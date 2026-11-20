export function qualificationPayload(lead, now=new Date()) {
 return {
  status:'calificacion',priority:'alta',budget_mxn:2800000,preferred_zone:'Playa Centro — zona ficticia',
  notes:'ESCENARIO FICTICIO. Mariana Demo busca departamento para vivir. Dos recámaras; plazo de compra 3–6 meses. Presupuesto ilustrativo, no oferta. Modalidad de compra por confirmar. Calificación humana; no inferencia IA.',
  next_action:'Broker Demo A: confirmar modalidad de compra y proponer visita interna de demostración.',
  custom_fields_data:{...(lead.custom_fields_data||{}),demo:true,finalidad:'Vivir',recamaras:2,plazo:'3–6 meses',financiacion:'POR_CONFIRMAR',next_action_at:new Date(now.getTime()+86400000).toISOString()}
 };
}
export function appointmentPayload(leadId,now=new Date()){
 const start=new Date(now.getTime()+86400000);start.setUTCMinutes(0,0,0);
 return {title:'DEMO · Visita Mariana / Playa Centro',description:'Cita interna FICTICIA. Sin confirmación del cliente, sin sincronización externa ni recordatorios enviados.',event_type:'visita',start_time:start.toISOString(),end_time:new Date(start.getTime()+3600000).toISOString(),lead_id:leadId,reminder_minutes:0};
}
export function nextStage(stage){return ['nuevo','contactado','calificacion'].includes(stage)?'presentacion':stage;}
export function existingVisit(events,leadId){return events.find(e=>e.lead_id===leadId&&e.event_type==='visita'&&!e.completed)||null;}
export function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
