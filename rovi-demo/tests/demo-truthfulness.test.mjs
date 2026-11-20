import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../source/frontend/src/', import.meta.url).pathname;
test('demo hides unproven revenue and ROI panels and labels refresh transport honestly',()=>{
 const text=fs.readFileSync(root+'pages/DashboardPage.js','utf8');
 assert.ok(text.includes("const isProvisaDemo = process.env.REACT_APP_ENVIRONMENT === 'provisa-demo'"));
 assert.ok(text.includes('!isProvisaDemo && !isIndividual'));
 assert.ok(text.includes('!isProvisaDemo && isIndividual'));
 assert.ok(text.includes('El panel de demo consulta el CRM cada 5 segundos'));
});
test('demo websocket auto connection is disabled rather than endlessly reconnecting',()=>{
 const text=fs.readFileSync(root+'hooks/useWebSocket.js','utf8');
 assert.ok(text.includes("process.env.REACT_APP_ENVIRONMENT === 'provisa-demo'"));
 assert.ok(text.includes("setConnectionStatus('disabled')"));
});
