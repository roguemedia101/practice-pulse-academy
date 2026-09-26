import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  Braces,
  Check,
  ChevronRight,
  CircleDot,
  Code2,
  Database,
  FileCode2,
  FolderGit2,
  Gauge,
  Lightbulb,
  LockKeyhole,
  Menu,
  Network,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const MAX_CODE_LINES = 12;
const STARTER_CODE = `# Change the name, then run your code
name = "PyCademy"

def greet(learner):
    return f"Hello, {learner}!"

print(greet(name))`;

type SimValue = string | number | boolean;
type SimFunction = { parameter: string; expression: string };

function trimToLineLimit(value: string) {
  return value.replace(/\r/g, "").split("\n").slice(0, MAX_CODE_LINES).join("\n");
}

function highlightedPython(source: string) {
  const tokenPattern = /(#.*|f?"(?:\\.|[^"\\])*"|f?'(?:\\.|[^'\\])*'|\b(?:def|return|print|True|False)\b|\b\d+(?:\.\d+)?\b|[=+():,]|\b[A-Za-z_]\w*(?=\s*\()|\b[A-Za-z_]\w*)/g;

  return source.split("\n").map((line, lineIndex) => {
    const tokens = [];
    let cursor = 0;

    for (const match of line.matchAll(tokenPattern)) {
      const token = match[0];
      const index = match.index ?? 0;
      if (index > cursor) tokens.push(line.slice(cursor, index));

      const className = token.startsWith("#")
        ? "syntax-comment"
        : /^f?["']/.test(token)
          ? "syntax-string"
          : /^(def|return|print|True|False)$/.test(token)
            ? "syntax-keyword"
            : /^\d/.test(token)
              ? "syntax-number"
              : /^[=+():,]$/.test(token)
                ? "syntax-operator"
                : line.slice(index + token.length).match(/^\s*\(/)
                  ? "syntax-function"
                  : "syntax-variable";

      tokens.push(<span className={className} key={`${lineIndex}-${index}`}>{token}</span>);
      cursor = index + token.length;
    }

    if (cursor < line.length) tokens.push(line.slice(cursor));
    return <span className="code-highlight-line" key={lineIndex}>{tokens.length ? tokens : " "}{"\n"}</span>;
  });
}

function splitArguments(value: string) {
  const argumentsList: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";

  for (const character of value) {
    if ((character === '"' || character === "'") && !quote) quote = character;
    else if (character === quote) quote = "";
    else if (!quote && character === "(") depth += 1;
    else if (!quote && character === ")") depth -= 1;

    if (!quote && depth === 0 && character === ",") {
      argumentsList.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) argumentsList.push(current.trim());
  return argumentsList;
}

function evaluateExpression(
  expression: string,
  variables: Record<string, SimValue>,
  functions: Record<string, SimFunction>,
  localVariables: Record<string, SimValue> = {},
): SimValue {
  const value = expression.trim();
  const stringMatch = value.match(/^(f?)(["'])(.*)\2$/);

  if (stringMatch) {
    const [, prefix, , content = ""] = stringMatch;
    if (prefix !== "f") return content.replace(/\\n/g, "\n");
    return content.replace(/\{([A-Za-z_]\w*)\}/g, (_, key: string) => {
      const replacement = localVariables[key] ?? variables[key];
      if (replacement === undefined) throw new Error(`NameError: name '${key}' is not defined`);
      return String(replacement);
    });
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value === "True") return true;
  if (value === "False") return false;

  const callMatch = value.match(/^([A-Za-z_]\w*)\((.*)\)$/);
  if (callMatch) {
    const [, functionName = "", argumentSource = ""] = callMatch;
    const definition = functions[functionName];
    if (!definition) throw new Error(`NameError: name '${functionName}' is not defined`);
    const argument = evaluateExpression(argumentSource, variables, functions, localVariables);
    return evaluateExpression(definition.expression, variables, functions, {
      ...localVariables,
      [definition.parameter]: argument,
    });
  }

  const additiveParts = splitArguments(value.replace(/\+/g, ","));
  if (value.includes("+") && additiveParts.length > 1) {
    const results = additiveParts.map((part) => evaluateExpression(part, variables, functions, localVariables));
    return results.every((result) => typeof result === "number")
      ? (results as number[]).reduce((total, result) => total + result, 0)
      : results.join("");
  }

  const storedValue = localVariables[value] ?? variables[value];
  if (storedValue !== undefined) return storedValue;
  throw new Error(`NameError: name '${value}' is not defined`);
}

function simulatePython(source: string) {
  const lines = source.split("\n");
  const variables: Record<string, SimValue> = {};
  const functions: Record<string, SimFunction> = {};
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const functionMatch = line.match(/^def\s+([A-Za-z_]\w*)\((\w+)\):$/);
    if (functionMatch) {
      const nextLine = lines[index + 1] ?? "";
      const returnMatch = nextLine.match(/^\s+return\s+(.+)$/);
      if (!returnMatch) throw new Error(`Line ${index + 1}: expected an indented return statement`);
      functions[functionMatch[1] ?? ""] = {
        parameter: functionMatch[2] ?? "value",
        expression: returnMatch[1] ?? "",
      };
      index += 1;
      continue;
    }

    if (/^def\s+/.test(line)) throw new Error(`Line ${index + 1}: SyntaxError in function definition`);

    const printMatch = line.match(/^print\((.*)\)$/);
    if (printMatch) {
      const argumentsList = splitArguments(printMatch[1] ?? "");
      output.push(argumentsList.map((argument) => String(evaluateExpression(argument, variables, functions))).join(" "));
      continue;
    }

    const assignmentMatch = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (assignmentMatch) {
      variables[assignmentMatch[1] ?? ""] = evaluateExpression(assignmentMatch[2] ?? "", variables, functions);
      continue;
    }

    throw new Error(`Line ${index + 1}: this lightweight demo supports assignments, functions, and print()`);
  }

  return `${output.length ? output.join("\n") : "Program finished with no output."}\n✓ Process finished with exit code 0`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PyCademy — Learn to code by actually coding" },
      {
        name: "description",
        content:
          "A hands-on programming and cybersecurity learning platform built around practice, feedback, revision, and real projects.",
      },
      { property: "og:title", content: "PyCademy — Learn to code by actually coding" },
      {
        property: "og:description",
        content: "Write code, get useful feedback, revisit weak spots, and build something real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const stages = [
  { name: "Learn", label: "01", icon: Lightbulb, text: "Understand a concept through concise, focused explanations." },
  { name: "Practice", label: "02", icon: Code2, text: "Use it immediately in an interactive coding environment." },
  { name: "Feedback", label: "03", icon: Gauge, text: "See what worked, what broke, and why it happened." },
  { name: "Revision", label: "04", icon: RefreshCw, text: "Return to weak areas with targeted practice, not repetition." },
  { name: "Project", label: "05", icon: FolderGit2, text: "Turn what you know into something useful and complete." },
];

const paths = [
  { id: "python", kicker: "Foundation", title: "Python Core", icon: Braces, text: "Build a strong programming foundation.", preview: "functions.py", code: "def solve(problem):\n    return practice(problem)" },
  { id: "security", kicker: "Defense", title: "Ethical Hacking", icon: ShieldCheck, text: "Learn cybersecurity concepts, defensive thinking, networking and authorized security practice.", preview: "network_scan.py", code: "for host in trusted_network:\n    audit(host)" },
  { id: "data", kicker: "Analysis", title: "Data Science", icon: Database, text: "Work with data, analysis, visualization and practical data projects.", preview: "analysis.ipynb", code: "insights = data\n    .clean()\n    .visualize()" },
  { id: "ai", kicker: "Intelligence", title: "AI / Machine Learning", icon: BrainCircuit, text: "Build intelligent systems and learn modern machine-learning concepts.", preview: "model.py", code: "model.fit(X_train, y_train)\nscore = model.evaluate(X_test)" },
  { id: "hybrid", kicker: "Frontier", title: "AI + Cybersecurity", icon: Network, text: "Explore the combination of AI and cybersecurity.", preview: "threat_model.py", code: "signal = model.detect(event)\nreview(signal)" },
];

const projects = [
  { name: "Python Calculator", level: "Python", file: "calculator.py", status: "Core logic", lines: ["def calculate(a, op, b):", "    return operations[op](a, b)", "", "> calculate(24, '*', 4)", "96"] },
  { name: "To-Do CLI", level: "Python", file: "tasks.py", status: "Command line", lines: ["$ pycademy tasks list", "", "[x] Parse command arguments", "[x] Persist local tasks", "[ ] Add priority filters"] },
  { name: "File Integrity Monitor", level: "Security", file: "monitor.py", status: "Building", lines: ["baseline = hash_files(root)", "changes = compare(baseline, current)", "", "> monitoring /documents", "✓ 128 files verified"] },
  { name: "Flask Task API", level: "Web API", file: "app.py", status: "API online", lines: ["@app.post('/tasks')", "def create_task():", "    return task_service.create()", "", "POST /tasks  ·  201 CREATED"] },
];

const navItems = [
  { label: "Features", id: "how" },
  { label: "Learning Paths", id: "paths" },
  { label: "Projects", id: "projects" },
  { label: "How It Works", id: "loop" },
];

function Brand() {
  return (
    <a href="#top" className="group flex items-center gap-2.5" aria-label="PyCademy home">
      <span className="logo-mark"><span>>_</span></span>
      <span className="font-display text-[1.08rem] font-semibold text-foreground">PyCademy</span>
    </a>
  );
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [code, setCode] = useState(STARTER_CODE);
  const [output, setOutput] = useState("Ready to run your code.");
  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [activePath, setActivePath] = useState(0);
  const [tutorStep, setTutorStep] = useState(0);
  const [activeProject, setActiveProject] = useState(2);
  const codeHighlightRef = useRef<HTMLPreElement>(null);
  const activeStageData = stages[activeStage] ?? stages[0];
  const activePathData = paths[activePath] ?? paths[0];
  const activeProjectData = projects[activeProject] ?? projects[0];

  if (!activeStageData || !activePathData || !activeProjectData) return null;

  useEffect(() => {
    const timer = window.setInterval(() => setActiveStage((value) => (value + 1) % stages.length), 4000);
    return () => window.clearInterval(timer);
  }, []);

  const runCode = () => {
    setRunning(true);
    setOutput("Running main.py...");
    window.setTimeout(() => {
      try {
        setOutput(simulatePython(code));
      } catch (error) {
        setOutput(error instanceof Error ? `${error.message}\n✕ Process finished with exit code 1` : "Unable to run this code.");
      }
      setRunning(false);
    }, 650);
  };

  const handleCodeKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const nextCode = `${code.slice(0, start)}    ${code.slice(end)}`;
    setCode(trimToLineLimit(nextCode));
    window.requestAnimationFrame(() => {
      input.selectionStart = start + 4;
      input.selectionEnd = start + 4;
    });
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="top" className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-10" aria-label="Main navigation">
          <Brand />
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)} className="nav-link">{item.label}</button>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" onClick={() => scrollTo("final")}>Log In</Button>
            <Button variant="hero" onClick={() => scrollTo("final")}>Sign Up <ArrowRight /></Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </nav>
        {menuOpen && (
          <div className="border-t border-border bg-background px-5 py-5 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => scrollTo(item.id)} className="mobile-nav-link">{item.label}<ChevronRight /></button>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
                <Button variant="technical" onClick={() => scrollTo("final")}>Log In</Button>
                <Button variant="hero" onClick={() => scrollTo("final")}>Sign Up</Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="hero-grid relative min-h-[min(900px,100svh)] border-b border-border pt-28 lg:pt-36">
          <div className="mx-auto grid max-w-[1440px] items-center gap-14 px-5 pb-20 lg:grid-cols-[0.83fr_1.17fr] lg:px-10 lg:pb-28">
            <div className="relative z-10 max-w-2xl animate-fade-in">
              <div className="eyebrow"><span className="status-dot" /> Interactive developer learning</div>
              <h1 className="mt-7 font-display text-[clamp(3rem,6.4vw,6.6rem)] font-semibold leading-[0.94] tracking-normal">
                Learn to code.<br /><span className="text-primary">By coding.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground lg:text-xl">
                Write real code, solve practical problems, get useful feedback, revisit weak spots, and build something that works.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button size="xl" variant="hero" onClick={() => scrollTo("final")}>Create your free account <ArrowRight /></Button>
                <Button size="xl" variant="technical" onClick={() => scrollTo("how")}><Play /> Explore PyCademy</Button>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
                <span className="flex items-center gap-2"><Check className="text-security" /> Learn through practice</span>
                <span className="flex items-center gap-2"><Check className="text-security" /> Build real projects</span>
              </div>
            </div>

            <div className="hero-workspace relative mx-auto w-full max-w-3xl" aria-label="Interactive Python coding demonstration">
              <div className="depth-object depth-bracket" aria-hidden="true">{`{ }`}</div>
              <div className="depth-object depth-cube" aria-hidden="true"><span /></div>
              <div className="workspace-shell">
                <div className="workspace-topbar">
                  <div className="flex items-center gap-2"><span className="window-dot" /><span className="window-dot" /><span className="window-dot" /></div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground"><FileCode2 /> main.py <span className="hidden sm:inline">— practice workspace</span></div>
                  <Button variant="hero" size="sm" onClick={runCode} disabled={running}><Play /> {running ? "Running" : "Run"}</Button>
                </div>
                <div className="workspace-tabs"><span className="active">main.py</span><span>instructions.md</span></div>
                <div className="grid min-h-[360px] grid-rows-[1fr_auto] sm:min-h-[430px]">
                  <div className="code-editor code-editor-editable">
                    <div className="line-numbers" aria-hidden="true">
                      {Array.from({ length: MAX_CODE_LINES }, (_, index) => <span key={index}>{index + 1}</span>)}
                    </div>
                    <div className="code-input-layer">
                      <pre ref={codeHighlightRef} className="code-highlight" aria-hidden="true">{highlightedPython(code)}</pre>
                      <textarea
                        className="code-textarea"
                        value={code}
                        onChange={(event) => setCode(trimToLineLimit(event.target.value))}
                        onKeyDown={handleCodeKeyDown}
                        onScroll={(event) => {
                          if (!codeHighlightRef.current) return;
                          codeHighlightRef.current.scrollTop = event.currentTarget.scrollTop;
                          codeHighlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
                        }}
                        rows={MAX_CODE_LINES}
                        wrap="off"
                        spellCheck={false}
                        aria-label="Editable Python code, maximum 12 lines"
                      />
                    </div>
                  </div>
                  <div className="border-t border-border bg-terminal">
                    <div className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-[10px] uppercase text-muted-foreground"><span className="flex items-center gap-2"><Terminal /> Output</span><span>Python 3.12</span></div>
                    <pre className="min-h-20 whitespace-pre-wrap px-4 py-3 font-mono text-xs leading-6 text-terminal-foreground">{output}</pre>
                  </div>
                </div>
              </div>
              <div className="line-limit-label"><span className="status-dot" /> {code.split("\n").length} / {MAX_CODE_LINES} lines</div>
              <div className="workspace-badge"><Zap /> feedback_ready <span>12ms</span></div>
            </div>
          </div>
          <div className="hero-metric-strip">
            <div><span>01</span> Read less. Write sooner.</div><div><span>02</span> See exactly what changed.</div><div><span>03</span> Keep building from there.</div>
          </div>
        </section>

        <section id="how" className="section-band border-b border-border">
          <div className="section-shell">
            <SectionHeading eyebrow="The method" title="A continuous learning loop." text="Each step feeds the next. You move forward by using what you learn—not by collecting watched videos." />
            <div className="mt-14 lg:mt-20">
              <div className="stage-rail" style={{ "--stage-progress": `${(activeStage / (stages.length - 1)) * 100}%` } as React.CSSProperties}>
                {stages.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <button key={stage.name} className={`stage-node ${index <= activeStage ? "is-complete" : ""} ${index === activeStage ? "is-active" : ""}`} onClick={() => setActiveStage(index)}>
                      <span className="stage-icon"><Icon /></span><span className="font-mono text-[10px] text-muted-foreground">{stage.label}</span><strong>{stage.name}</strong>
                    </button>
                  );
                })}
              </div>
              <div className="stage-detail">
                <div className="font-mono text-xs text-primary">STAGE_{activeStageData.label}</div>
                <p>{activeStageData.text}</p>
                <div className="hidden items-center gap-2 font-mono text-xs text-muted-foreground sm:flex">{stages.map((stage, index) => <span key={stage.name} className={index === activeStage ? "text-primary" : ""}>{index === activeStage ? "●" : "○"}</span>)}</div>
              </div>
            </div>
          </div>
        </section>

        <section id="paths" className="section-band border-b border-border bg-surface-subtle">
          <div className="section-shell">
            <SectionHeading eyebrow="Learning paths" title="Start with Python. Go further." text="Build the foundation first, then move into data, intelligent systems, and defensive security." />
            <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-5">
              {paths.map((path, index) => {
                const Icon = path.icon;
                return (
                  <button key={path.id} onClick={() => setActivePath(index)} className={`path-tile path-${path.id} ${activePath === index ? "is-active" : ""}`}>
                    <span className="path-topline"><Icon /><span>{path.kicker}</span></span>
                    <strong>{path.title}</strong><p>{path.text}</p><span className="path-arrow"><ArrowRight /></span>
                  </button>
                );
              })}
            </div>
            <div className={`path-preview path-${activePathData.id}`}>
              <div className="flex items-center gap-3"><span className="path-file-icon"><FileCode2 /></span><div><span className="font-mono text-[10px] uppercase text-muted-foreground">Current workspace</span><p className="font-mono text-sm">{activePathData.preview}</p></div></div>
              <pre>{activePathData.code}</pre>
              <div className="path-signal"><span /> Ready to practice</div>
            </div>
          </div>
        </section>

        <section className="section-band border-b border-border">
          <div className="section-shell grid items-center gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-24">
            <div>
              <div className="eyebrow"><Sparkles /> Learning assistance</div>
              <h2 className="section-title mt-6">Not just an answer.<br /><span className="text-ai">A way forward.</span></h2>
              <p className="section-copy mt-6">PyCademy helps you understand the mistake, gives you a useful next step, and lets you solve it yourself.</p>
              <div className="mt-8 flex items-center gap-3 font-mono text-xs text-muted-foreground"><LockKeyhole className="text-security" /> Frontend product demonstration</div>
            </div>
            <div className="tutor-console">
              <div className="console-header"><span className="flex items-center gap-2"><BrainCircuit /> PyCademy tutor</span><span className="live-label"><span /> ACTIVE</span></div>
              <div className="space-y-5 p-5 sm:p-7">
                <div className="message student-message"><span>YOU</span><p>Why is this Python code giving me an error?</p><code>if score &gt; 80<br />&nbsp;&nbsp;&nbsp;&nbsp;print(&quot;Great work&quot;)</code></div>
                {tutorStep >= 1 && <div className="message tutor-message animate-fade-in"><span>PYCademY · EXPLANATION</span><p>Python expects a colon at the end of the <code>if</code> condition. It uses the colon to begin the indented block.</p></div>}
                {tutorStep >= 2 && <div className="message hint-message animate-fade-in"><span><Lightbulb /> HINT</span><p>Look directly after <code>80</code>. What symbol usually opens a Python block?</p></div>}
                {tutorStep >= 3 && <div className="corrected-code animate-fade-in"><div><span>CORRECTED CODE</span><Check /></div><code><span className="syntax-keyword">if</span> score <span className="syntax-operator">&gt;</span> <span className="syntax-number">80</span>:<br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="syntax-function">print</span>(<span className="syntax-string">&quot;Great work&quot;</span>)</code></div>}
                <Button variant={tutorStep === 3 ? "technical" : "hero"} onClick={() => setTutorStep((value) => value === 3 ? 0 : value + 1)}>{tutorStep === 0 ? "Explain the error" : tutorStep === 1 ? "Give me a hint" : tutorStep === 2 ? "Show corrected code" : "Try again"}<ArrowRight /></Button>
              </div>
            </div>
          </div>
        </section>

        <section id="projects" className="section-band border-b border-border bg-surface-subtle">
          <div className="section-shell">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <SectionHeading eyebrow="Project-based learning" title="Lessons end. Your work continues." text="You don't just finish lessons. You combine the skills, make decisions, debug problems, and build things." />
              <div className="font-mono text-xs text-muted-foreground">04 PROJECT WORKSPACES</div>
            </div>
            <div className="project-browser mt-14">
              <div className="project-sidebar">
                <div className="sidebar-label">Your projects</div>
                {projects.map((project, index) => (
                  <button key={project.name} className={activeProject === index ? "is-active" : ""} onClick={() => setActiveProject(index)}>
                    <FileCode2 /><span><strong>{project.name}</strong><small>{project.level}</small></span><ChevronRight />
                  </button>
                ))}
              </div>
              <div className="project-workspace">
                <div className="project-toolbar"><div><CircleDot className="text-project" /><span>{activeProjectData.name}</span><small>/ {activeProjectData.file}</small></div><span className="build-state"><span /> {activeProjectData.status}</span></div>
                <div className="project-code"><div className="project-gutter">01<br />02<br />03<br />04<br />05</div><pre>{activeProjectData.lines.map((line, index) => <span key={`${line}-${index}`} className={line.startsWith(">") || line.startsWith("$") || line.startsWith("✓") ? "output-line" : ""}>{line || " "}{"\n"}</span>)}</pre></div>
                <div className="project-footer"><span><Terminal /> terminal</span><span><span className="status-dot" /> workspace synced</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="loop" className="section-band border-b border-border">
          <div className="section-shell">
            <SectionHeading eyebrow="Inside every lesson" title="Mistakes are part of the interface." text="A practical loop designed to turn confusion into working knowledge." centered />
            <div className="learning-loop mt-14 lg:mt-20">
              {[{ icon: Code2, label: "Write", detail: "code.py" }, { icon: Play, label: "Run", detail: "python 3.12" }, { icon: X, label: "Miss", detail: "line 04" }, { icon: Sparkles, label: "Understand", detail: "feedback" }, { icon: RefreshCw, label: "Retry", detail: "revision" }, { icon: Check, label: "Build", detail: "project" }].map((item, index) => {
                const Icon = item.icon;
                return <div className="loop-step" key={item.label}><span className="loop-number">0{index + 1}</span><div className="loop-icon"><Icon /></div><strong>{item.label}</strong><small>{item.detail}</small>{index < 5 && <ArrowRight className="loop-arrow" />}</div>;
              })}
            </div>
            <div className="mt-10 text-center font-mono text-xs text-muted-foreground">knowledge compounds <span className="mx-2 text-primary">→</span> projects become possible</div>
          </div>
        </section>

        <section id="final" className="final-section relative overflow-hidden">
          <div className="final-grid" aria-hidden="true" /><div className="final-bracket final-bracket-left" aria-hidden="true">[</div><div className="final-bracket final-bracket-right" aria-hidden="true">]</div>
          <div className="relative z-10 mx-auto max-w-4xl px-5 py-28 text-center sm:py-36">
            <div className="eyebrow mx-auto w-fit"><span className="status-dot" /> Your first workspace is ready</div>
            <h2 className="mt-7 font-display text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[0.95]">Ready to start<br /><span className="text-primary">building?</span></h2>
            <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-muted-foreground">Learn the skills. Practice them. Build something real.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Button size="xl" variant="hero">Create your free account <ArrowRight /></Button><Button size="xl" variant="technical">Log In</Button></div>
          </div>
          <footer className="relative z-10 border-t border-border/70"><div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-5 px-5 py-7 sm:flex-row lg:px-10"><Brand /><p className="font-mono text-xs text-muted-foreground">LEARN → PRACTICE → FEEDBACK → BUILD</p><p className="text-xs text-muted-foreground">© 2026 PyCademy</p></div></footer>
        </section>
      </main>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text, centered = false }: { eyebrow: string; title: string; text: string; centered?: boolean }) {
  return <div className={`max-w-3xl ${centered ? "mx-auto text-center" : ""}`}><div className={`eyebrow ${centered ? "mx-auto w-fit" : ""}`}><span className="status-dot" /> {eyebrow}</div><h2 className="section-title mt-6">{title}</h2><p className={`section-copy mt-5 ${centered ? "mx-auto" : ""}`}>{text}</p></div>;
}