// Maths cards in the Practice view: the rules for this class, to look up while you practise.
//
// This is where the world maker used to sit. It is deliberately the opposite kind of thing: nothing here
// is generated, nothing is asked of a provider, and nothing changes between visits. A reference a child
// checks their own answer against has to say the same true thing every time, so the cards are written
// down in classes/reference.ts and every worked example on them is re-solved by a test.
//
// The rule is on the front and the worked example is one tap away, because a child who already knows the
// rule should not have to read the example, and a child who does not should not have to hunt for it.
import { cardsFor } from "../classes/reference";
import { CLASSES } from "../classes/catalog";

(function () {
  const S = window.MQS, MQ = window.MQ, $ = (id) => document.getElementById(id);
  const esc = window.MQClassArt.esc;
  const grade = () => window.MQClasses?.grade() || null;

  function render() {
    const box = $("mathCards");
    if (!box) return;
    const id = grade();
    if (!id) { box.innerHTML = ""; return; }
    const info = CLASSES[id], cards = cardsFor(id);
    if (!cards.length) { box.innerHTML = ""; return; }
    const open = box.dataset.open === "true";

    box.innerHTML = `<div class="rc-head">
        <div><p class="voyage-kicker">${esc(info.label.toUpperCase())} · MATHS CARDS</p><h2>The rules, whenever you want them.</h2><p class="rc-lede">Not a test and nothing to finish — just how each idea works, with one worked example. Tap a card to see the example.</p></div>
        <button type="button" class="rc-all" data-rc="all" aria-pressed="${open}">${open ? "Hide the examples" : "Show every example"}</button>
      </div>
      <ul class="rc-grid">${cards.map((card, i) => `<li class="rc-card">
        <button type="button" class="rc-face" id="rc-face-${i}" aria-expanded="${open}" aria-controls="rc-body-${i}">
          <span class="rc-icon" aria-hidden="true">${card.icon}</span>
          <b>${esc(card.title)}</b>
          <span class="rc-rule">${esc(card.rule)}</span>
          <span class="rc-more" aria-hidden="true">${open ? "Hide the example" : "See an example"}</span>
        </button>
        <p class="rc-body" id="rc-body-${i}" ${open ? "" : "hidden"}>${esc(card.example)}</p>
      </li>`).join("")}</ul>`;

    box.querySelectorAll("[data-rc='all']").forEach((b) => (b.onclick = () => {
      box.dataset.open = String(!open);
      render();
      MQ.fx.sfx.tap();
      box.querySelector("[data-rc='all']")?.focus({ preventScroll: true });
    }));
    box.querySelectorAll(".rc-face").forEach((face) => (face.onclick = () => {
      const body = document.getElementById(face.getAttribute("aria-controls"));
      const showing = face.getAttribute("aria-expanded") === "true";
      face.setAttribute("aria-expanded", String(!showing));
      body.hidden = showing;
      face.querySelector(".rc-more").textContent = showing ? "See an example" : "Hide the example";
      MQ.fx.sfx.tap();
    }));
  }

  const previous = MQ.start;
  MQ.start = function () {
    previous();
    const map = $("mapScreen");
    if (map && !$("mathCards")) {
      const box = document.createElement("section");
      box.id = "mathCards";
      box.className = "rc-panel";
      // Directly under the practice heading, where the world maker used to be.
      map.querySelector(".map-intro")?.after(box);
    }
    render();
    S.on("classChanged", render);
  };

  window.MQReference = { render, cardsFor };
})();
