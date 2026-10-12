# -*- coding: utf-8 -*-
# Builds AGENT-TEST.html: the real app.html with the network stubbed out, so the agent UI
# (chat, Telegram pairing, action ledger) can be seen and clicked without a deploy or login.
# Throwaway file - gitignored.
import io

SRC = "C:/Users/acer/OneDrive/Desktop/personal ai instict/nimbo-site/app.html"
OUT = "C:/Users/acer/OneDrive/Desktop/personal ai instict/AGENT-TEST.html"

s = io.open(SRC, encoding="utf-8").read()

STUB = """
<script>
/* ---- TEST STUB: pretend we are signed in, and answer every API call locally ---- */
(function(){
  try{ localStorage.setItem('nimbo_token','TEST'); }catch(e){}

  var LONG = [
    '\\uD83C\\uDFAC Ghar Pe Fat Loss Shuru Karo | Zero Equipment Routine',
    '',
    'HOOK (first 2 seconds):',
    'Gym ki mehengi fees bharne se pehle, ye 3 bodyweight moves master karo!',
    '',
    'FORMAT: Instagram Reel',
    '',
    'SCRIPT:',
    '[HOOK] Gym ki mehengi fees bharne se pehle, ye 3 moves master karo. [BODY] Pehla: squats, 15 reps ke 3 set. Dusra: incline push-ups, 10 reps. Teesra: high knees, 30 second. [CTA] Aaj se shuru karo, bahane band!',
    '',
    'THUMBNAIL TEXT: ZERO EQUIPMENT FAT LOSS',
    '',
    'HASHTAGS: #homeworkout #fatloss #gymmotivation #noequipment',
    '',
    '(89 videos left this month)'
  ].join('\\n');

  var PROFILE = {
    user:{ name:'Test Creator', email:'test@nimbo.app', picture:'' },
    profile:{ creatorName:'Test Creator', niche:'home workouts and gym motivation', platform:'instagram',
              language:'Hinglish', autopilot:true, onboarded:true, plan:'creator', planStatus:'active',
              brand:'Simple honest fitness advice.' },
    briefs:[], usage:{ month:'2026-10', count:1, limit:90 },
    events:[
      { at:Date.now()-4*60000,   kind:'content',   text:'Autopilot made "Ghar Pe Fat Loss Shuru Karo"' },
      { at:Date.now()-70*60000,  kind:'research',  text:'Checked trends for home workouts' },
      { at:Date.now()-3*3600000, kind:'setting',   text:'Changed language to "Hinglish"' },
      { at:Date.now()-5*3600000, kind:'autopilot', text:'Autopilot turned ON' },
      { at:Date.now()-26*3600000,kind:'connect',   text:'Telegram connected' }
    ],
    channels:{ telegram:{ connected:false } },
    plans:{ starter:{id:'starter',name:'Starter',price:19,videos:30,blurb:'1 video a day'},
            creator:{id:'creator',name:'Creator',price:39,videos:90,blurb:'3 videos a day'},
            pro:{id:'pro',name:'Pro',price:79,videos:300,blurb:'10 videos a day'} },
    foundingDiscount:0.30
  };

  var polls = 0;
  function reply(obj){ return Promise.resolve({ ok:true, status:200, json:function(){ return Promise.resolve(obj); } }); }

  window.fetch = function(url, opts){
    url = String(url);
    var method = (opts && opts.method) || 'GET';
    if(url.indexOf('/profile') > -1)  return reply(PROFILE);
    if(url.indexOf('/connect') > -1){
      if(method === 'POST') { PROFILE.channels.telegram = { connected:false }; return reply({ ok:true, connected:false }); }
      return reply({ connected:false, code:'A7K2QM', bot:'nimbo_agent_bot', link:'https://t.me/nimbo_agent_bot?start=A7K2QM', expiresInMinutes:30 });
    }
    if(url.indexOf('/ask') > -1){
      if(method === 'POST'){ polls = 0; return reply({ ok:true, taskId:'task_test' }); }
      if(url.indexOf('taskId=') > -1){
        polls++;
        if(polls < 2) return reply({ status:'working' });
        return reply({ status:'done', intent:'make_content', reply:LONG });
      }
      return reply({ conv:[
        { role:'creator', text:'bhai gym motivation par ek instagram reel banao', at:Date.now()-9*60000 },
        { role:'nimbo',   text:'Bhai, ek zabardast Instagram reel bana raha hoon!', at:Date.now()-8*60000 }
      ], events:PROFILE.events });
    }
    return reply({});
  };

  /* Google sign-in is not available offline - jump straight into the app. */
  window.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){ try{ setToken('TEST'); loadSession(); }catch(e){ console.log('stub:', e.message); } }, 60);
  });
})();
</script>
</body>"""

assert "</body>" in s, "no </body>"
s = s.replace("</body>", STUB, 1)
io.open(OUT, "w", encoding="utf-8").write(s)
print("wrote AGENT-TEST.html (" + str(len(s)) + " chars)")
