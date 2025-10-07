"use strict";

// src/core/export.ts
function exportVariablesJSON() {
  var _a;
  const result = { collections: [] };
  const collections = figma.variables.getLocalVariableCollections();
  const allVars = figma.variables.getLocalVariables();
  for (const coll of collections) {
    const entry = {
      id: coll.id,
      name: coll.name,
      modes: coll.modes.map((m) => ({ id: m.modeId, name: m.name })),
      variables: []
    };
    for (const v of allVars) {
      if (v.variableCollectionId !== coll.id) continue;
      const perMode = {};
      for (const m of coll.modes) {
        const val = (_a = v.valuesByMode) == null ? void 0 : _a[m.modeId];
        if (val !== void 0) perMode[m.name] = normalizeValue(v.resolvedType, val);
      }
      entry.variables.push({
        id: v.id,
        name: v.name,
        type: v.resolvedType,
        valuesByMode: perMode
      });
    }
    result.collections.push(entry);
  }
  return result;
}
function exportSelectionJSON(opts) {
  const options = withDefaults(opts);
  const sel = figma.currentPage.selection.filter((n) => filterNode(n, options));
  return sel.map((n) => serializeNode(n, options, 0));
}
function exportDocumentJSON(opts) {
  const options = withDefaults(opts);
  const frames = figma.currentPage.findAll((n) => filterNode(n, options));
  return frames.map((n) => serializeNode(n, options, 0));
}
function withDefaults(opts) {
  var _a, _b, _c, _d, _e, _f;
  return {
    onlyFrames: (_a = opts == null ? void 0 : opts.onlyFrames) != null ? _a : true,
    maxChildren: Math.max(0, (_b = opts == null ? void 0 : opts.maxChildren) != null ? _b : 200),
    maxDepth: Math.max(0, (_c = opts == null ? void 0 : opts.maxDepth) != null ? _c : 3),
    includePrototype: (_d = opts == null ? void 0 : opts.includePrototype) != null ? _d : true,
    includeTextContent: (_e = opts == null ? void 0 : opts.includeTextContent) != null ? _e : true,
    includeBindings: (_f = opts == null ? void 0 : opts.includeBindings) != null ? _f : true
  };
}
function filterNode(n, options) {
  if (n.type === "PAGE") return false;
  if (!("visible" in n) || !n.visible) return false;
  if (!options.onlyFrames) return "type" in n;
  return n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE";
}
function serializeNode(n, options, depth) {
  const base = {
    id: n.id,
    name: n.name,
    type: n.type,
    x: "x" in n ? n.x : void 0,
    y: "y" in n ? n.y : void 0,
    width: "width" in n ? n.width : void 0,
    height: "height" in n ? n.height : void 0,
    rotation: "rotation" in n ? n.rotation : void 0,
    layout: pickLayout(n),
    fills: pickPaints(n.fills),
    strokes: pickPaints(n.strokes),
    effects: pickEffects(n.effects),
    cornerRadius: n.cornerRadius,
    constraints: n.constraints,
    opacity: n.opacity,
    visible: n.visible,
    locked: n.locked
  };
  if (options.includeBindings) base.bindings = pickBindings(n);
  if (options.includeTextContent && n.type === "TEXT") base.characters = n.characters;
  if (options.includePrototype) base.prototype = pickPrototype(n);
  if ("children" in n && depth < options.maxDepth) {
    const kids = n.children;
    base.children = [];
    let count = 0;
    for (const c of kids) {
      if (!("visible" in c) || !c.visible) continue;
      base.children.push(serializeNode(c, options, depth + 1));
      if (++count >= options.maxChildren) {
        base.truncated = true;
        break;
      }
    }
  }
  return compact(base);
}
function pickLayout(n) {
  const k = {};
  if ("layoutMode" in n) {
    k.layoutMode = n.layoutMode;
    k.primaryAxisSizingMode = n.primaryAxisSizingMode;
    k.counterAxisSizingMode = n.counterAxisSizingMode;
    k.itemSpacing = n.itemSpacing;
    k.padding = {
      top: n.paddingTop,
      right: n.paddingRight,
      bottom: n.paddingBottom,
      left: n.paddingLeft
    };
    k.counterAxisAlignItems = n.counterAxisAlignItems;
    k.primaryAxisAlignItems = n.primaryAxisAlignItems;
  }
  if ("layoutGrids" in n) k.layoutGrids = n.layoutGrids;
  return compact(k);
}
function pickPaints(paints) {
  if (!paints || paints === figma.mixed) return void 0;
  return paints.map((p) => {
    var _a, _b;
    if (p.type === "SOLID") {
      const s = p;
      const colorHex = rgbToHex(s.color);
      const bound = (_a = s.boundVariables) == null ? void 0 : _a.color;
      return compact({ type: "SOLID", hex: colorHex, opacity: s.opacity, variableId: bound });
    }
    if (p.type === "GRADIENT_LINEAR" || p.type === "GRADIENT_RADIAL") {
      return { type: p.type, gradientStops: (_b = p.gradientStops) == null ? void 0 : _b.length };
    }
    return { type: p.type };
  });
}
function pickEffects(effects) {
  if (!effects || effects === figma.mixed) return void 0;
  return effects.map((e) => ({ type: e.type, radius: e.radius, spread: e.spread }));
}
function pickBindings(n) {
  var _a;
  const binds = {};
  if ("boundVariables" in n) binds.node = (_a = n.boundVariables) != null ? _a : void 0;
  return compact(binds);
}
function pickPrototype(n) {
  const p = {};
  if ("flowStartingPoints" in figma.currentPage && figma.currentPage.flowStartingPoints) {
  }
  const interactions = n.reactions || n.prototypeDevice;
  if (interactions) p.reactions = interactions;
  return compact(p);
}
function rgbToHex(c) {
  var _a, _b, _c;
  const r = Math.round(((_a = c.r) != null ? _a : 0) * 255);
  const g = Math.round(((_b = c.g) != null ? _b : 0) * 255);
  const b = Math.round(((_c = c.b) != null ? _c : 0) * 255);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function normalizeValue(type, val) {
  if (type === "COLOR" && val && typeof val === "object" && "r" in val) return rgbToHex(val);
  return val;
}
function compact(o) {
  const out = {};
  for (const k in o) if (o[k] !== void 0) out[k] = o[k];
  return out;
}

// src/main.ts
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === "sync-tokens") {
      figma.notify("\u2705 Tokens synced");
      figma.ui.postMessage({ type: "notify", text: "Tokens synced" });
      return;
    }
    if (msg.type === "generate-screens" || msg.type === "update-screens") {
      figma.notify(msg.type === "generate-screens" ? "\u{1F9F1} Screens generated" : "\u267B\uFE0F Screens updated");
      figma.ui.postMessage({ type: "notify", text: "Screens updated" });
      return;
    }
    if (msg.type === "export-variables") {
      const data = exportVariablesJSON();
      figma.ui.postMessage({ type: "export-result", payload: data });
      figma.notify("\u{1F4E4} Variables exported");
      return;
    }
    if (msg.type === "export-selection") {
      const data = exportSelectionJSON({ onlyFrames: true, maxDepth: 3 });
      figma.ui.postMessage({ type: "export-result", payload: data });
      figma.notify("\u{1F4E4} Selection exported");
      return;
    }
    if (msg.type === "export-document") {
      const data = exportDocumentJSON({ onlyFrames: true, maxDepth: 2, maxChildren: 300 });
      figma.ui.postMessage({ type: "export-result", payload: data });
      figma.notify("\u{1F4E4} Document exported");
      return;
    }
  } catch (e) {
    figma.notify(`\u26A0\uFE0F ${(e == null ? void 0 : e.message) || e}`);
    figma.ui.postMessage({ type: "notify", text: `Error: ${(e == null ? void 0 : e.message) || e}` });
  }
};
