// Real move-based play, class isolation and the roaming AI's step history. No paid provider calls.
import { chromium, expect as baseExpect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const expect=baseExpect.configure({timeout:12000}),url=process.env.BASE_URL||'http://localhost:3001';
const out='test-results/grade-play';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),errors=[],requests=[];
const open=async(page,id)=>{await page.evaluate(id=>{window.MQ.openLevel(window.MQ.levels.find(l=>l.id===id));},id);await expect(page.locator('.class-stage')).toBeVisible();await expect(page.locator('#cgPrompt')).not.toBeEmpty();};
const snapshot=page=>page.evaluate(()=>window.MQHoot.snapshot());
const board=async page=>JSON.parse((await snapshot(page)).board.split('. ')[0]);
const next=async page=>{await page.locator('[data-cg=check]').click();await expect(page.locator('#cgFeedback')).toContainText('✓');await page.locator('[data-cg=next]').click();};
async function grade(page,g){await page.evaluate(g=>{window.MQClasses.switchTo(g,{quiet:true});window.MQS.update(s=>{for(const c of window.MQClasses.current().chapters)s.chapters[c.id]=true;});},g);}
async function playWorld(page){
  const w=(await board(page)).world;
  if(w.game==='patch') {let delta=w.target-w.start;for(const unit of w.units){const n=Math.floor(Math.abs(delta)/unit);for(let i=0;i<n;i++)await page.locator(`[data-play=${delta<0?'remove':'add'}][data-unit="${unit}"]`).click();delta%=unit;}}
  if(w.game==='share') {const each=(w.total-w.remainder)/w.groups;for(let index=0;index<w.groups;index++){let left=each;for(const unit of w.units){for(let i=0;i<Math.floor(left/unit);i++)await page.locator(`[data-play=give][data-index="${index}"][data-unit="${unit}"]`).click();left%=unit;}}}
  if(w.game==='bridge') {let count=w.initial.reduce((a,b)=>a+b,0);while(count>w.target){await page.locator('[data-play=undoPlank]').click();count--;}while(count<w.target){await page.locator(`[data-play=plank][data-index="${w.pieces.indexOf(1)}"]`).click();count++;}}
  if(w.game==='gates') {const op=(v,g)=>g.op==='+'?v+g.amount:g.op==='−'?v-g.amount:g.op==='×'?v*g.amount:v/g.amount;
    function route(v,step,path){if(step===w.gates.length)return v===w.target?path:null;for(let i=0;i<w.gates[step].length;i++){const n=op(v,w.gates[step][i]);if(Number.isInteger(n)&&n>=0&&n<=w.capacity){const found=route(n,step+1,[...path,i]);if(found)return found;}}return null;}
    for(const index of route(w.start,0,[]))await page.locator(`.pw-gate-stop.current [data-play=gate][data-index="${index}"]`).click();
  }
  await page.locator('[data-cg=check]').click();await expect(page.locator('#cgFeedback')).toContainText('✓');
}
try {
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(12000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/adventure-ai',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{enabled:true}});
   const data=route.request().postDataJSON();
   if(data.task!=='coach')return route.fulfill({json:{ok:false,reason:'rejected'}});
   requests.push(data);
   const hint=data.step===1?'Can you move a bunny into the patch?':data.step===2?'Can you check which bunnies still need to move?':'Point at each bunny as it hops into the patch, then check the patch. Can you try that here?';
   return route.fulfill({json:{ok:true,data:{notice:'Some bunnies are waiting.',hint}}});
 });
 await page.addInitScript(()=>{if(!localStorage.getItem('mq.playtest.v3'))localStorage.setItem('mq.playtest.v3',JSON.stringify({grade:'K',prologue:true,hero:'🧑‍🚀',muted:true,unlockAll:true,chapters:{},coins:25}));});
 await page.goto(url);await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});await expect(page.locator('.title-screen')).toHaveCount(0);
 await grade(page,'K');await expect(page.locator('.roaming-hoot')).toBeVisible();
 await open(page,'k-bunny');await expect(page.locator('.pw-game-patch')).toBeVisible();
 await page.locator('.rh-ask').click();await expect(page.locator('.hc-history li')).toHaveCount(1);
 await expect(page.locator('.roaming-hoot')).toHaveAttribute('data-open','true');
 // The help opens beside Hoot: it never covers where the mission text starts, and stays a corner card.
 const [help,mission]=[await page.locator('.hoot-coach').boundingBox(),await page.locator('#cgPrompt').boundingBox()];
 const reading={x:mission.x+8,y:mission.y+mission.height/2};
 expect(reading.x>=help.x&&reading.x<=help.x+help.width&&reading.y>=help.y&&reading.y<=help.y+help.height).toBe(false);
 expect((help.width*help.height)/(1280*900)).toBeLessThan(0.34);
 await page.locator('.hc-play').click();await page.locator('[data-play=add]').click();
 await page.locator('.rh-ask').click();await expect(page.locator('.hc-history li')).toHaveCount(2);
 expect(requests[1].step).toBe(2);expect(requests[1].previous).toEqual([requests[0].previous.length===0?'Can you move a bunny into the patch?':'unexpected']);
 expect(requests[1].response).not.toBe(requests[0].response);expect(requests[1].board).toContain('constructed');
 expect(requests[1].grade).toBe('K');expect(requests[1].ref.chapter).toBe('k-bunny');
 // Three hints, the last one an example, and then no more.
 await page.locator('.hc-next').click();await expect(page.locator('.hc-history li')).toHaveCount(3);
 await expect(page.locator('.hc-history li').last()).toContainText('SHOW ME HOW'); // Kindergarten sees the method, older classes an example
 expect(requests[2].step).toBe(3);expect(requests[2].previous).toHaveLength(2);
 await expect(page.locator('.hc-next')).toBeDisabled();await expect(page.locator('.hc-source')).toContainText('AI hint');await expect(page.locator('.hc-source')).toContainText('last of three hints');
 await page.screenshot({path:`${out}/desktop-hoot.png`});
 // The child can move Hoot between corners, and can keep it still.
 const firstCorner=await page.locator('.roaming-hoot').getAttribute('data-corner');
 await page.locator('.hc-corner').click();
 await expect(page.locator('.roaming-hoot')).not.toHaveAttribute('data-corner',firstCorner);
 // The perches are scenery: they stay where they are while Hoot flies, and only the one it lands on is lit.
 await expect(page.locator('.roaming-hoot .rh-move')).toHaveCount(0);
 const perchesBefore=await page.locator('.rh-perches').evaluate(l=>[...l.children].map(p=>p.style.transform));
 await page.locator('.rh-fly').click();
 const landed=await page.locator('.roaming-hoot').getAttribute('data-corner');
 expect(landed).not.toBe(firstCorner);
 expect(await page.locator('.rh-perches').evaluate(l=>[...l.children].map(p=>p.style.transform))).toEqual(perchesBefore);
 await expect(page.locator(`.rh-perch[data-corner="${landed}"]`)).toHaveAttribute('data-lit','true');
 expect(await page.locator('.rh-perch[data-lit=true]').count()).toBe(1);
 await page.locator('.hc-pin input').check();
 await expect(page.locator('.roaming-hoot')).toHaveAttribute('data-still','true');
 expect(await page.evaluate(()=>window.MQS.get().hoot.still)).toBe(true);
 await page.locator('.hc-close').click();await expect(page.locator('.hoot-coach')).toBeHidden();
 await page.locator('[data-play=undo]').click();await playWorld(page);
 expect(await page.evaluate(()=>window.MQS.get().classRuns['k-bunny'].supported)).toBe(false); // next, unseen mission checkpoint
 await page.locator('[data-cg=next]').click();await expect(page.locator('.pw-sign')).toContainText('−');await playWorld(page);
 await page.screenshot({path:`${out}/desktop-k-subtraction.png`});
 for(const [g,id] of [['1','g1-story'],['2','g2-bridge'],['3','g3-twostep'],['4','g4-falls'],['5','g5-foundry']]){
   await grade(page,g);await open(page,id);
   if(g==='4'){for(let i=0;i<2;i++){await page.locator('[data-cg=help]').click();await next(page);}}
   await expect(page.locator('.play-world')).toBeVisible();await playWorld(page);
   await page.screenshot({path:`${out}/desktop-grade-${g}.png`});
 }
 await grade(page,'3');await open(page,'g3-facts');await page.locator('[data-cg=help]').click();await next(page);await expect(page.locator('.pw-game-share')).toBeVisible();await playWorld(page);
 await grade(page,'K');await page.evaluate(()=>window.MQS.update(s=>{s.minis.flight=true;s.best.flight=8;}));await grade(page,'5');expect(await page.evaluate(()=>Boolean(window.MQS.get().minis.flight))).toBe(false);
 // Direct entry is protected too, not only map links.
 await page.evaluate(()=>{window.MQ.openLevel(window.MQ.levels.find(l=>l.id==='fireflies'));});await expect(page.locator('#levelScreen')).toBeHidden();
 for(const g of ['K','1','2','3','4','5']){await grade(page,g);await open(page,`arena-${g}`);expect((await snapshot(page)).grade).toBe(g);expect((await snapshot(page)).ref.chapter).toBeTruthy();await expect(page.locator('.cg-arena-readout')).toContainText('only');}
 // The Story Lab block that used to sit here went with the feature: the game's story lives in its
 // chapters, and a second story-writing surface was both redundant and the biggest spender of AI tokens.
 // Mobile: each board fits the page, the owl travels into bonus overlays, and disconnection is explicit.
 await page.setViewportSize({width:390,height:844});await grade(page,'K');await page.evaluate(()=>window.MQS.update(s=>{delete s.classRuns['k-bunny'];}));await open(page,'k-bunny');
 await page.screenshot({path:`${out}/phone-bunnies.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>{window.MQ.showMap();window.MQMini.play('flight');});await expect(page.locator('.gb-game')).toContainText('Firefly Float');await expect(page.locator('.mini .roaming-hoot')).toBeVisible();
 for(let round=0;round<3;round++){let lights=await page.locator('[data-light]').count();for(let i=0;i<lights;i++)await page.locator(`[data-light="${i}"]`).click();if(round<2)await page.locator('.mini [data-next]').click();}
 await page.screenshot({path:`${out}/phone-firefly-bonus.png`,fullPage:true});await page.locator('.mini-done .btn').click();await expect(page.locator('.mini')).toHaveCount(0);
 await grade(page,'5');await open(page,'g5-foundry');await playWorld(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${out}/phone-fractions.png`,fullPage:true});
 await page.route('**/api/adventure-ai',route=>route.fulfill({json:{enabled:false}}));await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});await expect(page.locator('.title-screen')).toHaveCount(0);await page.locator('.rh-ask').click();await expect(page.locator('.hc-source')).toContainText('AI is not connected');
 // Grades 3–5 trade the drawing and music minis for Number Chute; the younger classes keep them.
 await page.setViewportSize({width:1280,height:900});
 for(const [g,first,last] of [['1','Mist Painter','Glow Orchestra'],['4','Factor Falls','Exact Order']]){
   await grade(page,g);await page.evaluate(()=>window.MQ.showMap());await page.locator('[data-world-view=arcade]').click();
   await expect(page.locator('.pc-name').first()).toHaveText(first);
   expect(await page.locator('.pc-name').last().textContent()).toBe(last);
   // One honest skill line per game, not the learner's grade label printed under all eight.
   const skills=await page.locator('.pc-skills').allTextContents();
   expect(skills).toHaveLength(8);expect(new Set(skills).size).toBe(8);
 }
 // The new game actually runs: a wave starts, crystals fall, and the lane buttons move the catcher.
 await page.evaluate(()=>{void window.MQMini.play('mist');});
 await expect(page.locator('.ch-game')).toBeVisible();
 await page.locator('.ch-go').click();
 await expect(page.locator('.ch-drop').first()).toBeVisible();
 await page.locator('[data-lane="3"]').click();
 await expect(page.locator('.ch-catcher')).toHaveAttribute('style',/--lane:\s*3/);
 await page.screenshot({path:`${out}/desktop-factor-falls.png`});
 await page.locator('.mini-skip').click();await expect(page.locator('.mini')).toHaveCount(0);
 expect(errors).toEqual([]);console.log(`Grade play passed: all six classes, real world moves, grade arenas, AI step context, bonus isolation and phone layouts. ${requests.length} mocked coach calls. Screenshots: ${out}`);
} finally {await browser.close();}
