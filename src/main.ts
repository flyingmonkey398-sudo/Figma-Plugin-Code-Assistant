import { exportVariablesJSON, exportSelectionJSON, exportDocumentJSON } from "./core/export";
// existing imports: syncTokens, generateOrUpdateScreens, etc.

figma.ui.onmessage = async (msg: any) => {
    try {
        if (msg.type === "sync-tokens") {
            // ... your existing sync (notify on success)
            figma.notify("✅ Tokens synced");
            figma.ui.postMessage({ type: "notify", text: "Tokens synced" });
            return;
        }
        if (msg.type === "generate-screens" || msg.type === "update-screens") {
            // ... your existing generate/update
            figma.notify(msg.type === "generate-screens" ? "🧱 Screens generated" : "♻️ Screens updated");
            figma.ui.postMessage({ type: "notify", text: "Screens updated" });
            return;
        }

        if (msg.type === "export-variables") {
            const data = exportVariablesJSON();
            figma.ui.postMessage({ type: "export-result", payload: data });
            figma.notify("📤 Variables exported");
            return;
        }
        if (msg.type === "export-selection") {
            const data = exportSelectionJSON({ onlyFrames: true, maxDepth: 3 });
            figma.ui.postMessage({ type: "export-result", payload: data });
            figma.notify("📤 Selection exported");
            return;
        }
        if (msg.type === "export-document") {
            const data = exportDocumentJSON({ onlyFrames: true, maxDepth: 2, maxChildren: 300 });
            figma.ui.postMessage({ type: "export-result", payload: data });
            figma.notify("📤 Document exported");
            return;
        }
    } catch (e: any) {
        figma.notify(`⚠️ ${e?.message || e}`);
        figma.ui.postMessage({ type: "notify", text: `Error: ${e?.message || e}` });
    }
};
