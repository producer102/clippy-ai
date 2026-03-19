// Claude Clippy - with i18n support
import { initAgent } from "./lib/index.mjs";
import agentData from "./lib/agents/clippy/agent.mjs";
import mapData from "./lib/agents/clippy/map.mjs";
import soundData from "./lib/agents/clippy/sounds-mp3.mjs";
import { de, en } from "./i18n.mjs";

const ClippyLoader = {
  agent: () => Promise.resolve({ default: agentData }),
  map: () => Promise.resolve({ default: mapData }),
  sound: () => Promise.resolve({ default: soundData }),
};

// ====== i18n ======
let t = en; // default, overridden by main process
window.clippy.onSetLanguage((lang) => {
  t = lang === "de" ? de : en;
  console.log("Language set:", lang);
});

// ====== State ======
let agent = null;
let currentState = "idle";
let idleTimeout = null;
let _keepAwakeInterval = null;
let lastBubbleTime = 0;
const BUBBLE_THROTTLE_MS = 1800;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function trunc(s, n) { return !s ? "" : s.length > n ? s.slice(0, n) + "..." : s; }
function fmt(s, v) { return s.replace("%s", v).replace("%d", v); }

// ====== Error Memory ======
const errorMemory = [];
function rememberError(msg) {
  if (!msg) return null;
  const key = msg.slice(0, 80);
  const ex = errorMemory.find(e => e.key === key);
  if (ex) { ex.count++; ex.lastSeen = Date.now(); return ex; }
  const entry = { key, message: msg, count: 1, lastSeen: Date.now() };
  errorMemory.push(entry);
  if (errorMemory.length > 50) errorMemory.shift();
  return null;
}

// ====== Progress Counter ======
let taskToolCount = 0, taskStartTime = 0, taskActive = false;
function startTask() { taskToolCount = 0; taskStartTime = Date.now(); taskActive = true; }
function tickTask() { if (!taskActive) startTask(); taskToolCount++; }
function endTask() {
  const duration = taskActive ? Math.round((Date.now() - taskStartTime) / 1000) : 0;
  const count = taskToolCount;
  taskActive = false; taskToolCount = 0;
  return { count, duration };
}

// ====== Daily Stats ======
const dailyStats = { date: new Date().toDateString(), toolsUsed: 0, filesEdited: new Set(), filesWritten: new Set(), errors: 0, tasksCompleted: 0, bashCommands: 0, searches: 0 };
function trackStat(event) {
  const today = new Date().toDateString();
  if (dailyStats.date !== today) Object.assign(dailyStats, { date: today, toolsUsed: 0, filesEdited: new Set(), filesWritten: new Set(), errors: 0, tasksCompleted: 0, bashCommands: 0, searches: 0 });
  dailyStats.toolsUsed++;
  const tool = event.toolName || "";
  if (tool === "Edit") dailyStats.filesEdited.add(event.message || "?");
  if (tool === "Write") dailyStats.filesWritten.add(event.message || "?");
  if (tool === "Bash") dailyStats.bashCommands++;
  if (["Grep","Glob","WebSearch"].includes(tool)) dailyStats.searches++;
  if (event.type === "error") dailyStats.errors++;
  if (event.type === "task_complete") dailyStats.tasksCompleted++;
}

// ====== Context Memory ======
const recentActions = [];
let conversationContext = { project: "", topic: "", userMessages: [], assistantMessages: [] };

function trackAction(event) {
  const file = (event.message || "").match(/[\w-]+\.\w+/)?.[0] || "";
  recentActions.push({ tool: event.toolName || "", file, message: event.message || "", time: Date.now() });
  if (recentActions.length > 20) recentActions.shift();
  if (event.context) {
    if (event.context.topic) conversationContext.topic = event.context.topic;
    if (event.context.project) conversationContext.project = event.context.project;
    if (event.context.userMessages?.length) conversationContext.userMessages = event.context.userMessages;
    if (event.context.assistantMessages?.length) conversationContext.assistantMessages = event.context.assistantMessages;
  }
}

function getContextPhrase() {
  const phrases = [];
  const ctx = conversationContext;
  const topic = ctx.topic || "";
  const project = ctx.project || "";
  const lastUser = ctx.userMessages?.length ? ctx.userMessages[ctx.userMessages.length - 1] : "";
  const c = t.ctx;

  if (topic) {
    phrases.push(fmt(c.topicStill, trunc(topic, 50)), fmt(c.topicLetter, trunc(topic, 40)),
      fmt(c.topicOverheard, trunc(topic, 40)), fmt(c.topicWord, trunc(topic, 40)));
  }
  if (lastUser) {
    phrases.push(fmt(c.lastWish, trunc(lastUser, 50)), fmt(c.lastExcel, trunc(lastUser, 50)));
  }
  if (project) {
    phrases.push(fmt(c.projectWhen, project), fmt(c.projectStill, project), fmt(c.projectImportant, project));
  }
  if (recentActions.length > 0) {
    const last = recentActions[recentActions.length - 1];
    const files = recentActions.map(a => a.file).filter(Boolean);
    const uniqueFiles = [...new Set(files)];
    const editCount = recentActions.filter(a => a.tool === "Edit" || a.tool === "Write").length;
    const bashCount = recentActions.filter(a => a.tool === "Bash").length;
    const mostEdited = files.sort((a,b) => files.filter(f=>f===b).length - files.filter(f=>f===a).length)[0];
    const timeSince = Date.now() - last.time;

    if (mostEdited && files.filter(f => f === mostEdited).length > 2) {
      phrases.push(fmt(c.fileAgain, mostEdited), fmt(c.filePlease, mostEdited));
    }
    if (editCount > 5) phrases.push(fmt(c.editsMany, editCount));
    if (bashCount > 5) phrases.push(fmt(c.bashMany, bashCount));
    if (uniqueFiles.length > 3) phrases.push(fmt(c.filesMany, uniqueFiles.length));
    if (timeSince > 30000) phrases.push(c.idle);
    if (last.tool === "Edit" && last.file) phrases.push(fmt(c.lastEdit, last.file));
  }
  if (dailyStats.tasksCompleted >= 5) phrases.push(fmt(c.tasksMany, dailyStats.tasksCompleted));
  else if (dailyStats.tasksCompleted === 1) phrases.push(c.tasksOne);

  return phrases.length ? pick(phrases) : pick(t.dblclick);
}

// ====== Annoying Tips ======
function startAnnoyingTips() {
  function scheduleNext() {
    setTimeout(() => {
      if (agent && currentState !== "working") {
        playAnim("GetAttention");
        const msg = Math.random() < 0.5 && recentActions.length > 0 ? getContextPhrase() : pick(t.annoyingTips);
        setTimeout(() => showBubble(msg), 150);
      }
      scheduleNext();
    }, 45000 + Math.random() * 45000);
  }
  scheduleNext();
}

// ====== Init ======
async function init() {
  try {
    agent = await initAgent(ClippyLoader);
    agent.show();
    const el = agent._el;
    if (el) {
      el.style.position = "fixed"; el.style.bottom = "10px"; el.style.right = "10px"; el.style.left = ""; el.style.top = "";

      let dragging = false, dragDistance = 0, mouseDownTime = 0, startX = 0, startY = 0, clickTimer = null;
      el.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        dragging = true; dragDistance = 0; startX = e.screenX; startY = e.screenY; mouseDownTime = Date.now();
        window.clippy.dragStart(); e.preventDefault(); e.stopPropagation();
      }, true);
      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        dragDistance = Math.abs(e.screenX - startX) + Math.abs(e.screenY - startY);
        if (dragDistance > 5) { e.preventDefault(); window.clippy.dragMove(); }
      }, true);
      window.addEventListener("mouseup", () => {
        if (!dragging) return; dragging = false; window.clippy.dragEnd();
        const holdTime = Date.now() - mouseDownTime;
        if (dragDistance < 6 && holdTime < 400) {
          if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; onDoubleClick(); }
          else { clickTimer = setTimeout(() => { clickTimer = null; window.clippy.focusVSCode(); }, 600); }
        }
      }, true);
    }
    setTimeout(() => { agent.play("Greeting"); showBubble(t.greeting); }, 800);
    setTimeout(() => setState("idle"), 8000);
    startAnnoyingTips();
  } catch (err) { console.error("Clippy init failed:", err); }
}

// ====== Double-click ======
function onDoubleClick() {
  if (!agent) return;
  const anims = agent.animations ? agent.animations() : [];
  const fun = anims.filter(a => !a.startsWith("Idle") && a !== "Show" && a !== "Hide" && a !== "RestPose");
  if (fun.length > 0) playAnim(pick(fun));
  setTimeout(() => showBubble(getContextPhrase()), 150);
}

// ====== Bubble ======
function showBubble(text) {
  if (!agent || !text) return;
  agent.speak(text); window.clippy.bubbleShow();
  clearTimeout(showBubble._timer);
  showBubble._timer = setTimeout(() => window.clippy.bubbleHide(), Math.max(4000, text.length * 70));
}
function canShowBubble() {
  const now = Date.now();
  if (now - lastBubbleTime < BUBBLE_THROTTLE_MS) return false;
  lastBubbleTime = now; return true;
}

// ====== State ======
function setState(state) { currentState = state; window.__clippyNoIdle = (state === "working"); }
function resetIdleTimer() {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => { if (currentState !== "idle") setState("idle"); }, 60000);
}

// ====== Animation ======
function getAnimation(toolName) {
  const map = { Bash: "CheckingSomething", Write: "Writing", Edit: "Writing", Read: "Searching", Grep: "Searching", Glob: "Searching", Agent: "GetTechy", WebSearch: "Searching" };
  return map[toolName] || "Thinking";
}
function playAnim(name) {
  if (!agent) return;
  agent._queue.clear();
  if (agent._idleResolve) { agent._idleResolve(); agent._idlePromise = null; agent._idleResolve = null; }
  agent._animator.showAnimation(name, (_, state) => {
    if (state === 0 && currentState === "working") agent._animator._exiting = true;
  });
}

// ====== Build message ======
function buildMessage(event) {
  const hookMsg = event.message || "";
  const phrases = t.tool[event.toolName];
  const intro = phrases ? pick(phrases) : "";
  // Hook sends filename/detail, we prepend the i18n intro
  if (hookMsg && hookMsg.length > 1) return intro ? `${intro} ${hookMsg}` : hookMsg;
  return intro;
}

// ====== Event handler ======
function handleEvent(event) {
  if (!agent) return;
  trackStat(event); trackAction(event);

  switch (event.type) {
    case "user_prompt": {
      setState("working"); startTask(); playAnim("Thinking");
      _keepAwakeInterval = setInterval(() => {
        if (currentState === "working" && agent) agent._animator.showAnimation("Thinking", () => {});
        else clearInterval(_keepAwakeInterval);
      }, 3000);
      break;
    }
    case "thinking": case "working": {
      setState("working");
      if (_keepAwakeInterval) { clearInterval(_keepAwakeInterval); _keepAwakeInterval = null; }
      tickTask(); playAnim(getAnimation(event.toolName));
      if (taskToolCount > 1 && taskToolCount % 5 === 0) {
        setTimeout(() => showBubble(`${t.step} ${taskToolCount}... ${pick(t.busy)}`), 150);
      } else if (canShowBubble()) {
        const msg = buildMessage(event);
        if (msg) setTimeout(() => showBubble(trunc(msg, 120)), 150);
      }
      break;
    }
    case "working_quiet": {
      setState("working"); tickTask(); playAnim(getAnimation(event.toolName));
      break;
    }
    case "task_complete": {
      setState("done"); const { count, duration } = endTask(); playAnim("Congratulate");
      let msg = pick(t.complete);
      if (count > 2) {
        const mins = duration > 60 ? `${Math.round(duration / 60)} ${t.min}` : `${duration}s`;
        msg += `\n(${count} ${t.stepsIn} ${mins})`;
      }
      setTimeout(() => showBubble(trunc(msg, 180)), 150);
      setTimeout(() => { if (currentState === "done") setState("idle"); }, 15000);
      break;
    }
    case "question": {
      setState("question"); playAnim("GetAttention");
      setTimeout(() => showBubble(trunc(event.message || pick(t.question), 160)), 150);
      break;
    }
    case "error": {
      setState("error"); const prev = rememberError(event.message || ""); playAnim("Alert");
      if (prev && prev.count > 1) {
        setTimeout(() => showBubble(`${t.errorRepeat} (${prev.count}x)\n${t.hadBefore} ${prev.count - 1}${t.timesBefore}`), 150);
      } else { setTimeout(() => showBubble(pick(t.error)), 150); }
      break;
    }
  }
  resetIdleTimer();
}

window.clippy.onClaudeEvent((event) => {
  console.log("Event:", event.type, event.toolName, event.message?.slice(0, 50));
  handleEvent(event);
});

init(); resetIdleTimer();
