const send = (msg: any) => parent.postMessage({ pluginMessage: msg }, "*");
const out = document.getElementById("out") as HTMLTextAreaElement;
const statusEl = document.getElementById("status")!;
const serverEl = document.getElementById("server") as HTMLInputElement;
const tokenEl = document.getElementById("token") as HTMLInputElement;
const padEl = document.getElementById("pad") as HTMLInputElement;
const gapEl = document.getElementById("gap") as HTMLInputElement;
const layoutEl = document.getElementById("layout") as HTMLSelectElement;
const treeEl = document.getElementById("tree") as HTMLDivElement;


function setStatus(s: string) { statusEl.textContent = s; }


(document.getElementById("exportSelection")!).onclick = () => { setStatus("Exporting selection…"); send({ type: "export-selection" }); };
(document.getElementById("exportDoc")!).onclick = () => { setStatus("Exporting document…"); send({ type: "export-document" }); };
(document.getElementById("normalize")!).onclick = () => {
    const padding = parseInt(padEl.value || "24", 10);
    const itemSpacing = parseInt(gapEl.value || "12", 10);
    const layout = (layoutEl.value || "VERTICAL") as "VERTICAL" | "HORIZONTAL";
    send({ type: "normalize-spacing", padding, itemSpacing, layout });
};
(document.getElementById("pullApply")!).onclick = () => {
    send({ type: "fetch-and-apply-rules", serverUrl: serverEl.value, token: tokenEl.value });
};


function renderTree(data: any) {
    const items: any[] = Array.isArray(data) ? data : (data?.children || []);
    const html = items.map(renderNode).join("");
    treeEl.innerHTML = html || '<span class="muted">No nodes</span>';
}


function renderNode(n: any): string {
    const title = `${n.name || n.id} <span class="pill">${n.type}</span>`;
    const meta = n.layout ? ` <span class="muted">• layout: ${n.layout.layoutMode || "NONE"} • gap: ${n.layout.itemSpacing ?? "–"} • pad: ${padStr(n.layout.padding)}</span>` : "";
    const head = `<summary>${title}${meta}</summary>`;
    const kids = (n.children || []).map(renderNode).join("");
    return `<details open>${head}${kids}</details>`;
}


function padStr(p: any){ if(!p) return "–"; return `${p.top ?? 0}/${p.right ?? 0}/${p.bottom ?? 0}/${p.left ?? 0}`; }


// inbound messages from plugin
// - export-result → update JSON + tree
window.onmessage = (e) => {
    const msg = e.data?.pluginMessage;
    if (!msg) return;
    if (msg.type === "export-result") {
        out.value = JSON.stringify(msg.payload, null, 2);
        try { renderTree(msg.payload); } catch (e) {}
        setStatus("Ready");
    }
    if (msg.type === "notify") setStatus(msg.text || "Ready");
};