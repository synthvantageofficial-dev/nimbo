# -*- coding: utf-8 -*-
# Records the autonomous engine (11 Oct) in CLAUDE.md: architecture, files, what the
# founder must do, and the new env vars.
import io

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/CLAUDE.md"
s = io.open(P, encoding="utf-8").read()

# ---- 1. §4: list the engine under BUILT-NOT-DEPLOYED -------------------------
old4 = "6. **Engine personalisation** - every brief now uses the full creator profile (language, tone, audience, hard avoid rules)."
old4 = old4.replace("-", "\u2014", 1)
if old4 not in s:
    old4 = "6. **Engine personalisation** \u2014 every brief now uses the full creator profile (language, tone, audience, hard avoid rules)."
assert old4 in s, "section 4 anchor"
s = s.replace(old4, old4 + """
7. **THE AUTONOMOUS ENGINE** (11 Oct) \u2014 the thing that makes Nimbo an agent instead of an app. See \u00a712.""", 1)

# ---- 2. new section 12, inserted before "# 5. Stack & file map" ---------------
NEW = """
---

# \U0001F916 12. THE AUTONOMOUS ENGINE (built 11 Oct, tested locally)

**What the founder asked for:** *"user hume message kare, ya call kare, ya Gmail par mail bheje \u2014 aur kaam
automatic ho jaye."* That is now built. The creator never opens a dashboard: they talk, Nimbo works.

## How it works
```
Telegram msg / voice note  \\
Email to Nimbo              }\u2192  queue  \u2192  WORKER  \u2192  brain (Gemini) decides  \u2192  acts  \u2192  answers back
Chat in the app            /                         on the same channel
```
1. **Any channel** drops a request on a shared queue and answers instantly ("kaam shuru...").
   Nothing times out, because the slow AI work never happens inside the webhook.
2. **The worker** runs the agent loop: understand \u2192 decide \u2192 do \u2192 deliver.
3. **The brain** (`lib/brain.js`) picks ONE action from: `make_content`, `trending`, `status`,
   `history`, `update_setting`, `set_autopilot`, `help`, `chat` \u2014 with the creator's full profile
   and the last 8 messages as context. Structured output, so it never rambles.
4. **The agent** (`lib/agent.js`) actually does it: plan + quota check, real generation, saves the brief,
   counts usage, writes the action ledger, and replies in the creator's own language.
5. **Autopilot** now PUSHES: it creates on its own and sends the result to the creator's phone.

## Voice = the free version of "call karo"
A Telegram **voice note** is downloaded and sent straight to Gemini as audio \u2014 it transcribes AND
understands in one call. **Free.** (Real phone calls need Twilio = money, so this is the \u20b90 answer.
Revisit when there is revenue.)

## Channels
| Channel | Status | Notes |
|---|---|---|
| **Telegram** (text + voice) | built, simulated end-to-end | free forever, worldwide, no domain needed |
| **Web chat** in the app | built, verified in a browser | same brain, same queue |
| **Email in** | built (`email-in.js`), provider-agnostic | needs a **domain** + an inbound provider (Cloudflare Email Routing is free) |
| **Email out / WhatsApp / calls** | not built | email out needs a domain + verified sender; WhatsApp & calls cost money |

## New files
- `functions/lib/brain.js` \u2014 understands the message (text or audio), picks the action
- `functions/lib/agent.js` \u2014 runs the action, enforces plan + quota, writes the ledger
- `functions/lib/channels.js` \u2014 Telegram send/typing/file-download, 3800-char chunking, `deliver()`
- `functions/lib/worker.js` \u2014 `runTask` / `drain` / `kick`
- `functions/telegram.js` \u2014 webhook: pair by code, queue, instant ack, `/help`, `/stop`
- `functions/ask.js` \u2014 web chat: POST queues, GET polls for the answer
- `functions/connect.js` \u2014 one-time 6-char pairing code + one-tap `t.me` link
- `functions/email-in.js` \u2014 inbound email webhook (any provider)
- `functions/worker-background.js` \u2014 background worker (no 10s limit)
- `functions/worker-scheduled.js` \u2014 safety net, every 5 min (in `netlify.toml`)
- app UI: **Talk to Nimbo** chat + **Connect Telegram** card + **"Nimbo ne khud kya kiya"** ledger

## Storage added (Netlify Blobs)
`conv/<sub>` last 20 messages \u00b7 `events/<sub>` action ledger (50) \u00b7 `link/telegram/<chatId>` and
`link/email/<address>` \u2192 account \u00b7 `code/<CODE>` 30-min pairing codes \u00b7 `task/<id>` the queue.

## \u2b50 Local test mode (works while deploys are blocked)
Netlify Blobs is **not reachable from the laptop**. Set `NIMBO_LOCAL_STORE=<dir>` and `lib/store.js`
uses a JSON file instead \u2014 the entire agent runs offline.
```bash
node tools/test-agent.js       # full conversation against real Gemini
node tools/test-telegram.js    # pair by code -> message -> worker -> delivery
python tools/build-agent-test.py   # makes AGENT-TEST.html, the UI with the API stubbed
```
**Verified 11 Oct:** Hinglish understood, Instagram format detected from the words, real brief generated,
real 30-day trends, setting changed by chat, autopilot toggled by chat, quota counted, ledger written,
Telegram pairing + queue + delivery all passed.

## \u26a0\ufe0f Founder's job before this can go live (free, ~5 minutes)
1. Telegram \u2192 **@BotFather** \u2192 `/newbot` \u2192 pick a name (e.g. `NimboAgentBot`).
   Send me the **token** and the **username**.
2. I set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` as Netlify env vars.
3. After the deploy unblocks, register the webhook once:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<site>/.netlify/functions/telegram&secret_token=<SECRET>`
4. Then: open the app \u2192 "Connect Telegram" \u2192 one tap \u2192 message the bot \u2192 the work arrives on the phone.

### New env vars needed
`TELEGRAM_BOT_TOKEN` \u00b7 `TELEGRAM_BOT_USERNAME` \u00b7 `TELEGRAM_WEBHOOK_SECRET` \u00b7
`NIMBO_APP_URL` (optional) \u00b7 `EMAIL_IN_SECRET` (only when email-in is wired)

"""

anchor5 = "# 5. Stack & file map"
assert anchor5 in s, "stack section anchor"
s = s.replace(anchor5, NEW.lstrip("\n") + anchor5, 1)

# ---- 3. fix the old profile.js data-loss note in the file map ----------------
old_fn = "  `dodo-webhook.js` (renew/cancel sync, HMAC verified) \u00b7 `daily.js` (scheduled autopilot) \u00b7"
assert old_fn in s, "file map anchor"
s = s.replace(old_fn, old_fn + """
  **agent:** `telegram.js` \u00b7 `ask.js` \u00b7 `connect.js` \u00b7 `email-in.js` \u00b7 `worker-background.js` \u00b7 `worker-scheduled.js` \u00b7""", 1)

old_lib = "- **Shared** (`functions/lib/`): `engine.js` (generation core) \u00b7 `store.js` (Netlify Blobs + PLANS + monthly usage) \u00b7"
assert old_lib in s, "lib map anchor"
s = s.replace(old_lib, "- **Shared** (`functions/lib/`): `engine.js` (generation core) \u00b7 `store.js` (Blobs + PLANS + usage + conv/ledger/links/queue + local test mode) \u00b7\n  `brain.js` (decides) \u00b7 `agent.js` (does) \u00b7 `channels.js` (Telegram out) \u00b7 `worker.js` (queue) \u00b7", 1)

# ---- 4. roadmap + open decisions --------------------------------------------
old_road = "1. **UNBLOCK DEPLOY** (\u00a71) \u2192 push everything \u2192 founder does a full real test (sign in \u2192 wizard \u2192 paywall \u2192 pay \u2192 generate)."
assert old_road in s, "roadmap anchor"
s = s.replace(old_road, "1. **UNBLOCK DEPLOY** (\u00a71) \u2192 push everything \u2192 founder does a full real test\n   (sign in \u2192 wizard \u2192 paywall \u2192 pay \u2192 chat with Nimbo \u2192 connect Telegram \u2192 voice note).", 1)

old_dec = "- [ ] When to create the separate **Nimbo** Dodo business?"
assert old_dec in s, "decisions anchor"
s = s.replace(old_dec, old_dec + "\n- [ ] **Create the Telegram bot** via @BotFather and send me the token + username (\u00a712) \u2014 free, 5 min, blocks nothing else", 1)

# ---- 5. status log ----------------------------------------------------------
s = s.rstrip() + """
- **11 Oct (later)** \u2014 **AUTONOMOUS ENGINE built**: message / voice note / email \u2192 queue \u2192 worker \u2192
  brain decides \u2192 Nimbo acts \u2192 answers on the same channel. Telegram (text + free voice understanding),
  web chat, inbound email, background + scheduled workers, action ledger, autopilot now pushes to the
  creator's phone. Plan + quota enforced on every channel. Tested end-to-end locally with real Gemini
  (`tools/test-agent.js`, `tools/test-telegram.js`) and the UI verified in a browser. Also fixed:
  `profile.js` was wiping server-set fields (Dodo subscription ids) on every setup edit; autopilot
  ignored plan + quota. Added `NIMBO_LOCAL_STORE` so everything is testable without a deploy.
"""

io.open(P, "w", encoding="utf-8").write(s)
print("CLAUDE.md updated -> sections 4, 5, 10, 11 + new section 12")
