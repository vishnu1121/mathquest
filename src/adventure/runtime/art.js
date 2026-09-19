// Original, hand-drawn SVG artwork. No image files, fonts, or external assets.
(function () {
  const owl = `<svg viewBox="0 0 100 110" fill="none" aria-hidden="true"><path d="M20 41 17 15 39 28M80 41 83 15 61 28" fill="#497767"/><path d="M12 65C12 36 29 24 50 24s38 12 38 41c0 26-15 39-38 39S12 91 12 65" fill="#598575"/><path d="M29 75c0-18 42-18 42 0v14c-8 13-34 13-42 0" fill="#e6e8be"/><path d="M15 56C-2 65 7 86 19 87M85 56c17 9 8 30-4 31" fill="#365d50"/><circle cx="34" cy="51" r="19" fill="#fff7da"/><circle cx="66" cy="51" r="19" fill="#fff7da"/><circle cx="37" cy="53" r="7" fill="#263f38"/><circle cx="63" cy="53" r="7" fill="#263f38"/><circle cx="39" cy="50" r="2.4" fill="white"/><circle cx="65" cy="50" r="2.4" fill="white"/><path d="m44 67 6 9 6-9" fill="#e9ae51"/><path d="M31 103h12m14 0h12" stroke="#d99b45" stroke-width="6" stroke-linecap="round"/></svg>`;
  function landscape(id = "valley", palette = "forest") {
    const tree = (x, y, s, c) => {
      const shapes = {
        space: '<circle cy="10" r="40" fill="#b6a4d0"/><ellipse cy="10" rx="67" ry="16" fill="none" stroke="#e2c89f" stroke-width="8" transform="rotate(-25)"/><circle cx="-12" cy="-7" r="9" fill="#d5c6e4"/>',
        ocean: '<path d="M0 88V-35m0 65C-43 30-41 2-40-16M0 52c42 0 44-28 40-44M0-4c21 1 26-15 24-34m-63 31-19-21" fill="none" stroke="#cf9e8f" stroke-width="15" stroke-linecap="round"/>',
        candy: '<path d="M0 10v82" stroke="#fcf0d4" stroke-width="13" stroke-linecap="round"/><circle cy="-10" r="42" fill="#d9a4a3"/><path d="M0-10c-20-19-37 13-14 22 35 15 54-30 24-48" fill="none" stroke="#fff0d0" stroke-width="10" stroke-linecap="round"/>',
        volcano: '<path d="m-56 69 38-118h34L58 69Z" fill="#9d9588"/><path d="m-18-49-15 48 20-10L0 9l11-26 17 13-12-45Z" fill="#dca375"/><path d="m-3-65 8-15-9-16" fill="none" stroke="#d4c5a9" stroke-width="10" stroke-linecap="round"/>',
      };
      return `<g transform="translate(${x} ${y}) scale(${s})">${shapes[palette] || `<path d="M0 0v94" stroke="#8d7652" stroke-width="13" stroke-linecap="round"/><path d="M0-63C-51-58-63-11-47 15c-28 40 4 63 47 48 43 15 75-8 47-48C63-11 51-58 0-63" fill="${c}"/><path d="M0 3v75m0-49-22-16M0 46l21-17" stroke="#ffffff" stroke-opacity=".15" stroke-width="4" stroke-linecap="round"/>`}</g>`;
    };
    let art = `<svg class="valley-art" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#e3eee8"/><stop offset="1" stop-color="#f4edcc"/></linearGradient><linearGradient id="${id}-water" x2="0" y2="1"><stop stop-color="#96c5c1"/><stop offset="1" stop-color="#b0d7cb"/></linearGradient><radialGradient id="${id}-glow"><stop stop-color="#fff3ba" stop-opacity=".95"/><stop offset="1" stop-color="#fff3ba" stop-opacity="0"/></radialGradient></defs>
      <path fill="url(#${id}-sky)" d="M0 0h1000v640H0z"/>
      <circle cx="716" cy="128" r="70" fill="#fff7d1"/>
      <g fill="#fffdf1" opacity=".8"><path d="M109 137c-18-25 13-45 34-35 3-38 62-38 65-5 40-14 65 34 37 44Z"/><path d="M774 207c-17-22 4-43 29-34 4-33 58-40 64-7 39-15 62 32 31 40Z"/><path d="M379 68c-11-18 5-32 24-26 3-26 38-26 42-3 24-7 38 23 17 31Z"/></g>
      <path d="M0 299 129 146 277 300 424 143 594 308 769 192 1000 303v337H0Z" fill="#b7ccc0"/>
      <path d="m84 198 45-52 54 57-38-14-16 11-21-11Zm290 0 50-55 58 61-40-16-18 14-19-17Z" fill="#edf2df"/>
      <path d="M0 320Q152 239 304 316T629 294T1000 291V640H0Z" fill="#91b7a0"/>
      <path d="M0 367Q215 275 410 372T788 340T1000 365V640H0Z" fill="#abc69e"/>
      <path d="M656 317c-60 45-84 72-14 100S737 489 604 520 465 602 494 640h250c-101-88-3-104 57-141 98-58-67-73-120-102-54-28-72-37 4-79Z" fill="url(#${id}-water)"/>
      <g fill="none" stroke="#e7f5df" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M647 364h30m-59 27h38m14 87h37m-86 77h61m-72 40h38m89-159h29"/></g>
      <path d="M-20 550C175 538 220 395 432 423s244 40 423-140" fill="none" stroke="#c7b995" stroke-width="49" stroke-linecap="round"/>
      <path d="M-20 550C175 538 220 395 432 423s244 40 423-140" fill="none" stroke="#f4e6ba" stroke-width="39" stroke-linecap="round"/>
      <path d="M-20 550C175 538 220 395 432 423s244 40 423-140" fill="none" stroke="#d6bf8c" stroke-width="3" stroke-dasharray="2 17" stroke-linecap="round"/>
      ${tree(80, 337, 1.2, "#557e60")}${tree(182, 290, .7, "#749974")}${tree(947, 330, 1.4, "#618869")}${tree(887, 286, .8, "#7a9e75")}${tree(441, 282, .6, "#739572")}
      <g transform="translate(527 405) rotate(7)"><path d="M-34-7h114v47H-34z" fill="#a48057"/><path d="M-28-4v39m17-39v39M6-4v39M23-4v39M40-4v39M57-4v39M74-4v39" stroke="#d7bb88" stroke-width="12"/><path d="M-35-10H84M-35 38H84" stroke="#816548" stroke-width="6" stroke-linecap="round"/></g>
      <g transform="translate(807 257)"><path d="M-28 36h57v38h-57z" fill="#cfb98b"/><path d="m-44 37 45-46 42 46" fill="#638474"/><path d="M-11 74V51q11-18 22 0v23" fill="#5d7660"/><path d="M0-7v-38" stroke="#94704e" stroke-width="7"/><circle cx="0" cy="-47" r="76" fill="url(#${id}-glow)"/><path d="M-15-65h30v37q-15 12-30 0z" fill="#f9d06f" stroke="#b88644" stroke-width="4"/><path d="M-18-65h36m-34 35h32M0-76v10" stroke="#6a7760" stroke-width="5" stroke-linecap="round"/></g>
      <path d="M0 606q93-70 217-19t241 53H0Z" fill="#709369"/><path d="M767 640q115-127 233-91v91Z" fill="#668b67"/>
      ${tree(17, 491, 1.6, "#3e6d56")}${tree(989, 508, 1.8, "#3f6d56")}
      <g fill="#f9e9ad"><circle cx="166" cy="463" r="5"/><circle cx="300" cy="369" r="5"/><circle cx="754" cy="539" r="5"/><circle cx="855" cy="459" r="4"/><circle cx="336" cy="560" r="4"/></g>
      <g stroke="#527653" stroke-width="3" stroke-linecap="round"><path d="m225 530-4-13m4 13 7-16m139-42-4-12m4 12 7-16m463 43-4-13m4 13 7-16"/></g>
      <g transform="translate(315 493)"><path d="M0 0v21m27-13v15" stroke="#f5e7bd" stroke-width="9"/><path d="M-18 1q2-28 19-27T21 1Z" fill="#d48b70"/><path d="M13 10q2-23 15-22t17 22Z" fill="#e6b779"/><circle cx="-4" cy="-11" r="4" fill="#fff4d9"/><circle cx="9" cy="-5" r="3" fill="#fff4d9"/></g>
      <g class="valley-sparks" fill="#fff6bb"><circle cx="477" cy="346" r="4"/><circle cx="731" cy="252" r="4"/><circle cx="217" cy="219" r="3"/><circle cx="740" cy="389" r="3"/><circle cx="389" cy="471" r="3"/></g>
    </svg>`;
    const colors = {
      space: ["#e3deee", "#ebe5f1", "#b8aec9", "#ab9cbb", "#bdb2c9", "#8e83a9", "#9c93b2"],
      ocean: ["#d8edf0", "#dceee0", "#9cbfc3", "#8eb6b3", "#a0c9c0", "#629e9f", "#75afae"],
      candy: ["#f3e7e7", "#fff0da", "#d4bfc9", "#c2b3c6", "#e0c5c4", "#b5a3b8", "#c2adae"],
      volcano: ["#ece4d8", "#f9ead1", "#c7b7a0", "#b7aa8d", "#d1c19b", "#9b977c", "#ae9e7c"],
    }[palette];
    if (colors) ["#e3eee8", "#f4edcc", "#b7ccc0", "#91b7a0", "#abc69e", "#709369", "#668b67"].forEach((color, i) => { art = art.replaceAll(color, colors[i]); });
    return art;
  }
  window.MQArt = { owl, landscape };
})();
