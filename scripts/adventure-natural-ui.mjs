// Focused visual/interaction check. AI is disabled by interception; no provider requests.
import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const out='test-results/natural-ui';mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),errors=[];
const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
const fit=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
const shot=name=>page.screenshot({path:`${out}/${name}.png`,fullPage:true});
async function grade(g){await page.evaluate(g=>{window.MQClasses.switchTo(g,{quiet:true});window.MQS.update(s=>{for(const c of window.MQClasses.current().chapters)s.chapters[c.id]=true;});},g);}
async function open(id){await page.evaluate(id=>window.MQ.openLevel(window.MQ.levels.find(l=>l.id===id)),id);await expect(page.locator('#cgPrompt')).toBeVisible();}
try {
 await page.route('**/api/adventure-ai',r=>r.fulfill({json:{enabled:false,ok:false,reason:'unavailable'}}));
 await page.addInitScript(()=>{if(!localStorage.getItem('mq.playtest.v3'))localStorage.setItem('mq.playtest.v3',JSON.stringify({grade:'K',prologue:true,muted:true,hero:'🧑‍🚀',chapters:{}}));});
 await page.goto(process.env.BASE_URL||'http://localhost:3001',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});await grade('K');
 await expect(page.locator('.voyage-world')).toHaveCSS('background-color','rgb(85, 205, 213)');
 for(const sel of ['.voyage-camera','.voyage-island','.voyage-island>.voyage-island-art'])await expect(page.locator(sel)).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await fit();await shot('desktop-island');
 await page.setViewportSize({width:2543,height:1163});await page.locator('button[data-region=coast]').click();await expect(page.locator('button[data-region=coast]')).toHaveAttribute('aria-pressed','true');await fit();await shot('wide-coast');
 await page.setViewportSize({width:1440,height:1000});await grade('4');await open('g4-express');
 expect(await page.locator('.class-stage').evaluate(e=>getComputedStyle(e,'::before').backgroundImage)).toContain('learning-grove.svg');
 expect(await page.locator('.class-stage').evaluate(e=>getComputedStyle(e,'::before').pointerEvents)).toBe('none');
 await fit();await shot('desktop-question');
 await page.locator('#cgInput').fill('1');await page.locator('[data-cg=check]').click();await expect(page.locator('#cgFeedback')).not.toBeEmpty();
 await page.evaluate(() => window.MQClassGames.fillAnswer());await page.locator('[data-cg=check]').click();await expect(page.locator('#cgFeedback')).toContainText('✓');await page.locator('[data-cg=next]').click();await expect(page.locator('#cgRound')).toContainText('2 OF');
 for(const g of ['K','1','2','3','4','5']) {
   await grade(g);const id=await page.evaluate(()=>window.MQClasses.current().chapters.find(c=>c.kind==='engine').id);await open(id);await fit();
   await expect(page.locator('.class-stage')).toHaveAttribute('data-class',g);
   if(g==='K')await shot('desktop-kindergarten');
 }
 await page.setViewportSize({width:390,height:844});await grade('4');await page.evaluate(()=>window.MQ.showMap());await page.locator('button[data-region=isles]').click();await fit();await shot('phone-island');
 await page.locator('#voyage-place-g4-mine').click();await expect(page.locator('.voyage-panel')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.voyage-panel')).toHaveCount(0);
 await open('g4-express');await fit();await shot('phone-question');
 expect(await page.locator('.class-stage').evaluate(e=>getComputedStyle(e,'::before').backgroundImage)).toContain('learning-grove-phone.svg');
 await page.evaluate(() => window.MQClassGames.fillAnswer());await page.locator('[data-cg=check]').click();await expect(page.locator('#cgFeedback')).toContainText('✓');
 await page.evaluate(()=>{document.documentElement.setAttribute('data-calm','');window.MQ.showMap();});
 expect(await page.locator('.vi-wave').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 expect(errors).toEqual([]);
 console.log('Natural UI passed: continuous aqua sea, both regions, six class backdrops, correct/retry/next, phone layouts, map dialog keyboard access, calm mode and no runtime errors. Screenshots: '+out);
} finally {await browser.close();}
