# -*- coding: utf-8 -*-
# Front-end: plan click -> Dodo checkout link -> pay -> return -> verify -> app.
import io

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/nimbo-site/app.html"
s = io.open(P, encoding="utf-8").read()

# 1) choosePlan -> real Dodo checkout
old = """    fetch(FN + '/subscribe', { method:'POST', headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' }, body: JSON.stringify({ plan: plan }) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        btn.disabled = false; btn.textContent = old;
        if(d && d.ok){ $('paywall').style.display = 'none'; loadSession(); }
        else { $('payNote').textContent = (d && d.error) || 'Could not activate. Please try again.'; }
      })
      .catch(function(){ btn.disabled = false; btn.textContent = old; $('payNote').textContent = 'Network error. Please try again.'; });"""
new = """    fetch(FN + '/checkout', { method:'POST', headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' }, body: JSON.stringify({ plan: plan }) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d && d.payment_link){ window.location.href = d.payment_link; return; }
        btn.disabled = false; btn.textContent = old;
        $('payNote').textContent = (d && d.error) || 'Could not open checkout. Please try again.';
      })
      .catch(function(){ btn.disabled = false; btn.textContent = old; $('payNote').textContent = 'Network error. Please try again.'; });"""
assert old in s, "choosePlan anchor"
s = s.replace(old, new, 1)
s = s.replace("btn.disabled = true; btn.textContent = 'Activating...';",
              "btn.disabled = true; btn.textContent = 'Opening checkout...';", 1)

# 2) boot: handle the return from Dodo checkout
boot_old = "  if(token){ loadSession(); } else { showGate(); }"
boot_new = """  function afterCheckout(){
    if(!token){ showGate(); return; }
    $('paywall').style.display = 'block';
    $('payNote').textContent = 'Confirming your payment...';
    fetch(FN + '/subscribe', { method:'POST', headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' }, body: '{}' })
      .then(function(r){ return r.json(); })
      .then(function(d){
        try { history.replaceState({}, '', location.pathname); } catch(e){}
        if(d && d.active){ $('paywall').style.display = 'none'; loadSession(); }
        else { $('payNote').textContent = 'Payment not confirmed yet. If you just paid, wait a few seconds and refresh this page.'; }
      })
      .catch(function(){ $('payNote').textContent = 'Could not confirm the payment. Please refresh.'; });
  }

  if(token){
    if(location.search.indexOf('checkout=done') >= 0) { afterCheckout(); }
    else { loadSession(); }
  } else { showGate(); }"""
assert boot_old in s, "boot anchor"
s = s.replace(boot_old, boot_new, 1)

io.open(P, "w", encoding="utf-8").write(s)
print("OK - frontend wired to Dodo checkout")
