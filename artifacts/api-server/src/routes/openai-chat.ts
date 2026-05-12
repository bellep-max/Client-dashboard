import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, conversationsTable, messagesTable, businessesTable, keywordsTable } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.userId = userId;
  next();
}

router.get("/openai/conversations", requireAuth, async (req: any, res): Promise<void> => {
  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, req.userId));
  res.json(conversations);
});

router.post("/openai/conversations", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ title: parsed.data.title, userId: req.userId })
    .returning();

  res.status(201).json(conversation);
});

router.get("/openai/conversations/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetOpenaiConversationParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  if (!conversation || conversation.userId !== req.userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(asc(messagesTable.createdAt));

  res.json({ ...conversation, messages: msgs });
});

router.delete("/openai/conversations/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteOpenaiConversationParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!conv || conv.userId !== req.userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListOpenaiMessagesParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(asc(messagesTable.createdAt));

  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = SendOpenaiMessageParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  if (!conversation || conversation.userId !== req.userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Get business context for the AI
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.userId, req.userId));
  const keywords = business
    ? await db.select().from(keywordsTable).where(eq(keywordsTable.businessId, business.id))
    : [];

  const businessContext = business
    ? `You are an AEO (Answer Engine Optimization) expert assistant helping the user manage their business on the AEO platform.

Business: ${business.businessName}
Owner: ${business.ownerName}
Industry: ${business.industry ?? "Not specified"}
Description: ${business.description ?? "Not specified"}
Keywords tracked: ${keywords.length} (${keywords.filter(k => k.status === "active").length} active)
Top keywords: ${keywords.slice(0, 5).map(k => k.keyword).join(", ") || "None yet"}

Help with AEO strategy, keyword optimization, content ideas, GBP optimization, and business visibility. Be concise and actionable.`
    : "You are an AEO (Answer Engine Optimization) expert assistant. Help the user with AEO strategy and business visibility optimization.";

  // Save user message
  await db.insert(messagesTable).values({
    conversationId: params.data.id,
    role: "user",
    content: parsed.data.content,
  });

  // Get conversation history
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(asc(messagesTable.createdAt));

  const chatMessages = [
    { role: "system" as const, content: businessContext },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  // Save assistant message
  await db.insert(messagesTable).values({
    conversationId: params.data.id,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
