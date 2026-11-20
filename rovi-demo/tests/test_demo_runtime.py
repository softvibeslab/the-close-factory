import importlib.util
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'runtime'))

class GuardTests(unittest.TestCase):
    def test_guard_only_accepts_dedicated_database_and_host(self):
        self.assertIsNotNone(importlib.util.find_spec('demo_scenario'), 'demo guard is not implemented')
        from demo_scenario import assert_demo_environment
        good = {'PROVISA_DEMO': '1', 'DB_NAME': 'provisa_demo', 'MONGO_URL': 'mongodb://mongo:27017'}
        assert_demo_environment(good)
        for key, value in [('PROVISA_DEMO', '0'), ('DB_NAME', 'production'), ('MONGO_URL', 'mongodb://localhost:27017'), ('MONGO_URL', 'mongodb://mongo:27017/production'), ('MONGO_URL', 'mongodb://mongo:27017,evil:27017'), ('MONGO_URL', 'mongodb://mongo:27017/?replicaSet=prod')]:
            with self.subTest(key=key, value=value), self.assertRaises(RuntimeError):
                assert_demo_environment({**good, key: value})

class PolicyTests(unittest.TestCase):
    def test_allowlist_blocks_external_and_unknown_routes(self):
        import demo_scenario as rules
        self.assertTrue(hasattr(rules, 'route_allowed'), 'route policy is missing')
        for method, path in [('GET', '/api/leads'), ('PUT', '/api/leads/demo-mariana'), ('POST', '/api/calendar/events'), ('POST', '/api/demo/intake'), ('GET', '/api/dashboard/stats'), ('POST', '/api/auth/login'), ('GET', '/api/tasks'), ('GET', '/api/gamification/rules')]:
            self.assertTrue(rules.route_allowed(method, path), (method, path))
        for method, path in [('POST', '/api/seed'), ('POST', '/api/auth/register'), ('GET', '/api/settings/integrations'), ('POST', '/api/campaigns/x/run'), ('POST', '/api/leads/x/analyze'), ('GET', '/api/products/location/search'), ('POST', '/api/leads/x/send'), ('DELETE', '/api/auth/account'), ('GET', '/docs'), ('POST', '/api/chat')]:
            self.assertFalse(rules.route_allowed(method, path), (method, path))

class ScenarioTests(unittest.TestCase):
    def test_synthetic_fixture_uses_real_membership_and_scoping_fields(self):
        import demo_scenario as rules
        self.assertTrue(hasattr(rules, 'scenario_documents'), 'synthetic initialization missing')
        docs = rules.scenario_documents()
        self.assertEqual(docs, rules.scenario_documents())
        users = {u['demo_role']: u for u in docs['users']}
        self.assertEqual(users['manager']['account_type'], 'agency')
        self.assertTrue(all(u['onboarding_completed'] for u in users.values()))
        primary = next(l for l in docs['leads'] if l['id'] == 'demo-mariana')
        self.assertEqual(primary['created_by'], users['manager']['id'])
        self.assertIsNone(primary['assigned_broker_id'])
        self.assertEqual(primary['name'], 'Mariana Demo')
        self.assertEqual(rules.CAMPAIGN['utm_campaign'], 'META_RIVIERA_DEPTO_DEMO')
        self.assertEqual(rules.CAMPAIGN['utm_source'], 'meta_demo')
        self.assertEqual(primary['status'], 'nuevo')
        self.assertNotEqual(primary['created_by'], users['broker_b']['id'])
        self.assertTrue(all(l[k] for l in docs['leads'] for k in ['email_opt_out', 'sms_opt_out', 'whatsapp_opt_out', 'call_opt_out']))
        self.assertEqual({m['tenant_id'] for m in docs['tenant_memberships']}, {'demo-provisa', 'demo-other'})
        self.assertIsNone(next(l for l in docs['leads'] if l['id'] == 'demo-followup')['assigned_broker_id'])

class AdapterTests(unittest.TestCase):
    @unittest.skipUnless(__import__('os').environ.get('DEMO_IMAGE_TEST') == '1', 'runs inside existing backend image')
    def test_real_app_registers_demo_routes_and_validates_models(self):
        self.assertIsNotNone(importlib.util.find_spec('demo_app'), 'FastAPI adapter missing')
        import demo_app
        from pydantic import ValidationError
        self.assertEqual(demo_app.IntakeRequest(idempotency_key='test', purpose='Comprar para vivir').purpose, 'Comprar para vivir')
        with self.assertRaises(ValidationError):
            demo_app.IntakeRequest(idempotency_key='test', purpose='UNAPPROVED_VALUE')
        from models import Lead, ProductService, User
        from demo_scenario import scenario_documents
        paths = {r.path for r in demo_app.app.routes}
        self.assertTrue({'/api/demo/enter', '/api/demo/info', '/api/demo/state', '/api/demo/reset', '/api/demo/intake'}.issubset(paths))
        for collection, model in [('leads', Lead), ('products', ProductService), ('users', User)]:
            for doc in scenario_documents()[collection]:
                model.model_validate(doc)

    @unittest.skipUnless(__import__('os').environ.get('DEMO_IMAGE_TEST') == '1', 'runs inside existing backend image')
    def test_native_task_status_and_comment_actions_are_allowed(self):
        from demo_scenario import route_allowed
        self.assertTrue(route_allowed('PUT', '/api/tasks/task-1/status'))
        self.assertTrue(route_allowed('POST', '/api/tasks/task-1/comments'))

    @unittest.skipUnless(__import__('os').environ.get('DEMO_IMAGE_TEST') == '1', 'runs inside existing backend image')
    def test_adapter_blocks_websocket_entry_points(self):
        import asyncio
        import demo_app
        async def exercise():
            sent = []
            async def receive():
                return {'type': 'websocket.connect'}
            async def send(message):
                sent.append(message)
            await demo_app.app({'type': 'websocket', 'path': '/unlisted', 'raw_path': b'/unlisted', 'query_string': b'', 'headers': [], 'scheme': 'ws', 'server': ('demo', 80), 'client': ('test', 1234), 'root_path': '', 'subprotocols': []}, receive, send)
            return sent
        self.assertEqual(asyncio.run(exercise()), [{'type': 'websocket.close', 'code': 1008, 'reason': 'Disabled in private sandbox'}])

    @unittest.skipUnless(__import__('os').environ.get('DEMO_IMAGE_TEST') == '1', 'runs inside existing backend image')
    def test_actual_http_public_info_auth_boundary_and_dangerous_routes(self):
        import asyncio
        import httpx
        import demo_app
        async def exercise():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=demo_app.app), base_url='http://demo') as client:
                info = await client.get('/api/demo/info')
                self.assertEqual(info.status_code, 200)
                self.assertFalse(info.json()['communications_enabled'])
                self.assertEqual((await client.get('/api/demo/state')).status_code, 401)
                self.assertEqual((await client.get('/api/leads')).status_code, 401)
                self.assertEqual((await client.post('/api/demo/enter', json={'role': 'admin'})).status_code, 422)
                for method, path in [('POST', '/api/auth/register'), ('POST', '/api/seed'), ('GET', '/api/settings/integrations'), ('POST', '/api/chat'), ('POST', '/api/campaigns/demo/run'), ('POST', '/api/tasks/seed-demo')]:
                    response = await client.request(method, path)
                    self.assertEqual(response.status_code, 403, path)
                refresh = demo_app.create_refresh_token({'sub': 'demo-manager'})[1]
                response = await client.get('/api/leads', headers={'Authorization': 'Bearer ' + refresh})
                self.assertEqual(response.status_code, 401)
        asyncio.run(exercise())

if __name__ == '__main__':
    unittest.main()
