"""Public hostname/TLS/auth/readback checks without printing credentials."""
from pathlib import Path
import http.client,ssl,socket,base64,json,datetime,hashlib,urllib.request,subprocess
ROOT=Path(str(__import__('pathlib').Path(__file__).resolve().parents[1] / ''));HOST='demo.rovicrm.com';IP='72.62.100.235'

def request(path,headers=None,method='GET',body=None):
 connection=http.client.HTTPSConnection(HOST,443,timeout=20,context=ssl.create_default_context())
 connection._create_connection=lambda addr,*args,**kwargs:socket.create_connection((IP,addr[1]),*args,**kwargs)
 try:
  connection.request(method,path,body=body,headers=headers or {})
  response=connection.getresponse();result=(response.status,dict(response.getheaders()),response.read())
  return result
 finally:connection.close()

status,headers,body=request('/');assert status==303 and headers['Location']=='/access'
status,headers,body=request('/access');assert status==401 and 'Set-Cookie' not in headers
status,headers,body=request('/demo/',{'Cookie':'rovi_demo_access=forged'});assert status==303
wrong='Basic '+base64.b64encode(b'provisa:incorrect-verification-password').decode()
status,headers,body=request('/access',{'Authorization':wrong});assert status==401 and 'Set-Cookie' not in headers
lines=Path('/root/.config/rovi-provisa-demo-access.txt').read_text().splitlines()
user,password=[line.split(': ',1)[1] for line in lines]
auth='Basic '+base64.b64encode((user+':'+password).encode()).decode()
status,headers,body=request('/access',{'Authorization':auth});assert status==200
cookie_header=headers['Set-Cookie'];assert all(s in cookie_header for s in ['Secure','HttpOnly','SameSite=Lax','Max-Age=28800'])
cookie=cookie_header.split(';',1)[0]
assets={}
for rel in ['index.html','app.mjs','core.mjs','style.css','guion.html','onboarding.html','recorrido.webm']:
 status,headers,body=request('/demo/'+rel,{'Cookie':cookie})
 assert status==200 and body==(ROOT/'public'/rel).read_bytes(),rel
 assets[rel]={'http':status,'sha256':hashlib.sha256(body).hexdigest()}
status,headers,body=request('/api/demo/enter',{'Cookie':cookie,'Content-Type':'application/json'},'POST',b'{"role":"manager"}')
assert status==200
token=json.loads(body)['access_token']
status,headers,body=request('/api/demo/state',{'Cookie':cookie,'Authorization':'Bearer '+token});assert status==200
state=json.loads(body);assert len(state['leads'])==2 and not state['events']
status,headers,body=request('/api/campaigns/demo/start',{'Cookie':cookie,'Authorization':'Bearer '+token,'Content-Type':'application/json'},'POST',b'{}');assert status==403
key=Path('/root/.config/hostinger.token').read_text().strip()
req=urllib.request.Request('https://developers.hostinger.com/api/dns/v1/zones/rovicrm.com',headers={'Authorization':'Bearer '+key,'Accept':'application/json','User-Agent':'ROVI-Demo-Setup/1.0'})
after=json.load(urllib.request.urlopen(req,timeout=20));before=json.loads((ROOT/'evidence/dns-rovicrm-before.json').read_text());assert all(row in after for row in before)
assert any(row.get('name')=='demo' and row.get('type')=='A' and any(r.get('content')==IP for r in row['records']) for row in after)
resolvers={}
for resolver in ['1.1.1.1','8.8.8.8','solar.dns-parking.com','lunar.dns-parking.com']:
 answer=subprocess.check_output(['dig','@'+resolver,'+short','A',HOST],timeout=15).decode().strip().splitlines()
 assert IP in answer,(resolver,answer)
 resolvers[resolver]=answer
network=json.loads(subprocess.check_output(['docker','network','inspect','rovi-provisa-demo_demo']))[0];assert network['Internal']
for name in ['mongo','backend','frontend']:
 container=json.loads(subprocess.check_output(['docker','inspect','rovi-provisa-demo-'+name+'-1']))[0]
 assert container['State']['Running'] and set(container['NetworkSettings']['Networks'])=={'rovi-provisa-demo_demo'}
assert not subprocess.check_output(['git','-C','/root/apps/rovi-zamna-mvp/src','status','--porcelain']).strip()
result={'url':'https://'+HOST+'/','timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS','tls_validation':True,'tls_routing':'Explicit public IP with original hostname/SNI; no certificate bypass','dns':resolvers,'existing_dns_record_groups_preserved':len(before),'unauthenticated_login_challenge':True,'wrong_password_rejected':True,'forged_cookie_rejected':True,'cookie_flags_verified':True,'crm_bearer_preserved':True,'external_action_denied':True,'core_docker_network_still_internal':True,'baseline_leads':len(state['leads']),'baseline_events':len(state['events']),'assets':assets}
(ROOT/'evidence/public-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in result.items() if k not in ['assets','dns']},ensure_ascii=False,indent=2))
