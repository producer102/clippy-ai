#!/usr/bin/env node
// Clippy AI Hook - sends rich context to the desktop overlay
const CLIPPY_PORT = process.env.CLIPPY_PORT || 19542;
const http = require("http");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let hook = {};
  try { hook = JSON.parse(input); } catch {}
  const eventType = process.argv[2] || "unknown";
  const payload = buildPayload(eventType, hook);
  if (payload) sendToClippyAI(payload);
  else process.exit(0);
});

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ====== Contextual message builders ======

function describeBash(cmd) {
  if (!cmd) return "";
  const c = cmd.trim();
  if (c.startsWith("npm ")) return "npm";
  if (c.startsWith("git ")) return "Git";
  if (c.match(/test/i)) return "Tests";
  if (c.match(/build|compile/i)) return "Build";
  if (c.match(/install/i)) return "Install";
  return "";
}

function describeFile(path) {
  if (!path) return "";
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "";
}

// No more intros here - renderer handles i18n phrases

// ====== Build payload ======
function getConversationContext(hook) {
  // Try to extract recent conversation from transcript
  const ctx = { project: "", userMessages: [], assistantMessages: [], topic: "" };
  ctx.project = hook.cwd ? hook.cwd.split(/[/\\]/).pop() : "";

  // Read transcript if available (jsonl format)
  const tp = hook.transcript_path;
  if (tp) {
    try {
      const fs = require("fs");
      const lines = fs.readFileSync(tp, "utf8").trim().split("\n");
      // Get last ~10 entries
      const recent = lines.slice(Math.max(0, lines.length - 10));
      for (const line of recent) {
        try {
          const entry = JSON.parse(line);
          let text = typeof entry.content === "string" ? entry.content
            : Array.isArray(entry.content) ? (entry.content.find(b => b.type === "text")?.text || "") : "";
          if (!text) continue;
          // Redact potential secrets
          text = text.replace(/(?:api[_-]?key|token|password|secret|credential)s?\s*[:=]\s*\S+/gi, '[REDACTED]');
          text = text.replace(/(?:sk-|ghp_|gho_|github_pat_|xox[bpsa]-)\S+/gi, '[REDACTED]');
          if (entry.role === "user") ctx.userMessages.push(trunc(text, 150));
          if (entry.role === "assistant") ctx.assistantMessages.push(trunc(text, 150));
        } catch {}
      }
      // Topic = last user message
      if (ctx.userMessages.length > 0) {
        ctx.topic = ctx.userMessages[ctx.userMessages.length - 1];
      }
    } catch {}
  }
  return ctx;
}

function buildPayload(eventType, hook) {
  const base = {
    sessionId: hook.session_id || `${process.pid}`,
    title: hook.cwd ? hook.cwd.split(/[/\\]/).pop() : "Claude Code",
    cwd: hook.cwd || process.cwd(),
    timestamp: Date.now(),
  };
  const toolName = hook.tool_name || "";
  const toolInput = hook.tool_input || {};
  const toolResponse = hook.tool_response || {};

  switch (eventType) {
    case "user_prompt": {
      const userMsg = hook.prompt || hook.user_message || "";
      const WAKEUP = [
        "Oh! Eine neue Nachricht!",
        "Hm, mal sehen was ihr wollt...",
        "Moment, Claude denkt nach...",
        "Neue Aufgabe! Ich bin gespannt!",
        "Ah, da ist ja wieder jemand!",
      ];
      return { ...base, type: "user_prompt", message: pick(WAKEUP), userMessage: trunc(userMsg, 100) };
    }

    case "thinking": {
      let type = "working";
      let msg = "";

      switch (toolName) {
        case "Bash": {
          const what = describeBash(toolInput.command);
          msg = what || "";
          if (!msg) type = "working_quiet";
          break;
        }
        case "Write":
          msg = describeFile(toolInput.file_path);
          break;
        case "Edit":
          msg = describeFile(toolInput.file_path);
          break;
        case "Read":
          type = "working_quiet";
          msg = "";
          break;
        case "Glob": case "Grep":
          type = "working_quiet";
          msg = "";
          break;
        case "TodoWrite":
          type = "working_quiet";
          msg = "";
          break;
        case "Agent":
          msg = "";
          break;
        case "WebSearch":
          msg = "";
          break;
        case "AskUserQuestion":
          return null;
        default:
          msg = "";
      }

      const ctx = getConversationContext(hook);
      return { ...base, type, message: msg, toolName, context: ctx };
    }

    case "question": {
      const q = toolInput.question || "Claude braucht eure Hilfe!";
      return {
        ...base,
        type: "question",
        message: trunc(q, 120),
        toolName: "AskUserQuestion",
      };
    }

    case "task_complete": {
      const ctx = getConversationContext(hook);
      const DONE = [
        "Geschafft!",
        "Fertig!",
        "Tada! Erledigt!",
        "Das waere geschafft!",
        "Mission erfuellt!",
      ];
      return { ...base, type: "task_complete", message: pick(DONE), context: ctx };
    }

    case "post_tool": {
      switch (toolName) {
        case "Bash": {
          const exit = toolResponse.exit_code ?? toolResponse.exitCode;
          if (exit !== 0 && exit !== undefined) {
            return {
              ...base,
              type: "error",
              message: `Befehl fehlgeschlagen! (Exit ${exit})`,
              toolName,
            };
          }
          return null;
        }
        default:
          return null;
      }
    }

    default:
      return { ...base, type: eventType, message: process.argv[3] || "" };
  }
}

function sendToClippyAI(payload) {
  const data = JSON.stringify(payload);
  const req = http.request({
    hostname: "127.0.0.1", port: CLIPPY_PORT, path: "/event", method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    timeout: 1500,
  }, () => process.exit(0));
  req.on("error", () => process.exit(0));
  req.on("timeout", () => { req.destroy(); process.exit(0); });
  req.write(data);
  req.end();
}

function trunc(s, n) { return !s ? "" : s.length > n ? s.slice(0, n) + "..." : s; }
function shortPath(p) {
  if (!p) return "";
  const parts = p.replace(/\\/g, "/").split("/");
  return parts.length > 2 ? ".../" + parts.slice(-2).join("/") : p;
}

setTimeout(() => { if (!input) process.stdin.emit("end"); }, 300);
