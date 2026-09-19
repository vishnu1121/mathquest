// Playable boards for class tasks. The pure task engine remains the authority on correctness.
import { replayWorld, operate } from "../classes/worlds";
import { tickValue } from "../classes/tasks";

(function () {
  const A = window.MQClassArt, esc = A.esc;
  const sky = '<div class="pw-sky" aria-hidden="true"><i>☁</i><i>☁</i><span>☀</span></div><div class="pw-hills" aria-hidden="true"></div>';
  const button = (label, action, attrs = "", disabled = false) => {
    const hash = [...action + attrs].reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,0);
    return `<button type="button" id="pw-${hash}" data-play="${action}" ${attrs} ${disabled ? "disabled" : ""}>${label}</button>`;
  };
  const objects = (n, emoji) => n <= 20 ? Array.from({length:n},(_,i)=>`<span class="pw-object" style="--i:${i}" aria-hidden="true">${emoji}</span>`).join("") : [1000,100,10,1].map(unit=>{const count=Math.floor(n/unit)%10;return count?`<span class="pw-crate"><b>${count}</b><small>× ${unit}</small></span>`:"";}).join("");
  const wrap = (kind, inside, footer = "") => `<div class="play-world pw-game-${kind}">${sky}<div class="pw-content">${inside}</div>${footer?`<div class="pw-controls">${footer}</div>`:""}</div>`;
  const fraction = (n,d) => {let a=n,b=d;while(b)[a,b]=[b,a%b];return n===d?"1 whole":`${n/a}/${d/a}`;};
  function world(t,r) {
    const w=t.world,s=replayWorld(w,r.moves);
    const undo=button("↶ Undo move","undo","",!r.moves.length);
    if(w.game==='patch') return wrap('patch',`<div class="pw-sign">START ${w.start} · ${w.operation} ${w.change}</div><div class="pw-friend" aria-hidden="true">${w.emoji==='🐰'?'🧚':'🦊'}</div><div class="pw-cargo" role="img" aria-label="${s.value} ${w.emoji==='🐰'?'bunnies in the patch':'supplies aboard'}">${objects(s.value,w.emoji)}${!s.value?'<span class="pw-empty">Empty</span>':''}</div><div class="pw-ground">${w.emoji==='🐰'?'🥕 · 🌱 · 🥕 · 🌱 · 🥕':'🚢 ━━━━━━━━━━━━━'}</div><output class="pw-meter" aria-live="polite">${s.value} ${w.emoji==='🐰'?'bunnies here':'aboard'}</output>`,w.units.map(unit=>button(`${w.emoji} +${unit}`,'add',`data-unit="${unit}"`,s.value+unit>w.capacity)+button(`↗ −${unit}`,'remove',`data-unit="${unit}"`,s.value<unit)).join('')+undo);
    if(w.game==='gates') {
      const gates=w.gates.map((pair,i)=>`<div class="pw-gate-stop ${s.step===i?'current':s.step>i?'passed':''}"><small>GATE ${i+1}</small>${pair.map((g,j)=>button(`${g.op} ${g.amount}`,'gate',`data-index="${j}" aria-label="Gate ${i+1}: ${g.op} ${g.amount}"`,i!==s.step||!Number.isInteger(operate(s.value,g))||operate(s.value,g)<0||operate(s.value,g)>w.capacity)).join('')}</div>`).join('');
      return wrap('gates',`<div class="pw-sign">DESTINATION · ${w.target} CRYSTALS</div><div class="pw-rail"><div class="pw-cart" style="--travel:${s.step/w.gates.length*82}%" aria-label="Cart carrying ${s.value}">🚃<b>${s.value} 💎</b></div></div><div class="pw-gates">${gates}<span class="pw-station" aria-hidden="true">🏁</span></div><p class="pw-caption">${s.step<w.gates.length?'Choose a gate to drive through. Look ahead before you steer.':'At the station! Check your cargo, or undo to try another route.'}</p>`,undo);
    }
    if(w.game==='share') return wrap('share',`<div class="pw-sign">POWER DEPOT · ${w.total} CELLS</div><div class="pw-depot" role="img" aria-label="${s.value} power cells remain at the depot">${objects(s.value,'🔋')}</div><output class="pw-meter" aria-live="polite">${s.value} cells at the depot</output><div class="pw-robots">${s.bins.map((n,i)=>`<section class="pw-robot"><span aria-hidden="true">🤖</span><b>Robot ${i+1} · ${n}</b><div class="pw-battery" style="--charge:${Math.min(100,n/Math.ceil(w.total/w.groups)*100)}%"></div><div class="pw-parcel-view">${n<=9?objects(n,'🔋'):''}</div>${w.units.map(unit=>button(`Give ${unit}`,'give',`data-index="${i}" data-unit="${unit}" aria-label="Give ${unit} to robot ${i+1}"`,s.value<unit)+button(`Take ${unit}`,'take',`data-index="${i}" data-unit="${unit}" aria-label="Take ${unit} from robot ${i+1}"`,n<unit)).join('')}</section>`).join('')}</div>`,undo);
    const totalWidth=Math.max(w.scale,w.target,w.scale*1.25);
    const sceneName=esc(w.placeLabel||{quilt:"PIP’S FRIENDSHIP QUILT",garden:"GARDEN WALKWAY",beacon:"LIGHTHOUSE GLASS",falls:"VILLAGE WATER CHANNEL",forge:"COPPER BELL FOUNDRY"}[w.setting]);
    const label=n=>w.words?(n===w.scale?'whole':n*2===w.scale?'half':w.scale===3?'third':'fourth'):fraction(n,w.scale);
    return wrap('bridge',`<div class="pw-sign">${sceneName} · ${esc(w.recipe)}</div><div class="pw-ravine pw-setting-${w.setting}"><span class="pw-cloud" style="--travel:${s.value/totalWidth*85}%" aria-hidden="true">${w.emoji}</span><div class="pw-bridge-pieces">${s.pieces.map(n=>`<span style="width:${n/totalWidth*100}%">${label(n)}</span>`).join('')}</div><div class="pw-whole" style="width:${w.scale/totalWidth*100}%">← one whole →</div><span class="pw-bank" aria-hidden="true">${w.setting==="forge"?"🔔":w.setting==="beacon"?"💡":w.setting==="quilt"?"🧵":w.setting==="falls"?"🏡":"🌱"}</span></div><output class="pw-meter" aria-live="polite">${w.words ? `${s.pieces.length} pieces placed` : `${s.value}/${w.scale} built`}</output>`,w.pieces.map((n,i)=>button(`🪵 ${label(n)}`,'plank',`data-index="${i}"`,s.value+n>w.scale*2)).join('')+button('Remove last plank','undoPlank','',!s.pieces.length)+undo);
  }
  function render(t,r,ui) {
    if(t.kind==='world') return world(t,r);
    if(t.kind==='choice') {
      if(t.visual?.type==='factors')return window.MQMathArt.factors(t,r);
      return `<section class="concept-choices">${A.visual(t.visual)}<div class="concept-options" role="group" aria-label="Choose using the model">${t.options.map(o=>button(`${A.mini(o.visual)}<b>${esc(o.label)}</b>${r.id===o.id?'<span class="concept-selected">✓ Selected</span>':''}`,'destination',`data-id="${o.id}" aria-pressed="${r.id===o.id}"`)).join('')}</div></section>`;
    }
    if(t.kind==='sort') {
      const current=t.items.find(i=>i.id===ui.card)||t.items.find(i=>!r.placements[i.id])||t.items[0];
      ui.card=current.id;
      return wrap('sort',`<div class="pw-conveyor" role="group" aria-label="Cargo waiting to be sorted">${t.items.filter(i=>!r.placements[i.id]).map(i=>button(`${A.mini(i.visual)}<b>${esc(i.label)}</b>`,'card',`draggable="true" data-id="${i.id}" aria-pressed="${current.id===i.id}"`)).join('')||'<span>Every parcel has a home. You can move a parcel again.</span>'}</div><p class="pw-caption">Touch a parcel, then its home. You can also drag it.</p><div class="pw-bays">${t.bins.map(b=>`<section class="pw-bay" data-drop="${b.id}">${button(`📦 ${esc(b.label)}`,'drop',`data-bin="${b.id}" aria-label="Send selected parcel to ${esc(b.label)}"`)}<div>${t.items.filter(i=>r.placements[i.id]===b.id).map(i=>button(`${A.mini(i.visual)}<small>${esc(i.label)}</small>`,'card',`data-id="${i.id}" draggable="true" aria-pressed="${current.id===i.id}"`)).join('')}</div></section>`).join('')}</div>`);
    }
    if(t.kind==='order') {
      const byId=Object.fromEntries(t.items.map(i=>[i.id,i]));
      return wrap('train',`<div class="pw-sign">${esc(t.first)} → ${esc(t.last)}</div><div class="pw-train"><span aria-hidden="true">🚂</span>${r.ids.map(id=>`<div class="pw-wagon">${A.mini(byId[id].visual)}<b>${esc(byId[id].label)}</b><i aria-hidden="true">● ━ ●</i></div>`).join('')}</div><p class="pw-caption">Choose the next carriage. Build the train in order.</p><div class="pw-platform">${t.items.filter(i=>!r.ids.includes(i.id)).map(i=>button(`${A.mini(i.visual)}<b>${esc(i.label)}</b>`,'carriage',`data-id="${i.id}"`)).join('')}</div>`,button('↶ Unhook last carriage','unhook','',!r.ids.length));
    }
    if(t.kind==='line') return wrap('river',`${A.visual(t.visual)}<div class="pw-river-path">${Array.from({length:t.ticks+1},(_,i)=>{const value=tickValue(t,i),label=t.labels.find(l=>Math.abs(l.at-value)<1e-9),mark=(t.marks||[]).find(m=>Math.abs(m.at-value)<1e-9),on=Math.abs(r.value-value)<1e-9;return button(`${mark?`<small>${esc(mark.text)}</small>`:''}<span aria-hidden="true">${on?'🐸':'🪨'}</span><b>${esc(label?.text||'·')}</b>`,'hop',`data-index="${i}" aria-label="${label?`Hop to ${esc(label.text)}`:`Hop to tick ${i}`}" aria-pressed="${on}"`);}).join('')}</div><p class="pw-caption">Choose a landing stone for your frog.</p>`);
    return null;
  }
  function act(t,r,ui,b) {
    const a=b.dataset.play;
    if(t.kind==='world') {
      if(a==='undo'){r.moves.pop();return true;}
      const m={action:a,index:Number(b.dataset.index||0),unit:Number(b.dataset.unit||1)};
      if(replayWorld(t.world,[...r.moves,m]).valid)r.moves.push(m);return true;
    }
    if(a==='destination'){r.id=b.dataset.id;return true;}
    if(a==='card'){ui.card=b.dataset.id;return true;}
    if(a==='drop'){if(ui.card)r.placements[ui.card]=b.dataset.bin;ui.card=null;return true;}
    if(a==='carriage'){r.ids.push(b.dataset.id);return true;}
    if(a==='unhook'){r.ids.pop();return true;}
    if(a==='hop'){r.value=tickValue(t,Number(b.dataset.index));return true;}
    return false;
  }
  window.MQClassPlay={render,act};
})();
