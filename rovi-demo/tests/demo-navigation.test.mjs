import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('demo navigation only exposes agreed CRM surfaces without changing normal mode',async()=>{
 const path=new URL('../source/frontend/src/lib/demoNavigation.js', import.meta.url).pathname;
 assert.ok(fs.existsSync(path),'Falta alcance de menú demo');
 const source=fs.readFileSync(path,'utf8');
 const {filterDemoNavigation}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const items=['/dashboard','/leads','/products','/brokers/manage','/calendar','/campaigns','/settings','/pricing-calculator','/automations'].map(to=>({to}));
 assert.equal(filterDemoNavigation(items,'production'),items);
 assert.deepEqual(filterDemoNavigation(items,'provisa-demo').map(x=>x.to),['/dashboard','/leads','/products','/brokers/manage','/calendar']);
 const sidebar=fs.readFileSync(new URL('../source/frontend/src/components/Sidebar.js', import.meta.url).pathname,'utf8');
 assert.ok(sidebar.includes('filterDemoNavigation('));
});
