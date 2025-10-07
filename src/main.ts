// src/main.ts
import { exportTokenSchemaFromCollection } from "./core/export";

figma.showUI(__html__, { width: 980, height: 620 });

figma.notify("Plugin booted");


/** Mirror logs into the UI panel and also to the code console. */
function debug(...args: any[]) {
    try {
        figma.ui.postMessage({
            type: "debug",
            lines: args.map(a => {
                if (typeof a === "string") return a;
                try { return JSON.stringify(a); } catch (_e) { return String(a); }
            }),
            ts: Date.now(),
        });
    } catch (_e) {}
    try { console.log(...args); } catch (_e) {}
}

debug("🔌 plugin booted");
figma.ui.postMessage({ type: "ready" });

figma.ui.onmessage = async (msg: any) => {
    try {
        debug("[code] got", msg?.type);

        switch (msg.type) {
            case "ping": {
                figma.ui.postMessage({ type: "pong" });
                figma.ui.postMessage({ type: "echo", text: "hello-from-code" });

                const json = exportTokenSchemaFromCollection("YY_web");
                figma.ui.postMessage({ type: "variables:pulled", json });
                debug("[code] sent variables:pulled (bootstrap)");
                return;
            }

            case "pull-variables": {
                const data = exportTokenSchemaFromCollection(msg.collection || "YY_web");
                figma.ui.postMessage({ type: "variables:pulled", json: data });
                figma.notify("📥 Variables pulled");
                debug("[code] pulled", { count: Object.keys(data?.tokens ?? {}).length });
                return;
            }

            case "resize-ui": {
                const w = Math.max(240, Math.min(1600, Number(msg.width) || 980));
                const h = Math.max(200, Math.min(1200, Number(msg.height) || 620));
                figma.ui.resize(w, h);
                debug("[code] resized UI →", `${w}×${h}`);
                return;
            }
        }
    } catch (e: any) {
        debug("[code] error", e?.message || e);
        figma.notify(`⚠️ ${e?.message || e}`);
        figma.ui.postMessage({ type: "notify", text: `Error: ${e?.message || e}` });
    }
};
