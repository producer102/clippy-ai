const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = require("electron");
const path = require("path");
const http = require("http");
const { WebSocketServer } = require("ws");

app.disableHardwareAcceleration();

// Detect system language
let systemLang = "en";
try {
  const { execSync } = require("child_process");
  const locale = execSync('powershell.exe -NoProfile -Command "(Get-Culture).TwoLetterISOLanguageName"', { timeout: 3000 }).toString().trim().toLowerCase();
  if (locale === "de") systemLang = "de";
  console.log("System language:", systemLang);
} catch { console.log("Language detection failed, defaulting to en"); }

let win = null;
let tray = null;
let quitting = false;
const sessions = new Map();
const PORT = 19542;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const scale = display.scaleFactor || 1;
  const winW = 300;
  const winH = 350;
  console.log("workArea:", JSON.stringify(workArea), "scale:", scale);

  win = new BrowserWindow({
    width: winW,
    height: winH,
    x: workArea.x + workArea.width - winW - 20,
    y: workArea.y + workArea.height - winH - 20,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    type: "toolbar",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  win.webContents.on("did-finish-load", () => {
    win.webContents.send("set-language", systemLang);
  });

  win.on("close", (e) => {
    if (!quitting) { e.preventDefault(); win.hide(); }
  });

  win.webContents.on("console-message", (_e, _lvl, msg) => {
    console.log("[R]", msg);
  });
}

function createTray() {
  try {
    const size = 16;
    const buf = Buffer.alloc(size * size * 4);
    // Paperclip icon
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const outer = (x >= 4 && x <= 12 && y >= 1 && y <= 14) &&
          ((x <= 5 || x >= 11) || y <= 2 || y >= 13);
        const inner = (x >= 7 && x <= 9 && y >= 4 && y <= 11) &&
          ((x === 7 || x === 9) || y <= 5 || y >= 10);
        if (outer && !inner) {
          buf[i] = 180; buf[i+1] = 190; buf[i+2] = 210; buf[i+3] = 255;
        }
      }
    }
    const icon = nativeImage.createFromBuffer(buf, { width: size, height: size });
    tray = new Tray(icon);
    tray.setToolTip("Clippy AI");
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: "Show", click: () => win && win.show() },
      { label: "Hide", click: () => win && win.hide() },
      { type: "separator" },
      { label: "Quit", click: () => { quitting = true; app.quit(); } },
    ]));
    tray.on("click", () => win && (win.isVisible() ? win.hide() : win.show()));
  } catch (e) { console.log("Tray error:", e.message); }
}

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/event") {
      let body = "";
      req.on("data", (c) => { body += c; if (body.length > 102400) { req.destroy(); return; } });
      req.on("end", () => {
        try { onEvent(JSON.parse(body)); res.writeHead(200); res.end("ok"); }
        catch { res.writeHead(400); res.end(); }
      });
    } else if (req.url === "/health") {
      res.writeHead(200); res.end("alive");
    } else { res.writeHead(404); res.end(); }
  });

  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    ws.on("message", (d) => { try { onEvent(JSON.parse(d.toString())); } catch {} });
  });

  server.listen(PORT, "127.0.0.1", () => console.log("Clippy AI on port", PORT));
  server.on("error", (e) => {
    console.log("Server error:", e.code);
    if (e.code === "EADDRINUSE") {
      console.log("Port already in use - another Clippy AI may be running. Quitting.");
      quitting = true;
      app.quit();
    }
  });
  return { server, wss };
}

function onEvent(event) {
  const id = event.sessionId || "?";
  sessions.set(id, {
    id, title: event.title || "Claude", status: event.type,
    lastMessage: event.message || "", cwd: event.cwd || "", timestamp: Date.now(),
  });
  if (win && !win.isDestroyed()) {
    win.webContents.send("claude-event", { ...event, sessions: [...sessions.values()] });
    if (["task_complete", "question", "error"].includes(event.type)) {
      // Grow window for speech bubble
      resizeForBubble(true);
      win.show();
      win.moveTop();
    }
  }
}

function resizeForBubble(show) {
  // Window is now always big enough for bubble, no resize needed
}

setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [id, s] of sessions) { if (s.timestamp < cutoff) sessions.delete(id); }
}, 60_000);

// ========= Lifecycle =========
// Suppress error dialogs (EADDRINUSE etc) - just quit silently
process.on("uncaughtException", (err) => {
  console.log("Uncaught:", err.message);
  app.exit(0);
});

let serverRefs;

app.on("ready", () => {
  console.log("App ready");
  createWindow();
  createTray();
  serverRefs = startServer();
  setupAutostart();

  ipcMain.on("hide-window", () => win && win.hide());

  // Resize window when bubble shows/hides
  ipcMain.on("bubble-show", () => resizeForBubble(true));
  ipcMain.on("bubble-hide", () => resizeForBubble(false));

  // Click-to-Focus: bring VSCode to front (10)
  ipcMain.on("focus-vscode", () => {
    try {
      // Temporarily drop alwaysOnTop so VSCode can grab focus
      if (win) win.setAlwaysOnTop(false);
      const { exec } = require("child_process");
      const script = path.join(__dirname, "hooks", "focus-vscode.ps1");
      exec(`powershell.exe -NoProfile -File "${script}"`, { timeout: 3000 },
        (err) => {
          if (err) console.log("focus-vscode err:", err.message);
          // Restore alwaysOnTop after a short delay
          setTimeout(() => { if (win && !win.isDestroyed()) win.setAlwaysOnTop(true); }, 500);
        });
    } catch (e) { console.log("focus-vscode err:", e.message); }
  });

  // Dragging
  ipcMain.on("drag-start", (_e) => {
    try {
      if (win && !win.isDestroyed()) {
        // Use Electron's built-in window moving
        const { x, y } = screen.getCursorScreenPoint();
        const [wx, wy] = win.getPosition();
        win._dragOffset = { x: x - wx, y: y - wy };
      }
    } catch (e) { console.log("drag-start err:", e.message); }
  });

  ipcMain.on("drag-move", (_e) => {
    try {
      if (win && !win.isDestroyed() && win._dragOffset) {
        const { x, y } = screen.getCursorScreenPoint();
        win.setPosition(x - win._dragOffset.x, y - win._dragOffset.y);
      }
    } catch (e) { console.log("drag-move err:", e.message); }
  });

  ipcMain.on("drag-end", () => {
    if (win) win._dragOffset = null;
  });
});

// ====== Autostart (9) ======
function setupAutostart() {
  try {
    const { execSync } = require("child_process");
    const launchScript = path.join(__dirname, "launch.js").replace(/\\/g, "\\\\");
    const nodePath = "C:\\\\Program Files\\\\nodejs\\\\node.exe";
    const regCmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "ClippyAI" /t REG_SZ /d "\\"${nodePath}\\" \\"${launchScript}\\"" /f`;
    execSync(regCmd, { timeout: 5000 });
    console.log("Autostart installed via registry");
  } catch (e) { console.log("Autostart setup error:", e.message); }
}

app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  quitting = true;
  if (serverRefs) { serverRefs.server.close(); serverRefs.wss.close(); }
});
