import {qualificationPayload,appointmentPayload,nextStage,existingVisit,esc} from './core.mjs';
import {presenterStep} from './presenter.mjs';
const $=s=>document.querySelector(s);
function renderPresenter(){
 const role=$('#role').value,step=presenterStep(state,role);
 $('#workspace-context').textContent='Inmobiliaria Demo Riviera Maya · '+roleName(role)+' · Solo sandbox';
 $('#presenter-title').textContent=step.title;
 $('#presenter-instruction').textContent=step.instruction;
 $('#presenter-say').textContent='Qué explicar: '+step.say;
}
const labels={nuevo:'Nuevo',contactado:'Contactado',calificacion:'Calificación',presentacion:'Presentación',apartado:'Apartado',venta:'Venta',perdido:'Perdido'};
let session=null,state=null,busy=false,currentView='operate',lastLeadId=null,polling=false;
let intakeKey=sessionStorage.getItem('provisa_demo_intake_key')||crypto.randomUUID();
sessionStorage.setItem('provisa_demo_intake_key',intakeKey);
function message(text,error=false){const el=$('#message');el.hidden=false;el.classList.toggle('error',error);el.textContent=text;}
async function request(path,options={}){
 const headers={'Content-Type':'application/json',...(options.headers||{})};
 if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;
 const response=await fetch('/api'+path,{...options,headers,cache:'no-store'});
 let data;try{data=await response.json();}catch{throw new Error('Respuesta no válida del CRM. No se muestran resultados inventados.');}
 if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail||data));
 return data;
}
function setBusy(value){busy=value;document.querySelectorAll('button[data-action],#reset,#role,#capture-form button').forEach(el=>el.disabled=value);}
function rows(data){return Array.isArray(data)?data:data?.leads||data?.items||[];}
function visibleLeads(){return rows(state?.leads);}
function scenario(){return state?.scenario||{};}
function primary(){const list=visibleLeads();return list.find(l=>l.id===scenario().lead_id)||list.find(l=>l.id===lastLeadId)||list.find(l=>l.name==='Mariana Demo')||list[0]||null;}
function roleName(role){return ({manager:'Gerente Demo',broker_a:'Broker Demo A',broker_b:'Broker Demo B'})[role]||role;}
function events(){return Array.isArray(state?.events)?state.events:[];}
function formFields(lead){return `<dl class="fields"><div><dt>Etapa</dt><dd><span class="stage">${esc(labels[lead.status]||lead.status)}</span></dd></div><div><dt>Necesidad</dt><dd>${esc(lead.custom_fields_data?.finalidad||'Por confirmar')} · ${esc(lead.preferred_zone||'Zona por confirmar')}</dd></div><div><dt>Presupuesto</dt><dd>${lead.budget_mxn?new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(lead.budget_mxn)+' · FICTICIO':'Por confirmar'}</dd></div><div><dt>Plazo / compra</dt><dd>${esc(lead.custom_fields_data?.plazo||'Por confirmar')} / ${esc(lead.custom_fields_data?.financiacion||'Por confirmar')}</dd></div><div><dt>Responsable</dt><dd>${esc(lead.assigned_broker_name||lead.assigned_broker_id||'Sin asignar')}</dd></div><div><dt>Siguiente acción</dt><dd>${esc(lead.next_action||'Pendiente de definir')}</dd></div></dl>`;}
function render(){
 const leads=visibleLeads(),lead=primary();
 const metrics=state?.metrics||{};
 $('#metric-total').textContent=metrics.total_leads??leads.length;
 $('#metric-assigned').textContent=metrics.assigned??leads.filter(l=>l.assigned_broker_id).length;
 $('#metric-visits').textContent=metrics.visits??events().filter(e=>e.event_type==='visita').length;
 $('#metric-sources').textContent=Object.keys(metrics.by_source||Object.fromEntries(leads.map(l=>[l.source,true]))).length;
 $('#lead-card').innerHTML=lead?`<div class="person"><span class="avatar">${esc(lead.name.split(' ').slice(0,2).map(v=>v[0]).join(''))}</span><div><h3>${esc(lead.name)}</h3><p>Prospecto ficticio · Registro real en sandbox</p></div></div>${formFields(lead)}`:'<div class="note">Esta cuenta no tiene una oportunidad visible. El servidor no entrega la cartera de otro broker. Asigna el caso desde la perspectiva gerente para continuar.</div>';
 $('#evidence').innerHTML=lead?`<div><span>ID del lead</span><code>${esc(lead.id)}</code></div><div><span>Origen persistido</span>${esc(lead.source)}</div><div><span>Campaña / UTM</span><code>${esc(lead.custom_fields_data?.utm_campaign||lead.custom_fields_data?.campaign_id||'Sin campaña registrada')}</code></div><div><span>Actualizado en CRM</span>${esc(lead.updated_at?new Date(lead.updated_at).toLocaleString('es-MX',{timeZone:'America/Cancun'}):'Sin dato')} · Cancún</div>`:'Sin datos individuales autorizados.';
 const evs=events().filter(e=>!lead||e.lead_id===lead.id);
 $('#events').innerHTML=evs.length?evs.map(e=>`<div class="event"><strong>${esc(e.title)}</strong><small>${esc(new Date(e.start_time).toLocaleString('es-MX',{timeZone:'America/Cancun'}))} · Cancún · FICTICIA</small></div>`).join(''):'No hay citas visibles guardadas para este caso.';
 $('#portfolio').innerHTML=leads.length?leads.map(l=>`<tr><td>${esc(l.name)}</td><td>${esc(labels[l.status]||l.status)}</td><td>${esc(l.source)}</td><td>${esc(l.next_action||'Pendiente')}</td><td>${esc(l.assigned_broker_name||l.assigned_broker_id||'Sin asignar')}</td></tr>`).join(''):'<tr><td colspan="5">Sin registros autorizados para esta cuenta.</td></tr>';
 const isManager=$('#role').value==='manager';
 $('#rescue').hidden=!isManager||!leads.some(l=>l.id===scenario().followup_lead_id&&!l.assigned_broker_id);
 $('#reset').hidden=!isManager;
 document.querySelectorAll('[data-action]').forEach(b=>{b.hidden=(!lead&&b.dataset.action!=='rescue')||(!isManager&&['assign','rescue'].includes(b.dataset.action));});
 $('#connection').textContent='Lectura real del CRM · cada 5 s';$('#connection-dot').style.background='#2c8057';
 $('#updated').textContent='Leído '+new Date().toLocaleTimeString('es-MX');
 renderPresenter();
}
async function refresh(){if(polling)return;polling=true;try{state=await request('/demo/state');render();}catch(e){state=null;renderPresenter();$('#connection').textContent='No se pudo leer la API';$('#connection-dot').style.background='#a34c35';message(e.message,true);}finally{polling=false;}}
async function enter(role){session=await request('/demo/enter',{method:'POST',body:JSON.stringify({role})});sessionStorage.setItem('provisa_demo_role',role);$('#role').value=role;await refresh();}
async function perform(action){if(busy)return;setBusy(true);try{
 let lead=primary();if(!lead&&action!=='rescue')throw new Error('No hay lead autorizado para esta cuenta.');
 if(action==='qualify'){
  await request('/leads/'+encodeURIComponent(lead.id),{method:'PUT',body:JSON.stringify(qualificationPayload(lead))});
  const propertyId=scenario().property_id;
  if(propertyId)await request('/lead-product-interests',{method:'POST',body:JSON.stringify({lead_id:lead.id,product_id:propertyId,interest_type:'principal',interest_status:'nuevo_interes',notes:'Vínculo ficticio de demostración. Disponibilidad no comercial.'})});
  message('Calificación humana guardada en el CRM. Presupuesto ficticio; financiación por confirmar.');
 }else if(action==='assign'){
  if($('#role').value!=='manager')throw new Error('La asignación se realiza desde gerencia.');
  const brokerId=scenario().broker_a_id;if(!brokerId)throw new Error('No se encontró el broker del escenario.');
  await request('/leads/'+encodeURIComponent(lead.id),{method:'PUT',body:JSON.stringify({assigned_broker_id:brokerId})});
  message('Broker Demo A asignado. Puedes abrir su perspectiva en otra pestaña para comprobar visibilidad.');
 }else if(action==='visit'){
  if(!lead.assigned_broker_id)throw new Error('Asigna primero un broker al caso.');
  const selectedId=lead.id;
  if($('#role').value==='manager'){await enter('broker_a');lead=visibleLeads().find(l=>l.id===selectedId);if(!lead)throw new Error('Broker A no tiene acceso a este lead.');}
  const prior=existingVisit(events(),lead.id);
  if(prior){message('La visita ya existe. No se ha creado un segundo evento.');}
  else{await request('/calendar/events',{method:'POST',body:JSON.stringify(appointmentPayload(lead.id))});await request('/activities',{method:'POST',body:JSON.stringify({lead_id:lead.id,activity_type:'nota',description:'Se programó una visita interna FICTICIA del escenario, sin confirmación externa ni mensajes enviados.'})});message('Visita interna guardada desde la cuenta del broker. Sin Google, mensajes ni confirmación al comprador.');}
 }else if(action==='advance'){
  const body={status:nextStage(lead.status),next_action:'Preparar visita interna y confirmar requisitos de compra. Escenario ficticio.'};
  await request('/leads/'+encodeURIComponent(lead.id),{method:'PUT',body:JSON.stringify(body)});
  message('Pipeline actualizado manualmente. Este cambio no representa una visita realizada ni una venta.');
 }else if(action==='rescue'){
  const id=scenario().followup_lead_id;if(!id)throw new Error('No se encontró el caso de seguimiento.');
  await request('/leads/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({assigned_broker_id:scenario().broker_a_id,next_action:'Broker Demo A: revisar necesidad y proponer horario de seguimiento ficticio.',custom_fields_data:{demo:true,next_action_at:new Date(Date.now()+3600000).toISOString()}})});
  message('Seguimiento recuperado: responsable y siguiente acción guardados. Detección manual, sin alerta IA.');
 }else throw new Error('Acción no disponible.');
 await refresh();
 }catch(e){message(e.message,true);}finally{setBusy(false);}}
function setView(view){currentView=view;for(const id of ['operate','capture','guide'])$('#view-'+id).hidden=id!==view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>perform(b.dataset.action)));
$('#role').addEventListener('change',async e=>{setBusy(true);try{await enter(e.target.value);message('Perspectiva '+roleName(e.target.value)+': datos autorizados por el servidor.');}catch(err){message(err.message,true);}finally{setBusy(false);}});
$('#refresh').addEventListener('click',refresh);
$('#open-crm').addEventListener('click',()=>{if(!session)return;const user={...(session.user||{}),active_workspace:session.active_workspace,available_workspaces:session.available_workspaces};for(const key of ['leadvibes_token','token'])localStorage.setItem(key,session.access_token);for(const key of ['leadvibes_user','user'])localStorage.setItem(key,JSON.stringify(user));for(const key of ['leadvibes_refresh_token','refresh_token']){if(session.refresh_token)localStorage.setItem(key,session.refresh_token);else localStorage.removeItem(key);}localStorage.setItem('leadvibes_app_mode','rovi');window.open('/leads','_blank','noopener');});
$('#reset').addEventListener('click',async()=>{if(!confirm('¿Restaurar SOLO la base de datos de este sandbox? Se borran los cambios de la demo; producción no se toca.'))return;setBusy(true);try{await request('/demo/reset',{method:'POST',body:JSON.stringify({confirm:'RESET_DEMO_PROVISA'})});intakeKey=crypto.randomUUID();sessionStorage.setItem('provisa_demo_intake_key',intakeKey);await enter('manager');$('#capture-result').textContent='';message('Sandbox restaurado. Producción no forma parte de esta base.');}catch(e){message(e.message,true);}finally{setBusy(false);}});
$('#capture-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;setBusy(true);try{if($('#role').value!=='manager')throw new Error('Usa Gerente Demo para crear la captación ficticia.');const form=new FormData(e.target);if(!form.get('synthetic'))throw new Error('Confirma que todos los datos son ficticios.');const body={name:form.get('name'),purpose:form.get('purpose'),zone:form.get('zone'),idempotency_key:intakeKey,source:'demo_meta',campaign_id:'META_RIVIERA_DEPTO_DEMO',utm_source:'meta_demo',utm_medium:'paid_social_demo',utm_campaign:'META_RIVIERA_DEPTO_DEMO',synthetic:true};const result=await request('/demo/intake',{method:'POST',headers:{'Idempotency-Key':intakeKey},body:JSON.stringify(body)});lastLeadId=result.lead_id||result.id;$('#capture-result').innerHTML=`<div class="message">Solicitud persistida. ID CRM: <code>${esc(lastLeadId)}</code>. Reenviar esta solicitud no debe crear un duplicado.</div>`;await refresh();message('Origen de campaña guardado en el CRM del sandbox. No se activó ningún anuncio.');}catch(err){message(err.message,true);}finally{setBusy(false);}});
const initial=new URL(location.href).searchParams.get('role')||sessionStorage.getItem('provisa_demo_role')||'manager';
try{await enter(['manager','broker_a','broker_b'].includes(initial)?initial:'manager');}catch(e){message('No se pudo iniciar el demo: '+e.message,true);}
setInterval(()=>{if(!busy)refresh();},5000);
