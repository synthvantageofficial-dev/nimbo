# PHASE 1 — NIMBO'S FIRST REAL SKILL (build plan)

**Date:** 8 Oct 2026
**Goal of Phase 1:** Get Nimbo's **core engine** working end-to-end on ONE creator task — something real, useful and demoable — then wrap it in autonomy. You can't have an autonomous agent until the thing it does actually works. So: **build the brain + first skill first, make it autonomous next.**

---

## The first skill: "Content Engine"

**What it does (v1):** A creator gives Nimbo their **niche** (or channel). Nimbo produces a complete, ready-to-use **content brief**:
- 3 strong video ideas (each with a hook)
- A full script for the best idea
- An optimized title + thumbnail concept
- Description + hashtags/tags

**Why this first:**
- It's the heart of every creator's work (research + create) — highest "wow".
- Safe: no posting, no money, no credentials — pure generation. Easy to make reliable.
- Demoable: you type a niche, you get a usable brief in seconds.
- Everything else (video generation, auto-posting, scheduling, autonomy) layers on top of this engine.

---

## How autonomy fits (so we don't lose the vision)

The locked vision = **autonomous, always-on, it works by itself.** We get there in steps:
- **Phase 1 (now):** the engine works on demand (niche → brief). *Foundation.*
- **Phase 2:** make it **autonomous** — it runs on a schedule for your niche and **proactively delivers** briefs (daily/weekly) to you (web + later WhatsApp/Telegram). This is the "it works while you sleep" moment.
- **Phase 3+:** more skills (real trend data, video generation via HeyGen, auto-posting via platform APIs), plus the trust layer (Action Ledger, approvals).

So Phase 1 is NOT a manual tool forever — it's the engine we then put on autopilot.

---

## Stack (all ₹0 / free tier)

- **Frontend:** a simple app page added to the Nimbo site (type niche → see brief). Hosted on Netlify (already set up).
- **Backend:** **Netlify Functions** (serverless, free) — keeps our API key secret and calls the LLM.
- **Brain (LLM):** **Google Gemini** — free API tier. (Chosen earlier as our MVP model.)
- **Real trend data (v1.1, next):** **YouTube Data API** (free quota) — to ground ideas in what's actually trending in the niche, so output is real, not generic. (Added right after the engine works.)
- **Storage:** none needed for v1 (stateless). Saved briefs/accounts come with Phase 2.

> Note on the connectors in this build session (vidIQ, HeyGen, Metricool): these are tied to *this Claude session*, not to the deployed product. The real product needs its own API keys (Gemini, YouTube, etc.). That's why Phase 1 uses Gemini's free API as Nimbo's own brain.

---

## What I need from the founder (one thing, free, 2 minutes)

A **free Google Gemini API key** — this is Nimbo's brain.
1. Go to **https://aistudio.google.com/apikey**
2. Sign in with your Google account → **"Create API key"**
3. Copy it and paste it to me.

I'll keep it secret (as a Netlify environment variable, never in the code/repo).

---

## Build steps (I do all of this)

1. Create the agent engine (a Netlify Function) that takes a niche → calls Gemini → returns a structured content brief.
2. Build the app page UI (niche input → nicely formatted brief, in the Nimbo cloud style).
3. Store the Gemini key securely as a Netlify env var.
4. Deploy + test end-to-end (I'll run a real niche and show you the brief).
5. Then: add real YouTube trend grounding (v1.1), then move to Phase 2 (autonomy).

**Milestone 1 (what "done" looks like):** You open the Nimbo app, type a niche like *"home workout for busy parents"*, and in seconds get 3 video ideas + a full script + title + thumbnail concept — good enough to actually shoot.
