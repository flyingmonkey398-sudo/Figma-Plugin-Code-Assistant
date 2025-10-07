// index.mjs — Minimal MCP client for Figma Desktop (Node ≥18)
// No deps. Works with “session-required” and “auto-init” builds.

const BASE = process.env.FIGMA_MCP_URL || "http://127.0.0.1:3845/mcp";

const headersJSON = {
    "Accept": "application/json, text/event-stream",
    "Content-Type": "application/json"
};

async function tryInitialize() {
    // Some builds are very picky about the init shape/headers.
    // We'll try 5 variants: minimal, clientInfo, clientName, SSE-without-body, and header-based.
    const variants = [
        // V1: minimal JSON-RPC (no params)
        {
            body: { jsonrpc:"2.0", id:"init-1", method:"initialize" },
            headers: { "Accept":"application/json, text/event-stream", "Content-Type":"application/json" }
        },
        // V2: clientInfo + protocolVersion
        {
            body: { jsonrpc:"2.0", id:"init-2", method:"initialize",
                params:{ clientInfo:{ name:"NodeClient", version:"1.0.0" }, protocolVersion:"2024-11-05", capabilities:{} } },
            headers: { "Accept":"application/json, text/event-stream", "Content-Type":"application/json" }
        },
        // V3: clientName/clientVersion
        {
            body: { jsonrpc:"2.0", id:"init-3", method:"initialize",
                params:{ clientName:"NodeClient", clientVersion:"1.0.0" } },
            headers: { "Accept":"application/json, text/event-stream", "Content-Type":"application/json" }
        },
        // V4: POST with NO BODY, SSE accept (some builds create session and return mcp-session-id)
        {
            raw: true,
            headers: { "Accept":"text/event-stream" }  // no Content-Type, no body
        },
        // V5: header-declared protocol version + empty JSON body
        {
            body: { jsonrpc:"2.0", id:"init-5", method:"initialize" },
            headers: { "Accept":"application/json, text/event-stream", "Content-Type":"application/json", "MCP-Protocol-Version":"2024-11-05" }
        }
    ];

    for (const v of variants) {
        try {
            const res = await fetch(BASE, {
                method: "POST",
                headers: v.headers,
                body: v.raw ? undefined : JSON.stringify(v.body)
            });

            const lower = {};
            for (const [k, val] of res.headers) lower[k.toLowerCase()] = val;

            let sid = lower["mcp-session-id"] || lower["x-session-id"] || null;
            let json = null;
            if (res.headers.get("content-type")?.includes("application/json")) {
                try { json = await res.json(); } catch {}
            }

            if (!sid && json) sid = json?.result?.sessionId || json?.sessionId || null;

            if (res.ok && sid) {
                log(`✅ initialize OK — sessionId: ${sid}`);
                return sid;
            } else {
                const msg = json?.error?.message || res.statusText;
                log(`init variant failed (${res.status}) with headers ${JSON.stringify(lower)}: ${msg}`);
            }
        } catch (e) {
            log(`init variant threw: ${e?.message || e}`);
        }
    }
    return null;
}


async function openStream(sessionId) {
    const candidates = [
        // 1) GET /mcp with header
        { method: "GET", path: "/mcp", headers: (sid) => ({ "Accept": "text/event-stream", "Cache-Control": "no-cache", ...(sid ? { "X-Session-Id": sid } : {}) }) },
        // 2) GET /mcp?sessionId=...
        { method: "GET", path: (sid) => `/mcp${sid ? `?sessionId=${encodeURIComponent(sid)}` : ""}`, headers: () => ({ "Accept": "text/event-stream", "Cache-Control": "no-cache" }) },
        // 3) GET /mcp/stream with header
        { method: "GET", path: "/mcp/stream", headers: (sid) => ({ "Accept": "text/event-stream", "Cache-Control": "no-cache", ...(sid ? { "X-Session-Id": sid } : {}) }) },
        // 4) GET /mcp/stream?sessionId=...
        { method: "GET", path: (sid) => `/mcp/stream${sid ? `?sessionId=${encodeURIComponent(sid)}` : ""}`, headers: () => ({ "Accept": "text/event-stream", "Cache-Control": "no-cache" }) },
        // 5) POST /mcp (some builds open SSE on POST)
        { method: "POST", path: "/mcp", headers: () => ({ "Accept": "text/event-stream" }), body: "" },
    ];

    for (const c of candidates) {
        try {
            const url = new URL(typeof c.path === "function" ? c.path(sessionId) : c.path, BASE);
            const res = await fetch(url, {
                method: c.method,
                headers: c.headers(sessionId),
                body: c.body ?? undefined
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                console.log(`stream candidate ${c.method} ${url.pathname}${url.search} → ${res.status}`, text.slice(0, 200));
                continue; // try next
            }

            const lower = {};
            for (const [k, v] of res.headers) lower[k.toLowerCase()] = v;
            const sid = lower["mcp-session-id"] || sessionId || null;

            console.log(`📡 stream open (HTTP ${res.status}) via ${c.method} ${url.pathname}${url.search} — sessionId: ${sid || "n/a"}`);
            readEventStream(res.body);
            return sid;
        } catch (e) {
            console.log("stream candidate error:", e?.message || e);
        }
    }

    throw new Error("No stream endpoint accepted the session. Server may require an IDE MCP client.");
}


async function rpc(sessionId, method, params = {}, id = randomId()) {
    const body = {
        jsonrpc: "2.0",
        id,
        method,
        params: { sessionId, ...(params || {}) }
    };

    const res = await fetch(BASE, {
        method: "POST",
        headers: {
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
            // 👇 some builds REJECT calls unless the session is also in a header
            ...(sessionId ? { "X-Session-Id": sessionId } : {}),
            "MCP-Protocol-Version": "2024-11-05"
        },
        body: JSON.stringify(body)
    });

    const text = await res.text();
    try { return JSON.parse(text); } catch { return { status: res.status, body: text }; }
}


// --- SSE reader (simple) ---
async function readEventStream(readable) {
    const decoder = new TextDecoder();
    const reader = readable.getReader();
    let buf = "";
    (async () => {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) { log("🔌 stream ended"); break; }
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf("\n\n")) >= 0) {
                const chunk = buf.slice(0, idx);
                buf = buf.slice(idx + 2);
                handleEventChunk(chunk);
            }
        }
    })().catch(e => log("stream error:", e?.message || e));
}

function handleEventChunk(chunk) {
    // Basic SSE format: lines starting with "event:" and "data:"
    const lines = chunk.split(/\r?\n/);
    let event = "message";
    let data = "";
    for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!data) return;
    try {
        const obj = JSON.parse(data);
        log(`📥 [${event}]`, obj);
    } catch {
        log(`📥 [${event}]`, data);
    }
}

// --- tiny REPL to send calls ---
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function log(...args) { console.log(...args); }

function randomId() {
    return Math.random().toString(16).slice(2);
}

async function main() {
    log(`🔗 Figma MCP URL: ${BASE}`);

    // Strategy:
    // 1) Try initialize to get session.
    // 2) If that fails, try opening SSE without it to see if server auto-assigns (some builds do).
    // 3) If that 400s, bail with a clear error message.
    let sessionId = await tryInitialize();

    if (!sessionId) {
        console.log("No session from initialize; trying stream-less RPC (replies will come on the POST).");
    } else {
        try {
            await openStream(sessionId);
        } catch (e) {
            console.log("⚠️ Stream couldn’t open:", e.message);
            console.log("→ Fallback: you can still type RPCs; responses will print below.");
        }
    }


    if (!sessionId) {
        log("⚠️ No session id exposed by headers; RPC may still work if the server bound the stream implicitly.");
    } else {
        log("✅ Ready. Type commands (e.g. `tools/list`, `resources/list`, `prompts/list`).");
    }

    const rl = readline.createInterface({ input, output });
    for (;;) {
        const line = (await rl.question("> ")).trim();
        if (!line) continue;
        if (line === "exit" || line === "quit") break;

        // parse: method [JSON params]
        // example: tools/list
        // example: resources/get {"uri":"figma://file/..."}
        let method = line;
        let params = {};
        const space = line.indexOf(" ");
        if (space > 0) {
            method = line.slice(0, space).trim();
            const p = line.slice(space + 1).trim();
            if (p) {
                try { params = JSON.parse(p); }
                catch { log("⚠️ params must be valid JSON"); continue; }
            }
        }
        try {
            const res = await rpc(sessionId, method, params);
            log("📤 RPC result:", res);
        } catch (e) {
            log("❌ RPC error:", e?.message || e);
        }
    }

    log("bye!");
    process.exit(0);
}

main().catch(e => {
    console.error("fatal:", e);
    process.exit(1);
});
