# CLAUDE.md — NIMBO (project source of truth)

> **Read this file first, fully, every session.** It is the complete state of the startup.
> Founder is **non-technical** — you build, he decides. Explain simply, **Hinglish is fine**.
> Budget **₹0** — free / open-source / free tiers only, unless he approves a spend.
> Keys are in **`.env.local`** (gitignored). Read it when you need a key. Never print keys in chat.

---

# 🚨 1. THE ONE THING BLOCKING EVERYTHING (start here)

**Netlify deploys are BLOCKED since 9 Oct 2026.**
```
POST /api/v1/sites/<siteId>/deploys  ->  403
{"error":"Account credit usage exceeded - new deploys are blocked until credits are added"}
```
- The **live site still works**; only *new* deploys are refused.
- Cause: ~20 deploys in one day on the free plan. **RULE GOING FORWARD: batch changes, deploy rarely.**
- Odd clue: the account API now reports `credits: {included: 300, used: 0}` yet deploys are still 403 → looks like a **stale/account-level block**.
- Retried many times over 2 days — still blocked.

### Everything below is BUILT, TESTED LOCALLY, and WAITING for this deploy
Setup wizard · Paywall · Dodo payments · better thumbnails · free voice/image proxies.
**The founder cannot test any of it live until this is fixed.**

### The two ways out (founder must choose)
- **A — Unblock Netlify (₹0):** he checks
  `https://app.netlify.com/teams/synthvantageofficial-dev/usage` and `.../billing`,
  sends a screenshot, or messages Netlify support to clear the block.
- **B — Migrate host** (Vercel / Cloudflare): everything live today, but
  Netlify Blobs → needs a replacement (Upstash Redis free REST is a good fit),
  Netlify Forms → replace with a function, **and the URL changes** —
  ⚠️ he already put `nimbo-4sc3.netlify.app` in a **reel + social bios**.
- **Strong recommendation made to him:** buy a cheap domain (~₹900/yr, e.g. `trynimbo.com`).
  A paid product needs a real domain anyway (trust at checkout, email sending, host-independence).
  **Awaiting his decision.**

---

# 2. What Nimbo is

An **autonomous, always-on personal AI agent for content creators** (all platforms: YouTube, Instagram, TikTok…).
Same "machine" as **Instinct** (memory + action + does the work for you, you just talk to it), pointed at the creator niche.

- **Brand:** Nimbo — smiling **cloud mascot**, playful pastel/cartoon look (not corporate SaaS).
- **Positioning:** *"Your whole content team, in one agent you just talk to."*
- **Core promise:** set it up **once**, then it runs by itself — research → script → video → post.
- **Edge:** one agent replaces the scattered **$290+/month** tool stack; real trend data, not generic AI;
  transparency/trust (what it did, approvals, undo).
- **Launch offer (live on the site):** first **1000 creators get 30% off for life**.

### How we got here (decisions already made — do not re-litigate)
1. Founder researched **Instinct** ($10B personal-agent startup). Goal: copy the *machine*, not the brand.
2. Niche moved from "personal life" (Instinct owns it) → **content creators**
   (creators pay monthly, are the best viral channel, and no polished autonomous creator-agent exists).
3. Brand **Nimbo** chosen (Nimbus/Roo were taken by AI companies).
4. **All platforms**, not one — the same creator is everywhere.
5. Video is **tool-agnostic**: user connects *their own* tool (HeyGen or any) **or** uses our **free faceless** video.
6. **No free tier** — everyone subscribes after setup.

---

# 3. Money

## Cost model — BYOK (locked)
The startup pays for **nothing** expensive. Each creator connects **their own** accounts:
- **AI video** → their own HeyGen / any tool's API key. No subscription → they use our free faceless video.
- **Posting** → their own YouTube / Instagram / TikTok.
- Only genuinely free things run on our shared keys (Gemini text, YouTube trend reads, Pexels, Edge-TTS).
- **Per-creator automation level:** `full_auto` (create **and** post) or `approve_first`. Both must exist.

## Unit economics (real calc, 2 videos/day = 60/month)
| Item | Cost |
|---|---|
| Gemini brief/script | ~$0.005 / video |
| YouTube + Pexels + Edge-TTS | $0 (free quotas) |
| **Video rendering** | **$0 — ffmpeg.wasm runs in the USER's browser** ⭐ |
| Netlify functions/bandwidth | ~$0.003 / video |
| Fixed costs share | ~$0.25 / user |
**≈ $0.75/user best case — plan with $2–3/user** (buffer for paid TTS/image fallbacks).

## Plans (LOCKED)
| Plan | List | **Founding (30% off, for life)** | Videos/month |
|---|---|---|---|
| Starter | $19 | **$13** | 30 |
| **Creator** ⭐ | $39 | **$27** | 90 |
| Pro | $79 | **$55** | 300 |

Margins **72–85%** (target was 50–60%). Quota is **monthly**, resets on the 1st.

### ⚠️ Open pricing decision: INDIA
Checkout showed **$27 → ₹2,709.98/mo incl. GST** — far too expensive for Indian creators.
Proposed (still ~70% margin): **Starter ₹499 · Creator ₹999 · Pro ₹1,999**. **Founder has not decided yet.**

---

# 4. What is LIVE vs BUILT-BUT-NOT-DEPLOYED

## ✅ LIVE right now (old code, from before the block)
- **Landing + waitlist:** https://nimbo-4sc3.netlify.app
  Cloud mascot design, "first 1000 → 30% off" banner, tool-comparison table,
  **real email capture** via Netlify Forms (form name `waitlist`) — tested.
  Read signups: Netlify MCP → `manage-form-submissions`.
- **Content Engine:** https://nimbo-4sc3.netlify.app/app.html
  Google sign-in, profile, saved briefs, niche+platform → 3 ideas + script + title + thumbnail + description + hashtags,
  platform-aware lengths, **real YouTube 30-day trend grounding**, 🤖 autopilot toggle.

## 🧪 BUILT LOCALLY, NOT DEPLOYED (deploy the moment the block clears)
1. **One-time SETUP WIZARD** (6 steps) — shows after sign-in until `profile.onboarded`; re-openable via "Edit my setup".
   Collects: name/niche/themes/audience/**language**/country · platforms + links + size ·
   tone + face-or-faceless + video style + **brand voice** + **NEVER-do rules** + inspirations ·
   posting frequency/days/time · video tool (free faceless | own HeyGen | other + API key) + voice + captions + music ·
   automation level + per-action permissions + daily autopilot.
   *Verified in a local browser: all 6 steps, progress bar, chips, and data collection.*
2. **PAYWALL** — 3 plan cards, founding prices, flow **sign in → wizard → paywall → app**, "Change plan" button.
3. **DODO PAYMENTS** — real checkout + verify-then-activate + webhook (see §6).
4. **Better thumbnails** — format-aware (16:9 for YouTube-long, 9:16 for shorts) + crisp CSS text overlay.
5. **`functions/tts.js`** (free Google-TTS proxy) and **`functions/img.js`** (free Pollinations proxy).
6. **Engine personalisation** — every brief now uses the full creator profile (language, tone, audience, hard avoid rules).
7. **THE AUTONOMOUS ENGINE** (11 Oct) — the thing that makes Nimbo an agent instead of an app. See §12.

---

---

# 🤖 12. THE AUTONOMOUS ENGINE (built 11 Oct, tested locally)

**What the founder asked for:** *"user hume message kare, ya call kare, ya Gmail par mail bheje — aur kaam
automatic ho jaye."* That is now built. The creator never opens a dashboard: they talk, Nimbo works.

## How it works
```
Telegram msg / voice note  \
Email to Nimbo              }→  queue  →  WORKER  →  brain (Gemini) decides  →  acts  →  answers back
Chat in the app            /                         on the same channel
```
1. **Any channel** drops a request on a shared queue and answers instantly ("kaam shuru...").
   Nothing times out, because the slow AI work never happens inside the webhook.
2. **The worker** runs the agent loop: understand → decide → do → deliver.
3. **The brain** (`lib/brain.js`) picks ONE action from: `make_content`, `trending`, `status`,
   `history`, `update_setting`, `set_autopilot`, `help`, `chat` — with the creator's full profile
   and the last 8 messages as context. Structured output, so it never rambles.
4. **The agent** (`lib/agent.js`) actually does it: plan + quota check, real generation, saves the brief,
   counts usage, writes the action ledger, and replies in the creator's own language.
5. **Autopilot** now PUSHES: it creates on its own and sends the result to the creator's phone.

## Voice = the free version of "call karo"
A Telegram **voice note** is downloaded and sent straight to Gemini as audio — it transcribes AND
understands in one call. **Free.** (Real phone calls need Twilio = money, so this is the ₹0 answer.
Revisit when there is revenue.)

## Channels
| Channel | Status | Notes |
|---|---|---|
| **Telegram** (text + voice) | built, simulated end-to-end | free forever, worldwide, no domain needed |
| **Web chat** in the app | built, verified in a browser | same brain, same queue |
| **Email in** | built (`email-in.js`), provider-agnostic | needs a **domain** + an inbound provider (Cloudflare Email Routing is free) |
| **Email out / WhatsApp / calls** | not built | email out needs a domain + verified sender; WhatsApp & calls cost money |

## New files
- `functions/lib/brain.js` — understands the message (text or audio), picks the action
- `functions/lib/agent.js` — runs the action, enforces plan + quota, writes the ledger
- `functions/lib/channels.js` — Telegram send/typing/file-download, 3800-char chunking, `deliver()`
- `functions/lib/worker.js` — `runTask` / `drain` / `kick`
- `functions/telegram.js` — webhook: pair by code, queue, instant ack, `/help`, `/stop`
- `functions/ask.js` — web chat: POST queues, GET polls for the answer
- `functions/connect.js` — one-time 6-char pairing code + one-tap `t.me` link
- `functions/email-in.js` — inbound email webhook (any provider)
- `functions/worker-background.js` — background worker (no 10s limit)
- `functions/worker-scheduled.js` — safety net, every 5 min (in `netlify.toml`)
- app UI: **Talk to Nimbo** chat + **Connect Telegram** card + **"Nimbo ne khud kya kiya"** ledger

## Storage added (Netlify Blobs)
`conv/<sub>` last 20 messages · `events/<sub>` action ledger (50) · `link/telegram/<chatId>` and
`link/email/<address>` → account · `code/<CODE>` 30-min pairing codes · `task/<id>` the queue.

## ⭐ Local test mode (works while deploys are blocked)
Netlify Blobs is **not reachable from the laptop**. Set `NIMBO_LOCAL_STORE=<dir>` and `lib/store.js`
uses a JSON file instead — the entire agent runs offline.
```bash
node tools/test-agent.js       # full conversation against real Gemini
node tools/test-telegram.js    # pair by code -> message -> worker -> delivery
python tools/build-agent-test.py   # makes AGENT-TEST.html, the UI with the API stubbed
```
**Verified 11 Oct:** Hinglish understood, Instagram format detected from the words, real brief generated,
real 30-day trends, setting changed by chat, autopilot toggled by chat, quota counted, ledger written,
Telegram pairing + queue + delivery all passed.

## ⚠️ Founder's job before this can go live (free, ~5 minutes)
1. Telegram → **@BotFather** → `/newbot` → pick a name (e.g. `NimboAgentBot`).
   Send me the **token** and the **username**.
2. I set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` as Netlify env vars.
3. After the deploy unblocks, register the webhook once:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<site>/.netlify/functions/telegram&secret_token=<SECRET>`
4. Then: open the app → "Connect Telegram" → one tap → message the bot → the work arrives on the phone.

### New env vars needed
`TELEGRAM_BOT_TOKEN` · `TELEGRAM_BOT_USERNAME` · `TELEGRAM_WEBHOOK_SECRET` ·
`NIMBO_APP_URL` (optional) · `EMAIL_IN_SECRET` (only when email-in is wired)

# 5. Stack & file map

- **Host:** Netlify — site `nimbo-4sc3`, ids in `.env.local`.
- **Site:** `nimbo-site/index.html` (landing) · `nimbo-site/app.html` (the app: login, wizard, paywall, engine UI).
- **Functions** (`functions/`):
  `generate-brief.js` (auth + plan gate + monthly quota + save) · `profile.js` (full profile + plans + usage) ·
  `subscribe.js` (**verifies with Dodo** then activates) · `checkout.js` (creates Dodo payment link) ·
  `dodo-webhook.js` (renew/cancel sync, HMAC verified) · `daily.js` (scheduled autopilot) ·
  **agent:** `telegram.js` · `ask.js` · `connect.js` · `email-in.js` · `worker-background.js` · `worker-scheduled.js` ·
  `run-autopilot.js` (manual trigger, `x-admin-secret` header) · `tts.js` · `img.js`
- **Shared** (`functions/lib/`): `engine.js` (generation core) · `store.js` (Blobs + PLANS + usage + conv/ledger/links/queue + local test mode) ·
  `brain.js` (decides) · `agent.js` (does) · `channels.js` (Telegram out) · `worker.js` (queue) ·
  `auth.js` (Google token verify) · `autopilot.js` · `dodo.js`
- **Storage:** **Netlify Blobs** — `profile/<sub>`, `briefs/<sub>` (last 20), `usage/<sub>` (monthly).
- **Brain:** Google **Gemini** `gemini-flash-latest` (+ fallbacks `gemini-3.8-flash`, `gemini-flash-lite-latest`).
- **Tools dir:** `tools/` — `makevideo3.js` / `makevideo4.js` (free faceless video builders),
  `build-setup-test.py` (makes the no-login `SETUP-TEST.html` demo), and the `patch_*.py` scripts used to build features.
- **Deploy command:**
  `netlify deploy --dir=nimbo-site --functions=functions --prod --site <NIMBO_SITE_ID>` with `NETLIFY_AUTH_TOKEN`.

---

# 6. Dodo Payments (integrated, TEST mode)

### Verified facts
- **India AND international creators can both pay.** Dodo is a Merchant of Record: global cards **+ UPI/RuPay** for Indian buyers. **No Razorpay needed.**
- The founder's key is **TEST/sandbox only** (works on `test.dodopayments.com`, 401 on `live.dodopayments.com`).
- Dodo keys are **per business account, not per project** — this key also lists his other product ("InkFit").
- ⚠️ **Checkout currently shows the business name "inkfit"**, not Nimbo. **Create a separate Dodo business for Nimbo before going live.**
- Test and live are fully separate (keys, hosts, products, webhooks).

### Products (test mode, founding prices) — ids in `.env.local`
Starter $13 · Creator $27 · Pro $55 (all monthly recurring).

### Flow
`paywall → /checkout (creates subscription + payment_link, metadata.nimbo_sub) → Dodo hosted checkout →
return to /app.html?checkout=done → /subscribe asks Dodo for status → only if active, plan is activated`

### ✅ Payment was really tested (11 Oct)
Founder paid on a test link. Dodo confirms `status: active`, $27/mo, next billing 11 Nov 2026.
**Nothing unlocked in the app — and that is NOT a bug:** the paywall/wizard/`/subscribe`/`/checkout` are **not deployed**
(live site returns 404 for those functions), and that test subscription used a dummy `nimbo_sub: "founder-live-test"`.

### Before taking real money
1. Verify business in Dodo → get **LIVE key**  2. Copy products to live mode  3. Set `DODO_MODE=live` + live product ids
4. Create webhook + set `DODO_WEBHOOK_SECRET`  5. **Separate Dodo business for Nimbo**  6. Confirm India fees with Dodo.

---

# 7. Free faceless video (for creators with no paid tool)

Pipeline **proven locally** with ffmpeg (v9.0 installed on the founder's machine). Samples in the project root:
- `nimbo_faceless_sample.mp4` (v1 — AI image + robotic voice → rejected as too weak)
- `nimbo_faceless_v2.mp4` (real **Pexels** stock footage — big jump)
- `nimbo_faceless_v3.mp4` (+ **natural voice**, Edge-TTS — robotic voice fixed)
- `nimbo_faceless_v4.mp4` (+ **reel-style word-by-word captions**) ← current best, founder approved the direction

**Free stack that works:** Pexels (footage) + **Edge-TTS** (`msedge-tts` npm, `en-US-AriaNeural`, no key) + ffmpeg.
Builders: `tools/makevideo3.js`, `tools/makevideo4.js`.

**Still to polish:** background music, smarter scene keywords from the script, intro hook card, more cuts.
**Founder's standard:** *"no creator will post a bad reel from their channel"* — editing (cuts, music, effects, animation) is **our job**, because they pay us.

**Product integration (not built yet):** `/voice` (edge-tts → mp3) + `/pexels` (search+proxy, hides key) functions,
then **ffmpeg.wasm client-side** assembles the MP4 in the user's browser (keeps our cost at $0).

---

# 8. Gotchas learned the hard way (save yourself hours)

- **Netlify env vars:** must be set via the **account env API with ALL FOUR scopes**
  (`functions,runtime,builds,post_processing`) — fewer scopes → **403**. CLI `env:set` and the MCP env tool both failed.
- **Netlify Blobs in manual deploys** are NOT auto-configured: pass `getStore({name, siteID, token})` explicitly
  (`NIMBO_SITE_ID`, `NIMBO_BLOBS_TOKEN`).
- **Bash heredocs mangle escapes** (`\n`, `\"`) and break on big HTML/JS. ✅ Pattern that works:
  write a `patch_*.py` with the **Write tool**, then run it with `python`.
- **Windows:** use `python` (not `python3`); use `C:/...` paths in Python (not `/c/...`).
- **Gemini:** `gemini-2.5-flash` is closed to new users → use `gemini-flash-latest`.
  **Gemini image generation and Google-Search grounding are NOT free** (free-tier limit 0 → 429 billing error).
- **Pollinations:** free but **adds a watermark** and returns **402 after a few images** — unreliable; only a fallback.
- **TTS:** StreamElements is dead (401). Google Translate TTS works (robotic, ≤200 chars/chunk). **Edge-TTS is the good free one.**
- **Pexels free:** landscape `1280x720` ✅, vertical `576x1024` ✅, `enhance=true` → 402 (paid).
- Netlify **scheduled functions** may not register from a manual CLI deploy — verify, else use an external cron hitting `run-autopilot`.

---

# 9. Guardrails

- **Do NOT touch the founder's other live projects** (Supabase `investing-app` / `ai-literacy-kids`, Netlify `revv-ev` / `chipsterkids` / `tokenpilot-saas`). Supabase free tier is maxed (2 active) → Nimbo uses **Netlify Blobs**, never Supabase.
- **Never** put secrets in the repo, client code, or chat. Keys live only in `.env.local` + Netlify env vars.
- Ship in **small verified steps**; build the capability first, then make it autonomous.
- **Deploy rarely** (see §1).
- Be honest about limits and costs — the founder values straight answers over optimism.

---

# 10. Roadmap

1. **UNBLOCK DEPLOY** (§1) → push everything → founder does a full real test
   (sign in → wizard → paywall → pay → chat with Nimbo → connect Telegram → voice note).
2. Free faceless video **into the product** (`/voice`, `/pexels`, ffmpeg.wasm) + BYO-tool connect.
3. **Auto-posting** — YouTube OAuth first; Instagram/TikTok later (need business accounts + app review).
4. Polish video: music, animated captions, better cuts.
5. Go-live on payments (§6 checklist) + decide **India pricing**.
6. Email/WhatsApp delivery of briefs (needs a domain + verified sender).
7. Trust layer: Action Ledger, approvals, undo.

## Decisions waiting on the founder
- [ ] Netlify block: unblock (A) or migrate (B)?
- [ ] Buy a domain (~₹900/yr)?
- [ ] India pricing (₹499 / ₹999 / ₹1,999)?
- [ ] When to create the separate **Nimbo** Dodo business?
- [ ] **Create the Telegram bot** via @BotFather and send me the token + username (§12) — free, 5 min, blocks nothing else

---

# 11. Status log
- **8 Oct** — Landing + waitlist live (real email capture). Content Engine live. Phase 1.1: platform-aware briefs + real 30-day YouTube trend grounding.
- **8 Oct** — Accounts: Google Sign-In, profiles + saved briefs in Netlify Blobs, usage limits. Autopilot v1 (scheduled + manual trigger, app toggle, "Nimbo made this while you were away" banner).
- **9 Oct** — Thumbnails (format-aware + overlay). **Netlify deploy block starts.** Free faceless video proven locally (v1→v3).
- **10 Oct** — Faceless v4 (reel-style captions). Pexels key obtained. Edge-TTS natural voice.
- **11 Oct** — **Setup wizard (6 steps)** built + tested. **Pricing locked** (3 plans). **Paywall** built. **Dodo Payments integrated** (products created, checkout verified, verify-then-activate + webhook). Founder completed a real test payment → Dodo `active`. Confirmed the missing unlock is *only* the undeployed code. Everything saved for a fresh session.
- **11 Oct (later)** — **AUTONOMOUS ENGINE built**: message / voice note / email → queue → worker →
  brain decides → Nimbo acts → answers on the same channel. Telegram (text + free voice understanding),
  web chat, inbound email, background + scheduled workers, action ledger, autopilot now pushes to the
  creator's phone. Plan + quota enforced on every channel. Tested end-to-end locally with real Gemini
  (`tools/test-agent.js`, `tools/test-telegram.js`) and the UI verified in a browser. Also fixed:
  `profile.js` was wiping server-set fields (Dodo subscription ids) on every setup edit; autopilot
  ignored plan + quota. Added `NIMBO_LOCAL_STORE` so everything is testable without a deploy.

## 12 Oct - Session 3

### What was done this session
- **Google OAuth fix:** Added `http://localhost:8888` to authorized JavaScript origins in Google Cloud Console → Google sign-in now works on localhost.
- **Telegram alternative discussed:** BotFather not creating new bots on founder's account. WhatsApp Business Cloud API identified as best global alternative (needs Meta Business Account + dedicated number). Email (with domain) is simplest universal option. **Decision pending from founder.**
- **Local dev clarification:** Founder's project folder is `C:\Users\acer\OneDrive\Desktop\personal ai instict` (not "nimbo"). To test: `cd` to that folder → `git fetch origin && git checkout main-35vxqq` → `node tools/dev-server.js` → open `http://localhost:8888/app.html?dev=1`.
- **CLAUDE.md updated** with full ✅ / ❌ status summary below.

### What was done (continued — YouTube auto-posting)
- **Pexels-first thumbnails** (`functions/lib/engine.js`): `buildThumbUrl()` now async, Pexels API first (format-aware portrait/landscape), Pollinations as fallback only. Dramatically better thumbnail quality.
- **`functions/lib/youtube.js`**: YouTube API helpers — `getValidToken()` (refresh if expired), `getChannelInfo()`, `initiateUpload()`.
- **`functions/youtube-connect.js`**: OAuth 2.0 callback — exchanges code, fetches channel info, stores `profile.yt` in Blobs, redirects to app with `?yt_connected=1` or `?yt_error=...`.
- **`functions/youtube-token.js`**: `GET` endpoint — returns fresh access_token to client (avoids Netlify 6MB upload limit by having client talk directly to YouTube).
- **`functions/profile.js`** fixes: now preserves `yt` tokens on every profile save (was silently wiped before); now exposes `sub: user.sub` in GET response (needed as OAuth state param).
- **`nimbo-site/app.html`** — "▶️ Connect YouTube" channel card, OAuth redirect flow, upload UI with progress bar, toast notifications for OAuth callbacks and upload status.
- ⚠️ **Founder still needs to do** (manual, one-time): in Google Cloud Console → OAuth consent screen → add `https://www.googleapis.com/auth/youtube.upload` scope + add `https://nimbo-4sc3.netlify.app/.netlify/functions/youtube-connect` as authorized redirect URI.

### Decisions still waiting on founder
- [ ] Messaging channel: WhatsApp (Meta Business Account + spare number) OR Email (buy domain ₹900) OR wait for BotFather to work?
- [ ] Domain: `trynimbo.com` ya koi aur? (needed for email channel, payments trust, host-independence)
- [ ] Netlify block: check `app.netlify.com/teams/synthvantageofficial-dev/billing` and send screenshot or message Netlify support
- [ ] Google Cloud Console: add YouTube scope + redirect URI (see above)

---

## 📊 COMPLETE STATUS: WHAT IS DONE vs WHAT REMAINS

### ✅ 100% BUILT (code is ready, waiting for deploy)

| Feature | Where | Notes |
|---|---|---|
| Landing page + waitlist | LIVE | Email capture working |
| Content Engine (basic) | LIVE | Ideas + script + trends |
| **Setup Wizard (6 steps)** | Ready to deploy | All steps tested locally |
| **Paywall** (3 plans) | Ready to deploy | Founding prices, flow complete |
| **Dodo Payments** | Ready to deploy | Test payment confirmed ($27/mo) |
| Better thumbnails | Ready to deploy | Format-aware (16:9 / 9:16) |
| TTS + Image proxies | Ready to deploy | `tts.js`, `img.js` |
| Engine personalization | Ready to deploy | Full creator profile used in briefs |
| **Autonomous Engine** | Ready to deploy | Web chat + Telegram + Email-in wired |
| Action ledger ("Nimbo ne khud kya kiya") | Ready to deploy | Last 50 actions saved |
| Background + scheduled workers | Ready to deploy | Queue-based, no timeout |
| Video player UI | Ready to deploy | Shows in brief, download button |
| **YouTube auto-posting** | Ready to deploy | OAuth connect, client-side resumable upload, toast notifications |
| Free faceless video (v4) | Proven locally | Pexels + Edge-TTS + captions |
| Local dev server (`?dev=1`) | Working on laptop | Skips Google sign-in |

### ❌ REMAINING (not built yet)

| Feature | Blocker | Priority |
|---|---|---|
| **DEPLOY** everything above | Netlify block (§1) | 🔴 #1 |
| **Messaging channel** (WhatsApp/Email) | Founder decision + setup | 🔴 High |
| Free video INTO product (`/voice`, `/pexels`, ffmpeg.wasm) | Needs coding | 🟡 Medium |
| Video polish (music, better cuts, animated captions) | Needs coding | 🟡 Medium |
| ~~Auto-posting (YouTube OAuth)~~ **BUILT** | Ready to deploy | 🟡 Medium |
| Payments LIVE mode (separate Dodo biz) | Founder action (Dodo) | 🟡 Medium |
| Domain purchase | Founder pays ₹900 | 🟡 Medium |
| Email delivery channel | Needs domain first | 🟡 Medium |
| India pricing decision | Founder decides | 🟡 Medium |
| PWA (install on home screen) | Needs coding | 🟢 Later |
| Trust layer (approvals, undo) | Needs coding | 🟢 Later |
| Native mobile app | Months of work + money | 🔵 Future |

---

## 12 Oct - Session 2 (cloud session continues from here)

### What was done this session
- **`app.html` accidentally wiped** by a Python UnicodeEncodeError mid-write. **Fully recovered:**
  - Downloaded live Netlify HTML (old base), re-applied all 7 patches in correct order:
    `patch_wizard` → `patch_paywall_ui` → `patch_dodo_ui` → `patch_agent_ui` → `patch_ui_clean` → `patch_connect_ui` → video UI patches
  - File is now 1326 lines with all features present: wizard, paywall, agent chat, Telegram card, video player.
- **Video player fully wired into `render(d)`:**
  - `window.__nimboVideo` captured at top of `render()`
  - `mountVideo($('result'))` called just before `scrollIntoView`
  - `mountVideo()` helper + `.vidwrap/.vidbar/.vidnote` CSS added
  - When Nimbo builds a video, the player now appears above the brief card with duration, scenes, size + Download button.
- **All backend files are correct** (agent.js, channels.js, worker.js, brain.js, video.js, store.js, autopilot.js) — all already English, video pipeline wired, binary storage working.

### To test locally
```bash
node tools/dev-server.js
# open http://localhost:8888/app.html?dev=1
```

### What still needs to be deployed (all in nimbo-site/ and functions/)
Everything from §4 "BUILT LOCALLY, NOT DEPLOYED" plus the video player UI.

## 11 Oct (evening) - founder tested it and three things came back
1. **"Same reply to every message"** - he was testing `AGENT-TEST.html`, a **stub page with fake data**
   that returns one canned answer. Not an engine bug. **Lesson: never hand him a stubbed page without
   saying so, in the message itself.** Real local testing is now `node tools/dev-server.js`.
2. **"Sab gachal-pachal, kuch samajh nahi aa raha"** - the app had TWO front doors (the chat AND the old
   niche form) competing for the same job. Fixed: the chat is the only primary action; the old form is a
   collapsed **"Manual mode & settings"** section underneath.
3. **"Everything in English"** - all UI copy and every agent / Telegram-bot reply is now English.
   The brain still **understands any language** - verified: a Hindi question returned an English answer
   with real trend data.

### Running the REAL app locally (no deploy needed)
```bash
node tools/dev-server.js
# then open  http://localhost:8888/app.html?dev=1
```
- `--offline` is required, otherwise the CLI tries to reach the blocked Netlify account and dies.
- Storage goes to `NIMBO_LOCAL_STORE` (a JSON file), and `NIMBO_DEV_USER` skips Google sign-in.
  **Both env vars exist only on the laptop, so live auth and live storage are untouched.**

**Verified on localhost with the real backend:** "how many videos do I have left" returned the real
plan + quota; a Hindi question about trends returned an English answer with real 30-day YouTube data;
the action ledger updated. Also fixed stale copy that still promised a free tier
("Free - 10 briefs/day while in beta") on the sign-in box.
