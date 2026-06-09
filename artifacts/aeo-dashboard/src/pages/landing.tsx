import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, LineChart, ShieldCheck, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { motion, AnimatePresence } from "framer-motion";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const ENGINES = ["ChatGPT", "Gemini", "Perplexity", "Claude", "Grok"];

function TypewriterEngines() {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = ENGINES[index];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(
        () => setDisplayed(word.slice(0, displayed.length + 1)),
        80,
      );
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1400);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % ENGINES.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, index]);

  return (
    <span className="text-primary inline-block min-w-[160px]">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

function FloatingOrbs() {
  const orbs = [
    { size: 320, x: "10%", y: "20%", delay: 0, duration: 12 },
    { size: 200, x: "70%", y: "60%", delay: 2, duration: 10 },
    { size: 160, x: "50%", y: "10%", delay: 4, duration: 14 },
    { size: 120, x: "20%", y: "75%", delay: 1, duration: 9 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function PulsingNodes() {
  const nodes = [
    { cx: 80, cy: 120 },
    { cx: 220, cy: 60 },
    { cx: 350, cy: 180 },
    { cx: 160, cy: 260 },
    { cx: 300, cy: 310 },
    { cx: 420, cy: 90 },
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [0, 3],
    [3, 4],
    [2, 5],
    [1, 5],
    [3, 2],
  ];

  return (
    <motion.svg
      viewBox="0 0 500 380"
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, delay: 0.5 }}
    >
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].cx}
          y1={nodes[a].cy}
          x2={nodes[b].cx}
          y2={nodes[b].cy}
          stroke="hsl(var(--primary))"
          strokeOpacity={0.15}
          strokeWidth={1.5}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.8 + i * 0.12, ease: "easeOut" }}
        />
      ))}
      {nodes.map((node, i) => (
        <g key={i}>
          <motion.circle
            cx={node.cx}
            cy={node.cy}
            r={18}
            fill="hsl(var(--primary))"
            fillOpacity={0.06}
            stroke="hsl(var(--primary))"
            strokeOpacity={0.2}
            strokeWidth={1}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: 1 }}
            transition={{
              scale: {
                duration: 2.5,
                delay: i * 0.3 + 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              },
              opacity: { duration: 0.4, delay: i * 0.15 + 0.3 },
            }}
          />
          <motion.circle
            cx={node.cx}
            cy={node.cy}
            r={5}
            fill="hsl(var(--primary))"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 0.3,
              delay: i * 0.15 + 0.5,
              type: "spring",
            }}
          />
        </g>
      ))}
    </motion.svg>
  );
}

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
  hidden: {},
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();

  const features = [
    {
      icon: Bot,
      title: "AI Keyword Intelligence",
      desc: "Discover exactly what people ask AI about your industry.",
    },
    {
      icon: LineChart,
      title: "Performance Reports",
      desc: "Track your efficiency score and visibility trends over time.",
    },
    {
      icon: ShieldCheck,
      title: "Profile Authority",
      desc: "Connect GBP and backlinks to feed AI models verified facts.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <motion.header
        className="border-b border-border py-4 px-6 flex items-center justify-between bg-card shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
          >
            AE
          </motion.div>
          <span className="font-bold tracking-tight text-lg">AEO Platform</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid="button-theme-toggle"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </motion.header>

      <main className="flex-1 grid lg:grid-cols-2 min-h-0">
        <div className="relative flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-24 overflow-hidden">
          <FloatingOrbs />

          <motion.div
            className="relative z-10"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20 w-fit"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Bot className="w-4 h-4 shrink-0" />
              </motion.div>
              <span className="text-sm font-medium">
                Answer Engine Optimization
              </span>
            </motion.div>

            <motion.div variants={fadeUp} className="mb-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                Welcome to AEO
              </p>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight mb-6 leading-tight"
            >
              Command your
              <br />
              visibility in <span className="text-primary">AI search</span>.
            </motion.h1>

            <motion.div variants={fadeUp} className="mb-6">
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                When customers ask <TypewriterEngines /> about your business,
                <br className="hidden lg:block" />
                make sure you are the answer.
              </p>
            </motion.div>

            <motion.div variants={stagger} className="flex flex-col gap-3">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex items-start gap-3"
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"
                    whileHover={{
                      scale: 1.15,
                      backgroundColor: "hsl(var(--primary) / 0.2)",
                    }}
                  >
                    <f.icon className="w-4 h-4 text-primary" />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-sm">{f.title}</p>
                    <p className="text-muted-foreground text-sm">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute bottom-6 right-6 opacity-10 pointer-events-none w-48 h-36 hidden lg:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            <PulsingNodes />
          </motion.div>
        </div>

        <motion.div
          className="flex flex-col items-center justify-center px-6 py-12 lg:py-0 bg-card border-l border-border"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <div className="w-full max-w-md text-center space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
              <p className="text-muted-foreground">
                Sign in to your account to track your AI search rankings.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/sign-in">
                <Button size="lg" className="w-full text-base">
                  Sign In
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
