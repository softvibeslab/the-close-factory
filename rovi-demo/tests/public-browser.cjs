if(process.env.RUN_DEMO_MUTATION_TESTS!=='1') throw new Error('Set RUN_DEMO_MUTATION_TESTS=1 only for an authorized disposable sandbox; this test resets data.');
const fs=require('fs');const assert=require('node:assert/strict');
const {chromium}=require(require('node:path').resolve(__dirname,'../source/frontend/node_modules/playwright'));
const ROOT=require('node:path').resolve(__dirname,'../');const BASE='https://demo.rovicrm.com';
const lines=fs.readFileSync('/root/.config/rovi-provisa-demo-access.txt','utf8').trim().split('\n');
const username=lines[0].split(': ')[1],password=lines[1].split(': ')[1];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/root/.hermes/tools/chromium-1208/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP demo.rovicrm.com 72.62.100.235']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:980},httpCredentials:{username,password,origin:BASE},ignoreHTTPSErrors:false});
  await context.route('**/*',r=>new URL(r.request().url()).origin===BASE?r.continue():r.abort('blockedbyclient'));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'/');await page.waitForURL(BASE+'/demo/');await page.locator('#lead-card').filter({hasText:'Mariana Demo'}).waitFor();
  const cookies=await context.cookies(BASE);const access=cookies.find(c=>c.name==='rovi_demo_access');assert.ok(access&&access.secure&&access.httpOnly&&access.sameSite==='Lax');
  const reset=await page.evaluate(async()=>{const s=await (await fetch('/api/demo/enter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'manager'})})).json();const r=await fetch('/api/demo/reset',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify({confirm:'RESET_DEMO_PROVISA'})});return r.status;});assert.equal(reset,200);
  await page.reload();await page.locator('#metric-total').filter({hasText:'2'}).waitFor();
  await page.locator('[data-action="qualify"]').click();await page.locator('#message').filter({hasText:'Calificación humana guardada'}).waitFor();
  await page.locator('[data-action="assign"]').click();await page.locator('#message').filter({hasText:'Broker Demo A asignado'}).waitFor();
  await page.locator('[data-action="visit"]').click();await page.locator('#message').filter({hasText:'Visita interna guardada'}).waitFor();
  await page.locator('[data-action="advance"]').click();await page.locator('#message').filter({hasText:'Pipeline actualizado'}).waitFor();
  await page.reload();await page.locator('#lead-card .stage').filter({hasText:'Presentación'}).waitFor();
  await page.locator('#role').selectOption('manager');await page.locator('#metric-visits').filter({hasText:'1'}).waitFor();
  const [crm]=await Promise.all([context.waitForEvent('page'),page.locator('#open-crm').click()]);crm.on('pageerror',e=>errors.push(e.message));await crm.waitForLoadState('domcontentloaded');await crm.getByText('Mariana Demo',{exact:true}).first().waitFor({timeout:30000});
  await crm.screenshot({path:ROOT+'/evidence/public-crm.png',fullPage:true});
  await page.screenshot({path:ROOT+'/evidence/public-demo.png',fullPage:true});
  const resetFinal=await page.evaluate(async()=>{const s=await (await fetch('/api/demo/enter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'manager'})})).json();const r=await fetch('/api/demo/reset',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify({confirm:'RESET_DEMO_PROVISA'})});const state=await (await fetch('/api/demo/state',{headers:{Authorization:'Bearer '+s.access_token}})).json();return {status:r.status,leads:state.leads.length,events:state.events.length};});
  assert.deepEqual(resetFinal,{status:200,leads:2,events:0});assert.equal(errors.length,0,JSON.stringify(errors));
  const result={url:BASE+'/',timestamp:new Date().toISOString(),tls_validation:true,host_resolution:'Explicit browser DNS mapping; independent public resolvers separately verified',access_cookie_flags:{secure:true,httpOnly:true,sameSite:'Lax'},native_crm_bearer_preserved:true,flow_persistence:true,reset:resetFinal,page_errors:errors.length,status:'PASS'};
  fs.writeFileSync(ROOT+'/evidence/public-browser-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
