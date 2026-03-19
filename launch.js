const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const electronPath = path.join(__dirname, "node_modules", "electron", "dist", "electron.exe");
const logPath = path.join(__dirname, "clippy.log");

// Build clean env WITHOUT ELECTRON_RUN_AS_NODE
const cleanEnv = {};
for (const [key, val] of Object.entries(process.env)) {
  if (key !== "ELECTRON_RUN_AS_NODE") cleanEnv[key] = val;
}

// Open log file for output
const logFd = fs.openSync(logPath, "a");

const child = spawn(electronPath, ["."], {
  cwd: __dirname,
  detached: true,
  stdio: ["ignore", logFd, logFd],
  env: cleanEnv,
});

child.unref();
fs.closeSync(logFd);
console.log("Clippy AI launched! PID:", child.pid, "Log:", logPath);
