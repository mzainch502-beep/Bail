import {test,expect} from '@playwright/test';
test('compose, edit, reorder, save and restore a story',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('.scene-card')).toHaveCount(2);
 await page.locator('#prompt').fill('A small thought. A new world.');await page.locator('#compose-preview').click();await expect(page.locator('.scene-card')).toHaveCount(2);
 await page.locator('#scene-text').fill('My original story.');await page.locator('#scene-right').click();await expect(page.locator('.scene-card').nth(1)).toContainText('My original story.');
 await page.locator('#ratio').selectOption('landscape');await expect(page.locator('#canvas')).toHaveAttribute('width','1280');
 await page.locator('#save').click();await page.locator('#project-name').fill('My first film');await page.locator('#save-confirm').click();await page.getByRole('button',{name:'My projects',exact:true}).click();await expect(page.locator('.project-card')).toContainText('My first film');
 await page.getByRole('button',{name:'Open story'}).click();await expect(page.locator('#project-name-display')).toHaveText('My first film');await expect(page.locator('.scene-card')).toHaveCount(2);
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`test-results/studio-${test.info().project.name}.png`,fullPage:true});
});
test('one prompt button generates an actual downloadable video with no server',async({page})=>{
 const remote=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173')&&!r.url().startsWith('blob:'))remote.push(r.url());});
 await page.goto('/');await page.locator('#prompt').fill('An ocean beach at sunset.');const waiting=page.waitForEvent('download');await page.locator('#generate').click();const download=await waiting;expect(download.suggestedFilename()).toMatch(/\.(webm|mp4)$/);await expect(page.locator('#export-status')).toContainText('Your video is ready');
 const size=await page.locator('#download-video').evaluate(async a=>(await (await fetch(a.href)).blob()).size);expect(size).toBeGreaterThan(1000);expect(remote).toEqual([]);
});
test('image generation produces PNGs whose pixels change with the prompt',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#prompt').fill('Neon city at night with rain');const d=page.waitForEvent('download');await page.locator('#generate-image').click();expect((await d).suggestedFilename()).toBe('bail-generated-image.png');
 const city=await page.locator('#canvas').evaluate(c=>c.toDataURL());await page.locator('#prompt').fill('Snowy mountains at sunrise');await page.locator('#compose-preview').click();const mountains=await page.locator('#canvas').evaluate(c=>c.toDataURL());expect(city).not.toBe(mountains);
 await page.screenshot({path:`test-results/generated-scene-${test.info().project.name}.png`,fullPage:true});expect(errors).toEqual([]);
});
