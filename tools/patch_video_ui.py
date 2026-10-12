# -*- coding: utf-8 -*-
# Show the finished video in the app: a player at the top of the brief, and a thumbnail
# marker in the saved list. Briefs made before this still render exactly as before.
import io

P = "C:/Users/acer/OneDrive/Desktop/personal ai instict/nimbo-site/app.html"
s = io.open(P, encoding="utf-8").read()

def rep(old, new, why):
    global s
    if new in s:
        print("  (already) " + why); return
    assert old in s, "MISSING: " + why + " -> " + old[:90]
    s = s.replace(old, new, 1)
    print("  ok " + why)

# ---------------------------------------------------------------- styles
rep("""  /* ---------- telegram pairing steps ---------- */""",
    """  /* ---------- finished video ---------- */
  .vidwrap{margin:0 0 18px;background:#0d0a1f;border-radius:18px;overflow:hidden;border:1px solid var(--line)}
  .vidwrap video{display:block;width:100%;max-height:70vh;background:#0d0a1f}
  .vidbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:#f4f1ff}
  .vidbar b{font-family:var(--fdisplay);font-weight:600;font-size:.95rem}
  .vidbar span{color:var(--ink-soft);font-weight:700;font-size:.82rem}
  .vidbar a{margin-left:auto;text-decoration:none;background:linear-gradient(180deg,var(--accent),var(--accent-d));
    color:#fff;font-family:var(--fdisplay);font-weight:600;font-size:.85rem;padding:.5em .95em;border-radius:10px}
  .vidnote{background:#fff7e3;color:#8a6400;font-weight:700;font-size:.86rem;padding:10px 14px;border-radius:12px;margin-bottom:16px}

  /* ---------- telegram pairing steps ---------- */""",
    "video player styles")

# ---------------------------------------------------------------- render()
# Put the player at the very top of a rendered brief.
old_render = "  function render(d){"
i = s.index(old_render)
# find the first line inside render() that clears the output area
marker = s.index("\n", i)
insert_at = marker + 1
NEW_FN = """    // A finished video, if Nimbo built one for this brief.
    window.__nimboVideo = (d && d.videoUrl) ? { url: d.videoUrl, info: d.video || {}, err: null }
                        : (d && d.videoError ? { url: '', info: {}, err: d.videoError } : null);
"""
s = s[:insert_at] + NEW_FN + s[insert_at:]
print("  ok render() captures the video")

# Mount the player into the results area once it exists.
rep("""  function renderBriefList(){""",
    """  // Drop the player in above everything else in the result card.
  function mountVideo(host){
    var v = window.__nimboVideo;
    if(!host || !v) return;
    if(v.err === 'notready'){
      host.insertBefore(el('div','vidnote','\\uD83C\\uDFA5 The written brief is ready. Automatic video building is not switched on for this server yet.'), host.firstChild);
      return;
    }
    if(v.err){
      host.insertBefore(el('div','vidnote','\\uD83C\\uDFA5 Could not finish the video this time: ' + v.err + '. The script below is ready to shoot.'), host.firstChild);
      return;
    }
    if(!v.url) return;
    var wrap = el('div','vidwrap','');
    var vid = document.createElement('video');
    vid.src = v.url; vid.controls = true; vid.playsInline = true; vid.preload = 'metadata';
    wrap.appendChild(vid);
    var bar = el('div','vidbar','');
    bar.appendChild(el('b','','\\uD83C\\uDFA5 Your video'));
    var bits = [];
    if(v.info.seconds) bits.push(v.info.seconds + 's');
    if(v.info.scenes) bits.push(v.info.scenes + ' scenes');
    if(v.info.bytes) bits.push(Math.round(v.info.bytes/1024/1024*10)/10 + ' MB');
    bar.appendChild(el('span','', bits.join('  \\u00b7  ')));
    var dl = document.createElement('a');
    dl.href = v.url; dl.download = 'nimbo-video.mp4'; dl.textContent = 'Download';
    bar.appendChild(dl);
    wrap.appendChild(bar);
    host.insertBefore(wrap, host.firstChild);
  }

  function renderBriefList(){""",
    "mountVideo helper")

io.open(P, "w", encoding="utf-8").write(s)
print("video UI added (player still needs to be mounted - see next step)")
