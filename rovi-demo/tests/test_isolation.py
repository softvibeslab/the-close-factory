import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(str(__import__('pathlib').Path(__file__).resolve().parents[1] / ''))

class IsolationConfigTest(unittest.TestCase):
    def test_demo_compose_is_private_and_separate(self):
        path = ROOT / 'compose.yaml'
        self.assertTrue(path.exists(), 'Falta composición aislada de demo')
        data = json.loads(subprocess.check_output(['docker','compose','--project-directory',str(ROOT),'-f',str(path),'config','--format','json']))
        self.assertEqual(data['name'], 'rovi-provisa-demo')
        self.assertTrue(data['networks']['demo']['internal'])
        for name, service in data['services'].items():
            self.assertEqual(set(service['networks']), {'demo'})
            self.assertNotIn('network_mode', service)
            self.assertFalse(service.get('privileged', False))
            self.assertFalse(service.get('labels', {}).get('traefik.enable') == 'true')
            if name != 'frontend':
                self.assertFalse(service.get('ports'))
        self.assertFalse(data['services']['frontend'].get('ports'))
        self.assertEqual(data['services']['frontend']['networks']['demo']['ipv4_address'], '10.0.11.4')
        socket=ROOT/'runtime'/'rovi-provisa-demo.socket'
        self.assertTrue(socket.exists(), 'Falta relay loopback para red Docker interna')
        self.assertIn('ListenStream=127.0.0.1:9130', socket.read_text())
        env = data['services']['backend']['environment']
        self.assertEqual(env['DB_NAME'], 'provisa_demo')
        self.assertEqual(env['MONGO_URL'], 'mongodb://mongo:27017')
        self.assertEqual(env['PROVISA_DEMO'], '1')
        self.assertGreaterEqual(len(env['JWT_SECRET']), 48)
        self.assertNotIn('SENDGRID_API_KEY', env)
        self.assertNotIn('OPENAI_API_KEY', env)
        for service in data['services'].values():
            for volume in service.get('volumes', []):
                self.assertNotIn('/var/run/docker.sock', volume.get('source',''))
                if volume.get('type') == 'bind':
                    self.assertTrue(Path(volume['source']).resolve().is_relative_to(ROOT.resolve()), 'Bind mount must stay inside the exported project')

if __name__ == '__main__':
    unittest.main()
