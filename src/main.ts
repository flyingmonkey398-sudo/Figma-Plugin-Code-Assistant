import { exportVariablesJSON, exportSelectionJSON, exportDocumentJSON } from "./core/export";
import { normalizeSpacingInSelection, applyRulesToPage, type Rule } from "./actions";

figma.showUI(__html__, { width: 980, height: 620 });

figma.ui.onmessage = async (msg: any) => {
    try {
        switch (msg.type) {
            case "sync-tokens":
                figma.notify("✅ Tokens synced");
                figma.ui.postMessage({ type: "notify", text: "Tokens synced" });
                return;

            case "export-variables": {
                const data = exportVariablesJSON();
                figma.ui.postMessage({ type: "export-result", payload: data });
                figma.notify("📤 Variables exported");
                return;
            }

            case "export-selection": {
                const data = exportSelectionJSON({ onlyFrames: true, maxDepth: 4 });
                figma.ui.postMessage({ type: "export-result", payload: data });
                figma.notify("📤 Selection exported");
                return;
            }

            case "export-document": {
                const data = exportDocumentJSON({ onlyFrames: true, maxDepth: 3, maxChildren: 500 });
                figma.ui.postMessage({ type: "export-result", payload: data });
                figma.notify("📤 Document exported");
                return;
            }

            case "normalize-spacing": {
                normalizeSpacingInSelection(msg.padding ?? 24, msg.itemSpacing ?? 12, msg.layout ?? "VERTICAL");
                return;
            }

            case "apply-rules": {
                const rules: Rule[] = msg.rules || [];
                applyRulesToPage(rules);
                return;
            }

            case "fetch-and-apply-rules": {
                const { serverUrl, token } = msg;
                const res = await fetch(`${serverUrl.replace(/\/$/, "")}/rules`, {
                    headers: { Authorization: token ? `Bearer ${token}` : "" },
                });
                if (!res.ok) throw new Error(`Failed to GET /rules (${res.status})`);
                const rules: Rule[] = await res.json();
                applyRulesToPage(rules);
                return;
            }

            default:
                return;
        }
    } catch (e: any) {
        figma.notify(`⚠️ ${e?.message || e}`);
        figma.ui.postMessage({ type: "notify", text: `Error: ${e?.message || e}` });
    }
};
