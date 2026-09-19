// "You wanna know how?" — the shared control and panel.
//
// Four different runtimes ask a child a question and mark it: class chapters and practice
// (class-games.js), the voyage missions (voyage-games.js), the learning trails (pathway.js) and the
// Arena (arena.js). Each draws its own board and keeps its own state, and the first version of this
// feature lived inside only one of them — so the owner opened a bridge mission and the button was
// simply not there.
//
// The offer belongs to all four, so it lives here once. A level supplies the facts at the moment it
// marks a question correct; everything else — the button, the panel, the request, the caching, the
// read-aloud, the failure state — is the same everywhere, which is also what stops the four copies
// drifting apart later.
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const READ_ALOUD = new Set(["K", "1", "2"]);

  /** True when the explainer's own provider account is configured and answering. */
  const available = () => Boolean(window.MQAI && window.MQAI.explainStatus() === "on");

  /**
   * Build the control and its panel.
   *
   * `actions`  where the button goes — usually beside the level's other secondary buttons.
   * `panel`    where the steps are written, usually straight under the feedback line.
   * `signal`   the level's lifecycle AbortSignal, so a request cannot outlive the screen.
   * `buttonClass` the level's own secondary-button class, so it looks native to that screen.
   */
  function create({ actions, panel, signal, buttonClass = "trail-help" }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${buttonClass} cg-how-ask`;
    button.hidden = true;
    button.textContent = "💡 You wanna know how?";
    actions.append(button);

    const box = document.createElement("div");
    box.className = "cg-how";
    box.hidden = true;
    panel.append(box);

    let facts = null, got = null, asking = false;

    const reset = () => {
      facts = null; got = null; asking = false;
      button.hidden = true; button.disabled = false;
      button.textContent = "💡 You wanna know how?";
      button.removeAttribute("aria-expanded");
      box.hidden = true; box.innerHTML = "";
    };

    /**
     * Offer the walk-through for a question that is ALREADY marked and scored. Called at the solve
     * moment, never before: the point of the feature is that asking costs a child nothing.
     * A question with no single answer for the server's closing-line guard to check is not offered.
     */
    const offer = (next) => {
      reset();
      if (!next || !next.answer || !available()) return;
      facts = next;
      button.hidden = false;
    };

    async function ask() {
      if (!facts) return;
      if (got) {
        box.hidden = !box.hidden;
        button.setAttribute("aria-expanded", String(!box.hidden));
        button.textContent = box.hidden ? "💡 You wanna know how?" : "💡 Hide the steps";
        return;
      }
      if (asking) return;
      asking = true;
      button.disabled = true;
      button.textContent = "💡 Working it out…";
      box.hidden = false;
      box.innerHTML = '<p class="cg-how-wait">Hoot is writing the steps…</p>';

      const reply = await window.MQAI.explain(facts, signal).catch(() => null);
      asking = false;
      if (signal && signal.aborted) return;
      if (!reply) {
        // Honest about what happened, and still offers the way back in. No silently dead button.
        button.disabled = false;
        button.textContent = "💡 Try that again";
        box.innerHTML = '<p class="cg-how-wait">Hoot could not write the steps just now.</p>';
        return;
      }

      got = reply;
      button.disabled = false;
      button.textContent = "💡 Hide the steps";
      button.setAttribute("aria-expanded", "true");
      box.innerHTML = `<h3 tabindex="-1">How it works</h3><ol class="cg-how-steps">${reply.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><p class="cg-how-answer">${esc(reply.answerLine)}</p>`;
      // Read-aloud for the children who cannot yet read the steps they just asked for.
      if ("speechSynthesis" in window && READ_ALOUD.has(facts.grade)) {
        const listen = document.createElement("button");
        listen.type = "button";
        listen.className = "cg-listen cg-how-listen";
        listen.textContent = "🔊 Read the steps";
        listen.addEventListener("click", () => {
          window.speechSynthesis.cancel();
          const words = new SpeechSynthesisUtterance([...reply.steps, reply.answerLine].join(" "));
          words.lang = "en-US";
          words.rate = facts.grade === "K" ? 0.8 : 0.95;
          window.speechSynthesis.speak(words);
        }, signal ? { signal } : undefined);
        box.append(listen);
      }
      box.querySelector("h3").focus({ preventScroll: true });
    }

    button.addEventListener("click", ask, signal ? { signal } : undefined);
    return { offer, reset, button, panel: box };
  }

  window.MQExplain = { available, create };
})();
