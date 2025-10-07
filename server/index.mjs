import express from "express";
const app = express();
app.use(express.json());


const PASSCODE = process.env.FIGMA_PASSCODE || "dev-pass";


// In-memory rules example; swap for a DB if you like
let rules = [
    {
        name: "Normalize Cards",
        match: { nameRegex: "(?i)card|tile" },
        set: { layoutMode: "VERTICAL", itemSpacing: 12, padding: { top: 24, right: 24, bottom: 24, left: 24 } }
    }
];


app.get("/rules", (req, res) => { res.json(rules); });
app.post("/rules", (req, res) => { rules = Array.isArray(req.body) ? req.body : rules; res.json({ ok: true, count: rules.length }); });


// Figma webhook endpoint — add this URL when creating the webhook
app.post("/figma/webhook", (req, res) => {
    const { passcode, event_type, file_key } = req.body || {};
    if (passcode !== PASSCODE) return res.status(400).send("bad passcode");
    res.status(200).send("ok");
    console.log("▶️", event_type, file_key);
// Optional: adjust rules based on event_type, or enqueue work for CI, etc.
});


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Webhook server listening on :${port}`));