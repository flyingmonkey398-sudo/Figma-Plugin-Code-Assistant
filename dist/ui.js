"use strict";
(() => {
  // src/ui.ts
  var send = (msg) => parent.postMessage({ pluginMessage: msg }, "*");
  var out = document.getElementById("out");
  var statusEl = document.getElementById("status");
  var serverEl = document.getElementById("server");
  var tokenEl = document.getElementById("token");
  var padEl = document.getElementById("pad");
  var gapEl = document.getElementById("gap");
  var layoutEl = document.getElementById("layout");
  var treeEl = document.getElementById("tree");
  function setStatus(s) {
    statusEl.textContent = s;
  }
  document.getElementById("exportSelection").onclick = () => {
    setStatus("Exporting selection\u2026");
    send({ type: "export-selection" });
  };
  document.getElementById("exportDoc").onclick = () => {
    setStatus("Exporting document\u2026");
    send({ type: "export-document" });
  };
  document.getElementById("normalize").onclick = () => {
    const padding = parseInt(padEl.value || "24", 10);
    const itemSpacing = parseInt(gapEl.value || "12", 10);
    const layout = layoutEl.value || "VERTICAL";
    send({ type: "normalize-spacing", padding, itemSpacing, layout });
  };
  document.getElementById("pullApply").onclick = () => {
    send({ type: "fetch-and-apply-rules", serverUrl: serverEl.value, token: tokenEl.value });
  };
  function renderTree(data) {
    const items = Array.isArray(data) ? data : (data == null ? void 0 : data.children) || [];
    const html = items.map(renderNode).join("");
    treeEl.innerHTML = html || '<span class="muted">No nodes</span>';
  }
  function renderNode(n) {
    var _a;
    const title = `${n.name || n.id} <span class="pill">${n.type}</span>`;
    const meta = n.layout ? ` <span class="muted">\u2022 layout: ${n.layout.layoutMode || "NONE"} \u2022 gap: ${(_a = n.layout.itemSpacing) != null ? _a : "\u2013"} \u2022 pad: ${padStr(n.layout.padding)}</span>` : "";
    const head = `<summary>${title}${meta}</summary>`;
    const kids = (n.children || []).map(renderNode).join("");
    return `<details open>${head}${kids}</details>`;
  }
  function padStr(p) {
    var _a, _b, _c, _d;
    if (!p) return "\u2013";
    return `${(_a = p.top) != null ? _a : 0}/${(_b = p.right) != null ? _b : 0}/${(_c = p.bottom) != null ? _c : 0}/${(_d = p.left) != null ? _d : 0}`;
  }
  window.onmessage = (e) => {
    var _a;
    const msg = (_a = e.data) == null ? void 0 : _a.pluginMessage;
    if (!msg) return;
    if (msg.type === "export-result") {
      out.value = JSON.stringify(msg.payload, null, 2);
      try {
        renderTree(msg.payload);
      } catch (e2) {
      }
      setStatus("Ready");
    }
    if (msg.type === "notify") setStatus(msg.text || "Ready");
  };
})();
