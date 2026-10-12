# -*- coding: utf-8 -*-
# Founder: "code 30 min ke liye valid hai - matlab har 30 min code dalna padega?"
#          "aur code dalna kahan hai? woh jagah to hai hi nahi"
# Both are UI failures:
#   - we never said the code is a ONE-TIME pairing, not a recurring password
#   - we showed a code with no destination, because the bot does not exist yet
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

# ---------------------------------------------------------------- card markup
rep("""          <b>Message Nimbo from your phone</b>
          <span id="tgSub">Connect Telegram, then text or send a voice note from anywhere. Nimbo does the work and sends it back.</span>""",
    """          <b>Message Nimbo from your phone</b>
          <span id="tgSub">Loading&hellip;</span>
          <div class="tgsteps" id="tgSteps"></div>""",
    "telegram card markup")

# ---------------------------------------------------------------- styling
rep("""  /* ---------- manual mode (secondary, collapsed) ---------- */""",
    """  /* ---------- telegram pairing steps ---------- */
  .tgsteps{margin-top:10px}
  .tgsteps ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px}
  .tgsteps li{font-weight:700;font-size:.86rem;color:var(--ink)}
  .tgsteps .once{display:inline-block;margin-top:8px;background:#e9fbf4;color:#1c7a5a;font-weight:800;
    font-size:.78rem;padding:4px 10px;border-radius:999px}
  .tgsteps .soon{background:#fff7e3;color:#8a6400;font-weight:800;font-size:.8rem;padding:8px 12px;border-radius:12px;display:inline-block}
  .tgsteps .manual{color:var(--ink-soft);font-weight:700;font-size:.8rem;margin-top:8px}

  /* ---------- manual mode (secondary, collapsed) ---------- */""",
    "pairing step styles")

# ---------------------------------------------------------------- the logic
OLD_FN_START = "  function renderTelegram(d){"
i = s.index(OLD_FN_START)
j = s.index("  function loadTelegram(){")
NEW_FN = """  function renderTelegram(d){
    var act = $('tgAction'), sub = $('tgSub'), steps = $('tgSteps');
    if(!act) return;
    act.innerHTML = ''; steps.innerHTML = '';

    // Already paired - nothing more to do, ever.
    if(d && d.connected){
      sub.textContent = 'Connected' + (d.username ? ' as @' + d.username : '') + '. Text or send a voice note from your phone any time.';
      var ok = el('span','okdot','\\u2705 Connected  ');
      var dis = el('button','signout','Disconnect');
      dis.onclick = function(){
        fetch(FN + '/connect', { method:'POST', headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' }, body:'{"disconnect":true}' })
          .then(function(){ loadTelegram(); });
      };
      act.appendChild(ok); act.appendChild(dis);
      return;
    }

    // The bot is not live yet - say that plainly instead of showing a code with nowhere to go.
    if(!d || !d.bot){
      sub.textContent = 'Soon you will be able to text or send a voice note to Nimbo from your phone, and get the work back there.';
      var soon = el('div','soon','\\uD83D\\uDD27 Being set up - this turns on in the next update.');
      steps.appendChild(soon);
      return;
    }

    // Bot is live: one tap, one time.
    sub.textContent = 'Link your Telegram once, then just message Nimbo from your phone.';
    var ol = document.createElement('ol');
    [ 'Tap the button - it opens Nimbo in Telegram.',
      'Press Start. You are connected.',
      'Now message or send a voice note any time.' ].forEach(function(t){
      var li = document.createElement('li'); li.textContent = t; ol.appendChild(li);
    });
    steps.appendChild(ol);
    steps.appendChild(el('span','once','\\u2705 One time only - you will never need a code again'));
    if(d.code){
      steps.appendChild(el('div','manual','Rather do it by hand? Open @' + d.bot + ' in Telegram and send: ' + d.code + ' (this code works for the next 30 minutes)'));
    }

    var a = document.createElement('a');
    a.className = 'tgbtn'; a.href = d.link || ('https://t.me/' + d.bot); a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'Connect Telegram';
    act.appendChild(a);
  }
"""
s = s[:i] + NEW_FN + s[j:]
print("  ok renderTelegram rewritten")

io.open(P, "w", encoding="utf-8").write(s)
print("connect UI fixed")
