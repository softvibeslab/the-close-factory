const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require(require('node:path').resolve(__dirname,'../source/frontend/node_modules/playwright'));
const ROOT=require('node:path').resolve(__dirname,'../');const BASE=process.env.DEMO_PUBLIC==='1'?'https://demo.rovicrm.com':'http://127.0.0.1:9130';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/root/.hermes/tools/chromium-1208/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 let opts={viewport:{width:1440,height:1000},ignoreHTTPSErrors:false};
 if(BASE.startsWith('https')){const lines=fs.readFileSync('/root/.config/rovi-provisa-demo-access.txt','utf8').trim().split('\n');opts.httpCredentials={username:lines[0].split(': ')[1],password:lines[1].split(': ')[1],origin:BASE};}
 const ctx=await browser.newContext(opts);const page=await ctx.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'/demo/eduardo.html');
 if(BASE.startsWith('https'))await page.waitForURL(BASE+'/demo/');
 await page.goto(BASE+'/demo/eduardo.html');
 await page.getByRole('heading',{name:'Eduardo: presenta un caso, no todos los menús.'}).waitFor();
 const boxes=page.locator('[data-rehearsal]');assert.equal(await boxes.count(),6);
 assert.ok((await page.locator('#rehearsal-status').innerText()).includes('No es una certificación técnica'));
 for(const checkbox of await boxes.all())await checkbox.check();
 assert.ok((await page.locator('#rehearsal-status').innerText()).includes('6 de 6'));
 assert.ok((await page.locator('#rehearsal-status').innerText()).includes('no acredita'));
 await page.reload();assert.equal(await page.locator('[data-rehearsal]:checked').count(),0);
 await page.screenshot({path:ROOT+'/evidence/onboarding-commercial-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:ROOT+'/evidence/onboarding-commercial-mobile.png',fullPage:true});
 await page.getByRole('link',{name:'Empezar como Gerente Demo',exact:true}).click();
 await page.locator('#presenter-title').waitFor();
 await page.waitForFunction(()=>!document.querySelector('#presenter-title').textContent.includes('pendiente'));
 assert.equal(await page.locator('#role').inputValue(),'manager');
 assert.ok((await page.locator('#workspace-context').innerText()).includes('Gerente Demo'));
 await page.screenshot({path:ROOT+'/evidence/presenter-commercial.png',fullPage:true});
 await page.route('**/api/demo/state',r=>r.fulfill({status:503,contentType:'application/json',body:'{"detail":"Error de lectura de prueba"}'}));
 await page.locator('#refresh').click();
 await page.locator('#presenter-title').filter({hasText:'Lectura pendiente'}).waitFor();
 assert.equal(errors.length,0,JSON.stringify(errors));
 const result={timestamp:new Date().toISOString(),base:BASE,status:'PASS',checklist:6,checklist_is_manual:true,checkboxes_not_persisted:true,manager_entry:true,live_context:true,api_error_hides_guidance:true,mobile_overflow:false,page_errors:errors,crm_mutations:0};
 fs.writeFileSync(ROOT+'/evidence/commercial-onboarding-'+(BASE.startsWith('https')?'public':'local')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await ctx.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
