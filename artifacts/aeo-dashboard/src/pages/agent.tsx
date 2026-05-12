import React, { useState, useEffect, useRef } from "react";
import { useListOpenaiConversations, useCreateOpenaiConversation, useGetOpenaiConversation, useDeleteOpenaiConversation, getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, MessageSquare, Send, Bot, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AgentPage() {
  const queryClient = useQueryClient();
  const { data: conversations, isLoading: isConvosLoading } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();
  
  const [activeId, setActiveId] = useState<number | null>(null);

  // Set activeId to the first conversation if none selected and convos loaded
  useEffect(() => {
    if (!activeId && conversations && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const handleNewChat = () => {
    createConversation.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveId(res.id);
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (activeId === id) setActiveId(null);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-2px)] overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-72 border-r border-border bg-card flex flex-col h-full shrink-0 ${activeId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-bold text-lg">Strategy Agent</h2>
          <Button size="icon" variant="ghost" onClick={handleNewChat} data-testid="button-new-chat">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isConvosLoading ? (
              <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
            ) : conversations?.map(c => (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors group ${activeId === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                data-testid={`chat-item-${c.id}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <div className="truncate text-sm font-medium">{c.title}</div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => handleDelete(c.id, e)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col h-full bg-background ${!activeId ? 'hidden md:flex' : 'flex'}`}>
        {activeId ? (
          <ChatInterface conversationId={activeId} onBack={() => setActiveId(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Bot className="w-16 h-16 mb-4 opacity-20" />
            <p>Select or start a conversation</p>
            <Button className="mt-4" onClick={handleNewChat}>Start New Chat</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatInterface({ conversationId, onBack }: { conversationId: number, onBack: () => void }) {
  const { data: convo, isLoading } = useGetOpenaiConversation(conversationId);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync loaded messages
  useEffect(() => {
    if (convo?.messages) {
      setMessages(convo.messages);
    }
  }, [convo]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    
    const userMsg = input.trim();
    setInput("");
    
    // Optimistic user message
    const tempUserMsg = { id: Date.now(), role: "user", content: userMsg, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsStreaming(true);

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantContent = "";
      const tempAsstId = Date.now() + 1;
      
      // Optimistic empty assistant message
      setMessages(prev => [...prev, { id: tempAsstId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "");
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.done) break;
              if (data.content) {
                assistantContent += data.content;
                // Update the last message in place
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  if (last.role === "assistant" && last.id === tempAsstId) {
                    last.content = assistantContent;
                  }
                  return newMsgs;
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE chunk", dataStr);
            }
          }
        }
      }
    } catch (e) {
      toast.error("Failed to send message");
    } finally {
      setIsStreaming(false);
    }
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-card flex items-center gap-3 shrink-0 shadow-sm z-10">
        <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Button>
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">{convo?.title || "Agent"}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8">
            <Bot className="w-12 h-12 mb-4 opacity-20" />
            <p className="max-w-md">I am your AEO Strategy Agent. I know about your business profile, keywords, and performance. Ask me for optimization advice, content ideas, or analysis of your recent reports.</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={m.id || i} className={`flex gap-4 max-w-3xl ${m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'}`}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-xl ${m.role === 'user' ? 'bg-secondary text-secondary-foreground rounded-tr-sm' : 'bg-card border border-border shadow-sm rounded-tl-sm'}`}>
                <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap break-words leading-relaxed max-w-none">
                  {m.content}
                  {isStreaming && i === messages.length - 1 && m.role === 'assistant' && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle"></span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-background border-t border-border shrink-0">
        <form 
          className="max-w-3xl mx-auto relative flex items-center"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your AEO strategy..."
            className="pr-12 h-12 rounded-full border-border bg-card shadow-sm"
            disabled={isStreaming}
            data-testid="input-chat"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-1 w-10 h-10 rounded-full" 
            disabled={!input.trim() || isStreaming}
            data-testid="button-send-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <div className="text-center mt-2 text-xs text-muted-foreground">
          AI agents can make mistakes. Verify important strategy recommendations.
        </div>
      </div>
    </div>
  );
}