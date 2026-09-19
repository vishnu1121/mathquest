import { progressReport, reportLines } from "../progressReport";

(function () {
  const S = window.MQS, MQ = window.MQ;
  const safe = (text) => { const node = document.createElement("span"); node.textContent = text; return node.innerHTML; };
  function open() {
    if (document.querySelector(".adult-dashboard")) return;
    const before = document.activeElement, report = progressReport(S.get()), dialog = document.createElement("dialog");
    let closed = false, request = 0, filter = "all";
    dialog.className = "adult-dashboard"; dialog.setAttribute("aria-labelledby", "adultTitle");
    dialog.innerHTML = `<header class="ad-header"><div><p class="voyage-kicker">MATHQUEST · FOR GROWN-UPS</p><h1 id="adultTitle">Little steps, made visible.</h1><p>A learning snapshot from this browser. No student account or identifying details.</p>${window.MQClasses?.current() ? `<p class="ad-class"><span>Class: <b>${safe(window.MQClasses.current().label)}</b> · ${safe(window.MQClasses.current().island)}</span><button type="button" class="fg-button" data-ad="class">Change class</button></p><p class="ad-class-note">Each class keeps its own chapters, stars and learning records. Coins, badges and the camp are shared.</p>` : ""}</div><button type="button" class="fg-button" data-ad="close" aria-label="Close adult dashboard">Back to adventure ×</button></header><div class="ad-metrics"><article><b>${report.completed}<small> / ${report.chapters}</small></b><span>Story chapters explored</span></article><article><b>${report.explored}<small> / ${report.rows.length}</small></b><span>Skills with answer evidence</span></article><article><b>${report.independent}</b><span>Recent independent answers</span></article><article><b>${report.supported}</b><span>Recent successes with support</span></article></div><div class="ad-body"><section class="ad-evidence"><div class="ad-section-title"><div><h2>How the practice is going</h2><p>Up to the last eight answer attempts per skill, oldest to newest. These are attempts, not unique questions.</p></div><label>Show skills<select class="ad-filter"><option value="all">All skills</option><option value="practiced">Practiced skills</option><option value="support">Practiced with support / retries</option></select></label></div><div class="ad-legend"><span><i class="independent">✓</i> Correct independently</span><span><i class="supported">↗</i> Correct with a hint or retry</span><span><i class="retry">·</i> Not correct yet</span></div><div class="ad-rows"></div><p class="ad-caveat">Chapters, coins, arcade scores, and time spent are not mastery measures. Guided work and retries are valuable; they are shown separately. This snapshot does not assign a grade, diagnose a learning need, or compare children.</p></section><aside class="ad-sidebar"><section class="ad-next"><p class="voyage-kicker">TRY TOGETHER · A FEW MINUTES</p><h2>${report.hasEvidence ? safe(report.priority.name) : "Start with a little curiosity"}</h2><p>${safe(report.priority.activity)}</p><p class="ad-why">${report.hasEvidence ? `${report.priority.independent} independent, ${report.priority.supported} supported, and ${report.priority.retry} not-correct attempts in this skill’s recent evidence. ${safe(report.priority.next)}.` : "No answers have been recorded yet. Play a chapter or a practice trail, then return here to see actual observations."}</p></section><section class="ad-ai"><p class="voyage-kicker">AI LEARNING COMPANION</p><h2>A note to guide your next conversation</h2><p class="ad-ai-status"></p><button type="button" class="btn" data-ad="coach" disabled>Write an AI coaching note</button><p class="ad-coach" role="status">The activity above is ready to use. An AI note can connect the recorded observations in plain language.</p><details class="ad-connection"><summary>AI connection & data</summary><p>The story maker, Hoot’s contextual hints, Teach Pip, and coaching notes use the server’s Anthropic connection. Only the game context or the short story idea or explanation submitted for that feature is sent. This dashboard’s coaching request sends aggregate practice counts.</p><p>For local setup: set <code>ANTHROPIC_API_KEY</code> and <code>AI_ENABLED=true</code> in <code>.env.local</code>, then restart the development server. Never put a key in the browser.</p><p>A configured key is not proof that a live request has succeeded. Slow, unavailable, or rejected responses keep the built-in activity available.</p></details></section><button type="button" class="fg-button ad-export" data-ad="export">↓ Download this snapshot (.txt)</button></aside></div>`;
    document.body.append(dialog); dialog.showModal();
    const q = (s) => dialog.querySelector(s);
    function drawRows() {
      const rows = report.rows.filter((r) => filter === "all" || filter === "practiced" && r.recent || filter === "support" && (r.retry + r.supported > 0));
      q(".ad-rows").innerHTML = rows.length ? rows.map((r) => `<article class="ad-row"><div class="ad-row-title"><h3>${safe(r.name)}</h3><span>${r.recent ? `${r.recent} recent attempts` : "Not explored yet"}</span></div><div class="ad-marks" role="img" aria-label="${r.independent} independent, ${r.supported} supported, ${r.retry} not correct; oldest to newest">${Array.from({ length: 8 }, (_, i) => `<i class="${r.marks[i] || "empty"}" aria-hidden="true">${({ independent: "✓", supported: "↗", retry: "·" })[r.marks[i]] || ""}</i>`).join("")}</div><p>${r.recent ? `${r.independent} independent · ${r.supported} with support · ${r.retry} not correct yet` : "Answer evidence will appear here after this skill is practiced."}</p>${r.recent ? `<details><summary>Practice idea & next step</summary><p>${safe(r.next)}. ${safe(r.activity)}</p></details>` : ""}</article>`).join("") : '<p class="ad-empty">No attempts match this filter yet. Try All skills to see the learning pathway.</p>';
    }
    drawRows();
    const unsubscribe = window.MQAI.onStatus((status) => {
      if (closed) return;
      q(".ad-ai-status").textContent = status === "on" ? "AI configured · the next request will try the server connection." : status === "checking" ? "Checking AI configuration…" : "AI is off for this session. Story Lab and all games use built-in content.";
      q('[data-ad="coach"]').disabled = status !== "on" || !report.hasEvidence;
      if (!report.hasEvidence) q(".ad-coach").textContent = "Play a little first. An AI coaching note needs actual answer evidence.";
    });
    const close = () => { closed = true; request++; unsubscribe(); dialog.close(); dialog.remove(); if (before?.isConnected) before.focus({ preventScroll: true }); };
    dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    q(".ad-filter").addEventListener("change", (e) => { filter = e.target.value; drawRows(); });
    dialog.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-ad]"); if (!b) return;
      if (b.dataset.ad === "close") { close(); return; }
      if (b.dataset.ad === "class") {
        const picked = await window.MQClasses.openPicker();
        if (picked && picked !== window.MQClasses.grade()) { close(); window.MQClasses.switchTo(picked); }
        return;
      }
      if (b.dataset.ad === "coach") {
        const token = ++request; b.disabled = true; q(".ad-coach").textContent = "Connecting the recorded observations…";
        const text = await window.MQAI.journeyNote({ lines: reportLines(report) });
        if (closed || token !== request) return;
        q(".ad-coach").textContent = text ? `AI coaching note: ${text}` : `The AI note is unavailable. Try this together: ${report.priority.activity}`;
        b.disabled = window.MQAI.status() !== "on";
      }
      if (b.dataset.ad === "export") {
        const content = ["MathQuest · practice snapshot", `Generated locally: ${new Date().toLocaleDateString()}`, "Up to eight recent answer attempts per skill. Attempt counts are not unique questions or mastery scores.", `${report.completed} of ${report.chapters} story chapters explored.`, ...reportLines(report), `Try together: ${report.priority.activity}`, "This browser stores one learner's progress. No account, diagnosis, or grade comparison."].join("\n\n");
        const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
        const a = document.createElement("a"); a.href = url; a.download = "mathquest-practice-snapshot.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    });
  }
  window.MQAdults = { open };
  const start = MQ.start;
  MQ.start = function () {
    start(); const button = document.createElement("button"); button.type = "button"; button.id = "adultBtn"; button.className = "hud-pill adult-entry"; button.textContent = "Adults"; button.setAttribute("aria-label", "Open adult progress dashboard"); button.onclick = open; document.querySelector(".hud-right").prepend(button);
  };
})();
