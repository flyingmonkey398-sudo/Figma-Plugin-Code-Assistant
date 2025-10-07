type ExportOptions = {
    onlyFrames?: boolean;     // default true: export frames only
    maxChildren?: number;     // per node
    maxDepth?: number;        // nesting depth
    includePrototype?: boolean;
    includeTextContent?: boolean;
    includeBindings?: boolean; // variable bindings
};

export function exportVariablesJSON() {
    const result: any = { collections: [] };
    const collections = figma.variables.getLocalVariableCollections();
    const allVars = figma.variables.getLocalVariables();

    for (const coll of collections) {
        const entry: any = {
            id: coll.id,
            name: coll.name,
            modes: coll.modes.map(m => ({ id: m.modeId, name: m.name })),
            variables: []
        };
        for (const v of allVars) {
            if (v.variableCollectionId !== coll.id) continue;
            const perMode: Record<string, any> = {};
            for (const m of coll.modes) {
                const val = v.valuesByMode?.[m.modeId];
                if (val !== undefined) perMode[m.name] = normalizeValue(v.resolvedType, val);
            }
            entry.variables.push({
                id: v.id, name: v.name, type: v.resolvedType, valuesByMode: perMode
            });
        }
        result.collections.push(entry);
    }
    return result;
}

export function exportSelectionJSON(opts?: Partial<ExportOptions>) {
    const options = withDefaults(opts);
    const sel = figma.currentPage.selection.filter(n => filterNode(n, options));
    return sel.map(n => serializeNode(n as SceneNode, options, 0));
}

export function exportDocumentJSON(opts?: Partial<ExportOptions>) {
    const options = withDefaults(opts);
    const frames = figma.currentPage
        .findAll(n => filterNode(n, options)) as SceneNode[];
    return frames.map(n => serializeNode(n, options, 0));
}

// ---------- helpers ----------

function withDefaults(opts?: Partial<ExportOptions>): Required<ExportOptions> {
    return {
        onlyFrames: opts?.onlyFrames ?? true,
        maxChildren: Math.max(0, opts?.maxChildren ?? 200),
        maxDepth: Math.max(0, opts?.maxDepth ?? 3),
        includePrototype: opts?.includePrototype ?? true,
        includeTextContent: opts?.includeTextContent ?? true,
        includeBindings: opts?.includeBindings ?? true,
    };
}

function filterNode(n: BaseNode, options: Required<ExportOptions>) {
    if (n.type === "PAGE") return false;
    if (!("visible" in n) || !(n as any).visible) return false;
    if (!options.onlyFrames) return "type" in n;
    return n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE";
}

function serializeNode(n: SceneNode, options: Required<ExportOptions>, depth: number): any {
    const base: any = {
        id: n.id,
        name: n.name,
        type: n.type,
        x: "x" in n ? (n as any).x : undefined,
        y: "y" in n ? (n as any).y : undefined,
        width: "width" in n ? (n as any).width : undefined,
        height: "height" in n ? (n as any).height : undefined,
        rotation: "rotation" in n ? (n as any).rotation : undefined,
        layout: pickLayout(n),
        fills: pickPaints((n as any).fills),
        strokes: pickPaints((n as any).strokes),
        effects: pickEffects((n as any).effects),
        cornerRadius: (n as any).cornerRadius,
        constraints: (n as any).constraints,
        opacity: (n as any).opacity,
        visible: (n as any).visible,
        locked: (n as any).locked,
    };

    if (options.includeBindings) base.bindings = pickBindings(n);
    if (options.includeTextContent && n.type === "TEXT") base.characters = (n as TextNode).characters;
    if (options.includePrototype) base.prototype = pickPrototype(n);

    if ("children" in n && depth < options.maxDepth) {
        const kids = (n as any).children as ReadonlyArray<SceneNode>;
        base.children = [];
        let count = 0;
        for (const c of kids) {
            if (!("visible" in c) || !(c as any).visible) continue;
            base.children.push(serializeNode(c, options, depth + 1));
            if (++count >= options.maxChildren) { base.truncated = true; break; }
        }
    }
    return compact(base);
}

function pickLayout(n: SceneNode) {
    const k: any = {};
    if ("layoutMode" in n) {
        k.layoutMode = (n as any).layoutMode; // VERTICAL | HORIZONTAL | NONE
        k.primaryAxisSizingMode = (n as any).primaryAxisSizingMode;
        k.counterAxisSizingMode = (n as any).counterAxisSizingMode;
        k.itemSpacing = (n as any).itemSpacing;
        k.padding = {
            top: (n as any).paddingTop,
            right: (n as any).paddingRight,
            bottom: (n as any).paddingBottom,
            left: (n as any).paddingLeft
        };
        k.counterAxisAlignItems = (n as any).counterAxisAlignItems;
        k.primaryAxisAlignItems = (n as any).primaryAxisAlignItems;
    }
    if ("layoutGrids" in n) k.layoutGrids = (n as any).layoutGrids;
    return compact(k);
}

function pickPaints(paints: Paint[] | PluginAPI["mixed"]) {
    if (!paints || paints === figma.mixed) return undefined;
    return (paints as Paint[]).map(p => {
        if (p.type === "SOLID") {
            const s = p as SolidPaint;
            const colorHex = rgbToHex(s.color);
            const bound = (s as any).boundVariables?.color;
            return compact({ type: "SOLID", hex: colorHex, opacity: s.opacity, variableId: bound });
        }
        if (p.type === "GRADIENT_LINEAR" || p.type === "GRADIENT_RADIAL") {
            return { type: p.type, gradientStops: (p as any).gradientStops?.length };
        }
        return { type: p.type };
    });
}

function pickEffects(effects: readonly Effect[] | PluginAPI["mixed"]) {
    if (!effects || effects === figma.mixed) return undefined;
    return effects.map(e => ({ type: e.type, radius: (e as any).radius, spread: (e as any).spread }));
}

function pickBindings(n: SceneNode) {
    const binds: any = {};
    if ("boundVariables" in n) binds.node = (n as any).boundVariables ?? undefined;
    // text fills often carry boundVariables in fills; we already expose per paint above
    return compact(binds);
}

function pickPrototype(n: SceneNode) {
    const p: any = {};
    // limited snapshot to avoid heavy graphs
    if ("flowStartingPoints" in figma.currentPage && figma.currentPage.flowStartingPoints) {
        // page-level; leave out
    }
    // Node-level interactions
    // @ts-ignore access safely
    const interactions = (n as any).reactions || (n as any).prototypeDevice; // reactions is the main one
    if (interactions) p.reactions = interactions;
    return compact(p);
}

function rgbToHex(c: RGB) {
    const r = Math.round((c.r ?? 0) * 255);
    const g = Math.round((c.g ?? 0) * 255);
    const b = Math.round((c.b ?? 0) * 255);
    return "#" + [r,g,b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function normalizeValue(type: VariableResolvedDataType, val: any) {
    if (type === "COLOR" && val && typeof val === "object" && "r" in val) return rgbToHex(val as RGB);
    return val;
}

function compact<T extends object>(o: T): T {
    const out: any = {};
    for (const k in o) if ((o as any)[k] !== undefined) out[k] = (o as any)[k];
    return out;
}
