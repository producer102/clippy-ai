#!/usr/bin/env node
/**
 * Clippy AI - Hook Installer
 *
 * Installs Claude Code hooks that send events to the Clippy AI desktop overlay.
 * Hooks are added to the user's global Claude Code settings.
 *
 * Usage: node install-hooks.js [--uninstall]
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_SETTINGS_DIR = path.join(os.homedir(), ".claude");
const SETTINGS_FILE = path.join(CLAUDE_SETTINGS_DIR, "settings.json");
const HOOK_SCRIPT = path.join(__dirname, "hooks", "notify.js").replace(/\\/g, "/");

const HOOK_MARKER = "clippy-ai";

// Find node.exe - try process.execPath, then common locations
function findNode() {
  const candidates = [
    process.execPath,
    "C:/Program Files/nodejs/node.exe",
    "/usr/local/bin/node",
    "/usr/bin/node",
  ];
  for (const p of candidates) {
    if (p && !p.includes("electron") && fs.existsSync(p)) return p.replace(/\\/g, "/");
  }
  return "node"; // fallback to PATH
}

const NODE = findNode();

// The hooks we want to install
const CLIPPY_HOOKS = {
  UserPromptSubmit: [
    {
      matcher: "",
      hooks: [
        {
          type: "command",
          command: `"${NODE}" "${HOOK_SCRIPT}" user_prompt`,
          timeout: 5,
          description: `[${HOOK_MARKER}] Wake Clippy when user sends message`,
        },
      ],
    },
  ],
  PreToolUse: [
    {
      matcher: ".*",
      hooks: [
        {
          type: "command",
          command: `"${NODE}" "${HOOK_SCRIPT}" thinking`,
          timeout: 5,
          description: `[${HOOK_MARKER}] Notify Clippy overlay on tool use`,
        },
      ],
    },
  ],
  PostToolUse: [
    {
      matcher: "AskUserQuestion",
      hooks: [
        {
          type: "command",
          command: `"${NODE}" "${HOOK_SCRIPT}" question`,
          timeout: 5,
          description: `[${HOOK_MARKER}] Notify Clippy when Claude asks a question`,
        },
      ],
    },
    {
      matcher: "Bash|Write|Edit",
      hooks: [
        {
          type: "command",
          command: `"${NODE}" "${HOOK_SCRIPT}" post_tool`,
          timeout: 5,
          description: `[${HOOK_MARKER}] Notify Clippy with tool results`,
        },
      ],
    },
  ],
  Notification: [
    {
      matcher: ".*",
      hooks: [
        {
          type: "command",
          command: `"${NODE}" "${HOOK_SCRIPT}" task_complete`,
          timeout: 5,
          description: `[${HOOK_MARKER}] Notify Clippy when task completes`,
        },
      ],
    },
  ],
  Stop: [
    {
      matcher: ".*",
      hooks: [
        {
          type: "command",
          command: `"${NODE}" "${HOOK_SCRIPT}" task_complete`,
          timeout: 5,
          description: `[${HOOK_MARKER}] Notify Clippy when Claude stops`,
        },
      ],
    },
  ],
};

function loadSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    console.error("Error reading settings file. Creating backup...");
    fs.copyFileSync(SETTINGS_FILE, SETTINGS_FILE + ".backup");
    return {};
  }
}

function saveSettings(settings) {
  // Ensure directory exists
  if (!fs.existsSync(CLAUDE_SETTINGS_DIR)) {
    fs.mkdirSync(CLAUDE_SETTINGS_DIR, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

function removeClippyHooks(hooks) {
  if (!hooks) return hooks;
  const cleaned = {};
  for (const [event, matchers] of Object.entries(hooks)) {
    const filtered = matchers.filter((m) => {
      if (!m.hooks) return true;
      // Remove matchers that only have clippy hooks
      const nonClippy = m.hooks.filter(
        (h) => !h.description || !h.description.includes(HOOK_MARKER)
      );
      if (nonClippy.length === 0) return false;
      m.hooks = nonClippy;
      return true;
    });
    if (filtered.length > 0) {
      cleaned[event] = filtered;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function install() {
  console.log("🟠 Installing Clippy AI hooks...\n");

  const settings = loadSettings();

  // Remove existing clippy hooks first (clean install)
  if (settings.hooks) {
    settings.hooks = removeClippyHooks(settings.hooks);
  }

  // Merge clippy hooks
  if (!settings.hooks) settings.hooks = {};

  for (const [event, matchers] of Object.entries(CLIPPY_HOOKS)) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = [];
    }
    settings.hooks[event].push(...matchers);
  }

  saveSettings(settings);

  console.log("✅ Hooks installed successfully!\n");
  console.log("Hook script location:", HOOK_SCRIPT);
  console.log("Settings file:", SETTINGS_FILE);
  console.log("\nInstalled hooks:");
  for (const event of Object.keys(CLIPPY_HOOKS)) {
    console.log(`  - ${event}`);
  }
  console.log("\n📋 Next steps:");
  console.log("  1. Start Clippy AI:  npm start");
  console.log("  2. Use Claude Code as normal - the overlay will show updates!");
  console.log("\nTo uninstall: node install-hooks.js --uninstall");
}

function uninstall() {
  console.log("🗑️  Removing Clippy AI hooks...\n");

  const settings = loadSettings();
  if (settings.hooks) {
    settings.hooks = removeClippyHooks(settings.hooks);
    if (!settings.hooks) delete settings.hooks;
  }
  saveSettings(settings);

  console.log("✅ Hooks removed successfully!");
}

// Main
const args = process.argv.slice(2);
if (args.includes("--uninstall") || args.includes("-u")) {
  uninstall();
} else {
  install();
}
