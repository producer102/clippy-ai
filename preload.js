const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("clippy", {
  onClaudeEvent: (cb) => ipcRenderer.on("claude-event", (_e, d) => cb(d)),
  dragStart: () => ipcRenderer.send("drag-start"),
  dragMove: () => ipcRenderer.send("drag-move"),
  dragEnd: () => ipcRenderer.send("drag-end"),
  bubbleShow: () => ipcRenderer.send("bubble-show"),
  bubbleHide: () => ipcRenderer.send("bubble-hide"),
  focusVSCode: () => ipcRenderer.send("focus-vscode"),
  onSetLanguage: (cb) => ipcRenderer.on("set-language", (_e, lang) => cb(lang)),
});
