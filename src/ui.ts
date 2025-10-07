// src/ui.ts
const log = (...a: any[]) => console.log("[ui]", ...a);

function init() {
    log("init");
    const send = (msg: any) => {
        log("postMessage →", msg);
        parent.postMessage({ pluginMessage: msg }, "*");
    };

    const out = document.getElementById("out") as HTMLTextAreaElement | null;
    const logBox = document.getElementById("log") as HTMLTextAreaElement | null;
    const statusEl = document.getElementById("status") as HTMLElement | null;
    const pullBtn = document.getElementById("pullVars");
    const resizeBtn = document.getElementById("resize");
    const wEl = document.getElementById("w") as HTMLInputElement | null;
    const hEl = document.getElementById("h") as HTMLInputElement | null;

    const setStatus = (s: string) => { if (statusEl) statusEl.textContent = s; log("status:", s); };

    const appendLog = (lines: string[]) => {
        if (!logBox) return;
        const time = new Date().toLocaleTimeString();
        const text = lines.map(l => `[${time}] ${l}`).join("\n") + "\n";
        logBox.value += text;
        if (logBox.value.length > 5000) logBox.value = logBox.value.slice(-5000);
        logBox.scrollTop = logBox.scrollHeight;
    };

    if (!pullBtn || !resizeBtn || !wEl || !hEl || !out || !statusEl || !logBox) {
        appendLog(["❌ Missing UI elements (check IDs in ui.html)."]);
        return;
    }

    // handshake — ask code to reply
    setStatus("Connecting…");
    send({ type: "ping" });

    pullBtn.addEventListener("click", () => {
        setStatus("Pulling variables…");
        send({ type: "pull-variables", collection: "YY_web" });
    });

    resizeBtn.addEventListener("click", () => {
        const w = parseInt(wEl.value || "980", 10);
        const h = parseInt(hEl.value || "620", 10);
        setStatus(`Resizing to ${w}×${h}…`);
        send({ type: "resize-ui", width: w, height: h });
    });

    (window as any).onmessage = (e: MessageEvent) => {
        const msg = (e.data && (e.data as any).pluginMessage) || null;
        if (!msg) return;
        log("← pluginMessage", msg);

        if (msg.type === "ready")  { setStatus("Connected"); return; }
        if (msg.type === "pong")   { setStatus("Loaded"); return; }
        if (msg.type === "echo")   { appendLog(["echo from code"]); return; }

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

// Run now or after DOM is ready (covers both cases)
if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
