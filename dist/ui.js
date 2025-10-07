"use strict";
(() => {
  // src/ui.ts
  var log = (...a) => console.log("[ui]", ...a);
  function init() {
    log("init");
    const send = (msg) => {
      log("postMessage \u2192", msg);
      parent.postMessage({ pluginMessage: msg }, "*");
    };
    const out = document.getElementById("out");
    const logBox = document.getElementById("log");
    const statusEl = document.getElementById("status");
    const pullBtn = document.getElementById("pullVars");
    const resizeBtn = document.getElementById("resize");
    const wEl = document.getElementById("w");
    const hEl = document.getElementById("h");
    const setStatus = (s) => {
      if (statusEl) statusEl.textContent = s;
      log("status:", s);
    };
    const appendLog = (lines) => {
      if (!logBox) return;
      const time = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      const text = lines.map((l) => `[${time}] ${l}`).join("\n") + "\n";
      logBox.value += text;
      if (logBox.value.length > 5e3) logBox.value = logBox.value.slice(-5e3);
      logBox.scrollTop = logBox.scrollHeight;
    };
    if (!pullBtn || !resizeBtn || !wEl || !hEl || !out || !statusEl || !logBox) {
      appendLog(["\u274C Missing UI elements (check IDs in ui.html)."]);
      return;
    }
    setStatus("Connecting\u2026");
    send({ type: "ping" });
    pullBtn.addEventListener("click", () => {
      setStatus("Pulling variables\u2026");
      send({ type: "pull-variables", collection: "YY_web" });
    });
    resizeBtn.addEventListener("click", () => {
      const w = parseInt(wEl.value || "980", 10);
      const h = parseInt(hEl.value || "620", 10);
      setStatus(`Resizing to ${w}\xD7${h}\u2026`);
      send({ type: "resize-ui", width: w, height: h });
    });
    window.onmessage = (e) => {
      const msg = e.data && e.data.pluginMessage || null;
      if (!msg) return;
      log("\u2190 pluginMessage", msg);
      if (msg.type === "ready") {
        setStatus("Connected");
        return;
      }
      if (msg.type === "pong") {
        setStatus("Loaded");
        return;
      }
      if (msg.type === "echo") {
        appendLog(["echo from code"]);
        return;
      }
      if (msg.type === "variables:pulled") {
        out.value = JSON.stringify(msg.json, null, 2);
        setStatus("Ready");
        appendLog(["variables pulled"]);
        return;
      }
      if (msg.type === "notify") {
        setStatus(msg.text || "Ready");
        appendLog([`notify: ${msg.text}`]);
        return;
      }
      if (msg.type === "debug") {
        const { lines = [] } = msg;
        appendLog(Array.isArray(lines) ? lines : [String(lines)]);
        return;
      }
    };
  }
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
//# sourceMappingURL=ui.js.map
