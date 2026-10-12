import {test,expect} from '@playwright/test';
test('compose, edit, reorder, save and restore a story',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('.scene-card')).toHaveCount(4);
 await page.locator('#prompt').fill('A small thought. A new world.');await page.locator('#generate').click();await expect(page.locator('.scene-card')).toHaveCount(2);
 await page.locator('#scene-text').fill('My original story.');await page.locator('#scene-right').click();await expect(page.locator('.scene-card').nth(1)).toContainText('My original story.');
 await page.locator('#ratio').selectOption('landscape');await expect(page.locator('#canvas')).toHaveAttribute('width','1280');
 await page.locator('#save').click();await page.locator('#project-name').fill('My first film');await page.locator('#save-confirm').click();await page.getByRole('button',{name:'My projects',exact:true}).click();await expect(page.locator('.project-card')).toContainText('My first film');
 await page.getByRole('button',{name:'Open story'}).click();await expect(page.locator('#project-name-display')).toHaveText('My first film');await expect(page.locator('.scene-card')).toHaveCount(2);
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('video export produces a nonempty downloadable recording',async({page})=>{
 await page.goto('/');await page.locator('#prompt').fill('A film.');await page.locator('#generate').click();await page.locator('#export').click();await page.locator('#quality').selectOption('480');const waiting=page.waitForEvent('download');await page.locator('#export-start').click();const download=await waiting;expect(download.suggestedFilename()).toMatch(/\.(webm|mp4)$/);await expect(page.locator('#export-status')).toContainText('Your video is ready');
 const size=await page.locator('#download-video').evaluate(async a=>(await (await fetch(a.href)).blob()).size);expect(size).toBeGreaterThan(1000);
});
test('AI mode requires a runtime and handles an actual mocked queue protocol',async({page})=>{
 await page.route('https://gpu.example/**',async route=>{const u=new URL(route.request().url());if(u.pathname==='/system_stats')return route.fulfill({json:{system:{}}});if(u.pathname==='/prompt'){const body=route.request().postDataJSON();expect(body.prompt['1'].inputs.text).toContain('extraordinary');return route.fulfill({json:{prompt_id:'test-job'}});}if(u.pathname==='/history/test-job')return route.fulfill({json:{'test-job':{status:{completed:true},outputs:{1:{gifs:[{filename:'film.mp4',type:'output'}]}}}}});return route.fulfill({body:Buffer.from('mock-media'),contentType:'video/mp4'});});
 await page.goto('/');await page.locator('.ai-details summary').click();await page.locator('#ai-generate').click();await expect(page.locator('#ai-dialog')).toBeVisible();await page.locator('#ai-url').fill('https://gpu.example');await page.locator('#ai-workflow').fill(JSON.stringify({'1':{class_type:'CLIPTextEncode',inputs:{text:'{{prompt}}'}}}));await page.locator('#ai-connect').click();await expect(page.locator('#ai-connect-status')).toContainText('Connected.');await page.locator('#ai-dialog .dialog-close').click();await page.locator('#ai-generate').click();await expect(page.locator('#mode-badge')).toHaveText('AI footage',{timeout:15000});await page.locator('#back-motion').click();await expect(page.locator('#canvas')).toBeVisible();
});
