# -*- coding: utf-8 -*-
# Inserts the one-time setup wizard (CSS + markup + JS) into nimbo-site/app.html
import io, sys

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/nimbo-site/app.html"
src = io.open(P, encoding="utf-8").read()

if "wizstep" in src:
    print("wizard already present - aborting")
    sys.exit(0)

# ---------------- 1) CSS ----------------
css_anchor = "  .hint{color:var(--ink-soft);font-weight:700;font-size:.8rem;margin-top:8px}"
css_add = """
  .wiz{display:none;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:26px 24px;box-shadow:0 18px 40px rgba(90,70,170,.10);max-width:660px;margin-inline:auto}
  .wiz h2{font-size:1.4rem}
  .wiz .wsub{color:var(--ink-soft);font-weight:600;margin-top:8px;font-size:.95rem}
  .wizbar{height:8px;background:#efeaff;border-radius:999px;margin:18px 0 6px;overflow:hidden}
  .wizbar i{display:block;height:100%;width:16%;background:linear-gradient(90deg,var(--accent),var(--pink));border-radius:999px;transition:width .25s}
  .wizcount{color:var(--ink-soft);font-weight:800;font-size:.8rem;text-align:right;margin-bottom:14px}
  .wizstep{display:none}
  .wizstep.on{display:block}
  .fld{margin-top:16px}
  .fld label{display:block;font-weight:800;margin-bottom:4px}
  .fld .hl{color:var(--ink-soft);font-weight:700;font-size:.8rem;margin-bottom:7px}
  .fld input[type=text],.fld textarea,.fld select{width:100%;border:2px solid var(--line);border-radius:14px;padding:.75em 1em;font:inherit;font-weight:600;background:#fff;color:var(--ink)}
  .fld textarea{min-height:74px;resize:vertical}
  .fld input:focus,.fld textarea:focus,.fld select:focus{outline:none;border-color:var(--accent)}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chipb{border:2px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;color:var(--ink)}
  .chipb.sel{border-color:var(--accent);background:#efe9ff;color:var(--accent-d)}
  .wiznav{display:flex;justify-content:space-between;gap:10px;margin-top:26px}
  .btnghost{background:#fff;color:var(--ink-soft);box-shadow:inset 0 0 0 2px var(--line);border:0;border-radius:14px;padding:.8em 1.3em;font-family:var(--fdisplay);font-weight:600;cursor:pointer}
  .editsetup{background:none;border:0;color:var(--accent-d);font-weight:800;font-size:.82rem;cursor:pointer;text-decoration:underline;margin-top:14px;padding:0}"""
assert css_anchor in src, "css anchor missing"
src = src.replace(css_anchor, css_anchor + css_add, 1)

# ---------------- 2) WIZARD MARKUP ----------------
m_anchor = '  <div id="appArea" style="display:none">'
wiz = """  <!-- ONE-TIME SETUP WIZARD -->
  <div id="wiz" class="wiz">
    <h2>Let us set up your Nimbo</h2>
    <div class="wsub">This is a one-time setup. After this Nimbo works on its own, so tell it everything.</div>
    <div class="wizbar"><i id="wizBar"></i></div>
    <div class="wizcount" id="wizCount">Step 1 of 6</div>

    <div class="wizstep on" data-step="1">
      <div class="fld"><label>Your name / channel name</label><input type="text" id="w_creatorName" placeholder="e.g. FitMom Priya"></div>
      <div class="fld"><label>Your niche</label><div class="hl">What is your content about?</div><input type="text" id="w_niche" placeholder="e.g. home workouts for busy parents"></div>
      <div class="fld"><label>Recurring themes</label><div class="hl">Comma separated - the topics you keep coming back to</div><input type="text" id="w_subTopics" placeholder="e.g. 10-min workouts, meal prep, mom hacks"></div>
      <div class="fld"><label>Who is your audience?</label><div class="hl">Age, situation, what they struggle with</div><textarea id="w_audience" placeholder="e.g. moms aged 28-40 with toddlers, no time for the gym, want quick results at home"></textarea></div>
      <div class="fld"><label>Language of your content</label>
        <select id="w_language"><option>English</option><option>Hindi</option><option>Hinglish</option><option>Spanish</option><option>Portuguese</option><option>Arabic</option><option>Other</option></select></div>
      <div class="fld"><label>Country / region</label><input type="text" id="w_country" placeholder="e.g. India"></div>
    </div>

    <div class="wizstep" data-step="2">
      <div class="fld"><label>Which platforms do you post on?</label><div class="hl">Pick all that apply</div>
        <div class="chips" data-group="platforms" data-multi="1">
          <button type="button" class="chipb" data-v="youtube_long">YouTube (long)</button>
          <button type="button" class="chipb" data-v="shorts">YouTube Shorts</button>
          <button type="button" class="chipb" data-v="instagram">Instagram Reels</button>
          <button type="button" class="chipb" data-v="tiktok">TikTok</button>
          <button type="button" class="chipb" data-v="facebook">Facebook</button>
        </div></div>
      <div class="fld"><label>Main format for Nimbo to write</label>
        <select id="w_platform">
          <option value="short">Short-form (Reels / TikTok / Shorts)</option>
          <option value="instagram">Instagram Reels</option>
          <option value="tiktok">TikTok</option>
          <option value="shorts">YouTube Shorts</option>
          <option value="youtube_long">YouTube - long video</option>
        </select></div>
      <div class="fld"><label>Your channel links</label><div class="hl">Optional - helps Nimbo learn your style</div>
        <input type="text" id="w_ytLink" placeholder="YouTube channel URL" style="margin-bottom:8px">
        <input type="text" id="w_igLink" placeholder="Instagram profile URL" style="margin-bottom:8px">
        <input type="text" id="w_ttLink" placeholder="TikTok profile URL"></div>
      <div class="fld"><label>How big is your audience?</label>
        <select id="w_size"><option>Just starting</option><option>Under 1K</option><option>1K - 10K</option><option>10K - 100K</option><option>100K - 1M</option><option>1M+</option></select></div>
    </div>

    <div class="wizstep" data-step="3">
      <div class="fld"><label>Your tone</label><div class="hl">Pick all that fit</div>
        <div class="chips" data-group="tone" data-multi="1">
          <button type="button" class="chipb" data-v="funny">Funny</button>
          <button type="button" class="chipb" data-v="educational">Educational</button>
          <button type="button" class="chipb" data-v="inspiring">Inspiring</button>
          <button type="button" class="chipb" data-v="bold">Bold / edgy</button>
          <button type="button" class="chipb" data-v="calm">Calm</button>
          <button type="button" class="chipb" data-v="storytelling">Storytelling</button>
          <button type="button" class="chipb" data-v="motivational">Motivational</button>
        </div></div>
      <div class="fld"><label>Do you show your face?</label>
        <div class="chips" data-group="onCamera">
          <button type="button" class="chipb" data-v="face">I show my face</button>
          <button type="button" class="chipb" data-v="faceless">Faceless</button>
        </div></div>
      <div class="fld"><label>Video style</label>
        <select id="w_videoStyle"><option>Talking head</option><option>Voiceover + b-roll</option><option>Tutorial / screen recording</option><option>Vlog</option><option>Animation / motion graphics</option><option>Mixed</option></select></div>
      <div class="fld"><label>Your brand voice</label><div class="hl">How do you talk? Nimbo will write exactly like this.</div>
        <textarea id="w_brand" placeholder="e.g. energetic and funny, short punchy sentences, talks like a friend, uses emojis, never corporate"></textarea></div>
      <div class="fld"><label>Never do / never say</label><div class="hl">Hard rules Nimbo must always respect</div>
        <textarea id="w_avoid" placeholder="e.g. no swearing, no diet shaming, never promise quick weight loss, no political topics"></textarea></div>
      <div class="fld"><label>Creators you admire</label><div class="hl">Style reference only - Nimbo will never copy them</div><input type="text" id="w_inspirations" placeholder="e.g. @somechannel, @another"></div>
    </div>

    <div class="wizstep" data-step="4">
      <div class="fld"><label>How often do you want to post?</label>
        <select id="w_frequency"><option>1 per week</option><option>2 per week</option><option>3 per week</option><option>5 per week</option><option>Daily</option><option>2x daily</option></select></div>
      <div class="fld"><label>Best days to post</label>
        <div class="chips" data-group="postDays" data-multi="1">
          <button type="button" class="chipb" data-v="Mon">Mon</button><button type="button" class="chipb" data-v="Tue">Tue</button>
          <button type="button" class="chipb" data-v="Wed">Wed</button><button type="button" class="chipb" data-v="Thu">Thu</button>
          <button type="button" class="chipb" data-v="Fri">Fri</button><button type="button" class="chipb" data-v="Sat">Sat</button>
          <button type="button" class="chipb" data-v="Sun">Sun</button>
        </div></div>
      <div class="fld"><label>Preferred posting time</label><div class="hl">Your local time</div><input type="text" id="w_postTime" placeholder="e.g. 7:00 PM"></div>
    </div>

    <div class="wizstep" data-step="5">
      <div class="fld"><label>How should Nimbo make your videos?</label><div class="hl">You can change this anytime</div>
        <div class="chips" data-group="videoTool">
          <button type="button" class="chipb" data-v="free_faceless">Free faceless video (no subscription)</button>
          <button type="button" class="chipb" data-v="heygen">My HeyGen account</button>
          <button type="button" class="chipb" data-v="other">Another tool I pay for</button>
        </div></div>
      <div class="fld" id="w_keyWrap" style="display:none"><label>Your tool API key</label><div class="hl">Stored privately. Nimbo uses YOUR subscription - we never charge for it.</div>
        <input type="text" id="w_videoToolKey" placeholder="paste your API key"></div>
      <div class="fld"><label>Voice for your videos</label>
        <select id="w_voicePref"><option>Natural female</option><option>Natural male</option><option>Energetic female</option><option>Calm male</option><option>My own cloned voice (later)</option></select></div>
      <div class="fld"><label>Caption style</label>
        <select id="w_captionStyle"><option>Big word-by-word (reels style)</option><option>Simple bottom captions</option><option>No captions</option></select></div>
      <div class="fld"><label>Background music</label>
        <select id="w_music"><option>Upbeat</option><option>Chill</option><option>Cinematic</option><option>Trending sound style</option><option>No music</option></select></div>
    </div>

    <div class="wizstep" data-step="6">
      <div class="fld"><label>How automatic should Nimbo be?</label>
        <div class="chips" data-group="automation">
          <button type="button" class="chipb" data-v="approve_first">Prepare everything, I approve before posting</button>
          <button type="button" class="chipb" data-v="full_auto">Full auto - create AND post by itself</button>
        </div></div>
      <div class="fld"><label>What may Nimbo do on its own?</label><div class="hl">Pick all you allow</div>
        <div class="chips" data-group="perms" data-multi="1">
          <button type="button" class="chipb" data-v="ideas">Find ideas + write scripts</button>
          <button type="button" class="chipb" data-v="video">Make the videos</button>
          <button type="button" class="chipb" data-v="schedule">Schedule posts</button>
          <button type="button" class="chipb" data-v="post">Publish to my channels</button>
          <button type="button" class="chipb" data-v="comments">Reply to comments</button>
        </div></div>
      <div class="fld"><label>Daily autopilot</label><div class="hl">Nimbo prepares fresh content for you every day</div>
        <div class="chips" data-group="autopilot">
          <button type="button" class="chipb" data-v="on">Yes, run daily</button>
          <button type="button" class="chipb" data-v="off">Not yet</button>
        </div></div>
    </div>

    <div class="wiznav">
      <button type="button" class="btnghost" id="wizBack">Back</button>
      <button type="button" class="btn" id="wizNext">Next</button>
    </div>
    <div class="err" id="wizErr"></div>
  </div>

"""
assert m_anchor in src, "markup anchor missing"
src = src.replace(m_anchor, wiz + m_anchor, 1)

# ------------- 3) "Edit my setup" button inside the app box -------------
edit_anchor = """      </label>
    </div>"""
edit_new = """      </label>
      <button type="button" class="editsetup" id="editSetup">Edit my setup</button>
    </div>"""
assert edit_anchor in src, "editsetup anchor missing"
src = src.replace(edit_anchor, edit_new, 1)

# ------------- 4) showGate hides wizard -------------
sg_old = """  function showGate(){
    $('appArea').style.display='none';"""
sg_new = """  function showGate(){
    var wz=$('wiz'); if(wz) wz.style.display='none';
    $('appArea').style.display='none';"""
assert sg_old in src, "showGate anchor missing"
src = src.replace(sg_old, sg_new, 1)

# ------------- 5) onSignedIn routes to wizard -------------
os_old = """  function onSignedIn(d){
    $('gate').style.display='none';
    $('appArea').style.display='block';
    setAuthChip(d.user, d.usage);"""
os_new = """  function onSignedIn(d){
    $('gate').style.display='none';
    setAuthChip(d.user, d.usage);
    myProfile = d.profile || null;
    if(!d.profile || !d.profile.onboarded){ openWizard(d.profile); return; }
    $('wiz').style.display='none';
    $('appArea').style.display='block';"""
assert os_old in src, "onSignedIn anchor missing"
src = src.replace(os_old, os_new, 1)

# ------------- 6) wizard JS before boot -------------
boot_old = "  if(token){ loadSession(); } else { showGate(); }"
wiz_js = """  // ---------- ONE-TIME SETUP WIZARD ----------
  var myProfile = null, wizStep = 1, wizMax = 6, wizSel = {};

  function wizShow(n){
    wizStep = Math.max(1, Math.min(wizMax, n));
    var steps = document.querySelectorAll('.wizstep');
    for (var i=0;i<steps.length;i++){
      steps[i].className = 'wizstep' + (Number(steps[i].getAttribute('data-step')) === wizStep ? ' on' : '');
    }
    $('wizBar').style.width = Math.round(wizStep / wizMax * 100) + '%';
    $('wizCount').textContent = 'Step ' + wizStep + ' of ' + wizMax;
    $('wizNext').textContent = (wizStep === wizMax) ? 'Finish setup' : 'Next';
    $('wizBack').style.visibility = (wizStep === 1) ? 'hidden' : 'visible';
    $('wizErr').style.display = 'none';
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
  }

  document.addEventListener('click', function(ev){
    var b = ev.target && ev.target.closest ? ev.target.closest('.chipb') : null;
    if(!b) return;
    var wrap = b.parentNode, g = wrap.getAttribute('data-group'), multi = wrap.getAttribute('data-multi');
    if(multi){ b.classList.toggle('sel'); }
    else { var all = wrap.querySelectorAll('.chipb'); for(var i=0;i<all.length;i++) all[i].classList.remove('sel'); b.classList.add('sel'); }
    var sel = wrap.querySelectorAll('.chipb.sel'), out = [];
    for(var j=0;j<sel.length;j++) out.push(sel[j].getAttribute('data-v'));
    wizSel[g] = out;
    if(g === 'videoTool'){ $('w_keyWrap').style.display = (out[0] && out[0] !== 'free_faceless') ? 'block' : 'none'; }
  });

  function wOne(g, dflt){ return (wizSel[g] && wizSel[g][0]) || dflt; }
  function wMany(g){ return wizSel[g] || []; }
  function wVal(id){ var e = $(id); return e ? String(e.value || '').trim() : ''; }

  function wizCollect(){
    var perms = wMany('perms'), po = {};
    ['ideas','video','schedule','post','comments'].forEach(function(k){ po[k] = perms.indexOf(k) >= 0; });
    return {
      creatorName: wVal('w_creatorName'), niche: wVal('w_niche'),
      subTopics: wVal('w_subTopics').split(',').map(function(x){ return x.trim(); }).filter(Boolean),
      audience: wVal('w_audience'), language: wVal('w_language'), country: wVal('w_country'),
      platforms: wMany('platforms'), platform: wVal('w_platform'),
      links: { youtube: wVal('w_ytLink'), instagram: wVal('w_igLink'), tiktok: wVal('w_ttLink') },
      size: wVal('w_size'),
      tone: wMany('tone'), onCamera: wOne('onCamera','faceless'), videoStyle: wVal('w_videoStyle'),
      brand: wVal('w_brand'), avoid: wVal('w_avoid'), inspirations: wVal('w_inspirations'),
      frequency: wVal('w_frequency'), postDays: wMany('postDays'), postTime: wVal('w_postTime'),
      videoTool: wOne('videoTool','free_faceless'), videoToolKey: wVal('w_videoToolKey'),
      voicePref: wVal('w_voicePref'), captionStyle: wVal('w_captionStyle'), music: wVal('w_music'),
      automation: wOne('automation','approve_first'), permissions: po,
      autopilot: wOne('autopilot','off') === 'on',
      onboarded: true
    };
  }

  function wizPrefill(p){
    wizSel = {};
    if(!p) return;
    function set(id, v){ var e = $(id); if(e && v) e.value = v; }
    set('w_creatorName', p.creatorName); set('w_niche', p.niche);
    set('w_subTopics', (p.subTopics||[]).join(', ')); set('w_audience', p.audience);
    set('w_language', p.language); set('w_country', p.country); set('w_platform', p.platform);
    if(p.links){ set('w_ytLink', p.links.youtube); set('w_igLink', p.links.instagram); set('w_ttLink', p.links.tiktok); }
    set('w_size', p.size); set('w_videoStyle', p.videoStyle); set('w_brand', p.brand);
    set('w_avoid', p.avoid); set('w_inspirations', p.inspirations); set('w_frequency', p.frequency);
    set('w_postTime', p.postTime); set('w_videoToolKey', p.videoToolKey); set('w_voicePref', p.voicePref);
    set('w_captionStyle', p.captionStyle); set('w_music', p.music);
    var perms = [], pp = p.permissions || {};
    Object.keys(pp).forEach(function(k){ if(pp[k]) perms.push(k); });
    var groups = {
      platforms: p.platforms || [], tone: p.tone || [], postDays: p.postDays || [],
      onCamera: [p.onCamera], videoTool: [p.videoTool], automation: [p.automation],
      autopilot: [p.autopilot ? 'on' : 'off'], perms: perms
    };
    Object.keys(groups).forEach(function(g){
      var wrap = document.querySelector('[data-group="' + g + '"]');
      if(!wrap) return;
      var vals = (groups[g] || []).filter(Boolean);
      var all = wrap.querySelectorAll('.chipb');
      for(var i=0;i<all.length;i++){
        if(vals.indexOf(all[i].getAttribute('data-v')) >= 0) all[i].classList.add('sel');
        else all[i].classList.remove('sel');
      }
      wizSel[g] = vals;
    });
    if(p.videoTool && p.videoTool !== 'free_faceless') $('w_keyWrap').style.display = 'block';
  }

  function openWizard(p){
    $('gate').style.display = 'none';
    $('appArea').style.display = 'none';
    $('wiz').style.display = 'block';
    wizPrefill(p);
    wizShow(1);
  }

  $('wizBack').addEventListener('click', function(){ wizShow(wizStep - 1); });
  $('wizNext').addEventListener('click', function(){
    if(wizStep === 1 && !wVal('w_niche')){
      $('wizErr').textContent = 'Please tell Nimbo your niche - it needs this to work.';
      $('wizErr').style.display = 'block'; return;
    }
    if(wizStep < wizMax){ wizShow(wizStep + 1); return; }
    if(!token){ showGate(); return; }
    var body = wizCollect();
    $('wizNext').disabled = true; $('wizNext').textContent = 'Saving...';
    fetch(FN + '/profile', { method:'POST', headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' }, body: JSON.stringify(body) })
      .then(function(r){ return r.json(); })
      .then(function(){ $('wizNext').disabled = false; $('wizNext').textContent = 'Finish setup'; $('wiz').style.display = 'none'; loadSession(); })
      .catch(function(){ $('wizNext').disabled = false; $('wizNext').textContent = 'Finish setup'; $('wizErr').textContent = 'Could not save. Please try again.'; $('wizErr').style.display = 'block'; });
  });

  var esb = $('editSetup');
  if(esb) esb.addEventListener('click', function(){ openWizard(myProfile); });

"""
assert boot_old in src, "boot anchor missing"
src = src.replace(boot_old, wiz_js + boot_old, 1)

io.open(P, "w", encoding="utf-8").write(src)
print("OK - wizard inserted (CSS + 6 steps + JS + edit-setup button)")
