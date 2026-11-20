import unittest,json,subprocess
from pathlib import Path
ROOT=Path(str(__import__('pathlib').Path(__file__).resolve().parents[1] / 'public-edge'))
class PublicEdgeTest(unittest.TestCase):
 def test_cookie_boundary_preserves_crm_bearer_auth(self):
  p=ROOT/'gate.conf.template'
  self.assertTrue(p.exists(),'Falta frontera de acceso pública')
  s=p.read_text()
  for value in ['location = /access','auth_basic_user_file /etc/nginx/demo.users','HttpOnly; Secure; SameSite=Lax','proxy_set_header Authorization $http_authorization','if ($provisa_authenticated = 0)','proxy_pass http://10.0.1.1:9132','limit_req_zone']:
   self.assertIn(value,s)
  self.assertIn('try_files /access.html =404',s)
  self.assertNotIn('auth_basic',s.split('location / {',1)[1])
 def test_edge_has_no_public_ports_and_does_not_join_crm_network(self):
  p=ROOT/'compose.yaml';self.assertTrue(p.exists(),'Falta composición de edge')
  d=json.loads(subprocess.check_output(['docker','compose','-f',str(p),'config','--format','json']))
  svc=d['services']['edge'];self.assertFalse(svc.get('ports'))
  self.assertEqual(set(svc['networks']),{'coolify'})
  self.assertEqual(svc['networks']['coolify']['ipv4_address'],'10.0.1.240')
  self.assertFalse(svc.get('privileged',False))
  self.assertTrue(d['networks']['coolify']['external'])
if __name__=='__main__':unittest.main()
