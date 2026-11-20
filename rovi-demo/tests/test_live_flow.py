import os
if os.environ.get('RUN_DEMO_MUTATION_TESTS') != '1':
    raise RuntimeError('Set RUN_DEMO_MUTATION_TESTS=1 only for an authorized disposable sandbox; this test resets data.')
"""Ejercicio real de API, exclusivamente contra el puerto privado de demo."""
import json
import os
import unittest
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE='http://127.0.0.1:9130/api'
ROOT=Path(str(__import__('pathlib').Path(__file__).resolve().parents[1] / ''))
checks=[]

def call(path, method='GET', body=None, token=None):
    headers={'Content-Type':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    request=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
    try:
        with urllib.request.urlopen(request,timeout=20) as r:
            return r.status,json.load(r)
    except urllib.error.HTTPError as e:
        try:
            try:return e.code,json.load(e)
            except:return e.code,{}
        finally:e.close()

class SandboxFlowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sessions={}
        for role in ['manager','broker_a','broker_b','other']:
            status,data=call('/demo/enter','POST',{'role':role})
            assert status==200,(role,status,data)
            cls.sessions[role]=data
        cls.manager=cls.sessions['manager']['access_token']
        status,data=call('/demo/reset','POST',{'confirm':'RESET_DEMO_PROVISA'},cls.manager)
        assert status==200,(status,data)
        status,cls.state=call('/demo/state',token=cls.manager)
        assert status==200,(status,cls.state)
        cls.ids=cls.state['scenario']
        status,cls.other_baseline=call('/leads/demo-other-lead',token=cls.sessions['other']['access_token'])
        assert status==200
    def record(self,label,data):
        checks.append({'test':label,'result':'PASS',**data})
    def test_01_health_and_private_routes(self):
        self.assertEqual(call('/health')[0],200)
        self.assertIn(call('/leads')[0],[401,403])
        self.assertIn(call('/demo/state')[0],[401,403])
        self.record('health_and_auth',{})
    def test_02_qualification_survives_readback(self):
        lead_id=self.ids['lead_id']
        payload={'status':'calificacion','budget_mxn':2800000,'priority':'alta','next_action':'DEMO: confirmar financiación y proponer visita.','custom_fields_data':{'demo':True,'finalidad':'Vivir','utm_campaign':'META_RIVIERA_DEPTO_DEMO','next_action_at':(datetime.now(timezone.utc)+timedelta(days=1)).isoformat()}}
        self.assertEqual(call('/leads/'+lead_id,'PUT',payload,self.manager)[0],200)
        status,data=call('/leads/'+lead_id,token=self.manager)
        self.assertEqual(status,200)
        self.assertEqual(data['status'],'calificacion')
        self.assertEqual(data['budget_mxn'],2800000)
        self.assertEqual(data['custom_fields_data']['utm_campaign'],'META_RIVIERA_DEPTO_DEMO')
        self.record('qualification_readback',{'lead_id':lead_id})
    def test_03_assignment_and_negative_permissions(self):
        lead_id=self.ids['lead_id']
        self.assertEqual(call('/leads/'+lead_id,'PUT',{'assigned_broker_id':self.ids['broker_a_id']},self.manager)[0],200)
        a=self.sessions['broker_a']['access_token'];b=self.sessions['broker_b']['access_token'];other=self.sessions['other']['access_token']
        self.assertEqual(call('/leads/'+lead_id,token=a)[0],200)
        self.assertEqual(call('/leads/'+lead_id,token=b)[0],404)
        self.assertEqual(call('/leads/'+lead_id,token=other)[0],404)
        self.assertIn(call('/leads/'+lead_id,'PUT',{'notes':'UNAUTHORIZED'},b)[0],[403,404])
        self.assertIn(call('/leads/'+lead_id,'PUT',{'notes':'UNAUTHORIZED'},other)[0],[403,404])
        self.assertEqual(call('/leads/'+lead_id,'PUT',{'assigned_broker_id':self.ids['broker_b_id']},a)[0],403)
        self.record('assignment_and_isolation',{'lead_id':lead_id})
    def test_04_single_calendar_event_persists(self):
        a=self.sessions['broker_a']['access_token'];lead_id=self.ids['lead_id']
        payload={'title':'DEMO visita verificación','event_type':'visita','start_time':(datetime.now(timezone.utc)+timedelta(days=1)).isoformat(),'lead_id':lead_id,'reminder_minutes':0,'description':'FICTICIA, sin integración externa.'}
        status,data=call('/calendar/events','POST',payload,a)
        self.assertEqual(status,200,(status,data))
        status,items=call('/calendar/events',token=a)
        self.assertEqual(status,200)
        if isinstance(items,dict):items=items.get('events',items.get('items',[]))
        matches=[e for e in items if e.get('lead_id')==lead_id and e.get('event_type')=='visita']
        self.assertEqual(len(matches),1,matches)
        self.assertFalse(matches[0].get('google_event_id'))
        self.record('calendar_readback',{'event_id':matches[0]['id'],'count':len(matches)})
    def test_05_intake_provenance_and_replay(self):
        body={'name':'Prospecto Demo Verificación','purpose':'Comprar para vivir','zone':'Playa Centro DEMO','synthetic':True,'idempotency_key':'integration-verification-001','utm_source':'meta_demo','utm_medium':'paid_social_demo','utm_campaign':'META_RIVIERA_DEPTO_DEMO','campaign_id':'META_RIVIERA_DEPTO_DEMO'}  # gitleaks:allow -- synthetic replay key, not an authentication secret
        status,data=call('/demo/intake','POST',body,self.manager)
        self.assertEqual(status,200,(status,data))
        lead_id=data.get('lead_id') or data.get('id')
        self.assertTrue(lead_id)
        status,replay=call('/demo/intake','POST',body,self.manager)
        self.assertEqual(status,200,(status,replay))
        self.assertEqual(replay.get('lead_id') or replay.get('id'),lead_id)
        status,lead=call('/leads/'+lead_id,token=self.manager)
        self.assertEqual(status,200)
        self.assertEqual(lead['custom_fields_data']['utm_campaign'],'META_RIVIERA_DEPTO_DEMO')
        self.assertEqual(lead['custom_fields_data']['finalidad'],'Comprar para vivir')
        self.assertEqual(lead['tenant_id'],'demo-provisa')
        self.assertTrue(lead['email_opt_out'])
        self.assertTrue(lead['whatsapp_opt_out'])
        self.record('intake_persistence_idempotency',{'lead_id':lead_id})
    def test_06_stage_and_metrics_reconcile(self):
        lead_id=self.ids['lead_id']
        self.assertEqual(call('/leads/'+lead_id,'PUT',{'status':'presentacion'},self.manager)[0],200)
        status,data=call('/leads/'+lead_id,token=self.manager)
        self.assertEqual(data['status'],'presentacion')
        status,state=call('/demo/state',token=self.manager)
        self.assertEqual(status,200)
        leads=state['leads'];metrics=state['metrics']
        self.assertEqual(metrics['total_leads'],len(leads))
        self.assertEqual(metrics['assigned'],sum(bool(l.get('assigned_broker_id')) for l in leads))
        self.assertEqual(sum(metrics['by_stage'].values()),len(leads))
        self.assertEqual(sum(metrics['by_source'].values()),len(leads))
        self.assertEqual(call('/dashboard/stats',token=self.manager)[0],200)
        self.record('stage_and_metrics_readback',{'total_leads':len(leads)})
    def test_07_outbound_and_reset_guards(self):
        for path in ['/campaigns/anything/start','/webhooks/external-lead','/seed','/auth/register','/leads/'+self.ids['lead_id']+'/analyze']:
            self.assertEqual(call(path,'POST',{},self.manager)[0],403,path)
        self.assertEqual(call('/demo/reset','POST',{'confirm':'wrong'},self.manager)[0],400)
        self.assertEqual(call('/demo/reset','POST',{'confirm':'RESET_DEMO_PROVISA'},self.sessions['broker_a']['access_token'])[0],403)
        self.record('outbound_and_reset_guards',{})
    @classmethod
    def tearDownClass(cls):
        status,data=call('/demo/reset','POST',{'confirm':'RESET_DEMO_PROVISA'},cls.manager)
        assert status==200,(status,data)
        status,state=call('/demo/state',token=cls.manager)
        assert status==200
        assert not state['events'], 'Reset must remove demo calendar events'
        assert len(state['leads'])==len(cls.state['leads']), 'Reset must restore fixture count'
        status,other=call('/leads/demo-other-lead',token=cls.sessions['other']['access_token'])
        assert status==200 and other==cls.other_baseline, 'Reset must preserve the other tenant sentinel'
        (ROOT/'evidence'/'api-e2e-results.json').write_text(json.dumps({'checks':checks,'reset_verified':True,'timestamp':datetime.now(timezone.utc).isoformat()},ensure_ascii=False,indent=2))

if __name__=='__main__':unittest.main(verbosity=2)
