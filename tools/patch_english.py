# -*- coding: utf-8 -*-
# Founder's call: Nimbo speaks ENGLISH everywhere. It still UNDERSTANDS any language
# (Hindi, Hinglish, Telugu, anything) - it just always answers in clear, simple English.
import io

ROOT = "C:/Users/acer/OneDrive/Desktop/personal ai instict/"

def sub(path, pairs):
    p = ROOT + path
    s = io.open(p, encoding="utf-8").read()
    for old, new in pairs:
        if new in s:
            continue  # already applied - the script is safe to re-run
        assert old in s, "MISSING in " + path + " -> " + old[:70]
        s = s.replace(old, new, 1)
    io.open(p, "w", encoding="utf-8").write(s)
    print("english: " + path)

# --------------------------------------------------------------- brain.js
sub("functions/lib/brain.js", [
("""    "'reply' = ONE short, warm, human line (max 2 sentences) written in the SAME LANGUAGE AND SCRIPT the creator used",
    "(if they wrote Hinglish, reply in Hinglish). It should say what you are doing, not ask for permission.",""",
 """    "The creator may write in ANY language (English, Hindi, Hinglish, Telugu, anything) - understand all of them.",
    "'reply' = ONE short, warm, human line (max 2 sentences), ALWAYS IN SIMPLE ENGLISH, no matter what language they wrote in.",
    "It should say what you are doing, not ask for permission.","""),
])

# --------------------------------------------------------------- agent.js
sub("functions/lib/agent.js", [
('    return { ok: false, reply: "Tumhara plan active nahi hai, to main video nahi bana sakta." + NL + "Plan choose karo: " + APP };',
 '    return { ok: false, reply: "Your plan isn\'t active yet, so I can\'t create for you." + NL + "Pick a plan here: " + APP };'),

('    return { ok: false, reply: "Is month ke saare " + limit + " videos ho gaye (" + nm + " plan). Upgrade karo to main aage badhu: " + APP };',
 '    return { ok: false, reply: "You have used all " + limit + " videos in your " + nm + " plan this month. Upgrade and I\'ll keep going: " + APP };'),

('  if (!topic) return { reply: "Pehle apna niche bata do - phir main khud se banata rahunga. Setup: " + APP };',
 '  if (!topic) return { reply: "Tell me your niche first, then I can work on my own. Set it up here: " + APP };'),

('  if (!topic) return { reply: "Kis topic ka trend dekhna hai?" };',
 '  if (!topic) return { reply: "Which topic should I check?" };'),

('  if (!list.length) return { reply: "Abhi \\"" + topic + "\\" par koi strong trend nahi mil raha. Thodi der baad dekhta hun." };',
 '  if (!list.length) return { reply: "No strong trend on \\"" + topic + "\\" right now. I\'ll keep watching and tell you when something moves." };'),

('''    reply: "🔥 \\"" + topic + "\\" me abhi ye chal raha hai (last 30 days, fastest growing):" + NL + NL
      + list.map(function (v, i) { return (i + 1) + ". " + v.title + NL + "   " + viewsShort(v.views) + " views - " + v.ageDays + "d old - " + v.channel; }).join(NL)
      + NL + NL + "Bolo \\"isi topic par video banao\\" aur main bana deta hun."''',
 '''    reply: "🔥 Trending in \\"" + topic + "\\" right now (last 30 days, fastest growing):" + NL + NL
      + list.map(function (v, i) { return (i + 1) + ". " + v.title + NL + "   " + viewsShort(v.views) + " views - " + v.ageDays + "d old - " + v.channel; }).join(NL)
      + NL + NL + "Say \\"make a video on this\\" and I\'ll write it for you."'''),

('  lines.push("📊 Tumhara Nimbo:");',
 '  lines.push("📊 Your Nimbo:");'),

('  if (limit) lines.push("Is month: " + u.count + " / " + limit + " videos used, " + Math.max(0, limit - u.count) + " bache");',
 '  if (limit) lines.push("This month: " + u.count + " / " + limit + " videos used, " + Math.max(0, limit - u.count) + " left");'),

('  lines.push("Autopilot: " + (profile.autopilot ? "ON - main roz khud bana raha hun" : "OFF - sirf tumhare kehne par banata hun"));',
 '  lines.push("Autopilot: " + (profile.autopilot ? "ON - I create for you every day" : "OFF - I only create when you ask"));'),

('  if (!briefs.length && !events.length) return { reply: "Abhi tak kuch nahi banaya. Bolo kya banau?" };',
 '  if (!briefs.length && !events.length) return { reply: "Nothing yet. Tell me what to make and I\'ll get started." };'),

('  const lines = ["🗂 Maine ye kiya hai:"];',
 '  const lines = ["🗂 Here is what I have done:"];'),

('(b.auto ? " [khud banaya]" : ""));',
 '(b.auto ? " [made on autopilot]" : ""));'),

('    return { reply: "Ye setting main badal nahi paya. Setup page se kar lo: " + APP };',
 '    return { reply: "I couldn\'t change that one from chat. You can edit it in your setup: " + APP };'),

('    if (ok.indexOf(value) === -1) return { reply: "Format samajh nahi aaya. Short, Instagram, TikTok, YouTube Short ya YouTube long video - inme se bolo." };',
 '    if (ok.indexOf(value) === -1) return { reply: "I didn\'t catch the format. Say one of: short, Instagram, TikTok, YouTube Short, or YouTube long video." };'),

('  return { reply: "✅ Ho gaya - " + field + " ab \\"" + value + "\\" hai. Aage se isi hisaab se banaunga.", profileChanged: true };',
 '  return { reply: "✅ Done - your " + field + " is now \\"" + value + "\\". I\'ll use that from now on.", profileChanged: true };'),

('''      ? "🤖 Autopilot ON. Ab main roz khud content banata rahunga aur tumhe yahin bhej dunga - tumhe kuch karna nahi padega."
      : "Autopilot OFF. Ab sirf jab tum bologe tab banaunga.",''',
 '''      ? "🤖 Autopilot is ON. I'll create for you every day and send it straight to you - you don't have to do anything."
      : "Autopilot is OFF. I'll only create when you ask me to.",'''),

('''      "Main Nimbo hun - tumhara content team. Mujhe bas bolo, likho ya voice note bhejo:",
      "",
      "• \\"ek reel banao gym motivation par\\" - poora script, title, caption, hashtags ready",
      "• \\"YouTube long video banao\\" - format bolo, main usi hisaab se likhunga",
      "• \\"kya trend kar raha hai\\" - abhi ke real trending videos",
      "• \\"ab se hindi me banao\\" / \\"mera niche fitness hai\\" - setting badal dunga",
      "• \\"roz khud banao\\" - autopilot ON, phir main bina puche kaam karta rahunga",
      "• \\"kitne video bache\\" - plan aur quota",
      "",
      profile && profile.autopilot ? "Autopilot abhi ON hai." : "Tip: \\"roz khud banao\\" bolo to main apne aap kaam shuru kar dunga."''',
 '''      "I'm Nimbo - your content team. Just tell me what you need (type it or send a voice note):",
      "",
      "• \\"make a reel about gym motivation\\" - full script, title, caption and hashtags",
      "• \\"make a long YouTube video\\" - tell me the format and I'll write for it",
      "• \\"what's trending\\" - real trending videos in your niche right now",
      "• \\"write in Hindi from now on\\" / \\"my niche is fitness\\" - I'll update your settings",
      "• \\"work on your own every day\\" - turns on autopilot",
      "• \\"how many videos are left\\" - your plan and quota",
      "",
      "You can write in any language - I'll understand and reply in English.",
      profile && profile.autopilot ? "Autopilot is ON right now." : "Tip: say \\"work on your own every day\\" and I'll start creating without being asked."'''),

('    return { intent: "onboard", reply: "Hi! Pehle ek baar setup kar lo (2 minute) - phir main khud se kaam karta rahunga: " + APP };',
 '    return { intent: "onboard", reply: "Hi! Let\'s set you up once (takes 2 minutes) - after that I can work on my own: " + APP };'),

('''    result = { reply: "Ek dikkat aa gayi: " + ((e && e.message) || "try again") + NL + "Thodi der baad phir bolo." };''',
 '''    result = { reply: "Something went wrong: " + ((e && e.message) || "please try again") + NL + "Give it a moment and ask me again." };'''),

('    default:               result = { reply: decision.reply || "Bolo, kya banau?" };',
 '    default:               result = { reply: decision.reply || "Tell me what you\'d like me to make." }; break;'),

('  await S.addConv(sub, "nimbo", (result.brief ? ack || "Brief bhej diya." : reply)).catch(function () {});',
 '  await S.addConv(sub, "nimbo", (result.brief ? ack || "Sent you the brief." : reply)).catch(function () {});'),
])

# --------------------------------------------------------------- telegram.js
sub("functions/telegram.js", [
('''const WELCOME = [
  "👋 Main Nimbo hun - tumhara content team.",
  "",
  "Jodne ke liye apna 6-digit code bhejo (Nimbo app me 'Connect Telegram' par milega):",
  APP
].join(NL);''',
 '''const WELCOME = [
  "👋 I'm Nimbo - your content team.",
  "",
  "Send me your 6-character code to connect (find it under 'Connect Telegram' in the Nimbo app):",
  APP
].join(NL);'''),

('''const HELP = [
  "Bas bolo ya likho, main kaam kar deta hun:",
  "",
  "• \\"gym motivation par reel banao\\"",
  "• \\"YouTube long video banao\\"",
  "• \\"kya trend kar raha hai\\"",
  "• \\"roz khud banao\\"  (autopilot ON)",
  "• \\"kitne video bache\\"",
  "",
  "🎤 Voice note bhi bhej sakte ho - main sun leta hun."
].join(NL);''',
 '''const HELP = [
  "Just tell me what you need and I'll do it:",
  "",
  "• \\"make a reel about gym motivation\\"",
  "• \\"make a long YouTube video\\"",
  "• \\"what's trending\\"",
  "• \\"work on your own every day\\"  (autopilot ON)",
  "• \\"how many videos are left\\"",
  "",
  "🎤 You can send a voice note too - I'll listen to it.",
  "Write in any language; I'll always reply in English."
].join(NL);'''),

('        await sendTelegram(chatId, "✅ Ho gaya! Ab main tumhara agent hun." + NL + NL + HELP);',
 '        await sendTelegram(chatId, "✅ Connected! I\'m your agent now." + NL + NL + HELP);'),

('      await sendTelegram(chatId, "Ye code galat ya purana hai. Nimbo app se naya code lo: " + APP);',
 '      await sendTelegram(chatId, "That code is wrong or expired. Grab a fresh one from the Nimbo app: " + APP);'),

('    await sendTelegram(chatId, "Telegram disconnect ho gaya. Dobara jodna ho to app se naya code bhej do.");',
 '    await sendTelegram(chatId, "Telegram disconnected. Send a new code from the app whenever you want to reconnect.");'),

('      await sendTelegram(chatId, "Voice note nahi khul paya. Thoda chhota bhejo ya likh do.");',
 '      await sendTelegram(chatId, "I couldn\'t open that voice note. Try a shorter one, or just type it.");'),

('  await sendTelegram(chatId, audio ? "🎧 Sun liya, kaam shuru..." : "⏳ Theek hai, kaam shuru...");',
 '  await sendTelegram(chatId, audio ? "🎧 Got it, working on this..." : "⏳ On it, working...");'),
])

# --------------------------------------------------------------- worker.js / autopilot.js
sub("functions/lib/worker.js", [
('    try { await deliver(task.sub, "Sorry, ye kaam poora nahi kar paya: " + msg + " \u2014 thodi der baad phir bolo."); } catch (e2) {}',
 '    try { await deliver(task.sub, "Sorry, I couldn\'t finish that: " + msg + " \u2014 please ask me again in a moment."); } catch (e2) {}'),
])

sub("functions/lib/autopilot.js", [
('      const intro = "🤖 Nimbo here - tum busy the, maine ye bana diya:" + NL;',
 '      const intro = "🤖 Nimbo here - you were busy, so I made this for you:" + NL;'),
])

print("DONE - Nimbo now answers in English on every channel")
