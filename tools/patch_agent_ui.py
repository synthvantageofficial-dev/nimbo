# -*- coding: utf-8 -*-
# Front-end for the autonomous engine:
#   1. "Talk to Nimbo" chat  -> /ask  (same brain as Telegram & email)
#   2. "Connect Telegram"    -> /connect (code + one-tap link)
#   3. "What Nimbo did"      -> the action ledger, so autonomy is visible
import io

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/nimbo-site/app.html"
s = io.open(P, encoding="utf-8").read()

# ---------------------------------------------------------------- 1. CSS
CSS = """
  /* ---------- Talk to Nimbo (the agent) ---------- */
  .agentbox{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 18px 40px rgba(90,70,170,.10);margin-bottom:18px}
  .agenthead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px}
  .agenthead h2{font-size:1.25rem}
  .agentpill{background:#e9fbf4;color:#1c7a5a;font-weight:800;font-size:.72rem;padding:4px 10px;border-radius:999px}
  .agentsub{color:var(--ink-soft);font-weight:600;font-size:.92rem;margin:0 0 14px}
  .chat{max-height:380px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:4px 2px 10px}
  .bub{max-width:88%;padding:11px 14px;border-radius:16px;font-weight:600;font-size:.95rem;white-space:pre-wrap;word-break:break-word}
  .bub.me{align-self:flex-end;background:linear-gradient(180deg,var(--accent),var(--accent-d));color:#fff;border-bottom-right-radius:5px}
  .bub.nb{align-self:flex-start;background:#f4f1ff;border:1px solid var(--line);border-bottom-left-radius:5px}
  .bub.err{align-self:flex-start;background:#fff1f1;border:1px solid #ffd7d7;color:#a33}
  .chatempty{color:var(--ink-soft);font-weight:600;font-size:.92rem;text-align:center;padding:14px 6px}
  .dots span{display:inline-block;width:7px;height:7px;margin-right:4px;border-radius:50%;background:var(--accent);opacity:.35;animation:bl 1.1s infinite}
  .dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}
  @keyframes bl{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
  .askrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
  .askrow input{flex:1;min-width:170px;border:2px solid var(--line);border-radius:14px;padding:.8em 1em;font:inherit;font-weight:600}
  .askrow input:focus{outline:none;border-color:var(--accent)}
  .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .chips b{cursor:pointer;background:#f4f1ff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:.82rem;font-weight:800;color:var(--accent-d)}
  .chips b:hover{background:#ece6ff}

  /* ---------- channels ---------- */
  .chan{display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-top:1px dashed var(--line);margin-top:16px;padding-top:16px}
  .chan .ci{font-size:1.6rem}
  .chan .ct{flex:1;min-width:190px}
  .chan .ct b{display:block;font-family:var(--fdisplay);font-weight:600}
  .chan .ct span{color:var(--ink-soft);font-weight:600;font-size:.86rem}
  .code{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:800;letter-spacing:3px;font-size:1.15rem;background:#f4f1ff;border:2px dashed var(--accent);border-radius:12px;padding:8px 14px;color:var(--accent-d)}
  .tgbtn{display:inline-block;text-decoration:none;background:#229ED9;color:#fff;font-family:var(--fdisplay);font-weight:600;padding:.7em 1.15em;border-radius:12px;box-shadow:0 8px 18px rgba(34,158,217,.3)}
  .okdot{color:#1c7a5a;font-weight:800;font-size:.88rem}

  /* ---------- action ledger ---------- */
  .ledger{margin-top:16px;border-top:1px dashed var(--line);padding-top:14px}
  .ledger h3{font-size:1rem;margin-bottom:8px}
  .ledger ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
  .ledger li{display:flex;gap:9px;align-items:flex-start;font-weight:600;font-size:.88rem;color:var(--ink)}
  .ledger li em{color:var(--ink-soft);font-style:normal;font-weight:700;font-size:.8rem;white-space:nowrap}
  .ledger .none{color:var(--ink-soft);font-weight:600;font-size:.88rem}
"""
assert "</style>" in s
s = s.replace("</style>", CSS + "</style>", 1)

# ---------------------------------------------------------------- 2. HTML
HTML = """
    <!-- ================= TALK TO NIMBO (the autonomous agent) ================= -->
    <div class="agentbox">
      <div class="agenthead">
        <h2>Talk to Nimbo</h2>
        <span class="agentpill" id="agentState">Agent ready</span>
      </div>
      <p class="agentsub">Bas bolo kya chahiye - main kaam karke de deta hun. Koi form bharne ki zarurat nahi.</p>

      <div class="chat" id="chat"></div>

      <div class="askrow">
        <input id="askInput" type="text" placeholder="e.g. gym motivation par ek reel banao" autocomplete="off" />
        <button class="btn" type="button" id="askSend">Send</button>
      </div>
      <div class="chips" id="askChips">
        <b data-ask="ek reel banao">ek reel banao</b>
        <b data-ask="kya trend kar raha hai">kya trend kar raha hai</b>
        <b data-ask="roz khud banao">roz khud banao</b>
        <b data-ask="kitne video bache">kitne video bache</b>
        <b data-ask="tune kya kya banaya">tune kya kya banaya</b>
      </div>

      <!-- Telegram: message or voice-note Nimbo from your phone -->
      <div class="chan" id="chanTg">
        <span class="ci">💬</span>
        <span class="ct">
          <b>Nimbo ko phone se message karo</b>
          <span id="tgSub">Telegram jod lo - phir chalte-firte text ya voice note bhejo, Nimbo kaam karke bhej dega.</span>
        </span>
        <span id="tgAction"></span>
      </div>

      <!-- What Nimbo did on its own -->
      <div class="ledger" id="ledger">
        <h3>🤖 Nimbo ne khud kya kiya</h3>
        <div class="none" id="ledgerNone">Abhi tak kuch nahi. Autopilot ON karo ya kuch banane ko bolo.</div>
        <ul id="ledgerList"></ul>
      </div>
    </div>
"""
anchor = """      <button id="freshOpen">See it \u2606</button>
    </div>"""
if anchor not in s:
    anchor = """      <button id="freshOpen">See it \u2601\ufe0f</button>
    </div>"""
assert anchor in s, "freshBanner anchor not found"
s = s.replace(anchor, anchor + HTML, 1)

# ---------------------------------------------------------------- 3. JS
JS = """
  // ======================= THE AGENT: chat, channels, ledger =======================
  var convLoaded = false, pollTimer = null;

  function bubble(text, cls){
    var b = el('div','bub ' + (cls||'nb'), '');
    b.textContent = text;
    $('chat').appendChild(b);
    $('chat').scrollTop = $('chat').scrollHeight;
    return b;
  }
  function typingBubble(){
    var b = el('div','bub nb','');
    b.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>';
    $('chat').appendChild(b);
    $('chat').scrollTop = $('chat').scrollHeight;
    return b;
  }
  function renderConv(conv){
    var c = $('chat'); if(!c) return;
    c.innerHTML = '';
    if(!conv || !conv.length){
      var e = el('div','chatempty','Nimbo yahan hai. Niche likho ya koi suggestion dabao.');
      c.appendChild(e); return;
    }
    conv.forEach(function(m){ bubble(m.text || '', m.role === 'nimbo' ? 'nb' : 'me'); });
  }
  function timeAgo(ts){
    var m = Math.max(1, Math.round((Date.now() - (ts||0))/60000));
    if(m < 60) return m + 'm ago';
    var h = Math.round(m/60);
    if(h < 24) return h + 'h ago';
    return Math.round(h/24) + 'd ago';
  }
  var KIND_ICON = { content:'🎬', research:'🔎', setting:'⚙️', autopilot:'🤖', connect:'🔗', inbox:'📩', info:'•' };
  function renderLedger(events){
    var list = $('ledgerList'), none = $('ledgerNone');
    if(!list) return;
    list.innerHTML = '';
    if(!events || !events.length){ none.style.display='block'; return; }
    none.style.display='none';
    events.slice(0,8).forEach(function(e){
      var li = document.createElement('li');
      li.appendChild(el('span','', (KIND_ICON[e.kind] || '•')));
      li.appendChild(el('span','', e.text || ''));
      li.appendChild(el('em','', timeAgo(e.at)));
      list.appendChild(li);
    });
  }

  function loadConv(){
    if(!token) return;
    fetch(FN + '/ask', { headers:{ 'Authorization':'Bearer ' + token } })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if(!d) return;
        convLoaded = true;
        renderConv(d.conv);
        renderLedger(d.events);
      })
      .catch(function(){});
  }

  function setAgentState(txt){ var p = $('agentState'); if(p) p.textContent = txt; }

  function ask(text){
    if(!text || !token) return;
    var input = $('askInput');
    if(input) input.value = '';
    var empty = $('chat').querySelector('.chatempty'); if(empty) empty.remove();
    bubble(text, 'me');
    var typing = typingBubble();
    setAgentState('Nimbo kaam kar raha hai...');
    $('askSend').disabled = true;

    fetch(FN + '/ask', {
      method:'POST',
      headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' },
      body: JSON.stringify({ text: text })
    })
    .then(function(r){ return r.json().then(function(d){ return { status:r.status, d:d }; }); })
    .then(function(res){
      if(res.status === 401){ typing.remove(); clearToken(); showGate(); return; }
      if(!res.d || !res.d.taskId){
        typing.remove(); $('askSend').disabled = false; setAgentState('Agent ready');
        bubble((res.d && res.d.error) || 'Nimbo se baat nahi ho payi. Phir try karo.', 'err');
        return;
      }
      pollTask(res.d.taskId, typing, 0);
    })
    .catch(function(){
      typing.remove(); $('askSend').disabled = false; setAgentState('Agent ready');
      bubble('Network problem. Phir try karo.', 'err');
    });
  }

  // Nimbo works in the background (research + writing takes a while), so we poll for the answer.
  function pollTask(taskId, typing, tries){
    if(tries > 60){
      typing.remove(); $('askSend').disabled = false; setAgentState('Agent ready');
      bubble('Thoda zyada time lag raha hai. Page refresh karke dekho - kaam ho gaya hoga.', 'err');
      return;
    }
    pollTimer = setTimeout(function(){
      fetch(FN + '/ask?taskId=' + encodeURIComponent(taskId), { headers:{ 'Authorization':'Bearer ' + token } })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(d){
          if(!d){ pollTask(taskId, typing, tries + 1); return; }
          if(d.status === 'done'){
            typing.remove(); $('askSend').disabled = false; setAgentState('Agent ready');
            bubble(d.reply || 'Ho gaya.', 'nb');
            refreshAfterWork(d.intent);
            return;
          }
          if(d.status === 'error'){
            typing.remove(); $('askSend').disabled = false; setAgentState('Agent ready');
            bubble(d.error || 'Kuch galat ho gaya. Phir bolo.', 'err');
            return;
          }
          pollTask(taskId, typing, tries + 1);
        })
        .catch(function(){ pollTask(taskId, typing, tries + 1); });
    }, 2000);
  }

  // After Nimbo acts, pull the fresh state (new brief, new quota, changed settings).
  function refreshAfterWork(intent){
    fetch(FN + '/profile', { headers:{ 'Authorization':'Bearer ' + token } })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if(!d || !d.user) return;
        myProfile = d.profile || myProfile;
        briefsCache = d.briefs || briefsCache;
        updateUsage(d.usage);
        renderBriefList();
        renderLedger(d.events);
        if(myProfile){
          if(myProfile.niche) $('niche').value = myProfile.niche;
          if(myProfile.platform) $('platform').value = myProfile.platform;
          $('autopilot').checked = !!myProfile.autopilot;
        }
        if(intent === 'make_content' && briefsCache && briefsCache[0]) render(briefsCache[0]);
      })
      .catch(function(){});
  }

  // ---------- Telegram pairing ----------
  function renderTelegram(d){
    var act = $('tgAction'), sub = $('tgSub');
    if(!act) return;
    act.innerHTML = '';
    if(d && d.connected){
      sub.textContent = 'Connected' + (d.username ? ' as @' + d.username : '') + ' - ab phone se text ya voice note bhejo.';
      var ok = el('span','okdot','✅ Connected  ');
      var dis = el('button','signout','Disconnect');
      dis.onclick = function(){
        fetch(FN + '/connect', { method:'POST', headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' }, body:'{"disconnect":true}' })
          .then(function(){ loadTelegram(); });
      };
      act.appendChild(ok); act.appendChild(dis);
      return;
    }
    if(d && d.code){
      if(d.link){
        var a = document.createElement('a');
        a.className = 'tgbtn'; a.href = d.link; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Open Telegram & connect';
        act.appendChild(a);
        sub.textContent = 'Ek tap me jud jayega. Code: ' + d.code + ' (30 min valid)';
      } else {
        act.appendChild(el('span','code', d.code));
        sub.textContent = 'Nimbo bot ko ye code bhejo (30 minute valid). Bot ka link jaldi aa raha hai.';
      }
    }
  }
  function loadTelegram(){
    if(!token) return;
    fetch(FN + '/connect', { headers:{ 'Authorization':'Bearer ' + token } })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){ if(d) renderTelegram(d); })
      .catch(function(){});
  }

  function initAgent(d){
    renderConv((d && d.conv) || null);
    renderLedger((d && d.events) || []);
    loadConv();
    loadTelegram();
    setAgentState((d && d.profile && d.profile.autopilot) ? 'Autopilot ON' : 'Agent ready');
  }

  (function wireAgent(){
    var send = $('askSend'), input = $('askInput');
    if(send) send.addEventListener('click', function(){ ask(($('askInput').value || '').trim()); });
    if(input) input.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); ask((input.value || '').trim()); } });
    document.querySelectorAll('#askChips b').forEach(function(b){
      b.addEventListener('click', function(){ ask(b.getAttribute('data-ask')); });
    });
  })();

"""
js_anchor = "  function afterCheckout(){"
assert js_anchor in s, "boot anchor for JS not found"
s = s.replace(js_anchor, JS + js_anchor, 1)

# hook it into sign-in
old_hook = """    briefsCache = d.briefs||[];
    renderBriefList();
    showFresh();"""
new_hook = """    briefsCache = d.briefs||[];
    renderBriefList();
    showFresh();
    initAgent(d);"""
assert old_hook in s, "onSignedIn hook not found"
s = s.replace(old_hook, new_hook, 1)

io.open(P, "w", encoding="utf-8").write(s)
print("OK - app.html now has the agent chat, Telegram pairing and the action ledger")
