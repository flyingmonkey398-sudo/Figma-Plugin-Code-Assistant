import { exportVariablesJSON, exportSelectionJSON, exportDocumentJSON } from "./core/export";

figma.showUI(__html__, { width: 820, height: 520 });

figma.ui.onmessage = async (msg: any) => {
    try {
        if (msg.type === "sync-tokens") {
            // TODO: call your existing sync
            figma.notify("✅ Tokens synced");
            figma.ui.postMessage({ type: "notify", text: "Tokens synced" });
            return;
        }

        if (msg.type === "generate-screens") {
            // TODO: call your generate
            figma.notify("🧱 Screens generated");
            figma.ui.postMessage({ type: "notify", text: "Screens generated" });
            return;
        }

        if (msg.type === "update-screens") {
            // TODO: call your update
            figma.notify("♻️ Screens updated");
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
