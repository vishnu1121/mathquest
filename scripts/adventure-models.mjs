// The classroom visuals: the place-value workbench and the factor workbench, on desktop and on a phone.
// All provider traffic is mocked, and AI is reported as off throughout.
//
// This was `adventure-models-story.mjs`. The Story Lab half went with the feature it tested; the operand
// models it also covered are live gameplay and are what remains here.
import {chromium,expect as baseExpect} from '@playwright/test';import {mkdirSync} from 'node:fs';
const expect=baseExpect.configure({timeout:15000}),out='test-results/models';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),errors=[];
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
page.on('pageerror',e=>errors.push(String(e.message)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const snap=()=>page.evaluate(()=>window.MQHoot.snapshot());
const grade=async g=>page.evaluate(g=>{window.MQClasses.switchTo(g,{quiet:true});window.MQS.update(s=>{for(const c of window.MQClasses.current().chapters)s.chapters[c.id]=true;});},g);
const open=async id=>{await page.evaluate(id=>window.MQ.openLevel(window.MQ.levels.find(l=>l.id===id)),id);await expect(page.locator('#cgPrompt')).toBeVisible();};
const solve=async()=>{await page.evaluate(() => window.MQClassGames.fillAnswer());await page.locator('[data-cg=check]').click();await expect(page.locator('#cgFeedback')).toContainText('✓');await page.locator('[data-cg=next]').click();};
try{
 await page.route('**/api/adventure-ai',r=>r.fulfill({json:{enabled:false,explain:false,generate:false,ok:false,reason:'unavailable'}}));
 await page.addInitScript(()=>{if(!localStorage.getItem('mq.playtest.v3'))localStorage.setItem('mq.playtest.v3',JSON.stringify({grade:'4',prologue:true,hero:'🧑‍🚀',muted:true,unlockAll:true,chapters:{},coins:25}));});
 await page.goto(process.env.BASE_URL||'http://localhost:3001');
 // The way in is one question. No splash page, and skipping is a real option.
 await expect(page.locator('#tsName')).toBeVisible();
 expect(await page.locator('.ts-skip').count()).toBe(1);
 expect(await page.locator('.ts-title, .ts-art-wrap, .ts-hoot').count()).toBe(0);
 // Only letters, spaces, hyphens and apostrophes survive, and never more than fourteen of them.
 await page.fill('#tsName','  Ada <b>9</b> Lovelace-Rose  ');
 await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});await expect(page.locator('.title-screen')).toHaveCount(0);
 const saved=await page.evaluate(()=>window.MQS.get().name);
 if(!/^[\p{L}\p{M} '’-]+$/u.test(saved)||saved.length>14) throw new Error(`the name was not cleaned: "${saved}"`);
 // It goes where the hero stands, in place of YOU.
 await page.evaluate(()=>window.MQ.showMap());
 await expect(page.locator('#voyageHero i')).toHaveText(saved.toUpperCase());
 // And it is asked ONCE. Coming back must land on the island, not on the question again.
 await page.reload();
 await expect(page.locator('#voyageWorld')).toBeVisible();
 expect(await page.locator('#tsName').count()).toBe(0);
 // A grown-up can still correct it, which is the only way back to it.
 await page.locator('#adultBtn').click();
 await expect(page.locator('.ad-name')).toHaveValue(saved);
 await page.locator('.ad-name').fill('Sam');
 await page.locator('.ad-name').blur();
 await page.keyboard.press('Escape');
 await page.evaluate(()=>window.MQ.showMap());
 await expect(page.locator('#voyageHero i')).toHaveText('SAM');
 await grade('4');await open('g4-express');
 // The place-value workbench shows the real operands, digit by digit, in the right columns.
 await expect(page.locator('.mw-columns .mw-heading')).toHaveCount(5);
 const operands=(await snap()).goal.match(/[\d,]+/g).map(n=>n.replaceAll(',',''));
 expect(await page.locator('.mw-place strong').allTextContents()).toEqual(['·',...operands[0],'·',...operands[1]]);
 await page.screenshot({path:`${out}/desktop-place-value.png`,fullPage:true});
 await solve();await expect(page.locator('.math-workbench h3')).toContainText('Take away');await solve();await expect(page.locator('.mw-products')).toBeVisible();await solve();await expect(page.locator('.mw-products')).toBeVisible();
 // Find a deterministic chapter checkpoint whose first task is the seed-row choice variant.
 for(let seed=0;seed<25;seed++){
   await page.evaluate(seed=>window.MQS.update(s=>{s.classRuns['g4-factors']={seed,round:0,independent:0,supported:false};}),seed);
   await open('g4-factors');if(await page.locator('.factor-workbench').count())break;
 }
 await expect(page.locator('.factor-workbench')).toBeVisible();expect(await page.locator('.pw-door').count()).toBe(0);
 const total=Number((await snap()).goal.match(/\d+/)[0]);
 expect(await page.locator('.factor-seeds i').count()).toBe(total);
 // Every wrong row size leaves exactly the remainder behind, and never loses a seed.
 const options=await page.locator('.factor-choices button').all();let correct;
 for(const option of options){const size=Number(await option.locator('b').textContent());if(total%size===0){correct=size;continue;}await option.click();await expect(page.locator('.factor-leftovers')).toContainText(`${total%size} left over`);expect(await page.locator('.factor-seeds i').count()).toBe(total);}
 await page.locator('.factor-choices button').filter({has:page.locator('b',{hasText:new RegExp(`^${correct}$`)})}).click();await expect(page.locator('.factor-leftovers')).toContainText('0 left over');
 await page.screenshot({path:`${out}/desktop-factor-rows.png`,fullPage:true});
 await page.locator('[data-cg=check]').click();await expect(page.locator('#cgFeedback')).toContainText('✓');
 // There is no theme chooser and no world maker: each class has one fixed setting, and the Practice
 // view carries a static reference instead of a generator.
 expect(await page.locator('.student-theme-open, .theme-picker, #questMaker').count()).toBe(0);
 // Story Lab is gone, tab and all.
 expect(await page.locator('[data-world-view=dream], #dreamLab').count()).toBe(0);

 // Maths cards: every class has a set, they are reference rather than an activity, and the example is
 // one tap away rather than always on.
 for(const g of ['K','2','5']){
   await grade(g);await page.evaluate(()=>window.MQ.showMap());await page.locator('[data-world-view=practice]').click();
   await expect(page.locator('#mathCards .rc-card').first()).toBeVisible();
   expect(await page.locator('#mathCards .rc-card').count()).toBeGreaterThanOrEqual(6);
   await expect(page.locator('#mathCards .rc-head')).toContainText(g==='K'?'KINDERGARTEN':`GRADE ${g}`);
   const total=await page.locator('#mathCards .rc-card').count();
   // "Show every example" is a preference that survives a class switch, so collapse before checking.
   if(await page.locator('#mathCards .rc-body:visible').count()) await page.locator('#mathCards .rc-all').click();
   expect(await page.locator('#mathCards .rc-body:visible').count()).toBe(0);
   const first=page.locator('#mathCards .rc-face').first();
   await first.click();
   await expect(first).toHaveAttribute('aria-expanded','true');
   await expect(page.locator('#mathCards .rc-body').first()).toBeVisible();
   await page.locator('#mathCards .rc-all').click();
   expect(await page.locator('#mathCards .rc-body:visible').count()).toBe(total);
   // Every card is a real touch target.
   const short=await page.evaluate(()=>Math.min(...[...document.querySelectorAll('#mathCards .rc-face')].map(b=>b.getBoundingClientRect().height)));
   if(short<48) throw new Error(`a maths card is only ${short}px tall`);
 }
 await grade('4');await page.evaluate(()=>window.MQ.showMap());await page.locator('[data-world-view=practice]').click();
 await page.screenshot({path:`${out}/desktop-maths-cards.png`,fullPage:false});
 // Phone layout.
 await page.setViewportSize({width:390,height:844});await grade('4');
 await page.evaluate(()=>window.MQ.showMap());await page.locator('[data-world-view=practice]').click();
 await page.screenshot({path:`${out}/phone-maths-cards.png`,fullPage:false});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>window.MQS.update(s=>{delete s.classRuns['g4-express'];}));await open('g4-express');
 await page.screenshot({path:`${out}/phone-place-value.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.locator('.mw-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true); // all five places, including ones, fit on the phone
 expect(errors).toEqual([]);console.log('Visual models passed: place-value columns match the real operands, factor rows keep every seed, maths cards for every class with the example one tap away, no Story Lab or world maker, phone layouts. Screenshots: '+out);
}catch(e){console.error(e);await page.screenshot({path:`${out}/failure.png`,fullPage:true});process.exitCode=1;}
finally{await browser.close();}
