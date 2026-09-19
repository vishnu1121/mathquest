// Pictures for class chapters: every Visual and every live build preview from src/adventure/classes/tasks.ts,
// drawn with original SVG, CSS and emoji. Pictures never carry the answer as text, and meaning never relies on color alone.
(function () {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let uid = 0;
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const pt = (list) => list.map((p) => p.map((n) => Math.round(n * 10) / 10).join(",")).join(" ");
  const wrap = (label, body, cls = "") => `<div class="cv ${cls}" role="img" aria-label="${esc(label)}">${body}</div>`;

  // ---------- Flat shapes and solids ----------
  const regular = (n, r = 48, start = -90) => pt(Array.from({ length: n }, (_, i) => [60 + r * Math.cos((start + (i * 360) / n) * Math.PI / 180), 60 + r * Math.sin((start + (i * 360) / n) * Math.PI / 180)]));
  const SHAPES = {
    circle: '<circle cx="60" cy="60" r="44"/>',
    oval: '<ellipse cx="60" cy="60" rx="52" ry="32"/>',
    triangle: '<polygon points="60,12 108,102 12,102"/>',
    square: '<rect x="20" y="20" width="80" height="80"/>',
    rectangle: '<rect x="8" y="30" width="104" height="60"/>',
    rhombus: '<polygon points="60,8 96,60 60,112 24,60"/>',
    trapezoid: '<polygon points="36,30 84,30 110,90 10,90"/>',
    parallelogram: '<polygon points="36,30 112,30 84,90 8,90"/>',
    kite: '<polygon points="60,10 94,44 60,112 26,44"/>',
    pentagon: `<polygon points="${regular(5)}"/>`,
    hexagon: `<polygon points="${regular(6, 50, 0)}"/>`,
    octagon: `<polygon points="${regular(8, 50, 22.5)}"/>`,
    rightTriangle: '<polygon points="20,18 20,102 102,102"/><path class="cv-corner" d="M20 88h14v14"/>',
    acuteTriangle: '<polygon points="50,12 102,100 16,92"/>',
    obtuseTriangle: '<polygon points="8,96 112,96 34,58"/>',
    heart: '<path d="M60 104C20 78 6 52 20 32C34 12 56 20 60 38C64 20 86 12 100 32C114 52 100 78 60 104Z"/>',
    openShape: '<polyline class="cv-open" points="30,100 14,56 60,14 106,56 90,100"/>',
  };
  const SYM = { vertical: "M60 0V120", horizontal: "M0 60H120", diagonal: "M4 116L116 4" };
  function shape(v, size = "") {
    const body = `<g transform="rotate(${v.rotate || 0} 60 60)">${SHAPES[v.shape] || SHAPES.circle}${v.symmetry ? `<path class="cv-sym" d="${SYM[v.symmetry]}"/>` : ""}</g>`;
    return `<svg class="cv-shape ${size}" viewBox="-8 -8 136 136" aria-hidden="true">${body}</svg>`;
  }
  const SOLIDS = {
    cube: '<polygon class="f1" points="20,44 76,44 76,100 20,100"/><polygon class="f2" points="20,44 44,20 100,20 76,44"/><polygon class="f3" points="76,44 100,20 100,76 76,100"/>',
    prism: '<polygon class="f1" points="8,54 82,54 82,100 8,100"/><polygon class="f2" points="8,54 34,32 108,32 82,54"/><polygon class="f3" points="82,54 108,32 108,78 82,100"/>',
    sphere: '<circle class="f1" cx="60" cy="60" r="46"/><ellipse class="cv-dash" cx="60" cy="60" rx="46" ry="13"/><ellipse class="cv-shine" cx="44" cy="40" rx="11" ry="7"/>',
    cone: '<path class="f1" d="M60 10L106 94A46 14 0 0 1 14 94Z"/><ellipse class="f2" cx="60" cy="94" rx="46" ry="14"/>',
    cylinder: '<path class="f1" d="M16 28V92A44 14 0 0 0 104 92V28"/><ellipse class="f2" cx="60" cy="28" rx="44" ry="14"/>',
    pyramid: '<polygon class="f1" points="14,92 62,108 60,14"/><polygon class="f3" points="62,108 106,86 60,14"/>',
  };
  const solid = (v) => `<svg class="cv-shape cv-solid" viewBox="0 0 120 120" aria-hidden="true">${SOLIDS[v.solid] || SOLIDS.cube}</svg>`;

  // ---------- Fractions ----------
  function weights(parts, unequal) {
    const w = Array.from({ length: parts }, (_, i) => (unequal ? (i % 2 === 0 ? 1.7 : 0.55) + (i === parts - 1 ? 0.4 : 0) : 1));
    const total = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / total);
  }
  function fractionOne(model, parts, shaded, unequal) {
    const id = `cvh${++uid}`;
    const defs = `<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" class="cv-fill"/><path d="M0 0V8" class="cv-hatch"/></pattern></defs>`;
    const fill = (i) => (i < shaded ? `fill="url(#${id})" class="cv-part on"` : 'class="cv-part"');
    if (model === "circle") {
      let a = -90;
      const wedges = weights(parts, unequal).map((w, i) => {
        const start = a, end = a + w * 360; a = end;
        if (parts === 1) return `<circle cx="60" cy="60" r="52" ${fill(i)}/>`;
        const p = (deg) => [60 + 52 * Math.cos(deg * Math.PI / 180), 60 + 52 * Math.sin(deg * Math.PI / 180)];
        const [x1, y1] = p(start), [x2, y2] = p(end);
        return `<path d="M60 60L${x1.toFixed(1)} ${y1.toFixed(1)}A52 52 0 ${end - start > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z" ${fill(i)}/>`;
      }).join("");
      return `<svg class="cv-frac cv-frac-circle" viewBox="0 0 120 120" aria-hidden="true">${defs}${wedges}</svg>`;
    }
    const grid = model === "rect" && !unequal && [4, 6, 8].includes(parts);
    if (grid) {
      const cols = parts / 2, cw = 200 / cols;
      const cells = Array.from({ length: parts }, (_, i) => `<rect x="${(i % cols) * cw}" y="${Math.floor(i / cols) * 55}" width="${cw}" height="55" ${fill(i)}/>`).join("");
      return `<svg class="cv-frac" viewBox="-2 -2 204 114" aria-hidden="true">${defs}${cells}</svg>`;
    }
    let x = 0;
    const h = model === "bar" ? 50 : 100;
    const cells = weights(parts, unequal).map((w, i) => { const cell = `<rect x="${x}" y="0" width="${w * 240}" height="${h}" ${fill(i)}/>`; x += w * 240; return cell; }).join("");
    return `<svg class="cv-frac ${model === "bar" ? "cv-frac-bar" : ""}" viewBox="-2 -2 244 ${h + 4}" aria-hidden="true">${defs}${cells}</svg>`;
  }
  function fraction(v) {
    const wholes = v.wholes || 1;
    const body = Array.from({ length: wholes }, (_, w) => fractionOne(v.model, v.parts, Math.max(0, Math.min(v.parts, v.shaded - w * v.parts)), v.unequal)).join("");
    return wrap(v.unequal ? `A shape cut into ${v.parts} parts of different sizes` : `A shape cut into ${v.parts} equal parts${v.shaded ? `, ${v.shaded} shaded` : ""}`, `<div class="cv-row">${body}</div>`);
  }

  // ---------- Numbers you can see ----------
  function objects(v) {
    const groups = v.groups.map((g) => `<span class="cv-group">${Array.from({ length: g.count }, (_, i) => `<i class="${i >= g.count - (g.crossed || 0) ? "gone" : ""}">${g.emoji}</i>`).join("")}</span>`);
    const joiner = v.join === "+" ? '<b class="cv-join">+</b>' : v.join === "−" ? '<b class="cv-join">−</b>' : "";
    const label = v.groups.map((g) => `${g.count} ${g.emoji}${g.crossed ? `, ${g.crossed} crossed out` : ""}`).join(v.join === "vs" ? " and " : ` ${v.join || "and"} `);
    return wrap(label, groups.join(joiner), `cv-objects ${v.join === "vs" ? "cv-match" : ""}`);
  }
  function tenFrame(count, frames = 1, added = 0) {
    const total = count + added;
    const frame = (f) => `<span class="cv-frame">${Array.from({ length: 10 }, (_, i) => { const n = f * 10 + i; return `<i class="${n < count ? "dot" : n < total ? "dot added" : ""}">${n < count ? "●" : n < total ? "★" : ""}</i>`; }).join("")}</span>`;
    return wrap(`Ten frame with ${count} dots${added ? ` and ${added} added stars` : ""}`, Array.from({ length: frames }, (_, f) => frame(f)).join(""), "cv-tenframes");
  }
  function blocks(v) {
    const put = (n, cls) => Array.from({ length: n || 0 }, () => `<i class="${cls}"></i>`).join("");
    const parts = [["thousands", "cb-cube", "thousand"], ["hundreds", "cb-flat", "hundred"], ["tens", "cb-rod", "ten"], ["ones", "cb-unit", "one"]].filter(([k]) => (v[k] || 0) > 0 || k === "tens" || k === "ones");
    const label = parts.map(([k, , one]) => `${v[k] || 0} ${one}${(v[k] || 0) === 1 ? "" : "s"}`).join(", ");
    return wrap(`Place-value blocks: ${label}`, parts.map(([k, cls, one]) => `<span class="cv-place"><span class="cv-pile">${put(v[k], cls)}</span><small>${v[k] || 0} ${one}${(v[k] || 0) === 1 ? "" : "s"}</small></span>`).join(""), "cv-blocks");
  }
  function clock(hour, minute, label = true) {
    const nums = Array.from({ length: 12 }, (_, i) => { const a = ((i + 1) * 30 - 90) * Math.PI / 180; return `<text x="${(100 + 72 * Math.cos(a)).toFixed(1)}" y="${(100 + 72 * Math.sin(a) + 7).toFixed(1)}">${i + 1}</text>`; }).join("");
    const ticks = Array.from({ length: 60 }, (_, i) => { const a = (i * 6) * Math.PI / 180, r1 = i % 5 ? 86 : 81; return `<path d="M${(100 + r1 * Math.sin(a)).toFixed(1)} ${(100 - r1 * Math.cos(a)).toFixed(1)}L${(100 + 90 * Math.sin(a)).toFixed(1)} ${(100 - 90 * Math.cos(a)).toFixed(1)}" class="${i % 5 ? "" : "big"}"/>`; }).join("");
    const ha = ((hour % 12) + minute / 60) * 30, ma = minute * 6;
    const body = `<svg class="cv-clock" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="94" class="face"/><g class="ticks">${ticks}</g><g class="nums">${nums}</g><path class="hour" d="M100 100L${(100 + 46 * Math.sin(ha * Math.PI / 180)).toFixed(1)} ${(100 - 46 * Math.cos(ha * Math.PI / 180)).toFixed(1)}"/><path class="minute" d="M100 100L${(100 + 74 * Math.sin(ma * Math.PI / 180)).toFixed(1)} ${(100 - 74 * Math.cos(ma * Math.PI / 180)).toFixed(1)}"/><circle cx="100" cy="100" r="6" class="pin"/></svg>`;
    return label ? wrap("An analog clock with a short hour hand and a long minute hand", body, "cv-center") : body;
  }
  const COIN = { penny: ["1¢", "penny"], nickel: ["5¢", "nickel"], dime: ["10¢", "dime"], quarter: ["25¢", "quarter"], dollar: ["$1", "dollar"] };
  const coins = (list) => wrap(list.length ? `Coins: ${list.map((c) => COIN[c][1]).join(", ")}` : "No coins yet", list.length ? list.map((c) => `<span class="cv-coin cv-${c}"><b>${COIN[c][0]}</b><small>${COIN[c][1]}</small></span>`).join("") : '<span class="cv-empty">No coins yet</span>', "cv-coins");
  const array = (rows, cols, emoji) => wrap(`${rows} rows with ${cols} in each row`, Array.from({ length: rows }, () => `<span class="cv-arow">${Array.from({ length: cols }, () => `<i>${emoji}</i>`).join("")}</span>`).join(""), "cv-array");

  // ---------- Data ----------
  function graph(v) {
    const cells = Math.max(10, ...v.categories.map((c) => Math.ceil(c.value / v.scale)));
    const rows = v.categories.map((c) => {
      const n = c.value / v.scale;
      const fillCells = v.kind === "picture"
        ? Array.from({ length: cells }, (_, i) => `<i>${i < n ? c.emoji : ""}</i>`).join("")
        : Array.from({ length: cells }, (_, i) => `<i class="${i < n ? "bar" : ""}"></i>`).join("");
      return `<span class="cg-label">${c.emoji} ${esc(c.label)}</span><span class="cg-cells" style="--cells:${cells}">${fillCells}</span>`;
    }).join("");
    const axis = v.kind === "bar" ? `<span></span><span class="cg-axis" style="--cells:${cells}">${Array.from({ length: cells + 1 }, (_, i) => `<b>${i * v.scale}</b>`).join("")}</span>` : "";
    const key = v.kind === "picture" ? `<p class="cg-key">Key: each picture = ${v.scale}</p>` : v.scale > 1 ? `<p class="cg-key">Each square = ${v.scale}</p>` : "";
    return wrap(`${v.kind === "picture" ? "Picture" : "Bar"} graph: ${v.title}`, `<p class="cg-title">${esc(v.title)}</p><div class="cg-grid ${v.kind}">${rows}${axis}</div>${key}`, "cv-graph");
  }
  function linePlot(v) {
    const cols = v.ticks.map((t, i) => `<span class="lp-col"><span class="lp-marks">${Array.from({ length: v.counts[i] }, () => "<i>✕</i>").join("")}</span><b>${esc(t)}</b></span>`).join("");
    return wrap(`Line plot: ${v.title}`, `<p class="cg-title">${esc(v.title)}</p><div class="lp-line">${cols}</div>`, "cv-lineplot");
  }

  // ---------- Measurement and geometry ----------
  function rect(v) {
    const scale = Math.min(34, 280 / v.width, 180 / v.height), w = v.width * scale, h = v.height * scale;
    const grid = v.grid ? Array.from({ length: v.width - 1 }, (_, i) => `<path d="M${(i + 1) * scale} 0V${h}"/>`).join("") + Array.from({ length: v.height - 1 }, (_, i) => `<path d="M0 ${(i + 1) * scale}H${w}"/>`).join("") : "";
    const labels = v.labels ? `<text x="${w / 2}" y="-10" class="mid">${v.width} ${esc(v.unit)}</text><text x="-10" y="${h / 2 + 5}" class="end">${v.height} ${esc(v.unit)}</text>` : "";
    return wrap(`A rectangle${v.labels ? ` ${v.width} by ${v.height} ${v.unit}` : ""}${v.grid ? " covered in unit squares" : ""}`, `<svg class="cv-rect" viewBox="${v.labels ? -80 : -4} ${v.labels ? -30 : -4} ${w + (v.labels ? 88 : 8)} ${h + (v.labels ? 36 : 8)}" aria-hidden="true"><rect width="${w}" height="${h}" class="area"/><g class="gridlines">${grid}</g>${labels}</svg>`, "cv-center");
  }
  function coordGrid(size, points) {
    const c = 240 / size, left = 30, top = 10;
    const X = (x) => left + x * c, Y = (y) => top + (size - y) * c;
    const lines = Array.from({ length: size + 1 }, (_, i) => `<path d="M${X(i)} ${Y(0)}V${Y(size)}"/><path d="M${X(0)} ${Y(i)}H${X(size)}"/>`).join("");
    const labels = Array.from({ length: size + 1 }, (_, i) => `<text x="${X(i)}" y="${Y(0) + 20}" class="mid">${i}</text><text x="${X(0) - 10}" y="${Y(i) + 5}" class="end">${i}</text>`).join("");
    const dots = points.map((p) => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="7" class="pt"/><text x="${X(p.x) + 10}" y="${Y(p.y) - 9}" class="ptl">${esc(p.label)}</text>`).join("");
    return wrap(`A coordinate grid from 0 to ${size}${points.length ? ` with point ${points.map((p) => p.label).join(", ")}` : ""}`, `<svg class="cv-grid" viewBox="0 0 ${left + 240 + 20} ${top + 240 + 30}" aria-hidden="true"><g class="gl">${lines}</g><path class="axis" d="M${X(0)} ${Y(0)}H${X(size) + 8}M${X(0)} ${Y(0)}V${Y(size) - 8}"/>${labels}<text x="${X(size) + 12}" y="${Y(0) + 5}" class="axl">x</text><text x="${X(0) - 4}" y="${Y(size) - 12}" class="axl">y</text>${dots}</svg>`, "cv-center");
  }
  function angle(deg, protractor) {
    const cx = 150, cy = 158, r = 128, rad = deg * Math.PI / 180;
    const ticks = protractor ? Array.from({ length: 19 }, (_, i) => { const a = i * 10 * Math.PI / 180; return `<path d="M${(cx + (r - 12) * Math.cos(a)).toFixed(1)} ${(cy - (r - 12) * Math.sin(a)).toFixed(1)}L${(cx + r * Math.cos(a)).toFixed(1)} ${(cy - r * Math.sin(a)).toFixed(1)}"/>${i % 3 === 0 ? `<text x="${(cx + (r - 28) * Math.cos(a)).toFixed(1)}" y="${(cy - (r - 28) * Math.sin(a) + 5).toFixed(1)}">${i * 10}</text>` : ""}`; }).join("") : "";
    const arc = deg > 0 ? `<path class="arc" d="M${cx + 34} ${cy}A34 34 0 0 0 ${(cx + 34 * Math.cos(rad)).toFixed(1)} ${(cy - 34 * Math.sin(rad)).toFixed(1)}"/>` : "";
    const body = `<svg class="cv-angle" viewBox="0 0 300 176" aria-hidden="true">${protractor ? `<path class="prot" d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}Z"/><g class="pt">${ticks}</g>` : ""}${arc}<path class="ray" d="M${cx} ${cy}H${cx + 140}"/><path class="ray two" d="M${cx} ${cy}L${(cx + 140 * Math.cos(rad)).toFixed(1)} ${(cy - 140 * Math.sin(rad)).toFixed(1)}"/><circle cx="${cx}" cy="${cy}" r="5" class="vtx"/></svg>`;
    return wrap(protractor ? "An angle on a protractor" : "An angle", body, "cv-center");
  }
  const THING = { pencil: "✏️", crayon: "🖍️", key: "🔑", feather: "🪶", leaf: "🍃" };
  function ruler(v) {
    const max = Math.max(v.length + 3, v.unit === "cm" ? 15 : 8), step = 320 / max;
    const ticks = Array.from({ length: max * (v.unit === "in" ? 4 : 2) + 1 }, (_, i) => { const x = 10 + i * step / (v.unit === "in" ? 4 : 2), whole = i % (v.unit === "in" ? 4 : 2) === 0; return `<path d="M${x.toFixed(1)} 60v${whole ? 16 : 8}"/>${whole ? `<text x="${x.toFixed(1)}" y="92">${i / (v.unit === "in" ? 4 : 2)}</text>` : ""}`; }).join("");
    const body = `<svg class="cv-ruler" viewBox="0 0 340 104" aria-hidden="true"><rect class="obj" x="10" y="22" width="${v.length * step}" height="24" rx="12"/><text x="${10 + v.length * step / 2}" y="40" class="objl">${THING[v.object] || "📏"}</text><rect class="rul" x="4" y="58" width="332" height="44" rx="4"/><g class="rt">${ticks}</g><text x="330" y="100" class="unit">${v.unit}</text></svg>`;
    return wrap(`A ${v.object} above a ruler marked in ${v.unit === "cm" ? "centimeters" : "inches"}`, body, "cv-center");
  }
  function cubes(L, W, H) {
    const s = Math.min(26, 150 / Math.max(L + W, H * 1.4)), a = s * 0.866, b = s * 0.5;
    const P = (x, y, z) => `${(a * (x - y)).toFixed(1)},${(b * (x + y) - z * s).toFixed(1)}`;
    const list = [];
    for (let z = 0; z < H; z++) for (let y = 0; y < W; y++) for (let x = 0; x < L; x++) list.push([x, y, z]);
    list.sort((p, q) => p[0] + p[1] - (q[0] + q[1]) || p[2] - q[2]);
    const faces = list.map(([x, y, z]) => `<polygon class="t" points="${P(x, y, z + 1)} ${P(x + 1, y, z + 1)} ${P(x + 1, y + 1, z + 1)} ${P(x, y + 1, z + 1)}"/><polygon class="r" points="${P(x + 1, y, z)} ${P(x + 1, y + 1, z)} ${P(x + 1, y + 1, z + 1)} ${P(x + 1, y, z + 1)}"/><polygon class="l" points="${P(x, y + 1, z)} ${P(x + 1, y + 1, z)} ${P(x + 1, y + 1, z + 1)} ${P(x, y + 1, z + 1)}"/>`).join("");
    const minX = -a * W - 4, maxX = a * L + 4, minY = -H * s - 4, maxY = b * (L + W) + 4;
    return wrap(`A box built from unit cubes: ${L} long, ${W} wide and ${H} tall`, `<svg class="cv-cubes" viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}" aria-hidden="true">${faces}</svg>`, "cv-center");
  }
  function lengths(v) {
    const max = Math.max(...v.items.map((i) => i.length)), denom = max > 14 ? max : 14;
    return wrap(v.items.map((i) => i.label).join(" and "), v.items.map((i) => `<span class="cl-row"><small>${esc(i.label)}${v.unit ? ` · ${i.length} ${esc(v.unit)}` : ""}</small><i style="width:${(i.length / denom) * 100}%"></i></span>`).join(""), "cv-lengths");
  }
  const ARROW = '<defs><marker id="cvArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" class="head"/></marker></defs>';
  const LINES = {
    line: '<path d="M20 60H220" marker-start="url(#cvArrow)" marker-end="url(#cvArrow)"/>',
    ray: '<path d="M30 60H220" marker-end="url(#cvArrow)"/><circle cx="30" cy="60" r="6"/>',
    segment: '<path d="M30 60H210"/><circle cx="30" cy="60" r="6"/><circle cx="210" cy="60" r="6"/>',
    parallel: '<path d="M20 36H220" marker-start="url(#cvArrow)" marker-end="url(#cvArrow)"/><path d="M20 86H220" marker-start="url(#cvArrow)" marker-end="url(#cvArrow)"/>',
    perpendicular: '<path d="M20 60H220" marker-start="url(#cvArrow)" marker-end="url(#cvArrow)"/><path d="M120 6V114" marker-start="url(#cvArrow)" marker-end="url(#cvArrow)"/><path class="sq" d="M120 46h14v14"/>',
    intersecting: '<path d="M20 60H220" marker-start="url(#cvArrow)" marker-end="url(#cvArrow)"/><path d="M60 112L180 8" marker-start="url(#cvArrow)" marker-end="url(#cvArrow)"/>',
  };
  const lines = (v) => wrap("A drawing of lines", `<svg class="cv-lines" viewBox="0 0 240 120" aria-hidden="true">${ARROW}${LINES[v.kind]}</svg>`, "cv-center");
  function position(v) {
    const spot = { above: "1 / 2", below: "3 / 2", beside: "2 / 3" }[v.relation];
    return wrap("Two pictures", `<span style="grid-area:2 / 2">${v.reference}</span><span style="grid-area:${spot}">${v.thing}</span>`, "cv-position");
  }
  function scale(v) {
    const tilt = v.heavier === "left" ? -12 : 12;
    return wrap("A balance scale with one thing on each side", `<svg class="cv-scale" viewBox="0 0 240 150" aria-hidden="true"><path class="post" d="M120 40V136M84 138H156"/><g transform="rotate(${tilt} 120 40)"><path class="beam" d="M30 40H210"/><path class="rope" d="M30 40L14 84M30 40L46 84M210 40L194 84M210 40L226 84"/><path class="pan" d="M8 84H52Q30 102 8 84ZM188 84H232Q210 102 188 84Z"/><text x="30" y="78">${v.left}</text><text x="210" y="78">${v.right}</text></g><circle cx="120" cy="40" r="6" class="pin"/></svg>`, "cv-center");
  }

  function visual(v) {
    if (!v) return "";
    switch (v.type) {
      case "arithmetic": return window.MQMathArt.arithmetic(v);
      case "objects": return objects(v);
      case "tenFrame": return tenFrame(v.count, v.frames || 1);
      case "blocks": return blocks(v);
      case "clock": return clock(v.hour, v.minute);
      case "coins": return coins(v.coins);
      case "graph": return graph(v);
      case "linePlot": return linePlot(v);
      case "fraction": return fraction(v);
      case "shape": return wrap(`A ${v.symmetry ? "shape with a dashed line" : "flat shape"}`, shape(v), "cv-center");
      case "solid": return wrap("A solid shape", solid(v), "cv-center");
      case "array": return array(v.rows, v.cols, v.emoji);
      case "rect": return rect(v);
      case "grid": return coordGrid(v.size, v.points);
      case "angle": return angle(v.degrees, v.protractor);
      case "ruler": return ruler(v);
      case "cubes": return cubes(v.length, v.width, v.height);
      case "lengths": return lengths(v);
      case "lines": return lines(v);
      case "position": return position(v);
      case "scale": return scale(v);
      case "story": return `<div class="cv cv-story" aria-hidden="true">${v.emoji}</div>`;
      case "text": return window.MQMathArt?.arithmetic(v) || `<p class="cv cv-text">${esc(v.text)}</p>`;
      default: return "";
    }
  }
  /** A small picture inside a choice button, sort card or order card. */
  function mini(v) {
    if (!v) return "";
    if (v.type === "shape") return shape(v, "cv-mini");
    if (v.type === "solid") return solid(v).replace("cv-shape", "cv-shape cv-mini");
    return `<span class="cv-minibox">${visual(v)}</span>`;
  }

  /** What the child has built so far with the dials. */
  function live(task, values) {
    const v = (id) => values[id] ?? 0, l = task.live;
    switch (l.type) {
      case "blocks": return blocks({ thousands: v("thousands"), hundreds: v("hundreds"), tens: v("tens"), ones: v("ones") });
      case "coins": return coins(["dollar", "quarter", "dime", "nickel", "penny"].flatMap((c) => Array(v(c)).fill(c)));
      case "clock": return clock(v("hour"), v("minute"));
      case "array": return array(v("rows"), v("cols"), l.emoji);
      case "fraction": return fraction({ model: l.model, parts: l.parts, shaded: v("shaded") });
      case "tenFrame": return tenFrame(l.base, 1, Math.min(v("more"), 10 - l.base)) + (v("more") > 10 - l.base ? '<p class="cv-over">That is more than 10. Take some away.</p>' : "");
      case "grid": return coordGrid(l.size, [{ x: v("x"), y: v("y"), label: l.label }]);
      case "angle": return angle(v("degrees"), true);
      case "cubes": return cubes(Math.max(1, v("length")), Math.max(1, v("width")), Math.max(1, v("height")));
      default: return "";
    }
  }

  window.MQClassArt = { visual, mini, live, esc, fmt };
})();
