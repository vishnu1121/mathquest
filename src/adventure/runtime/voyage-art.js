// Original vector artwork. No downloaded assets, fonts or image requests.
(function () {
  const svg = (body, cls = "", viewBox = "0 0 160 140") => `<svg class="${cls}" viewBox="${viewBox}" ${cls === "voyage-island-art" ? 'preserveAspectRatio="none"' : ""} aria-hidden="true">${body}</svg>`;
  function building(id) {
    const shadow = '<ellipse cx="80" cy="120" rx="64" ry="13" fill="#123e55" opacity=".2"/>';
    const art = {
      frog: '<ellipse cx="80" cy="104" rx="64" ry="22" fill="#5cbcbc"/><ellipse cx="76" cy="101" rx="42" ry="13" fill="#b5e6b0"/><path d="m69 101 23-12-5 18" fill="#5cbcbc"/><path d="M48 85Q40 56 58 54Q59 28 78 48Q102 29 108 57Q125 82 106 99H60Z" fill="#81c765" stroke="#356f54" stroke-width="4"/><circle cx="64" cy="59" r="6" fill="#233e43"/><circle cx="96" cy="59" r="6" fill="#233e43"/><path d="M67 79Q80 91 95 79" fill="none" stroke="#233e43" stroke-width="4" stroke-linecap="round"/>',
      fireflies: '<path d="M79 12v18M62 28h36" stroke="#654d7f" stroke-width="7" stroke-linecap="round"/><path d="m47 42 65-1 8 56-24 24H64L40 97Z" fill="#f6bd60" stroke="#795183" stroke-width="5"/><path d="M59 49h41v49H59Z" fill="#fff5a3"/><path d="M80 40v70M44 95h74" stroke="#c78768" stroke-width="4"/><path d="m80 56 5 13 14 5-14 5-5 13-5-13-14-5 14-5Z" fill="#fff"/><circle cx="26" cy="52" r="5" fill="#fff6b8"/><circle cx="135" cy="72" r="6" fill="#fff6b8"/>',
      guardian: '<path d="M28 115 32 57 49 43 42 19 77 31 110 13 111 43 131 60 128 116Z" fill="#698c98" stroke="#3b5b73" stroke-width="4"/><path d="m48 48 30-11 34 9-7 52-27 20-28-20Z" fill="#9ec3b0"/><path d="m56 65 13 4m21 0 13-4" stroke="#21474e" stroke-width="5" stroke-linecap="round"/><path d="M66 88q13 12 26 0" fill="none" stroke="#21474e" stroke-width="4"/><path d="M25 103 8 80 20 58M132 96l18-21-7-20" fill="none" stroke="#72965d" stroke-width="8"/><path d="m72 17 9-13 12 16" fill="#f9d374"/>',
      skyrail: '<path d="m8 107 137 0m-137 12h137" stroke="#74516e" stroke-width="5"/><path d="M31 43h86v61H31Z" fill="#f5c7a0"/><path d="m18 48 56-39 57 39Z" fill="#ea817c" stroke="#955472" stroke-width="4"/><path d="M65 71q14-18 27 0v34H65Z" fill="#5b6592"/><path d="M43 59h15v17H43Z" fill="#fff6c1"/><circle cx="77" cy="39" r="10" fill="#fff3cd"/><path d="M77 33v6l5 2" stroke="#5a5683" stroke-width="2" fill="none"/><path d="M111 75h32v26h-32Z" fill="#91c7cd"/><circle cx="118" cy="108" r="7" fill="#525171"/><circle cx="139" cy="108" r="7" fill="#525171"/>',
      robotworks: '<path d="M27 69h108v46H27Z" fill="#987bad"/><path d="M39 63V25h15v37M104 62V11h18v62" stroke="#654a7e" stroke-width="9"/><path d="m18 72 36-29 25 21 27-23 36 32" fill="#caa5c5" stroke="#665281" stroke-width="4"/><rect x="56" y="60" width="51" height="43" rx="12" fill="#9de0d9" stroke="#476e8f" stroke-width="4"/><circle cx="70" cy="77" r="4" fill="#344b72"/><circle cx="92" cy="77" r="4" fill="#344b72"/><path d="M73 89h16" stroke="#344b72" stroke-width="4" stroke-linecap="round"/><circle cx="38" cy="99" r="13" fill="#f9d175"/><path d="M38 91v16m-8-8h16" stroke="#ba885d" stroke-width="3"/>',
      cloudbridge: '<path d="M10 110Q80 3 149 110" fill="none" stroke="#c397cb" stroke-width="22"/><path d="M10 107Q80 1 149 107" fill="none" stroke="#efadba" stroke-width="12"/><path d="M10 103Q80 0 149 103" fill="none" stroke="#ffe3a1" stroke-width="5"/><path d="M20 105h121" stroke="#f5ecda" stroke-width="9" stroke-dasharray="15 5"/><path d="M8 116q-17-21 7-27 6-25 24-9 25 0 19 25 14 18-7 20H9Z" fill="#e7eefb"/><path d="M109 117q-17-21 7-27 6-25 24-9 25 0 19 25 14 18-7 20h-42Z" fill="#e7eefb"/>',
      camp: '<path d="m16 114 65-85 62 85Z" fill="#efb575"/><path d="m80 29 16 85H44Z" fill="#ed896f"/><path d="m80 69 16 45H62Z" fill="#655076"/><path d="M77 31V9m0 0 31 10-31 8" fill="#a3dacc" stroke="#526e80" stroke-width="4"/><path d="m25 118 16-3m82 3 18-4" stroke="#685268" stroke-width="5"/>',
      garden: '<ellipse cx="80" cy="107" rx="65" ry="24" fill="#588c73"/><path d="M18 116V86m28 36V93m28 32V96m28 26V94m30 24V87M14 101h126" stroke="#f1d39c" stroke-width="6"/><path d="M60 94V41m40 56V55" stroke="#42745b" stroke-width="7"/><g fill="#f7c971"><circle cx="60" cy="27" r="16"/><circle cx="44" cy="43" r="16"/><circle cx="76" cy="43" r="16"/><circle cx="60" cy="58" r="16"/></g><circle cx="60" cy="43" r="13" fill="#715d66"/><g fill="#dca5ce"><circle cx="100" cy="48" r="21"/></g><circle cx="100" cy="48" r="9" fill="#fff0b6"/>',
      water: '<ellipse cx="80" cy="103" rx="67" ry="27" fill="#7ecbd0" stroke="#ead4a5" stroke-width="8"/><path d="M26 99q12 9 25 0m47 11q12 8 24 0" fill="none" stroke="#e6f6e6" stroke-width="4"/><path d="m62 48 9-26 21 0 9 26v55H62Z" fill="#c0dcec" stroke="#597f97" stroke-width="4"/><path d="M64 73h35v27H64Z" fill="#69b7c6"/><path d="M68 38h30" stroke="#ecc48d" stroke-width="6"/><ellipse cx="40" cy="97" rx="16" ry="12" fill="#739c67"/><circle cx="56" cy="95" r="7" fill="#9cc987"/><path d="m32 89 13 12m-14-1 12-11" stroke="#446d64" stroke-width="3"/>',
    };
    return svg(shadow + (art[id] || art.camp), "voyage-building");
  }
  const nimbus = svg('<path d="M24 107Q2 89 22 65Q18 37 46 37Q59 6 88 30Q119 18 129 48Q159 56 141 86Q148 114 111 117H46Z" fill="#d8def8" stroke="#8c8fc7" stroke-width="4"/><ellipse cx="60" cy="73" rx="5" ry="7" fill="#494472"/><ellipse cx="103" cy="73" rx="5" ry="7" fill="#494472"/><path d="M73 89q9 7 17-1" stroke="#494472" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="49" cy="85" rx="9" ry="5" fill="#efb0c3"/><ellipse cx="116" cy="85" rx="9" ry="5" fill="#efb0c3"/><path d="m40 117 18-10 14 20-25 5Z" fill="#efa976"/><path d="m58 118 12 16 19-7-16-16" fill="#f7c88a"/>', "nimbus-art");
  function island(done = {}) {
    const trees = [[110,445],[125,475],[162,540],[290,535],[330,588],[336,425],[150,185],[178,158],[335,230],[382,153],[452,112],[510,280],[580,250],[705,161],[895,290],[985,340],[1050,520],[902,577],[738,625],[560,616],[433,502]];
    return svg(`<defs><linearGradient id="vi-land" x2="0" y2="1"><stop stop-color="#b5ddb5"/><stop offset="1" stop-color="#79b7a0"/></linearGradient>
      <!-- Tropical water: deep aqua out at the edges, brighter towards the middle where the land sits. -->
      <pattern id="vi-sea" width="100" height="80" patternUnits="userSpaceOnUse"><path d="M15 30q12 8 24 0m19 31q8 5 18 0" fill="none" stroke="#a6e6ea" opacity=".28" stroke-width="2"/></pattern></defs>
      <!-- Open water: four bands of swell drifting at different speeds, so the sea reads as moving depth
           rather than a texture. Each band is twice the canvas wide and slides by exactly half its width,
           which makes the loop seamless. -->
      <g class="vi-swell">${[[70, "#6fd2dc", 0.34, 34], [255, "#8fe2e7", 0.26, 46], [470, "#6fd2dc", 0.30, 38], [668, "#a4ecef", 0.24, 52]].map(([y, colour, opacity, dur], i) => `<path class="vi-wave" style="--dur:${dur}s;--flip:${i % 2 ? -1 : 1}" opacity="${opacity}" fill="none" stroke="${colour}" stroke-width="6" stroke-linecap="round" d="M-1200 ${y}q50-16 100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0"/>`).join("")}</g>
      <path d="M50 417Q20 318 102 243Q74 128 229 128Q293 48 428 70Q515-8 614 77Q741 36 811 115Q1027 47 1080 235Q1184 296 1105 405Q1170 566 990 629Q923 727 780 674Q652 750 535 661Q407 730 322 646Q146 642 108 550Q42 536 50 417Z" fill="#3cb9c4" stroke="#8fe3e8" stroke-width="5"/>
      <path d="M72 396Q52 303 131 245Q99 150 241 153Q298 80 440 96Q523 23 616 102Q741 65 809 140Q1010 74 1051 252Q1147 305 1074 405Q1131 549 977 601Q911 690 780 647Q660 716 541 633Q411 694 330 621Q168 614 134 533Q62 505 72 396Z" fill="url(#vi-land)" stroke="#e6d5a1" stroke-width="16"/>
      <path d="M590 115Q610 238 474 333T235 533" fill="none" stroke="#538d9c" stroke-width="50"/><path d="M590 115Q610 238 474 333T235 533" fill="none" stroke="#8acbd0" stroke-width="34"/><path d="m407 365 81 35" stroke="#b78065" stroke-width="38"/><path d="m407 365 81 35" stroke="#e6ba82" stroke-width="28" stroke-dasharray="8 4"/>
      <path d="M190 490Q125 337 235 240Q343 160 525 175Q687 90 830 205Q1055 260 955 475Q871 609 670 550Q526 544 510 440Q359 513 190 490" fill="none" stroke="#ecd7a7" stroke-width="26" stroke-linecap="round"/><path d="M190 490Q125 337 235 240Q343 160 525 175Q687 90 830 205Q1055 260 955 475Q871 609 670 550" fill="none" stroke="#bdad89" stroke-width="3" stroke-dasharray="2 15" stroke-linecap="round"/>
      <path d="M745 249Q844 340 1020 312" fill="none" stroke="#657087" stroke-width="15"/><path d="M745 249Q844 340 1020 312" fill="none" stroke="#e4d1b6" stroke-width="8" stroke-dasharray="4 7"/>
      ${trees.map(([x,y],i) => `<g transform="translate(${x},${y})"><ellipse cy="20" rx="18" ry="7" fill="#315c64" opacity=".16"/><path d="M0 1v20" stroke="#887864" stroke-width="6"/><path d="m0-44 23 42h-46l13-23h-6Z" fill="${["#447b70","#649c79","#477c85"][i%3]}"/><path d="m0-44 4 42h19Z" fill="#254d60" opacity=".12"/></g>`).join("")}
      <g fill="#f6e1a2">${[[356,550],[368,563],[348,569],[740,302],[759,312],[725,312],[922,390],[909,403]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4"/>`).join("")}</g>
      ${done.cloudbridge ? '<path d="M602 460Q680 329 759 460" stroke="#edb4cc" fill="none" stroke-width="14" opacity=".65"/><path d="M602 453Q680 322 759 453" stroke="#ffe4a1" fill="none" stroke-width="7"/>' : '<g fill="#d8e1ec" opacity=".7"><ellipse cx="687" cy="556" rx="77" ry="23"/><ellipse cx="729" cy="569" rx="49" ry="18"/></g>'}
      <g fill="#e9eef4" opacity=".85"><path d="M15 115q-17-21 7-27 6-25 24-9 25 0 19 25 14 18-7 20H16Z"/><path d="M1069 671q-17-21 7-27 6-25 24-9 25 0 19 25 14 18-7 20h-42Z"/></g>`, "voyage-island-art", "0 0 1200 760");
  }
  /**
   * The sea is inhabited. Friendly creatures cruise the open water around the island on long, slow,
   * staggered loops — never across the land, never over a landmark button. This is an HTML layer rather
   * than part of the island SVG because that SVG is stretched to fill, which would squash them.
   */
  function seaLife() {
    // The open water is a frame around the land, so the creatures patrol that frame: across the top and
    // bottom channels, and up and down the two side channels. Nothing ever swims over the island.
    const across = [
      { emoji: "🐬", at: 2.5, dur: 68, delay: 0, size: 36, dir: 1 },
      { emoji: "🐢", at: 5.5, dur: 96, delay: 31, size: 30, dir: -1 },
      { emoji: "🐳", at: 95, dur: 120, delay: 17, size: 42, dir: 1 },
      { emoji: "🐠", at: 92, dur: 78, delay: 54, size: 25, dir: -1 },
    ];
    const along = [
      { emoji: "🦀", at: 2, dur: 88, delay: 9, size: 26, dir: 1 },
      { emoji: "🐡", at: 96.5, dur: 102, delay: 47, size: 26, dir: -1 },
    ];
    const one = (s, cls, axis) =>
      `<span class="vw-swimmer ${cls}" style="--${axis}:${s.at}%;--dur:${s.dur}s;--delay:-${s.delay}s;--size:${s.size}px;--dir:${s.dir}"><i>${s.emoji}</i></span>`;
    return `<div class="vw-sealife" aria-hidden="true">${across.map((s) => one(s, "vw-across", "top")).join("")}${along.map((s) => one(s, "vw-along", "left")).join("")}</div>`;
  }
  const robot = svg('<ellipse cx="80" cy="126" rx="45" ry="9" fill="#273c6255"/><path d="M56 100v19m47-19v19" stroke="#48576f" stroke-width="12" stroke-linecap="round"/><rect x="47" y="68" width="66" height="43" rx="13" fill="#e9bd81" stroke="#7b6986" stroke-width="4"/><path d="M80 73v31" stroke="#fce5b1" stroke-width="4"/><circle cx="96" cy="88" r="5" fill="#f9f0c1"/><path d="m46 78-14 11m83-11 13 11" stroke="#8dabc1" stroke-width="12" stroke-linecap="round"/><path d="M80 30V15" stroke="#667c99" stroke-width="4"/><circle cx="80" cy="12" r="7" fill="#ffdb83"/><rect x="43" y="30" width="75" height="47" rx="16" fill="#aeddd5" stroke="#637590" stroke-width="4"/><circle cx="64" cy="50" r="5" fill="#3c4d70"/><circle cx="96" cy="50" r="5" fill="#3c4d70"/><path d="M73 64q8 5 15-1" fill="none" stroke="#3c4d70" stroke-width="3" stroke-linecap="round"/>', 'voyage-robot');
  window.MQVoyageArt = { building, island, seaLife, nimbus, robot };
})();
