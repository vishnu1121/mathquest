// Hoot's Shop: spend coins on hats and pets by paying the exact price with bags of 10 and single coins
// (tens and ones practice). Plus the hidden treasure chest: pick three stones that make 20.
(function () {
  const S = window.MQS;
  let fx = null;
  let onChange = () => {};

  const ITEMS = [
    { id: "cap", kind: "hat", emoji: "🧢", name: "Explorer cap", price: 8 },
    { id: "shades", kind: "hat", emoji: "🕶️", name: "Cool shades", price: 12 },
    { id: "tophat", kind: "hat", emoji: "🎩", name: "Magic top hat", price: 17 },
    { id: "crown", kind: "hat", emoji: "👑", name: "Hero crown", price: 26 },
    { id: "chick", kind: "pet", emoji: "🐤", name: "Chirpy the chick", price: 14 },
    { id: "kitty", kind: "pet", emoji: "🐱", name: "Whiskers the kitty", price: 19 },
    { id: "fox", kind: "pet", emoji: "🦊", name: "Ember the fox", price: 23 },
    { id: "dragon", kind: "pet", emoji: "🐲", name: "Puff the baby dragon", price: 35 },
  ];
  const priceFor = (item) => S.get().grade === "K" ? { ...item, price: Math.min(5, Math.max(1, Math.ceil(item.price / 7))) } : item;
  const SECRET_HAT = { id: "scholar", kind: "hat", emoji: "🎓", name: "Secret scholar cap", price: 0 };
  // Where a worn thing belongs on the character: glasses sit on the face, everything else on top of the head.
  const FACE_WEAR = new Set(["🕶️", "😎", "👓", "🥽"]);
  const slotFor = (emoji) => (FACE_WEAR.has(emoji) ? "face" : "head");

  const heroHtml = () => {
    const s = S.get();
    return `<span class="shop-hero" aria-hidden="true">${S.hero()}${s.hat ? `<span class="sh-hat" data-slot="${slotFor(s.hat)}">${s.hat}</span>` : ""}${s.pet ? `<span class="sh-pet">${s.pet}</span>` : ""}</span>`;
  };

  function modal(className, inner) {
    const box = document.createElement("div");
    box.className = `shop ${className}`;
    box.innerHTML = `<div class="shop-card" role="dialog" aria-modal="true">${inner}</div>`;
    document.body.appendChild(box);
    box.addEventListener("click", (e) => e.target === box && box.remove());
    return box;
  }

  function wear(item) {
    S.update((s) => {
      if (item.kind === "hat") s.hat = s.hat === item.emoji ? null : item.emoji;
      else s.pet = s.pet === item.emoji ? null : item.emoji;
    });
    onChange();
  }

  function open() {
    const box = modal("", "");
    const card = box.querySelector(".shop-card");

    function renderGrid() {
      const s = S.get();
      card.innerHTML = `
        <div class="shop-head">
          <h2>🦉 Hoot's Shop</h2>
          <p class="shop-coins">🪙 ${s.coins} coins</p>
          <button type="button" class="hud-pill hud-icon shop-close" aria-label="Close the shop">✕</button>
        </div>
        <div class="shop-preview">${heroHtml()}<p>${S.get().grade === "K" ? "Touch single coins to buy a little gift." : "Pay with exact coins. Bags hold 10!"}</p></div>
        <ul class="shop-grid">
          ${[...ITEMS, ...(s.owned.includes(SECRET_HAT.id) ? [SECRET_HAT] : [])].map(priceFor).map((item) => {
            const owned = s.owned.includes(item.id);
            const wearing = s.hat === item.emoji || s.pet === item.emoji;
            const short = item.price - s.coins;
            const action = owned
              ? `<button type="button" class="btn ${wearing ? "" : "secondary"}" data-wear="${item.id}">${wearing ? "Wearing ✓" : "Wear"}</button>`
              : short > 0
                ? `<button type="button" class="btn secondary" disabled>Need ${short} more</button>`
                : `<button type="button" class="btn" data-buy="${item.id}">Buy</button>`;
            return `<li class="shop-item${owned ? " owned" : ""}">
              <span class="si-emoji" aria-hidden="true">${item.emoji}</span>
              <span class="si-name">${item.name}</span>
              <span class="si-price">${owned ? (item.kind === "hat" ? "Hat" : "Pet") : `🪙 ${item.price}`}</span>
              ${action}
            </li>`;
          }).join("")}
        </ul>`;
      card.querySelector(".shop-close").addEventListener("click", () => box.remove());
      card.querySelectorAll("[data-wear]").forEach((b) =>
        b.addEventListener("click", () => {
          wear([...ITEMS, SECRET_HAT].find((i) => i.id === b.dataset.wear));
          if (fx) fx.sfx.tap();
          renderGrid();
        }),
      );
      card.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => renderPay(ITEMS.find((i) => i.id === b.dataset.buy))));
      card.querySelector(".shop-close").focus();
    }

    function renderPay(item) {
      item = priceFor(item);
      const little = S.get().grade === "K";
      const coins = S.get().coins;
      let bags = 0;
      let ones = 0;
      card.innerHTML = `
        <div class="shop-head">
          <h2><span aria-hidden="true">${item.emoji}</span> ${item.name}</h2>
          <p class="shop-coins">🪙 ${coins} coins</p>
        </div>
        <p class="pay-goal">Pay exactly <b>${item.price}</b> coins.</p>
        <div class="pay-tray" aria-live="polite">
          <div class="pay-pile" id="payPile"></div>
          <p class="pay-total" id="payTotal">Paid: 0</p>
          <p class="pay-note" id="payNote">Tap bags of 10 and single coins.</p>
        </div>
        <div class="pay-buttons">
          <button type="button" class="btn sky" id="payTen">💰 Bag of 10</button>
          <button type="button" class="btn sky" id="payOne">🪙 1 coin</button>
          <button type="button" class="btn secondary" id="payBack">↩ Take one back</button>
        </div>
        <div class="pay-actions">
          <button type="button" class="story-skip" id="payCancel">Back to the shop</button>
          <button type="button" class="btn" id="payBuy" disabled>Buy it!</button>
        </div>`;
      const pile = card.querySelector("#payPile");
      const totalEl = card.querySelector("#payTotal");
      const note = card.querySelector("#payNote");
      const buy = card.querySelector("#payBuy");
      const history = [];
      if (little) { card.querySelector("#payTen").hidden = true; note.textContent = "Touch a coin to put it on the tray."; }

      function render() {
        const paid = bags * 10 + ones;
        pile.innerHTML = `${"<span class=\"pay-bag\">💰<i>10</i></span>".repeat(bags)}${"<span class=\"pay-coin\">🪙</span>".repeat(ones)}`;
        totalEl.textContent = `Paid: ${paid}`;
        card.querySelector("#payTen").disabled = paid + 10 > coins;
        card.querySelector("#payOne").disabled = paid + 1 > Math.min(coins, little ? 5 : coins);
        card.querySelector("#payBack").disabled = history.length === 0;
        buy.disabled = paid !== item.price;
        totalEl.className = paid === item.price ? "pay-total exact" : paid > item.price ? "pay-total over" : "pay-total";
        note.textContent = paid === item.price
          ? `${bags ? `${bags * 10} + ${ones}` : ones} = ${item.price}. Exactly right!`
          : paid > item.price ? `That's ${paid - item.price} too many. Take some back!` : `${item.price - paid} more to go.`;
      }
      const add = (kind) => {
        history.push(kind);
        if (kind === "ten") bags += 1;
        else ones += 1;
        if (fx) fx.sfx.coin();
        render();
      };
      card.querySelector("#payTen").addEventListener("click", () => add("ten"));
      card.querySelector("#payOne").addEventListener("click", () => add("one"));
      card.querySelector("#payBack").addEventListener("click", () => {
        const last = history.pop();
        if (last === "ten") bags -= 1;
        else if (last === "one") ones -= 1;
        if (fx) fx.sfx.tap();
        render();
      });
      card.querySelector("#payCancel").addEventListener("click", renderGrid);
      buy.addEventListener("click", () => {
        S.update((s) => {
          s.coins -= item.price;
          s.owned.push(item.id);
          if (item.kind === "hat") s.hat = item.emoji;
          else s.pet = item.emoji;
        });
        onChange();
        S.emit("bought", { id: item.id });
        if (fx) {
          fx.sfx.win();
          const c = fx.center(buy);
          fx.burst(c.x, c.y, { count: 24, chars: [item.emoji, "✨", "🪙"], spread: 200 });
        }
        renderGrid();
      });
      render();
      card.querySelector(little ? "#payOne" : "#payTen").focus();
    }

    renderGrid();
  }

  function openSecret() {
    const little = S.get().grade === "K", target = little ? 5 : 20, count = little ? 2 : 3;
    const stones = little ? [1,4,2,3,5,0] : [7,3,10,5,8,2];
    const box = modal("secret-box", `
      <div class="shop-head"><h2>🗝️ A hidden chest!</h2></div>
      <p class="secret-chest" aria-hidden="true">🧰</p>
      <p class="pay-goal">The lock needs <b>${target}</b>. Tap ${count} stones that make ${target}.</p>
      <div class="secret-stones" role="group" aria-label="Number stones">
        ${stones.map((n, i) => `<button type="button" class="secret-stone" data-i="${i}" aria-pressed="false">${n}</button>`).join("")}
      </div>
      <p class="pay-total" id="secretSum" aria-live="polite">0 of ${target}</p>
      <div class="pay-actions"><button type="button" class="story-skip" id="secretClose">Close</button></div>`);
    const picked = new Set();
    const sumEl = box.querySelector("#secretSum");
    box.querySelector("#secretClose").addEventListener("click", () => box.remove());
    box.querySelectorAll(".secret-stone").forEach((b) =>
      b.addEventListener("click", () => {
        const i = Number(b.dataset.i);
        if (picked.has(i)) picked.delete(i);
        else if (picked.size < count) picked.add(i);
        b.setAttribute("aria-pressed", String(picked.has(i)));
        if (fx) fx.sfx.hop(picked.size * 4);
        const nums = [...picked].map((k) => stones[k]);
        const sum = nums.reduce((x, y) => x + y, 0);
        sumEl.textContent = nums.length ? `${nums.join(" + ")} = ${sum}` : `0 of ${target}`;
        sumEl.className = sum === target && nums.length === count ? "pay-total exact" : sum > target ? "pay-total over" : "pay-total";
        if (nums.length === count && sum === target) unlock();
        else if (nums.length === count && fx) fx.sfx.wrong();
      }),
    );

    function unlock() {
      box.querySelectorAll(".secret-stone").forEach((b) => (b.disabled = true));
      const chest = box.querySelector(".secret-chest");
      chest.textContent = "💰";
      chest.classList.add("open");
      S.update((s) => {
        s.coins += 10;
        s.secret = true;
        if (!s.owned.includes(SECRET_HAT.id)) s.owned.push(SECRET_HAT.id);
      });
      onChange();
      S.emit("secret");
      if (fx) {
        fx.sfx.win();
        const c = fx.center(chest);
        fx.burst(c.x, c.y, { count: 28, chars: ["🪙", "✨", "🎓"], spread: 220 });
      }
      box.querySelector(".pay-goal").innerHTML = "You found <b>10 coins</b> and a secret scholar cap 🎓! Wear it in Hoot's Shop.";
    }
  }

  window.MQShop = {
    ITEMS,
    slotFor,
    open,
    openSecret,
    bind: (effects, changed) => {
      fx = effects;
      onChange = changed;
    },
  };
})();
