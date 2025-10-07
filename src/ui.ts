const send = (msg: any) => parent.postMessage({ pluginMessage: msg }, "*");
const out = document.getElementById("out") as HTMLTextAreaElement;
const statusEl = document.getElementById("status")!;

function setStatus(s: string) { statusEl.textContent = s; }

(document.getElementById("syncTokens")!).onclick = () => send({ type: "sync-tokens" });
(document.getElementById("genScreens")!).onclick   = () => send({ type: "generate-screens" });
(document.getElementById("updateScreens")!).onclick= () => send({ type: "update-screens" });

(document.getElementById("exportVars")!).onclick      = () => { setStatus("Exporting variables…");  send({ type: "export-variables" }); };
(document.getElementById("exportSelection")!).onclick = () => { setStatus("Exporting selection…");  send({ type: "export-selection" }); };
(document.getElementById("exportDoc")!).onclick       = () => { setStatus("Exporting document…");   send({ type: "export-document"  }); };

window.onmessage = (e) => {
    const msg = e.data?.pluginMessage;
    if (!msg) return;
    if (msg.type === "export-result") {
        out.value = JSON.stringify(msg.payload, null, 2);
        setStatus("Ready");
    }
    if (msg.type === "notify") setStatus(msg.text || "Ready");
};
