# -*- coding: utf-8 -*-
# Founder: "sab kuch gachal-pachal hai, kuch samajh nahi aa raha" + "everything in English".
# Fix: ONE clear thing on screen (talk to Nimbo). The old manual form becomes a collapsed
# "Manual mode" section instead of a second, competing way to do the same job.
import io

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/nimbo-site/app.html"
s = io.open(P, encoding="utf-8").read()

def rep(old, new, why):
    global s
    if new in s:
        print("  (already) " + why); return
    assert old in s, "MISSING: " + why + " -> " + old[:80]
    s = s.replace(old, new, 1)
    print("  ok " + why)

# ---------------------------------------------------------------- 1. hero
rep("""<h1>Tell Nimbo your niche.<br>Get a ready-to-shoot brief.</h1>""",
    """<h1>Your whole content team,<br>in one agent you just talk to.</h1>""",
    "hero headline")

# (hero subline handled directly)

# ---------------------------------------------------------------- 2. agent panel copy -> English
rep("""      <p class="agentsub">Bas bolo kya chahiye - main kaam karke de deta hun. Koi form bharne ki zarurat nahi.</p>""",
    """      <p class="agentsub">Just tell Nimbo what you need and it does the work. Write in any language &mdash; it always replies in English.</p>""",
    "agent subtitle")

rep("""        <input id="askInput" type="text" placeholder="e.g. gym motivation par ek reel banao" autocomplete="off" />""",
    """        <input id="askInput" type="text" placeholder="e.g. make a reel about gym motivation" autocomplete="off" />""",
    "chat placeholder")

rep("""        <b data-ask="ek reel banao">ek reel banao</b>
        <b data-ask="kya trend kar raha hai">kya trend kar raha hai</b>
        <b data-ask="roz khud banao">roz khud banao</b>
        <b data-ask="kitne video bache">kitne video bache</b>
        <b data-ask="tune kya kya banaya">tune kya kya banaya</b>""",
    """        <b data-ask="make a reel for me">make a reel</b>
        <b data-ask="what is trending right now">what's trending</b>
        <b data-ask="work on your own every day">work on your own daily</b>
        <b data-ask="how many videos do I have left">videos left</b>
        <b data-ask="what have you made so far">what have you made</b>""",
    "suggestion chips")

rep("""          <b>Nimbo ko phone se message karo</b>
          <span id="tgSub">Telegram jod lo - phir chalte-firte text ya voice note bhejo, Nimbo kaam karke bhej dega.</span>""",
    """          <b>Message Nimbo from your phone</b>
          <span id="tgSub">Connect Telegram, then text or send a voice note from anywhere. Nimbo does the work and sends it back.</span>""",
    "telegram card copy")

rep("""        <h3>🤖 Nimbo ne khud kya kiya</h3>
        <div class="none" id="ledgerNone">Abhi tak kuch nahi. Autopilot ON karo ya kuch banane ko bolo.</div>""",
    """        <h3>🤖 What Nimbo did on its own</h3>
        <div class="none" id="ledgerNone">Nothing yet. Turn on autopilot, or ask Nimbo to make something.</div>""",
    "ledger heading")

# ---------------------------------------------------------------- 3. JS strings -> English
pairs = [
 ("var e = el('div','chatempty','Nimbo yahan hai. Niche likho ya koi suggestion dabao.');",
  "var e = el('div','chatempty','Nimbo is ready. Type below, or tap a suggestion.');",
  "empty chat"),
 ("setAgentState('Nimbo kaam kar raha hai...');",
  "setAgentState('Nimbo is working...');",
  "working state"),
 ("bubble((res.d && res.d.error) || 'Nimbo se baat nahi ho payi. Phir try karo.', 'err');",
  "bubble((res.d && res.d.error) || 'Could not reach Nimbo. Please try again.', 'err');",
  "send error"),
 ("bubble('Network problem. Phir try karo.', 'err');",
  "bubble('Network problem. Please try again.', 'err');",
  "network error"),
 ("bubble('Thoda zyada time lag raha hai. Page refresh karke dekho - kaam ho gaya hoga.', 'err');",
  "bubble('This is taking longer than usual. Refresh the page - it has probably finished.', 'err');",
  "timeout message"),
 ("bubble(d.reply || 'Ho gaya.', 'nb');",
  "bubble(d.reply || 'Done.', 'nb');",
  "done fallback"),
 ("bubble(d.error || 'Kuch galat ho gaya. Phir bolo.', 'err');",
  "bubble(d.error || 'Something went wrong. Please ask again.', 'err');",
  "task error"),
 ("sub.textContent = 'Connected' + (d.username ? ' as @' + d.username : '') + ' - ab phone se text ya voice note bhejo.';",
  "sub.textContent = 'Connected' + (d.username ? ' as @' + d.username : '') + ' - text or send a voice note from your phone any time.';",
  "telegram connected"),
 ("sub.textContent = 'Ek tap me jud jayega. Code: ' + d.code + ' (30 min valid)';",
  "sub.textContent = 'One tap to connect. Your code: ' + d.code + ' (valid 30 minutes)';",
  "telegram code line"),
 ("sub.textContent = 'Nimbo bot ko ye code bhejo (30 minute valid). Bot ka link jaldi aa raha hai.';",
  "sub.textContent = 'Send this code to the Nimbo bot (valid 30 minutes).';",
  "telegram code fallback"),
]
for old, new, why in pairs:
    rep(old, new, why)

# ---------------------------------------------------------------- 4. the big one:
# the old manual form becomes a collapsed section instead of a second front door.
old_open = """    <div class="box">
      <form id="f">"""
new_open = """    <details class="box manualbox">
      <summary>\u2699\ufe0f Manual mode &amp; settings</summary>
      <form id="f">"""
rep(old_open, new_open, "manual form -> collapsed section (open tag)")

old_close = """      <button type="button" class="editsetup" id="editSetup">Edit my setup</button>
      <button type="button" class="editsetup" id="changePlan" style="margin-left:14px">Change plan</button>
    </div>"""
new_close = """      <button type="button" class="editsetup" id="editSetup">Edit my setup</button>
      <button type="button" class="editsetup" id="changePlan" style="margin-left:14px">Change plan</button>
    </details>"""
rep(old_close, new_close, "manual form -> collapsed section (close tag)")

# styling for the collapsed section
rep("""  /* ---------- action ledger ---------- */""",
    """  /* ---------- manual mode (secondary, collapsed) ---------- */
  .manualbox{padding:16px 22px}
  .manualbox>summary{cursor:pointer;font-family:var(--fdisplay);font-weight:600;color:var(--ink-soft);list-style:none}
  .manualbox>summary::-webkit-details-marker{display:none}
  .manualbox>summary::before{content:'\\25B8 ';color:var(--accent)}
  .manualbox[open]>summary{margin-bottom:14px;color:var(--ink)}
  .manualbox[open]>summary::before{content:'\\25BE '}

  /* ---------- action ledger ---------- */""",
    "manual section styling")

io.open(P, "w", encoding="utf-8").write(s)
print("app.html cleaned up + fully English")
