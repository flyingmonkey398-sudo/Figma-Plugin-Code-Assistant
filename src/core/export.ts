// src/core/export.ts
// Export current file variables from a specific collection (e.g. "YY_web")
// with per-mode values collapsed to a single value if identical.

export function exportTokenSchemaFromCollection(collectionName = "YY_web") {
    const out: any = { meta: {}, tokens: {} };

    const collections = figma.variables.getLocalVariableCollections();
    const coll = collections.find(c => c.name === collectionName);
    if (!coll) return { meta: { collection: collectionName, modes: [] }, tokens: {} };

    const modes = coll.modes; // [{name,modeId}, ...]
    out.meta.collection = coll.name;
    out.meta.modes = modes.map(m => m.name);

    const allVars = figma.variables.getLocalVariables().filter(v => v.variableCollectionId === coll.id);

    const rgbToHex = (c: RGB) => {
        const n = (x: number) => Math.round((x ?? 0) * 255).toString(16).padStart(2, "0");
        return `#${n(c.r)}${n(c.g)}${n(c.b)}`.toUpperCase();
    };

    const normalize = (type: VariableResolvedDataType, val: any) => {
        if (type === "COLOR" && val && typeof val === "object" && "r" in val) return rgbToHex(val as RGB);
        if (type === "FLOAT") return typeof val === "number" ? `${val}px` : String(val);
        return val;
    };

    const setDeep = (root: any, path: string[], value: any) => {
        let cur = root;
        for (let i = 0; i < path.length; i++) {
            const k = path[i];
            if (i === path.length - 1) cur[k] = { value };
            else cur = (cur[k] ??= {});
        }
    };

    for (const v of allVars) {
        const perMode: Record<string, any> = {};
        for (const m of modes) {
            const raw = v.valuesByMode?.[m.modeId];
            if (raw !== undefined) perMode[m.name] = normalize(v.resolvedType, raw);
        }
        const vals = Object.values(perMode);
        const allSame = vals.length > 0 && vals.every(x => JSON.stringify(x) === JSON.stringify(vals[0]));
        const finalValue = allSame ? vals[0] : perMode;

        const path = v.name.split("/"); // e.g. "main/wireframe_color1"
        setDeep(out.tokens, path, finalValue);
    }

    return out;
}
