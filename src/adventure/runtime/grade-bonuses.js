import { createRng } from "../../engine/rng";
import { BONUS_PROFILE, bonusSkill } from "../classes/bonus";

(function () {
  const rng = () => createRng((Math.random()*0xffffffff)>>>0);
  function frame(stage, title, note) {
    stage.innerHTML=`<div class="gb-game"><p class="eyebrow">${window.MQClasses.current().label.toUpperCase()} · PLAY TOGETHER</p><h1>${title}</h1><p class="gb-note">${note}</p><div class="gb-world"></div><p class="gb-status" role="status"></p><div class="gb-controls"></div></div>`;
    return (s)=>stage.querySelector(s);
  }
  function littleFlight(stage,kit) {
    const r=rng(), life=new AbortController(), k=kit.grade==="K", q=frame(stage,k?"Firefly Float":"River Lanterns",k?"Touch each light. Help Hoot bring the fireflies home.":"Pick a ring to finish the lantern. Hoot flies there when you choose.");
    let round=0, found=new Set(), target=0, base=0;
    function begin() {
      found=new Set(); target=r.int(k?3:6,k?5:10); base=k?0:r.int(1,target-1);
      q('.gb-world').innerHTML=`<span class="gb-owl" aria-hidden="true">🦉</span><div class="gb-lantern">${Array.from({length:target},(_,i)=>`<span class="${i<base?'lit':''}">☆</span>`).join('')}</div>`;
      q('.gb-status').textContent=k?'Give every light a touch.':`${base} lights are home. Fill ${target} homes.`;
      q('.gb-controls').innerHTML=k?Array.from({length:target},(_,i)=>`<button type="button" data-light="${i}" aria-label="Collect firefly ${i+1}">✨</button>`).join(''):r.shuffle([target-base,Math.max(0,target-base-1),target-base+1]).map(n=>`<button type="button" data-ring="${n}" aria-label="Add ${n} lights">+${n}</button>`).join('');
      kit.progress(round/3,`Lantern ${round+1} of 3`);
    }
    function finishRound() {round++;kit.fx.sfx.good();if(round===3)kit.done({art:'🦉',title:'A home for every light!',text:'Hoot brought your glowing lanterns back to the meadow.'});else {q('.gb-controls').innerHTML='<button type="button" class="btn" data-next>Next lantern →</button>';}}
    stage.addEventListener('click',(e)=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-next')){begin();return;}
      if(k&&b.dataset.light!==undefined&&!found.has(b.dataset.light)){found.add(b.dataset.light);b.disabled=true;b.textContent='✓';q('.gb-lantern').children[found.size-1].classList.add('lit');q('.gb-status').textContent=`${found.size} fireflies home`;kit.fx.sfx.pop();if(found.size===target)finishRound();}
      if(!k&&b.dataset.ring!==undefined){if(Number(b.dataset.ring)+base===target){q('.gb-lantern').querySelectorAll('span').forEach(s=>s.classList.add('lit'));finishRound();}else q('.gb-status').textContent='Try counting the empty homes. You can choose again.';}
    },{signal:life.signal}); begin();return()=>life.abort();
  }
  function shapeHunt(stage,kit) {
    const r=rng(),life=new AbortController(),q=frame(stage,'Pip’s Shape Parade','Find the matching shape. Turned shapes still belong together.'),shapes=['●','▲','■'];let round=0,target;
    const begin=()=>{target=r.pick(shapes);q('.gb-world').innerHTML=`<span class="gb-shape-target">${target}</span>`;q('.gb-controls').innerHTML=r.shuffle(shapes).map(s=>`<button type="button" data-shape="${s}" aria-label="${{'●':'circle','▲':'triangle','■':'square'}[s]}"><span style="display:inline-block;transform:rotate(${s==='▲'?r.pick([0,90,180]):0}deg)">${s}</span></button>`).join('');q('.gb-status').textContent='Which shape belongs in the parade?';kit.progress(round/5,`${round} shapes found`);};
    stage.addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(!b)return;if(b.dataset.shape!==target){q('.gb-status').textContent='Look at the sides and corners. Try another shape.';return;}kit.fx.sfx.good();round++;if(round===5)kit.done({art:'🔺',title:'What a shape parade!',text:'Pip found a place for every shape.'});else begin();},{signal:life.signal});begin();return()=>life.abort();
  }
  function steppingDelivery(stage,kit) {
    const r=rng(),life=new AbortController(),grade=kit.grade,advanced=grade==='5',size=advanced?6:grade==='K'?3:4,q=frame(stage,advanced?'Coordinate Courier':grade==='K'?'Pip’s Picnic Path':'River Post',advanced?'Follow each coordinate to deliver the parcel. Across first, then up.':'Use the arrows to carry a gift to the glowing house.');
    let player=0,goal=0,round=0,hop=null;const walls=grade==='1'?[5,6,9]:[];
    function begin(){
      do{goal=r.int(0,size*size-1);}while(goal===player||walls.includes(goal));
      // The first parcel gives its address; later ones give a move from the boat, so the round gets harder.
      if(advanced&&round>0){const dx=goal%size-player%size,dy=Math.floor(goal/size)-Math.floor(player/size);
        hop={dx:dx<0?`${-dx} back`:`${dx} across`,up:dy<0?`${-dy} down`:`${dy} up`};}
      else hop=null;
      draw();}
    // The docks carry no coordinates: rulers run along the two axes and the child counts from the boat,
    // the same way the class grid works. A labelled dock would only ask them to match a sticker.
    const ruler=()=>advanced?`<div class="gb-yaxis" aria-hidden="true">${Array.from({length:size},(_,k)=>`<span>${size-1-k}</span>`).join('')}</div>`:'';
    const foot=()=>advanced?`<span></span><div class="gb-xaxis" aria-hidden="true">${Array.from({length:size},(_,k)=>`<span>${k}</span>`).join('')}</div>`:'';
    function draw(){const grid=`<div class="gb-grid" style="--cols:${size}" role="group" aria-label="Delivery map">${Array.from({length:size*size},(_,i)=>advanced?(size-1-Math.floor(i/size))*size+i%size:i).map(i=>`<button type="button" data-place="${i}" ${advanced?'':'tabindex="-1"'} aria-label="${advanced?`${i%size} across, ${Math.floor(i/size)} up`:`Path square ${i+1}`}" ${walls.includes(i)?'disabled':''}>${i===player?'🚤':!advanced&&i===goal?'🏡':walls.includes(i)?'🌲':advanced?'':'·'}</button>`).join('')}</div>`;
      q('.gb-world').innerHTML=advanced?`<div class="gb-plane" style="--cols:${size}">${ruler()}${grid}${foot()}</div>`:grid;
      q('.gb-status').textContent=advanced?(hop?`From the boat, go ${hop.dx} across and ${hop.up}. Touch that dock.`:`Deliver to (${goal%size}, ${Math.floor(goal/size)}). Count across, then up.`):'Follow the path to the house.';
      q('.gb-controls').innerHTML=advanced?'':[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([d,s])=>`<button type="button" data-walk="${d}" aria-label="Move ${d}">${s}</button>`).join('');kit.progress(round/3,`${round} parcels delivered`);}
    function move(dir){const x=player%size,y=Math.floor(player/size),dx=dir==='left'?-1:dir==='right'?1:0,dy=dir==='up'?-1:dir==='down'?1:0;if(x+dx<0||x+dx>=size||y+dy<0||y+dy>=size)return;const to=(y+dy)*size+x+dx;if(walls.includes(to))return;player=to;arrive();}
    function arrive(){kit.fx.sfx.tap();if(player===goal){round++;if(round===3){kit.done({art:'📦',title:'Picnic post delivered!',text:'Every friend has a little gift from you.'});return;}begin();}else draw();}
    stage.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.walk)move(b.dataset.walk);else if(advanced&&b.dataset.place!==undefined){player=Number(b.dataset.place);arrive();}},{signal:life.signal});
    document.addEventListener('keydown',e=>{if(advanced||document.querySelector('.hoot-coach[open]'))return;const d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];if(d){e.preventDefault();move(d);}},{signal:life.signal});begin();return()=>life.abort();
  }
  function softBowls(stage,kit){const r=rng(),life=new AbortController(),q=frame(stage,'Pip’s Rainbow Roll','Choose a lane and roll a ball to the star. Everyone gets a turn.');let target,round=0;
    function begin(){target=r.int(0,2);q('.gb-world').innerHTML=`<div class="gb-lanes">${[0,1,2].map(i=>`<div>${i===target?'⭐':'🌿'}<span>│</span></div>`).join('')}</div>`;q('.gb-controls').innerHTML=['Left','Middle','Right'].map((v,i)=>`<button type="button" data-lane="${i}">⚽ ${v}</button>`).join('');q('.gb-status').textContent='Which lane leads to the star?';kit.progress(round/3,`${round} stars reached`);}
    stage.addEventListener('click',e=>{const b=e.target.closest('[data-lane]');if(!b)return;if(Number(b.dataset.lane)!==target){q('.gb-status').textContent='The ball found a leaf! Roll along another lane.';return;}round++;kit.fx.sfx.good();if(round===3)kit.done({art:'⚽',title:'A rainbow of rolls!',text:'Pip cheers for your careful aiming.'});else begin();},{signal:life.signal});begin();return()=>life.abort();}

  const chute=mode=>(stage,kit)=>window.MQChute.start(stage,kit,mode);
  window.MQGradeBonus={profile:grade=>BONUS_PROFILE[grade]||BONUS_PROFILE['3'],resolve(game,grade){
    const young=grade==='K'||grade==='1',upper=grade==='3'||grade==='4'||grade==='5';
    let next={...game,skills:bonusSkill(game.id)};
    if(young&&game.id==='flight')next={...next,name:grade==='K'?'Firefly Float':'River Lanterns',desc:grade==='K'?'Touch lights and count to five. No flying controls or timed rings.':'Help Hoot make a full lantern within ten. Choose at your own pace.',start:littleFlight};
    if(game.id==='courier'&&(young||grade==='5'))next={...next,name:grade==='5'?'Coordinate Courier':grade==='K'?'Pip’s Picnic Path':'River Post',desc:grade==='5'?'Deliver parcels using first-quadrant coordinates.':'Walk a little route with arrow buttons. No box-pushing traps.',start:steppingDelivery};
    if(young&&game.id==='bowls')next={...next,name:'Pip’s Rainbow Roll',desc:'Follow a lane to the star. No angles, wind or power calculations.',start:softBowls};
    if(grade==='K'&&game.id==='prismpop')next={...next,name:'Pip’s Shape Parade',desc:'Match circles, squares and turned triangles.',start:shapeHunt};
    // Grades 3–5 trade the wiping game and the music toy for Number Chute: four falling chutes, a rule that
    // changes every wave, three lives and a rising speed. Same slots, so unlocks and saves are unchanged.
    if(upper&&game.id==='mist')next={...next,name:'Factor Falls',emoji:'💠',desc:'Number crystals fall down four chutes. Catch the ones that fit the rule and let the rest drop. The rule changes every wave; the chutes speed up.',skills:bonusSkill('chuteSort'),start:chute('sort')};
    if(upper&&game.id==='orchestra')next={...next,name:'Exact Order',emoji:'🧺',desc:'Catch falling values to fill each order exactly. Go over and the load spills, so think before you slide the basket.',skills:bonusSkill('chuteExact'),start:chute('exact')};
    return next;
  }};
})();
