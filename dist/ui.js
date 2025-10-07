"use strict";
(() => {
  // src/ui.ts
  var send = (msg) => parent.postMessage({ pluginMessage: msg }, "*");
  var out = document.getElementById("out");
  var status = document.getElementById("status");
  function setStatus(s) {
    status.textContent = s;
  }
  document.getElementById("syncTokens").onclick = () => send({ type: "sync-tokens" });
  document.getElementById("genScreens").onclick = () => send({ type: "generate-screens" });
  document.getElementById("updateScreens").onclick = () => send({ type: "update-screens" });
  document.getElementById("exportVars").onclick = () => {
    setStatus("Exporting variables\u2026");
    send({ type: "export-variables" });
  };
  document.getElementById("exportSelection").onclick = () => {
    setStatus("Exporting selection\u2026");
    send({ type: "export-selection" });
  };
  document.getElementById("exportDoc").onclick = () => {
    setStatus("Exporting document\u2026");
    send({ type: "export-document" });
  };
  window.onmessage = (e) => {
    var _a;
    const msg = (_a = e.data) == null ? void 0 : _a.pluginMessage;
    if (!msg) return;
    if (msg.type === "export-result") {
      out.value = JSON.stringify(msg.payload, null, 2);
      setStatus("Ready");
    }
    if (msg.type === "notify") setStatus(msg.text);
  };
})();
