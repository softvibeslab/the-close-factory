// Cache both the in-flight request and its result for one modal session.
export async function createCalendarEventOnce(api, form, requestRef) {
  if (requestRef.current) return requestRef.current;
  const start = new Date(form.start_time);
  if (!form.title.trim() || !Number.isFinite(start.getTime())) {
    throw new Error('Completa el título y una fecha válida.');
  }
  requestRef.current = api.post('/calendar/events', {
    ...form,
    title: form.title.trim(),
    start_time: start.toISOString(),
    lead_id: form.lead_id || null,
  }).then(response => {
    if (!response.data?.id) throw new Error('No se recibió el identificador del evento.');
    return response.data.id;
  }).catch(error => {
    requestRef.current = null;
    throw error;
  });
  return requestRef.current;
}
