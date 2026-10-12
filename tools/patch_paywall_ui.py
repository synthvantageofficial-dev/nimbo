# -*- coding: utf-8 -*-
# Paywall UI: 3 plan cards, gating flow (sign in -> setup -> paywall -> app).
import io, sys

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/nimbo-site/app.html"
s = io.open(P, encoding="utf-8").read()
if 'id="paywall"' in s:
    print("paywall already present - aborting"); sys.exit(0)

# ---------------- CSS ----------------
css_anchor = "  .editsetup{background:none;border:0;color:var(--accent-d);font-weight:800;font-size:.82rem;cursor:pointer;text-decoration:underline;margin-top:14px;padding:0}"
css_add = """
  .pay{display:none;max-width:880px;margin-inline:auto}
  .payhead{text-align:center}
  .payhead h2{font-size:1.65rem}
  .payhead p{color:var(--ink-soft);font-weight:600;margin-top:10px}
  .foundbadge{display:inline-block;background:#e7f8f1;color:#157a56;font-weight:800;font-size:.8rem;padding:6px 14px;border-radius:999px;margin-top:14px}
  .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:28px;align-items:stretch}
  @media(max-width:780px){.plans{grid-template-columns:1fr}}
  .plan{background:#fff;border:2px solid var(--line);border-radius:22px;padding:26px 20px 22px;text-align:center;position:relative;display:flex;flex-direction:column}
  .plan.best{border-color:var(--accent);box-shadow:0 16px 36px rgba(124,92,255,.18)}
  .plan .tag2{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;font-family:var(--fdisplay);font-weight:700;font-size:.74rem;padding:4px 12px;border-radius:999px;white-space:nowrap}
  .plan h3{font-size:1.25rem}
  .plan .was{color:var(--ink-soft);text-decoration:line-through;font-weight:700;font-size:.95rem;margin-top:12px}
  .plan .now{font-family:var(--fdisplay);font-weight:600;font-size:2.2rem;color:var(--ink);line-height:1;margin-top:2px}
  .plan .per{color:var(--ink-soft);font-weight:700;font-size:.82rem;margin-top:4px}
  .plan ul{list-style:none;padding:0;margin:18px 0 0;text-align:left;flex:1}
  .plan li{font-weight:600;color:var(--ink);padding:5px 0;font-size:.9rem}
  .plan li::before{content:"\\2713  ";color:#157a56;font-weight:900}
  .plan .btn{width:100%;margin-top:18px;justify-content:center;display:block}
  .paynote{text-align:center;color:var(--ink-soft);font-weight:700;font-size:.82rem;margin-top:20px}
  .curplan{background:#efe9ff;color:var(--accent-d);font-weight:800;font-size:.72rem;padding:3px 9px;border-radius:999px;margin-left:6px}"""
assert css_anchor in s, "css anchor"
s = s.replace(css_anchor, css_anchor + css_add, 1)

# ---------------- MARKUP ----------------
m_anchor = '  <div id="appArea" style="display:none">'
pay = """  <!-- PAYWALL -->
  <div id="paywall" class="pay">
    <div class="payhead">
      <h2>Pick your plan to start</h2>
      <p>Nimbo replaces the $290+/month pile of creator tools. One agent, one price.</p>
      <div class="foundbadge" id="foundBadge">Founding creator - 30% off for life</div>
    </div>
    <div class="plans" id="planCards"></div>
    <div class="paynote" id="payNote">Cancel anytime. Your plan sets how many videos Nimbo makes for you each month.</div>
  </div>

"""
assert m_anchor in s, "markup anchor"
s = s.replace(m_anchor, pay + m_anchor, 1)

# ---------------- "Change plan" button next to Edit my setup ----------------
s = s.replace(
  '<button type="button" class="editsetup" id="editSetup">Edit my setup</button>',
  '<button type="button" class="editsetup" id="editSetup">Edit my setup</button>\n      <button type="button" class="editsetup" id="changePlan" style="margin-left:14px">Change plan</button>',
  1)

# ---------------- showGate hides paywall ----------------
s = s.replace(
  """  function showGate(){
    var wz=$('wiz'); if(wz) wz.style.display='none';""",
  """  function showGate(){
    var wz=$('wiz'); if(wz) wz.style.display='none';
    var pw=$('paywall'); if(pw) pw.style.display='none';""",
  1)

# ---------------- usage pill shows plan + monthly quota ----------------
s = s.replace(
  """    p.textContent=(u.count||0)+'/'+(u.limit||10)+' today';""",
  """    var pn = (myProfile && myProfile.plan) ? (myProfile.plan.charAt(0).toUpperCase()+myProfile.plan.slice(1)+' - ') : '';
    p.textContent = pn + (u.count||0) + '/' + (u.limit||0) + ' this month';""",
  1)

# ---------------- routing: setup -> paywall -> app ----------------
old_route = """    myProfile = d.profile || null;
    if(!d.profile || !d.profile.onboarded){ openWizard(d.profile); return; }
    $('wiz').style.display='none';
    $('appArea').style.display='block';"""
new_route = """    myProfile = d.profile || null;
    if(d.plans) PLANS = d.plans;
    if(typeof d.foundingDiscount === 'number') DISCOUNT = d.foundingDiscount;
    if(!d.profile || !d.profile.onboarded){ openWizard(d.profile); return; }
    var _pl = d.profile.plan;
    var _active = _pl && (!d.profile.planStatus || d.profile.planStatus === 'active');
    if(!_active){ openPaywall(); return; }
    $('wiz').style.display='none';
    $('paywall').style.display='none';
    $('appArea').style.display='block';"""
assert old_route in s, "route anchor"
s = s.replace(old_route, new_route, 1)

# ---------------- generate errors -> paywall ----------------
old_err = """        if(res.status===401){ clearToken(); showGate(); return; }
        if(res.d && res.d.usage) updateUsage(res.d.usage);"""
new_err = """        if(res.status===401){ clearToken(); showGate(); return; }
        if(res.status===402 || (res.d && (res.d.needPlan || res.d.needUpgrade))){ openPaywall(res.d && res.d.error); return; }
        if(res.d && res.d.usage) updateUsage(res.d.usage);"""
assert old_err in s, "generate error anchor"
s = s.replace(old_err, new_err, 1)

# ---------------- paywall JS before boot ----------------
boot = "  if(token){ loadSession(); } else { showGate(); }"
pay_js = """  // ---------- PAYWALL ----------
  var PLANS = null, DISCOUNT = 0.30;

  function openPaywall(msg){
    $('gate').style.display = 'none';
    var wz = $('wiz'); if(wz) wz.style.display = 'none';
    $('appArea').style.display = 'none';
    $('paywall').style.display = 'block';
    if(msg) $('payNote').textContent = msg;
    renderPlans();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
  }

  function renderPlans(){
    var box = $('planCards'); if(!box) return;
    box.innerHTML = '';
    var order = ['starter','creator','pro'];
    var cur = myProfile && myProfile.plan;
    $('foundBadge').textContent = 'Founding creator - ' + Math.round(DISCOUNT*100) + '% off for life';
    order.forEach(function(k){
      var p = PLANS && PLANS[k];
      if(!p) return;
      var disc = Math.round(p.price * (1 - DISCOUNT));
      var card = document.createElement('div');
      card.className = 'plan' + (k === 'creator' ? ' best' : '');
      var h = '';
      if(k === 'creator') h += '<div class="tag2">Most popular</div>';
      h += '<h3>' + p.name + (cur === k ? '<span class="curplan">current</span>' : '') + '</h3>';
      h += '<div class="was">$' + p.price + '/mo</div>';
      h += '<div class="now">$' + disc + '</div><div class="per">per month, locked for life</div>';
      h += '<ul>'
         + '<li>' + p.videos + ' videos a month (' + p.blurb + ')</li>'
         + '<li>Live trend research + scripts</li>'
         + '<li>Titles, thumbnails, captions, hashtags</li>'
         + '<li>All platforms: Reels, TikTok, Shorts, YouTube</li>'
         + '<li>Daily autopilot</li>'
         + (k !== 'starter' ? '<li>Priority generation</li>' : '')
         + (k === 'pro' ? '<li>Team / agency use</li>' : '')
         + '</ul>';
      card.innerHTML = h;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn';
      btn.textContent = (cur === k) ? 'Keep ' + p.name : 'Choose ' + p.name;
      btn.addEventListener('click', function(){ choosePlan(k, btn); });
      card.appendChild(btn);
      box.appendChild(card);
    });
  }

  function choosePlan(plan, btn){
    if(!token){ showGate(); return; }
    var old = btn.textContent;
    btn.disabled = true; btn.textContent = 'Activating...';
    fetch(FN + '/subscribe', { method:'POST', headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' }, body: JSON.stringify({ plan: plan }) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        btn.disabled = false; btn.textContent = old;
        if(d && d.ok){ $('paywall').style.display = 'none'; loadSession(); }
        else { $('payNote').textContent = (d && d.error) || 'Could not activate. Please try again.'; }
      })
      .catch(function(){ btn.disabled = false; btn.textContent = old; $('payNote').textContent = 'Network error. Please try again.'; });
  }

  var cpb = $('changePlan');
  if(cpb) cpb.addEventListener('click', function(){ openPaywall(); });

"""
assert boot in s, "boot anchor"
s = s.replace(boot, pay_js + boot, 1)

io.open(P, "w", encoding="utf-8").write(s)
print("OK - paywall UI inserted")
