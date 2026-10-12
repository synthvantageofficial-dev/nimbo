# -*- coding: utf-8 -*-
# Builds SETUP-TEST.html : no-login walkthrough of setup wizard -> paywall -> summary.
import io

SRC = "C:/Users/acer/OneDrive/Desktop/personal ai instict/nimbo-site/app.html"
OUT = "C:/Users/acer/OneDrive/Desktop/personal ai instict/SETUP-TEST.html"
s = io.open(SRC, encoding="utf-8").read()

# 1) test banner
s = s.replace('<div class="wrap">',
  '<div style="background:linear-gradient(90deg,#7c5cff,#ff8fcf);color:#fff;text-align:center;padding:10px 16px;font-family:Fredoka,system-ui,sans-serif;font-weight:600">TEST MODE - no login, no payment, nothing is saved.</div>\n<div class="wrap">', 1)

# 2) boot straight into the wizard with test plans
boot_old = "  if(token){ loadSession(); } else { showGate(); }"
boot_new = """  token = 'test';
  PLANS = {
    starter: { id:'starter', name:'Starter', price:19, videos:30,  blurb:'1 video a day' },
    creator: { id:'creator', name:'Creator', price:39, videos:90,  blurb:'3 videos a day' },
    pro:     { id:'pro',     name:'Pro',     price:79, videos:300, blurb:'10 videos a day' }
  };
  DISCOUNT = 0.30;
  openWizard(null);"""
assert boot_old in s, "boot anchor"
s = s.replace(boot_old, boot_new, 1)

# 3) wizard finish -> go to paywall (no server)
fin_old = """    var body = wizCollect();
    $('wizNext').disabled = true; $('wizNext').textContent = 'Saving...';"""
fin_new = """    var body = wizCollect();
    window._setup = body;
    myProfile = body;
    $('wiz').style.display = 'none';
    openPaywall();
    return;"""
assert fin_old in s, "finish anchor"
s = s.replace(fin_old, fin_new, 1)

# 4) choosing a plan -> show the full summary (no server)
pay_old = """    fetch(FN + '/subscribe', { method:'POST', headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' }, body: JSON.stringify({ plan: plan }) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        btn.disabled = false; btn.textContent = old;
        if(d && d.ok){ $('paywall').style.display = 'none'; loadSession(); }
        else { $('payNote').textContent = (d && d.error) || 'Could not activate. Please try again.'; }
      })
      .catch(function(){ btn.disabled = false; btn.textContent = old; $('payNote').textContent = 'Network error. Please try again.'; });"""
pay_new = """    var pl = PLANS[plan];
    var data = window._setup || {};
    var price = Math.round(pl.price * (1 - DISCOUNT));
    document.getElementById('paywall').innerHTML =
      '<div class="payhead"><h2>All set - Nimbo is ready</h2>'
      + '<p>Plan: <b>' + pl.name + '</b> - $' + price + '/month (was $' + pl.price + ') for <b>' + pl.videos + ' videos a month</b></p>'
      + '<div class="foundbadge">Founding price locked for life</div></div>'
      + '<div class="paynote">Everything below is what Nimbo now knows about you - it uses ALL of it automatically.</div>'
      + '<pre style="white-space:pre-wrap;text-align:left;background:#fff;border:1px solid #ece7ff;border-radius:16px;padding:18px;margin-top:16px;font-weight:600;font-size:.84rem;line-height:1.5;overflow:auto">'
      + JSON.stringify(data, null, 2).replace(/</g, '&lt;') + '</pre>'
      + '<div style="text-align:center"><button type="button" class="btn" style="margin-top:18px" onclick="location.reload()">Test again</button></div>';
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
    return;"""
assert pay_old in s, "choosePlan anchor"
s = s.replace(pay_old, pay_new, 1)

io.open(OUT, "w", encoding="utf-8").write(s)
print("SETUP-TEST.html rebuilt (" + str(len(s)) + " bytes)")
