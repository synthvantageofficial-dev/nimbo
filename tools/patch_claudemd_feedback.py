# -*- coding: utf-8 -*-
# Records the founder's 11-Oct feedback round and how each point was fixed.
import io

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/CLAUDE.md"
s = io.open(P, encoding="utf-8").read()

MARK = "## 11 Oct (evening) - founder tested it"
if MARK in s:
    print("already recorded")
else:
    s = s.rstrip() + """

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
"""
    io.open(P, "w", encoding="utf-8").write(s)
    print("CLAUDE.md updated with the feedback round")
