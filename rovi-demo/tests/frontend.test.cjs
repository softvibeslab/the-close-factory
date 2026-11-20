const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = require('node:path').resolve(__dirname,'../source/frontend/src');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('calendar creation shares an in-flight request and reuses its event id for final submit', async () => {
  const file = path.join(root, 'lib/createCalendarEvent.js');
  assert.equal(fs.existsSync(file), true, 'calendar needs one shared creation path');
  const { createCalendarEventOnce } = await import(`data:text/javascript;base64,${Buffer.from(fs.readFileSync(file)).toString('base64')}`);
  const ref = { current: null };
  let calls = 0;
  let finish;
  const api = { post: () => { calls++; return new Promise(resolve => { finish = resolve; }); } };
  const form = { title: 'Synthetic appointment', start_time: '2026-11-19T10:00', lead_id: '' };
  const first = createCalendarEventOnce(api, form, ref);
  const second = createCalendarEventOnce(api, form, ref);
  assert.equal(calls, 1);
  finish({ data: { id: 'synthetic-event-1' } });
  assert.equal(await first, 'synthetic-event-1');
  assert.equal(await second, 'synthetic-event-1');
  assert.equal(await createCalendarEventOnce(api, form, ref), 'synthetic-event-1');
  assert.equal(calls, 1, 'submit after assignment must not POST another event');
  await assert.rejects(createCalendarEventOnce(api, { title: '', start_time: 'bad' }, { current: null }), /título|fecha/i);
  const retryRef = { current: null };
  await assert.rejects(createCalendarEventOnce({ post: async () => { throw new Error('offline'); } }, form, retryRef), /offline/);
  assert.equal(retryRef.current, null, 'failed request permits retry');
  assert.equal(await createCalendarEventOnce({ post: async () => ({ data: { id: 'retry-id' } }) }, form, retryRef), 'retry-id');
  const calendar = read('pages/CalendarPage.js');
  const modal = calendar.slice(calendar.indexOf('const NewEventModal'), calendar.indexOf('export const CalendarPage'));
  assert.equal((modal.match(/createCalendarEventOnce\(api, form, eventRequestRef\)/g) || []).length, 2);
  assert.doesNotMatch(modal, /api\.post\('\/calendar\/events'/);
  assert.match(modal, /disabled=\{loading \|\| Boolean\(selectedEventId\)\}/);
  assert.match(calendar, /showNewModal && <NewEventModal/);
});

test('persistent banner is gated strictly to provisa-demo and identifies synthetic offline scope', () => {
  const app = read('App.js');
  assert.match(app, /process\.env\.REACT_APP_ENVIRONMENT === 'provisa-demo'/);
  assert.match(app, /href="\/demo\/"/);
  assert.match(app, /Datos sintéticos/);
  assert.match(app, /Sin canales externos/);
  assert.match(app, /fixed top-0/);
});

test('missing dashboard summaries render unavailable, and missing goals never produce NaN progress', () => {
  const source = read('pages/DashboardPage.js');
  for (const title of ['Panel Ejecutivo', 'Rendimiento del Broker']) {
    assert.match(source, new RegExp(`if \\(!data\\) return <UnavailableMetrics title="${title}"`));
  }
  assert.match(source, /!stats \? <UnavailableMetrics title="Resumen"/);
  assert.match(source, /stats\?\.apartados_goal > 0 \?/);
  assert.match(source, /stats\?\.ventas_goal > 0 \?/);
});

// Execute the actual source handler bodies without React/dependencies.
function dashboardFetch(name, setters, api) {
  const source = read('pages/DashboardPage.js');
  const body = source.match(new RegExp(`const ${name} = async \\(\\) => \\{([\\s\\S]*?)\\n  \\};`))[1];
  return new Function('api', ...Object.keys(setters), `return (async () => {${body}})();`)(api, ...Object.values(setters));
}

test('failed analytics requests clear stale metrics instead of inventing fallback numbers', async () => {
  for (const [fetch, key] of [['fetchTrendsData', 'Trends'], ['fetchComparisonData', 'Comparison'], ['fetchFunnelData', 'Funnel']]) {
    let value = { stale: true };
    let unavailable = false;
    let loading;
    await dashboardFetch(fetch, {
      [`set${key}Data`]: next => { value = next; },
      [`setLoading${key}`]: next => { loading = next; },
      [`set${key}Error`]: next => { unavailable = next; },
    }, { get: async () => { throw new Error('unavailable'); } });
    assert.equal(value, null, `${key} must not show made-up or stale metrics`);
    assert.equal(unavailable, true, `${key} must expose its unavailable state`);
    assert.equal(loading, false);
  }
  const dashboard = read('pages/DashboardPage.js');
  const components = read('components/DashboardEnhanced.js');
  for (const key of ['Trends', 'Comparison', 'Funnel']) assert.match(dashboard, new RegExp(`error=\\{${key.toLowerCase()}Error\\}`));
  assert.match(components, /Datos no disponibles/);
  assert.match(components, /if \(!data \|\| Object\.keys\(data\)\.length === 0\)/);
});
