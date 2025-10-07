export type Rule = {
    name?: string; // display
    match?: { nameRegex?: string; type?: SceneNode["type"] };
    set?: {
        layoutMode?: "VERTICAL" | "HORIZONTAL" | "NONE";
        itemSpacing?: number;
        padding?: { top?: number; right?: number; bottom?: number; left?: number };
        sizing?: { primaryAxis?: "FIXED" | "AUTO"; counterAxis?: "FIXED" | "AUTO" };
        align?: {
            primary?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
            counter?: "MIN" | "CENTER" | "MAX";
        };
    };
};

export function normalizeSpacingInSelection(
    padding = 24,
    item = 12,
    layout: "VERTICAL" | "HORIZONTAL" = "VERTICAL"
) {
    const nodes = figma.currentPage.selection.filter(
        (n): n is FrameNode => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE"
    );
    if (!nodes.length) figma.notify("No frames selected — adjusting all visible frames on page");
    const targets: SceneNode[] = nodes.length ? nodes : figma.currentPage.findAll(n => "layoutMode" in n);
    let changed = 0;
    for (const node of targets) {
        const f = node as any;
        if (f.layoutMode === "NONE") f.layoutMode = layout;
        if (typeof f.paddingTop === "number") {
            f.paddingTop = padding;
            f.paddingRight = padding;
            f.paddingBottom = padding;
            f.paddingLeft = padding;
        }
        if (typeof f.itemSpacing === "number") f.itemSpacing = item;
        changed++;
    }
    figma.notify(`✅ Updated spacing on ${changed} node(s)`);
}

export function applyRulesToPage(rules: Rule[]) {
    const frames = figma.currentPage.findAll(n => "layoutMode" in n) as SceneNode[];
    let touched = 0;
    for (const n of frames) {
        for (const r of rules) {
            if (!matches(n, r.match)) continue;
            if (r.set) {
                setProps(n, r.set);
                touched++;
            }
        }
    }
    figma.notify(`✅ Applied ${rules.length} rule(s) to ${touched} node(s)`);
}

function matches(n: SceneNode, m?: Rule["match"]) {
    if (!m) return true;
    if (m.type && n.type !== m.type) return false;
    if (m.nameRegex) {
        try {
            if (!new RegExp(m.nameRegex).test(n.name)) return false;
        } catch (e) {
            return false;
        }
    }
    return true;
}

function setProps(n: SceneNode, s: NonNullable<Rule["set"]>) {
    const f = n as any;
    if (s.layoutMode && "layoutMode" in f) f.layoutMode = s.layoutMode;
    if (s.itemSpacing != null && "itemSpacing" in f) f.itemSpacing = s.itemSpacing;
    if (s.padding && "paddingTop" in f) {
        const p = s.padding;
        if (p.top != null) f.paddingTop = p.top;
        if (p.right != null) f.paddingRight = p.right;
        if (p.bottom != null) f.paddingBottom = p.bottom;
        if (p.left != null) f.paddingLeft = p.left;
    }
    if (s.sizing) {
        if (s.sizing.primaryAxis && "primaryAxisSizingMode" in f) f.primaryAxisSizingMode = s.sizing.primaryAxis;
        if (s.sizing.counterAxis && "counterAxisSizingMode" in f) f.counterAxisSizingMode = s.sizing.counterAxis;
    }
    if (s.align) {
        if (s.align.primary && "primaryAxisAlignItems" in f) f.primaryAxisAlignItems = s.align.primary;
        if (s.align.counter && "counterAxisAlignItems" in f) f.counterAxisAlignItems = s.align.counter;
    }
}
