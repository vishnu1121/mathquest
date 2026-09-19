// Explain-it features. Teach Pip: Pip makes a real kid mistake, the child spots it, fixes it and then
// explains why (idea cards checked by code, or their own words understood by AI). How did you figure it
// out?: after a win, the child shares a strategy and Hoot names it back.
(function () {
  const S = window.MQS;
  const pad = (n, mark, cls = "") => `<span class="tp-pad ${cls}"><b>${n}</b><i>${mark}</i></span>`;

  const MISTAKES = {
    hopStart: {
      pipLine: "I'm on 8 and I hopped 5. I counted 8, 9, 10, 11, 12, so I landed on <b>12</b>!",
      work: `<div class="tp-pads">${pad(8, "1", "bad")}${pad(9, "2")}${pad(10, "3")}${pad(11, "4")}${pad(12, "5")}${pad(13, "")}</div>`,
      question: "Did Pip land on the right pad?",
      choices: [12, 13, 14],
      answer: 13,
      fixWrong: "Close! The first hop lands on 9. Count 5 hops from there.",
      ask: 'Pip: "Yay, 13! But why did I get 12? Teach me!"',
      ideas: [
        ["got_it", "You counted the pad you started on. Count the hops: 9, 10, 11, 12, 13"],
        ["partly", "8 + 5 is 13, not 12"],
        ["not_yet", "Pip hopped too slowly"],
      ],
      replies: {
        got_it: "Ohh! I counted 8, but I was already standing there. My first hop lands on 9, so 5 hops land on 13!",
        partly: "Yes, 8 + 5 is 13. But why did my counting say 12?",
        not_yet: "Hmm, speed wasn't it. Look at the pad where I started counting.",
        off_topic: "Hee hee! Can you help with my hops? Look at where I started counting.",
      },
      ai: {
        situation: 'Pip started on pad 8, hopped 5 times, counted "8, 9, 10, 11, 12" and said 12. The right answer is 13.',
        keyIdea: "You don't count the pad you start on. The first hop lands on 9, so the fifth hop lands on 13.",
        gotIt: "says Pip counted the starting pad, or that counting should start with the first hop onto 9",
        partly: "only says the answer is 13 or that 8 + 5 = 13, without explaining the counting",
        numbers: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13],
      },
      fact: "taught Pip not to count the pad you start on",
    },
    sixFive: {
      pipLine: "6 + 5 makes <b>10</b>! Let's light the lantern!",
      work: `<div class="tp-frame">${Array.from({ length: 10 }, (_, i) => `<span class="${i < 6 ? "a" : "b"}"></span>`).join("")}</div><div class="tp-extra"><span class="b"></span><em>one left over</em></div>`,
      question: "Does 6 + 5 make 10?",
      choices: [10, 11, 12],
      answer: 11,
      fixWrong: "Close! 6 and 4 fill the ten frame. Where does the last one go?",
      ask: 'Pip: "Oops, 11! But why isn\'t it 10? Teach me!"',
      ideas: [
        ["got_it", "6 needs 4 to make 10. 5 is one more than 4, so it makes 11"],
        ["partly", "6 + 5 is 11"],
        ["not_yet", "Pip needs more light"],
      ],
      replies: {
        got_it: "Ohh! 6 + 4 fills the ten, and 5 is one extra. So 6 + 5 is 11, one more than 10. Got it!",
        partly: "Yes, it's 11! But how can I tell it's not 10?",
        not_yet: "Hmm, maybe! But look at the ten frame. Is there one left over?",
        off_topic: "Hee hee! Can you help me with 6 + 5? Look at the ten frame.",
      },
      ai: {
        situation: "Pip said 6 + 5 makes 10. The right answer is 11.",
        keyIdea: "6 + 4 makes 10, and 5 is one more than 4, so 6 + 5 is one more than 10, which is 11.",
        gotIt: "explains that 6 needs 4 to make 10, or that 5 is one too many, or that the answer is one more than 10",
        partly: "only says 6 + 5 is 11 without explaining why it is not 10",
        numbers: [1, 4, 5, 6, 10, 11],
      },
      fact: "taught Pip that 6 + 5 is one more than 10",
    },
    carry513: {
      pipLine: "I'll help! My spell is <b>38 + 25 = 513</b>!",
      work: '<div class="pip-work"><span>38</span><span>+ 25</span><span class="pip-bad">5 13</span></div>',
      question: "Is Pip's spell right?",
      choices: [53, 63, 73],
      answer: 63,
      fixWrong: "Close! Add the ones first: 8 + 5 = 13. What happens to the ten in 13?",
      ask: 'Pip: "Yay, 63! But why was 513 wrong? Teach me!"',
      ideas: [
        ["partly", "8 + 5 = 13 is too big for the ones spot"],
        ["got_it", "13 has a ten in it. The ten moves to the tens: 3 + 2 + 1 = 6"],
        ["not_yet", "Pip just added the numbers wrong"],
      ],
      replies: {
        got_it: "Ohh! 13 is 1 ten and 3 ones, so the ten jumps over to the tens: 3 + 2 + 1 = 6. That makes 63!",
        partly: "Hmm, 13 is too big for one spot. But where does the extra ten go?",
        not_yet: "I did add something wrong… but which part? Look at the ones: 8 + 5 = 13.",
        off_topic: "Hee hee! But can you help with my spell? Look at the ones: 8 + 5 = 13.",
      },
      ai: {
        situation: "Pip added 38 + 25 and wrote 513: Pip wrote 8 + 5 = 13 in the ones place and 3 + 2 = 5 in the tens place, forgetting to carry. The right answer is 63.",
        keyIdea: "13 ones is 1 ten and 3 ones, so the tens are 3 + 2 + 1 = 6, making 63.",
        gotIt: "says the 13 must be split, or a ten must be carried, traded or moved to the tens, or explains why 63 is right",
        partly: "right direction but missing the carried ten, for example only says 513 is too big or the answer is 63",
        numbers: [1, 2, 3, 5, 6, 8, 10, 13, 25, 38, 63, 513],
      },
      fact: "taught Pip how to carry a ten in 38 + 25",
    },
  };

  function overlay(host, inner) {
    const box = document.createElement("div");
    box.className = "pip-event";
    box.innerHTML = `<div class="pip-card" role="dialog" aria-modal="true">${inner}</div>`;
    host.appendChild(box);
    return box;
  }

  // ---------- Teach Pip ----------
  function mistake({ host, api, id, chapter }) {
    const m = MISTAKES[id];
    return new Promise((resolve) => {
      const box = overlay(host, `
        <p class="pip-line"><span class="pip-face tp-fly" aria-hidden="true">🧚</span> Pip: "${m.pipLine}"</p>
        <div class="tp-work" aria-hidden="true">${m.work}</div>
        <p class="pip-ask" id="tpAsk">${m.question}</p>
        <div class="pip-choices" id="tpChoices">
          <button type="button" class="btn secondary" data-a="yes">Yes, it's right</button>
          <button type="button" class="btn" data-a="no">No, it's wrong</button>
        </div>`);
      const card = box.querySelector(".pip-card");
      const ask = box.querySelector("#tpAsk");
      let choices = box.querySelector("#tpChoices");
      let fixMisses = 0;
      box.querySelector('[data-a="no"]').focus();

      function fixStep(lead) {
        ask.textContent = `${lead} What's the right answer?`;
        choices.innerHTML = m.choices.map((n) => `<button type="button" class="btn secondary" data-n="${n}">${n}</button>`).join("");
        choices.querySelectorAll("button").forEach((btn) =>
          btn.addEventListener("click", () => {
            if (Number(btn.dataset.n) !== m.answer) {
              fixMisses += 1;
              api.emit("miss");
              api.sfx.wrong();
              api.shake(btn, 6);
              ask.textContent = m.fixWrong;
              return;
            }
            api.emit("solved", { afterMistake: fixMisses > 0 });
            api.sfx.good();
            const c = api.center(btn);
            api.burst(c.x, c.y, { count: 12, spread: 80 });
            teachStep();
          }),
        );
      }

      function teachStep() {
        const aiOn = api.ai.status() === "on";
        ask.textContent = m.ask;
        choices.remove();
        const teach = document.createElement("div");
        teach.className = "teach";
        teach.innerHTML = `
          <div class="teach-chips" role="group" aria-label="Ideas to teach Pip">
            ${m.ideas.map(([verdict, text]) => `<button type="button" class="chip" data-verdict="${verdict}">${text}</button>`).join("")}
          </div>
          <form class="teach-own" ${aiOn ? "" : "hidden"}>
            <label class="visually-hidden" for="tpInput">Explain it to Pip in your own words</label>
            <input id="tpInput" maxlength="160" autocomplete="off" placeholder="${aiOn ? "Or explain it in your own words" : "Your own words need AI"}" ${aiOn ? "" : "disabled"}>
            <button type="submit" class="btn" ${aiOn ? "" : "disabled"}>Teach Pip</button>
          </form>
          <p class="pip-reply" aria-live="polite" hidden></p>`;
        card.appendChild(teach);
        const reply = teach.querySelector(".pip-reply");
        const input = teach.querySelector("#tpInput");
        let tries = 0;
        let done = false;

        function respond(verdict, text, byAI) {
          tries += 1;
          reply.hidden = false;
          reply.classList.remove("thinking");
          reply.innerHTML = `${byAI ? '<span class="by-ai">✨ Pip understood your words (AI)</span>' : ""}🧚 ${text}`;
          if (verdict === "got_it") return finish(byAI);
          api.sfx.tap();
          if (tries >= 2 && !teach.querySelector(".tp-show")) {
            const show = document.createElement("button");
            show.type = "button";
            show.className = "btn secondary tp-show";
            show.textContent = "Show Pip the idea";
            show.addEventListener("click", () => respond("got_it", m.replies.got_it, false));
            teach.appendChild(show);
          }
        }

        function finish(byAI) {
          if (done) return;
          done = true;
          api.sfx.good();
          const c = api.center(reply);
          api.burst(c.x, c.y, { count: 16, chars: ["⭐", "🧚", "✨"], spread: 140 });
          api.addCoins(3, c);
          api.emit("taught", { byAI });
          S.addFact(chapter, m.fact);
          teach.querySelectorAll("button, input").forEach((el) => (el.disabled = true));
          const go = document.createElement("button");
          go.type = "button";
          go.className = "btn";
          go.textContent = "Pip learned it! Keep going ⭐";
          go.addEventListener("click", () => {
            box.remove();
            resolve({ taught: true, byAI });
          });
          card.appendChild(go);
          go.focus();
        }

        teach.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => respond(chip.dataset.verdict, m.replies[chip.dataset.verdict], false)));
        teach.querySelector("form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const said = input.value.trim();
          if (!said || done) return;
          reply.hidden = false;
          reply.classList.add("thinking");
          reply.textContent = "🧚 Pip is thinking about what you said…";
          const result = await api.ai.teach({ mistakeId: id, said });
          if (!api.alive() || done) return;
          if (result) respond(result.verdict, result.reply, true);
          else respond("not_yet", "I'm not sure I understood. Can you try one of the ideas above?", false);
        });
      }

      box.querySelector('[data-a="yes"]').addEventListener("click", () => {
        api.emit("miss");
        fixMisses += 1;
        api.sfx.wrong();
        fixStep("Hmm, look again carefully.");
      });
      box.querySelector('[data-a="no"]').addEventListener("click", () => {
        api.sfx.good();
        fixStep("Good catch!");
      });
    });
  }

  // ---------- How did you figure it out? ----------
  const WAYS = [
    ["big_hops", "I jumped by tens, then counted on", "Jumping by tens and then counting on is how number-line pros add!"],
    ["tens_then_ones", "I added the tens, then the ones", "Adding tens and ones separately keeps big numbers tidy. Great thinking!"],
    ["make_ten", "I made a ten first", "Making a ten first is a super strategy. Tens are easy to add!"],
    ["known_fact", "I just knew it", "You remembered it! Next time, try telling Hoot how you'd check it."],
  ];
  function strategy({ host, api, a, b, answer, chapter }) {
    return new Promise((resolve) => {
      const aiOn = api.ai.status() === "on";
      const box = overlay(host, `
        <p class="pip-line"><span class="pip-face" aria-hidden="true">🦉</span> Hoot: "You got it, ${a} + ${b} = ${answer}! How did you figure it out?"</p>
        <div class="teach">
          <div class="teach-chips" role="group" aria-label="Ways to solve it">
            ${WAYS.map(([id, label]) => `<button type="button" class="chip" data-id="${id}">${label}</button>`).join("")}
          </div>
          <form class="teach-own" ${aiOn ? "" : "hidden"}>
            <label class="visually-hidden" for="stInput">Tell Hoot in your own words</label>
            <input id="stInput" maxlength="160" autocomplete="off" placeholder="${aiOn ? "Or tell Hoot in your own words" : "Your own words need AI"}" ${aiOn ? "" : "disabled"}>
            <button type="submit" class="btn" ${aiOn ? "" : "disabled"}>Tell Hoot</button>
          </form>
          <p class="pip-reply hoot-reply" aria-live="polite" hidden></p>
          <button type="button" class="story-skip st-skip">Skip</button>
        </div>`);
      const card = box.querySelector(".pip-card");
      const reply = box.querySelector(".pip-reply");
      let done = false;

      function finish(id, text, byAI) {
        if (done) return;
        done = true;
        reply.hidden = false;
        reply.classList.remove("thinking");
        reply.innerHTML = `${byAI ? '<span class="by-ai">✨ Hoot understood your words (AI)</span>' : ""}🦉 ${text}`;
        api.sfx.good();
        const c = api.center(reply);
        api.burst(c.x, c.y, { count: 14, chars: ["🧠", "✨"], spread: 120 });
        api.addCoins(2, c);
        api.emit("strategyShared", { strategy: id });
        S.addFact(chapter, `explained how they solved ${a} + ${b}: ${id.replace(/_/g, " ")}`);
        box.querySelectorAll(".teach button, .teach input").forEach((el) => (el.disabled = true));
        const go = document.createElement("button");
        go.type = "button";
        go.className = "btn";
        go.textContent = "Keep going";
        go.addEventListener("click", () => {
          box.remove();
          resolve();
        });
        card.appendChild(go);
        go.focus();
      }

      box.querySelectorAll(".chip").forEach((chip) =>
        chip.addEventListener("click", () => {
          const way = WAYS.find(([id]) => id === chip.dataset.id);
          finish(way[0], way[2], false);
        }),
      );
      box.querySelector("form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const said = box.querySelector("#stInput").value.trim();
        if (!said || done) return;
        reply.hidden = false;
        reply.classList.add("thinking");
        reply.textContent = "🦉 Hoot is thinking…";
        const numbers = [...new Set([a, b, answer, 1, 10, a % 10, b % 10, Math.floor(a / 10) * 10, Math.floor(b / 10) * 10])];
        const result = await api.ai.strategy({ problem: `${a} + ${b} = ${answer}`, said, numbers });
        if (!api.alive() || done) return;
        if (result) finish(result.strategy, result.reply, true);
        else finish("other", "Thanks for sharing your thinking! Explaining your steps helps your brain remember them.", false);
      });
      box.querySelector(".st-skip").addEventListener("click", () => {
        box.remove();
        resolve();
      });
    });
  }

  window.MQTeach = { MISTAKES, mistake, strategy };
})();
