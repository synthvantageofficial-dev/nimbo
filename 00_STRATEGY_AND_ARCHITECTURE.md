# INSTINCT-STYLE PERSONAL AI AGENT — STRATEGY & ARCHITECTURE v1

**Date:** 2 October 2026
**Founder situation:** Solo, non-technical, ₹0 budget (open-source / free-tier only), Claude Code is the builder.
**Goal:** Build an original, broad personal AI agent — a real business, not a clone of Instinct.
**This doc = our plan.** We edit it as we learn. Code comes *after* we agree on this.

> **The one rule that governs everything below:**
> **Vision is broad. The first thing we ship is narrow.** The broad "handles-your-whole-life" agent is our North Star — but we earn our way there through one sharp wedge that feels magical on day one.

---

## PART A — HONEST REALITY CHECK (read this first)

We are competing in a category where a $10B company (Instinct), Meta, Google, OpenAI and Apple all play. We have no money and no engineering team. So let us be clear-eyed about what is and isn't realistic.

**What we CANNOT realistically do:**
- Match Instinct/Meta on model quality, infra, or phone-call concierge (voice/telephony costs real money — deferred).
- Win by being "a broad agent" out of the gate. Broad = expensive, unreliable, impossible to demo, impossible to maintain solo.
- Spend on frontier LLM APIs at scale.

**What we CAN realistically do, and where we actually win:**
1. **Trust & transparency as the product** — the thing every big player is weakest at. (Details in Part C.)
2. **A narrow wedge done 10x better than ChatGPT/Instinct** — one painful task, flawless.
3. **Product-led distribution** — the Instinct playbook needs ₹0, only a great result + invite loop.
4. **Open-source + free-tier stack** — enough to build a real MVP for one user (you) and a small beta.

**The trap to avoid:** Spending 6 months building a "broad agent" that does 20 things at 40% reliability. Nobody shares a 40% result. We instead do **one thing at 95%** that people screenshot and send to friends. That screenshot is our marketing.

**My recommendation on your "broad" choice:** Keep broad as the *registered company vision and architecture* (we design the system so broad is possible later — see Part E). But **ship a wedge first**. This is not a downgrade of your ambition; it's how ambition survives contact with reality. Instinct did exactly this (started heavy on one area — travel is still >50% of its volume).

---

## PART B — THE THESIS (our North Star)

**The category is shifting from "AI that answers" to "AI that acts and follows through."**

Our product in one line (working draft — brand TBD):

> **"Tell it what you need. It handles it — and shows you exactly what it did."**

The real product is not a chatbot. It is the combination:

**MEMORY + ACTION + TRUST + VERIFICATION + FOLLOW-THROUGH**

Everyone is building MEMORY + ACTION. **Almost nobody is building TRUST + VERIFICATION + FOLLOW-THROUGH well.** That gap is our entire opportunity.

---

## PART C — HOW WE'RE DIFFERENT (the 5 trust pillars)

Instinct's biggest weakness, per the research and press: **too much power, too little verifiability.** Users are nervous. A nervous user does not refer friends. So trust is not just safety — **trust is our distribution.**

Our 5 differentiators (each is a buildable feature, not a slogan):

1. **Action Ledger** — every action gets a plain-English receipt: *what I did, why, what data I used, the evidence, and how to undo it.* This is also our #1 viral asset (shareable proof).
2. **Permission OS** — not one scary "allow everything" switch. Granular, visual capabilities (e.g. "can draft email ✓, can send to family ✓, cannot send to strangers ✗", "can book under ₹X ✓, cannot spend above ✗").
3. **Verify-before-done** — the agent never says "done" without evidence (confirmation page, email, status). A separate "verifier" checks the "doer." No silent lies.
4. **Reversibility & Kill Switch** — risky actions get a rollback plan; one command = STOP EVERYTHING.
5. **User-owned Memory Vault** — you can see, edit, delete, and export everything the agent remembers about you, with the source of each memory. No creepy black box.

**Positioning vs the giants:** They say "trust us, it's powerful." We say **"here is exactly what it did, and you were always in control."** For a product that touches your email, money and calendar, that is the thing that makes a normal person comfortable enough to actually use it — and recommend it.

---

## PART D — THE WEDGE (what we build first)

We need a first task that is: genuinely painful, demo-able, safe-ish, repeatable, and something ChatGPT *cannot* just answer (because it requires multi-step *action*, not just text).

**Candidate wedges (we pick ONE to start):**

| Wedge | Why it's good | Risk |
|---|---|---|
| **Research & Decision Briefs** | "Compare 5 options, check live sources, give me a verified decision table." Pure read/browse — **no money, no sending, low risk.** Easiest to make reliable. Huge "wow". | Low |
| **Subscription & bill hunter** | "Find what I'm paying for, find cancellation routes, prepare the steps." High pain, very shareable. | Medium (touches accounts) |
| **Inbox triage + draft** | "Read my inbox, summarize what needs action, draft replies I approve." Daily habit → retention. | Medium (email access) |
| **Travel/booking research** | Instinct's hottest area. Find best options under constraints + explain trade-offs. | Medium |

**My recommendation: start with "Research & Decision Briefs" as wedge #0.**
Reason: it needs **only browsing + reasoning + the Action Ledger** — zero sending, zero spending, zero credentials. That means (a) we can make it reliable fast, (b) it's safe for a non-technical founder to run, (c) it produces beautiful shareable receipts, and (d) the entire trust/verification architecture gets built and proven on a low-risk task before we ever touch someone's money or email.

Then wedge #1 (adds a messaging channel + inbox read) → wedge #2 (actions with money/sending, full Permission OS). This sequence **builds the hard trust machinery early on safe ground.**

---

## PART E — ARCHITECTURE (designed broad, built narrow)

We design the "control plane" so the broad vision is possible later, but we only *implement* the boxes the wedge needs.

```
                      YOU
                       |
             (text / web chat — voice later)
                       |
                 AGENT GATEWAY
                       |
        +--------------+--------------+
        |              |              |
     MEMORY         PLANNER         POLICY/PERMISSIONS
        |              |              |
        +--------------+--------------+
                       |
                  TOOL BROKER   <-- the ONLY path to real actions
                       |
        +--------------+--------------+
        |              |              |
     WEB/BROWSER    (APIs later)   (PHONE later)
        |
                  VERIFIER  (separate checker)
                       |
              ACTION LEDGER / AUDIT LOG
                       |
                      YOU  (receipt + undo)
```

**Core principle (non-negotiable security rule):**
> **The model NEVER talks directly to real tools.** Everything flows: model → policy check → capability check → sandbox → tool → verify → log. External content (web pages, emails) is treated as **untrusted** and can never issue commands.

**Trust zones (what talks to what):**
- Zone 1: Agent reasoning (the LLM) — smart but *untrusted with authority*.
- Zone 2: Memory (what we know about you).
- Zone 3: Untrusted external content (web/email) — **data, never instructions.**
- Zone 4: Tool Broker — the guard that checks permission before any action.
- Zone 5: Sandbox (isolated browser worker).
- Zone 6: Secrets vault (credentials — the LLM never sees these).
- Zone 7: External services.

**Why this matters for a non-technical founder:** this structure is what stops the agent from (a) getting tricked by a malicious webpage into leaking your data (prompt injection — the #1 real risk), and (b) doing something expensive or irreversible you didn't approve. We build this skeleton even in the tiny MVP.

**Agent loop (MVP version — keep it simple):**
`Request → understand intent → pull relevant memory → classify risk → plan → (if risky: ask you) → do one step in sandbox → observe → verify → log → repeat → final receipt.`

Start with 4 roles only: **Router → Planner → Tool Broker → Verifier.** Add specialist agents (researcher, browser, comms, transaction, memory manager) only when a wedge needs them.

---

## PART E2 — THE AUTONOMY MODEL (core product principle — locked)

**This is NOT an app/SaaS the creator opens and operates. It is an autonomous, always-on agent that works by itself** — while the creator sleeps, travels, or does anything else. The creator does not give manual commands step-by-step; they set goals and the agent runs continuously. *(Manual = nobody pays. Automatic = people pay. This is the whole reason the product has value.)*

This matches how the 2026 frontier agents actually work (verified): **Meta Muse, Grok Bot, OpenAI dots, Gemini Spark, Manus, Instinct** all give the agent **its own cloud computer**, keep tasks **running in the background after the app is closed**, and **ping the user for approval at key moments**.

**Reality of how they do it:**
- Each agent runs in **its own persistent cloud computer / VM** (Muse "Secure VMs", Grok "own persistent cloud computer", Manus "cloud virtual computer").
- **Long-term memory + vector DB** so it remembers progress/voice/goals over weeks.
- **Multi-agent**: user talks to one "executor"; planner + specialist sub-agents run behind it (model-router: frontier model for reasoning, cheaper model for aux — e.g. Manus uses Claude + Qwen).
- Action = browser + shell + code execution inside the VM.
- Voice: the user can **call the agent** ("what happened today?") and the agent can **call out** (concierge/brand outreach).

**The ₹0 reality + our path (honest):**
- A 24/7 dedicated live VM per user costs money (~$4/user/mo basic → $50–200 heavy). Phone calls cost ~$0.09–0.33/min all-in. We cannot give every free user always-on compute + calls from day one.
- **Our trick: scheduled + trigger-based autonomy on serverless/free tiers.** The agent "wakes" on a schedule (every few hours / daily) and on events (new comment, video published, a set time), does its work in a cloud worker, **saves state to the database**, then sleeps. To the creator it **feels fully always-on** (it works while they sleep and messages them proactively) — but we don't pay for idle 24/7 compute.
- **State lives in the DB, not in memory** (serverless recycles idle processes → "amnesia"; persisting state avoids this).
- As paying users arrive, upgrade heavy users to **real persistent VMs**.
- **Voice/phone = premium/paid tier, enabled as revenue comes.** Early proactive contact = near-free text/voice messages (WhatsApp/Telegram).

**So:** vision = autonomous, own environment, voice, 24/7. Early plumbing = smart scheduled/serverless so it survives on ₹0 and scales with revenue. Same experience for the creator; sustainable economics for us.

---

## PART F — ZERO-BUDGET OPEN-SOURCE STACK

Everything here is free or has a usable free tier. **No vendor lock-in commitments until the first build task validates it.**

| Layer | Choice (free/OSS) | Note |
|---|---|---|
| **Language** | TypeScript (Node) | Best ecosystem for web + agents; Claude Code writes it well. |
| **Frontend** | Next.js + React | Free. Vercel free tier for hosting. |
| **Backend/API** | Next.js API routes or Node | Keep it one app at MVP. |
| **Database** | PostgreSQL via **Supabase free tier** (or local SQLite to start) | Free, includes auth. |
| **Auth** | Supabase Auth or Auth.js | Free. |
| **Browser automation** | **Playwright** | Free, open-source, the industry standard. This is our "action" engine. |
| **Agent framework** | Thin custom layer (we don't need a heavy framework) | Keeps us in control + light. |
| **Hosting** | Vercel free + Supabase free; run browser locally at first | Enough for 1 + small beta. |
| **Analytics/events** | Our own events table in Postgres | We need custom funnel events anyway (Part H). |

**THE ONE HARD CONSTRAINT — the LLM (this is the real cost):**
A broad, reliable agent wants a frontier model, which costs money. Our ₹0 options, best first:

1. **Free-tier cloud APIs (recommended to start):** Google **Gemini** has a genuinely useful free tier; **Groq** (free, very fast) and **OpenRouter** expose several free models. Start here — good enough for a research-brief wedge.
2. **Local models (truly ₹0 but weaker):** via **Ollama** (Llama / Qwen / Mistral). Only good if your laptop is strong (ideally 16GB+ RAM / a GPU). On a normal laptop, quality for multi-step agent work will be rough.
3. **Your Claude subscription:** great for *us building*, not for *powering the product* for other users.

> **DECISION NEEDED (the single most important one):** which LLM do we point the MVP at — Gemini/Groq free tier (recommended) or local Ollama? I'll default to **Gemini free tier** unless you prefer fully-local. This is the only choice that can block the first build.

**Deferred (costs money — explicitly NOT in early phases):** phone calls / telephony, text-to-speech/voice, SMS/iMessage channel, paid proxies, large-scale cloud browsers.

---

## PART G — DATA MODEL (high level, MVP subset)

Full vision has ~30 tables. **MVP needs only these:**
`users`, `user_preferences`, `memory_items` (with source/confidence/date — provenance from day one), `tasks`, `task_steps`, `tool_calls`, `action_receipts`, `verification_results`, `audit_events`, plus distribution tables: `waitlist`, `invites`, `referrals`, `events`.

Everything else (credentials vault, capabilities, delegations, agent-to-agent, life graph) is **designed-for but built-later.**

---

## PART H — DISTRIBUTION (built into the product, not bolted on)

The Instinct lesson: **₹0 marketing. The product's result IS the ad.** We engineer the loop:

```
Access → give agent a real task → surprisingly good result →
Action Receipt (shareable proof) → user shares / tells friend →
friend wants in → requests invite → new user → first success → loop
```

**P0 distribution features (build alongside the wedge):**
1. Landing page + **waitlist** (ask: email + "what would you delegate?").
2. **Invite codes** (each active user gets 3–5; more unlocked by doing real tasks — never spammy).
3. **Referral attribution** + funnel analytics (our own events table).
4. **Shareable Action Receipt** with a strict **privacy/redaction layer** (never leak email, money, personal data).
5. Admin growth dashboard (activation, D7/D30 retention, viral coefficient, share rate).

**Rule:** fix *product pull* before adding *scarcity*. If people aren't naturally asking "how do I get this?", the problem is the product, not the marketing. Scarcity can't save a weak product.

**Seed cohort:** ~10–30 high-signal people first (AI power users, founders, people who hate repetitive digital work) — NOT high-follower influencers. Let *them* create the first credibility; founder amplifies *after*.

---

## PART I — PHASED ROADMAP (realistic for our constraints)

Each phase ends with: *files changed, how to run it, what works, known issues, exact next step.*

- **Phase 0 — Freeze the plan (this doc).** Agree on wedge, LLM, trust pillars. *(we're here)*
- **Phase 1 — Skeleton.** Repo, Next.js app, DB, auth, basic chat UI, LLM connected. "Hello, agent."
- **Phase 2 — The trust spine.** Memory (with provenance) + Planner + Tool Broker + Verifier + Action Ledger + audit log. *Even before real actions.*
- **Phase 3 — Wedge #0 live (Research & Decision Briefs).** Playwright browsing in a sandbox → verified decision table → beautiful Action Receipt. **This is our first shareable "wow".** You use it daily.
- **Phase 4 — Distribution P0.** Waitlist, invites, referral tracking, shareable receipts, growth dashboard. Open a tiny private beta.
- **Phase 5 — Wedge #1.** Add a messaging/inbox-read channel + Permission OS (granular capabilities) + first "safe actions."
- **Phase 6 — Wedge #2 & broadening.** Actions with sending/spending under strict limits, follow-through engine (watch → check → follow up), more tools.
- **Phase 7+ — Toward the broad vision.** Proactive heartbeat, local/private mode, model router (cheap model for easy tasks), agent-to-agent, life graph. *Only after earlier phases are reliable and we have users.*

**Voice/phone/concierge = post-funding or post-revenue.** They need money we don't have yet.

---

## PART J — TOP RISKS (and our answer to each)

1. **LLM cost/quality on ₹0** → start on free tiers + wedge that a free model can do well; add a model router later.
2. **Prompt injection** (malicious web/email tricking the agent) → untrusted-content zone + tool broker + never let content issue commands + allowlists. Build an adversarial test set early.
3. **Solo + non-technical maintenance** → keep MVP to one codebase, few moving parts; Claude Code builds + documents everything; reversible migrations; tests before risky changes.
4. **Building broad too early** → the wedge discipline (Part D). This is the biggest killer; the roadmap is designed to prevent it.
5. **Trust incident** (one bad autonomous action early) → start with read-only wedge (no money/sending), confirmation gates, kill switch from day one.

---

## PART J2 — PRICING (deferred — decide by calculation, never by guess)

**Rule (founder decision):** We do NOT pick a price now. We decide the plan only after a full **unit-economics calculation**:
`(monthly subscription we charge) − (what it actually costs us to run ONE user: LLM tokens + compute/VM + 3rd-party tool/API + storage + telephony if used)` = per-user monthly margin. The plan is set so this is clearly **positive at scale**.
- We get real cost numbers once the MVP runs (measure tokens/compute per active user), then price.
- Landing page shows "One plan" for now; the number comes later.
- Likely shape (to validate later): a single simple creator subscription, benchmarked against the ~$290+/mo stack it replaces — priced well below that but comfortably above our per-user cost.

---

## LIVE STATUS (updated 8 Oct 2026)

- **Brand:** Nimbo (cloud mascot, playful/cartoon, all-platform creator agent).
- **Landing page + waitlist: LIVE** → https://nimbo-4sc3.netlify.app (Netlify, free; site in the founder's Netlify account, name `nimbo-4sc3`, siteId `a94f10c3-a179-49c7-83f6-715c07a3b4d9`).
- **Email capture: WORKING** via Netlify Forms (form name `waitlist`). Submissions readable via the Netlify MCP (`manage-form-submissions`). Tested end-to-end and verified 8 Oct 2026.
- Site source lives at `nimbo-site/index.html` in this project. Deploy = Netlify CLI with the founder's token (not stored in repo).
- **Design artifact (for iterating the look):** https://claude.ai/artifact/7TdEdKgB6pT5UPF1YDt1Ei
- **Content Engine (Phase 1 skill #1): LIVE & WORKING** → https://nimbo-4sc3.netlify.app/app.html — niche in → 3 ideas + full script + title + thumbnail concept + description + hashtags. Built on a Netlify Function (`functions/generate-brief.js`) calling Google Gemini (`gemini-flash-latest` with fallback to `gemini-3.8-flash` / `gemini-flash-lite-latest`). API key stored as Netlify env var `GEMINI_API_KEY` (set via account env API; CLI/MCP env-set were unauthorized/empty — use `POST /api/v1/accounts/{id}/env?site_id=` with the token). Verified end-to-end 8 Oct 2026. The `/app.html` page is NOT linked from the public landing yet (protects the free Gemini quota from waitlist traffic) — founder-only for now.
- **Phase 1.1 DONE (8 Oct 2026):** the engine is **all-platform + platform-aware** (Reels / TikTok / Shorts / YouTube long — brief adapts to the chosen format), and has **real YouTube trend grounding** (via `YOUTUBE_API_KEY` env var): it pulls real recently-popular videos + view counts in the niche and grounds ideas in them. The app shows a "🔥 Trending in your niche now" section. Verified end-to-end. (Why YouTube for trend data: it's the only platform with a free open trend API; IG/TikTok don't offer one. Trends are cross-platform, so this serves all-platform creators.)
- Not yet done: autonomy/scheduling + proactive delivery (Phase 2), accounts + login + saved briefs, more skills (thumbnail image / AI video / auto-post), custom domain, signup email notifications, usage limits before making `/app.html` public.

---

## PART K — IMMEDIATE NEXT STEPS (what we do right after you approve this doc)

1. **You decide the 2 open items:**
   - ✅/✏️ Wedge #0 = **Research & Decision Briefs** (my recommendation) — agree or pick another?
   - ✅/✏️ MVP LLM = **Gemini free tier** (my recommendation) — agree or go local Ollama?
2. I then write a short **Phase 1 technical spec** (exact files, how it runs on your Windows machine, how *you* — non-technical — will start/stop it).
3. We `git init` the project and build the Phase 1 skeleton.
4. First milestone goal: **you type a task in a web chat and the agent produces a verified research brief with an Action Receipt.** That single working loop is the foundation of everything.

**Nothing gets built until you say "go" on this doc and the 2 decisions above.**

---

### Open questions for you (no rush — we decide together)
- Brand/name idea? (We should NOT reuse "Instinct".)
- Who is our *very first* target user — you + which kind of people around you?
- Is your laptop strong (RAM/GPU)? — decides whether local models are even an option.
```
