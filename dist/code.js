"use strict";

// src/core/export.ts
function exportTokenSchemaFromCollection(collectionName = "YY_web") {
  var _a;
  const out = { meta: {}, tokens: {} };
  const collections = figma.variables.getLocalVariableCollections();
  const coll = collections.find((c) => c.name === collectionName);
  if (!coll) return { meta: { collection: collectionName, modes: [] }, tokens: {} };
  const modes = coll.modes;
  out.meta.collection = coll.name;
  out.meta.modes = modes.map((m) => m.name);
  const allVars = figma.variables.getLocalVariables().filter((v) => v.variableCollectionId === coll.id);
  const rgbToHex = (c) => {
    const n = (x) => Math.round((x != null ? x : 0) * 255).toString(16).padStart(2, "0");
    return `#${n(c.r)}${n(c.g)}${n(c.b)}`.toUpperCase();
  };
  const normalize = (type, val) => {
    if (type === "COLOR" && val && typeof val === "object" && "r" in val) return rgbToHex(val);
    if (type === "FLOAT") return typeof val === "number" ? `${val}px` : String(val);
    return val;
  };
  const setDeep = (root, path, value) => {
    var _a2;
    let cur = root;
    for (let i = 0; i < path.length; i++) {
      const k = path[i];
      if (i === path.length - 1) cur[k] = { value };
      else cur = (_a2 = cur[k]) != null ? _a2 : cur[k] = {};
    }
  };
  for (const v of allVars) {
    const perMode = {};
    for (const m of modes) {
      const raw = (_a = v.valuesByMode) == null ? void 0 : _a[m.modeId];
      if (raw !== void 0) perMode[m.name] = normalize(v.resolvedType, raw);
    }
    const vals = Object.values(perMode);
    const allSame = vals.length > 0 && vals.every((x) => JSON.stringify(x) === JSON.stringify(vals[0]));
    const finalValue = allSame ? vals[0] : perMode;
    const path = v.name.split("/");
    setDeep(out.tokens, path, finalValue);
  }
  return out;
}

// src/main.ts
figma.showUI(__html__, { width: 980, height: 620 });
figma.notify("Plugin booted");
function debug(...args) {
  try {
    figma.ui.postMessage({
      type: "debug",
      lines: args.map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch (_e) {
          return String(a);
        }
      }),
      ts: Date.now()
    });
  } catch (_e) {
  }
  try {
    console.log(...args);
  } catch (_e) {
  }
}
debug("\u{1F50C} plugin booted");
figma.ui.postMessage({ type: "ready" });
figma.ui.onmessage = async (msg) => {
  var _a;
  try {
    debug("[code] got", msg == null ? void 0 : msg.type);
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
        figma.notify("\u{1F4E5} Variables pulled");
        debug("[code] pulled", { count: Object.keys((_a = data == null ? void 0 : data.tokens) != null ? _a : {}).length });
        return;
      }
      case "resize-ui": {
        const w = Math.max(240, Math.min(1600, Number(msg.width) || 980));
        const h = Math.max(200, Math.min(1200, Number(msg.height) || 620));
        figma.ui.resize(w, h);
        debug("[code] resized UI \u2192", `${w}\xD7${h}`);
        return;
      }
    }
  } catch (e) {
    debug("[code] error", (e == null ? void 0 : e.message) || e);
    figma.notify(`\u26A0\uFE0F ${(e == null ? void 0 : e.message) || e}`);
    figma.ui.postMessage({ type: "notify", text: `Error: ${(e == null ? void 0 : e.message) || e}` });
  }
};
//# sourceMappingURL=code.js.map
