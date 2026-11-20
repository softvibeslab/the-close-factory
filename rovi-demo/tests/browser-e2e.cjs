if(process.env.RUN_DEMO_MUTATION_TESTS!=='1') throw new Error('Set RUN_DEMO_MUTATION_TESTS=1 only for an authorized disposable sandbox; this test resets data.');
const fs=require('fs');
const assert=require('node:assert/strict');
const {chromium}=require(require('node:path').resolve(__dirname,'../source/frontend/node_modules/playwright'));
const BASE='http://127.0.0.1:9130';
const ROOT=require('node:path').resolve(__dirname,'../');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/root/.hermes/tools/chromium-1208/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try{
  for(let run=1;run<=2;run++){
   const context=await browser.newContext({viewport:{width:1440,height:980},recordVideo:run===1?{dir:ROOT+'/evidence/videos',size:{width:1440,height:980}}:undefined});
   await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===BASE?route.continue():route.abort('blockedbyclient');});
   const entered=await context.request.post(BASE+'/api/demo/enter',{data:{role:'manager'}});assert.equal(entered.status(),200);const session=await entered.json();
   const headers={Authorization:'Bearer '+session.access_token};
   const reset=await context.request.post(BASE+'/api/demo/reset',{headers,data:{confirm:'RESET_DEMO_PROVISA'}});assert.equal(reset.status(),200);
   const page=await context.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
   // Pauses only make the recorded walkthrough readable; assertions wait on state.
   const hold=()=>run===1?page.waitForTimeout(1800):Promise.resolve();
   await page.goto(BASE+'/demo/?role=manager');
   await page.locator('#metric-total').filter({hasText:'2'}).waitFor();
   await page.locator('#lead-card').filter({hasText:'Mariana Demo'}).waitFor();
   await page.screenshot({path:ROOT+`/evidence/demo-start-${run}.png`,fullPage:true});
   await hold();
   await page.locator('[data-action="qualify"]').click();
   await page.locator('#message').filter({hasText:'Calificación humana guardada'}).waitFor();
   await page.reload();
   await page.locator('#lead-card .stage').filter({hasText:'Calificación'}).waitFor();
   await page.locator('#lead-card').filter({hasText:'2,800,000'}).waitFor();
   await hold();
   await page.locator('[data-action="assign"]').click();
   await page.locator('#message').filter({hasText:'Broker Demo A asignado'}).waitFor();
   await hold();
   // A genuinely separate page session observes server-authorized data on polling.
   const broker=await context.newPage();await broker.goto(BASE+'/demo/?role=broker_a');
   await broker.locator('#lead-card').filter({hasText:'Mariana Demo'}).waitFor();
   const outsider=await context.newPage();await outsider.goto(BASE+'/demo/?role=broker_b');
   await outsider.locator('#metric-total').filter({hasText:'0'}).waitFor();
   assert.ok(!(await outsider.locator('#portfolio').innerText()).includes('Mariana'));
   await page.locator('[data-action="visit"]').click();
   await page.locator('#message').filter({hasText:'Visita interna guardada'}).waitFor();
   await hold();
   assert.equal(await page.locator('#role').inputValue(),'broker_a');
   await page.locator('[data-action="visit"]').click();
   await page.locator('#message').filter({hasText:'La visita ya existe'}).waitFor();
   await page.locator('[data-action="advance"]').click();
   await page.locator('#message').filter({hasText:'Pipeline actualizado'}).waitFor();
   await page.reload();await page.locator('#lead-card .stage').filter({hasText:'Presentación'}).waitFor();
   await hold();
   await page.locator('#role').selectOption('manager');
   await page.locator('#metric-visits').filter({hasText:'1'}).waitFor();
   await page.locator('[data-action="rescue"]').click();
   await page.locator('#message').filter({hasText:'Seguimiento recuperado'}).waitFor();
   await page.locator('#metric-assigned').filter({hasText:'2'}).waitFor();
   await hold();
   await page.locator('[data-view="capture"]').click();
   await page.locator('[name="synthetic"]').check();
   await page.locator('[name="purpose"]').selectOption({label:'Evaluar inversión'});
   await page.locator('#capture-form button').click();
   await page.locator('#capture-result').filter({hasText:'Solicitud persistida'}).waitFor();
   await page.locator('#capture-form button').click();
   await hold();
   await page.locator('#capture-result').filter({hasText:'Solicitud persistida'}).waitFor();
   const current=await context.request.get(BASE+'/api/demo/state',{headers});assert.equal(current.status(),200);const state=await current.json();
   assert.equal(state.metrics.total_leads,3);assert.equal(state.events.length,1);
   const captured=state.leads.find(l=>l.name==='Valeria Demo');assert.ok(captured);assert.equal(captured.custom_fields_data.finalidad,'Evaluar inversión');assert.equal(captured.custom_fields_data.utm_campaign,'META_RIVIERA_DEPTO_DEMO');
   await page.locator('[data-view="operate"]').click();await page.screenshot({path:ROOT+`/evidence/demo-complete-${run}.png`,fullPage:true});
   // Opening actual compiled CRM uses the same backend and seeded membership.
   const [crm]=await Promise.all([context.waitForEvent('page'),page.locator('#open-crm').click()]);
   crm.on('pageerror',e=>pageErrors.push(e.message));await crm.waitForLoadState('domcontentloaded');
   await crm.getByText('Mariana Demo',{exact:true}).first().waitFor({timeout:30000});
   assert.ok((await crm.locator('body').innerText()).includes('Datos sintéticos'));
   await crm.screenshot({path:ROOT+`/evidence/crm-leads-${run}.png`,fullPage:true});
   assert.equal(await crm.getByRole('link',{name:'Configuracion',exact:true}).count(),0);
   await crm.goto(BASE+'/dashboard');await crm.waitForLoadState('domcontentloaded');await crm.locator('body').filter({hasText:'Dashboard'}).waitFor({timeout:30000});
   await crm.screenshot({path:ROOT+`/evidence/crm-dashboard-${run}.png`,fullPage:true});
   const dashboardText=await crm.locator('body').innerText();
   assert.ok(!dashboardText.includes('ROI por Fuente'),'No mostrar ROI sin costos observados');
   assert.ok(!dashboardText.includes('Ingresos Esperados'),'No presentar presupuesto del pipeline como ingresos');
   assert.ok(dashboardText.includes('El panel de demo consulta el CRM cada 5 segundos'));
   assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));
   // Error injection must never produce invented charts.
   await crm.route('**/api/dashboard/trends*',r=>r.fulfill({status:503,contentType:'application/json',body:'{"detail":"QA unavailable"}'}));
   await crm.route('**/api/dashboard/comparison*',r=>r.fulfill({status:503,contentType:'application/json',body:'{"detail":"QA unavailable"}'}));
   await crm.reload();await crm.getByText(/no disponible|no disponibles|no se pudieron|no fue posible/i).first().waitFor({timeout:30000});
   await crm.screenshot({path:ROOT+`/evidence/crm-dashboard-error-${run}.png`,fullPage:true});
   assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:ROOT+`/evidence/demo-mobile-${run}.png`,fullPage:true});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Mobile overflow');
   const finalReset=await context.request.post(BASE+'/api/demo/reset',{headers,data:{confirm:'RESET_DEMO_PROVISA'}});assert.equal(finalReset.status(),200);
   results.push({run,result:'PASS',persisted:true,roles:true,unique_visit:true,intake_replay:true,crm_render:true,dashboard_error_truthful:true,mobile_overflow:false,page_errors:pageErrors.length});
   const videoPath=run===1?await page.video().path():null;
   await context.close();
   if(videoPath)fs.copyFileSync(videoPath,ROOT+'/public/recorrido.webm');
  }
  fs.writeFileSync(ROOT+'/evidence/browser-results.json',JSON.stringify({timestamp:new Date().toISOString(),results},null,2));
  console.log(JSON.stringify(results,null,2));
 }catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
})();
