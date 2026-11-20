"""Pure safety policy and deterministic, entirely synthetic demo fixtures."""
from urllib.parse import urlsplit

TENANT = 'demo-provisa'
OTHER_TENANT = 'demo-other'
VERSION = 1


def route_allowed(method, path):
    import re
    # Positive allowlist: no broad integration/AI/campaign namespace exceptions.
    rules = {
        'GET': [r'/api/?', r'/api/health', r'/api/demo/(info|state)',
                r'/api/auth/(me|workspaces)', r'/api/leads(?:/tags|/[^/]+|/[^/]+/interests)?',
                r'/api/products(?:/[^/]+)?', r'/api/calendar/(events|today)',
                r'/api/dashboard/[a-z-]+(?:/[^/]+)?', r'/api/brokers(?:/[^/]+)?',
                r'/api/activities', r'/api/tasks(?:/[^/]+)?', r'/api/custom-fields', r'/api/gamification/rules'],
        'POST': [r'/api/demo/(enter|intake|reset)', r'/api/auth/(login|logout|refresh)',
                 r'/api/leads', r'/api/calendar/events', r'/api/activities', r'/api/tasks',
                 r'/api/lead-product-interests', r'/api/products', r'/api/tasks/[^/]+/comments'],
        'PUT': [r'/api/tasks/[^/]+/status',r'/api/leads/[^/]+', r'/api/calendar/events/[^/]+', r'/api/tasks/[^/]+', r'/api/products/[^/]+', r'/api/lead-product-interests/[^/]+'],
        'PATCH': [r'/api/tasks/[^/]+/status'],
        'DELETE': [r'/api/leads/[^/]+', r'/api/calendar/events/[^/]+', r'/api/tasks/[^/]+', r'/api/products/[^/]+'],
    }
    if path.startswith('/api/products/location/'):
        return False
    return any(re.fullmatch(pattern, path) for pattern in rules.get(method, []))

USER_IDS = {'manager': 'demo-manager', 'broker_a': 'demo-broker-a', 'broker_b': 'demo-broker-b', 'other': 'demo-other-user'}
SCENARIO = {'lead_id': 'demo-mariana', 'followup_lead_id': 'demo-followup', 'property_id': 'demo-property', 'broker_a_id': USER_IDS['broker_a'], 'broker_b_id': USER_IDS['broker_b']}
CAMPAIGN = {'campaign_id': 'META_RIVIERA_DEPTO_DEMO', 'utm_source': 'meta_demo', 'utm_medium': 'paid_social_demo', 'utm_campaign': 'META_RIVIERA_DEPTO_DEMO', 'utm_content': 'demo_form', 'synthetic': True, 'demo': True}
STAMP = '2026-11-19T00:00:00+00:00'


def scenario_documents():
    users, memberships = [], []
    for key, uid in USER_IDS.items():
        tenant = OTHER_TENANT if key == 'other' else TENANT
        role = 'manager' if key == 'manager' else 'broker'
        users.append({'id': uid, 'tenant_id': tenant, 'personal_tenant_id': tenant,
                      'demo_role': key, 'email': key + '@demo.example.com',
                      'name': {'manager': 'Gerente Demo', 'broker_a': 'Broker Demo A', 'broker_b': 'Broker Demo B', 'other': 'Otra Agencia Demo'}[key],
                      'role': role, 'account_type': 'agency' if key == 'manager' else 'individual',
                      'is_active': True, 'onboarding_completed': True, 'created_at': STAMP})
        memberships.append({'id': 'tm-' + uid, 'tenant_id': tenant, 'user_id': uid,
                            'role': role, 'status': 'active', 'is_default': True, 'linked_via': 'demo', 'created_at': STAMP})
    leads = []
    for lid, name, phone, tenant, assigned in [
        ('demo-mariana', 'Mariana Demo', '+52 000 000 0101', TENANT, None),
        ('demo-followup', 'Prospecto Demo Seguimiento', '+52 000 000 0102', TENANT, None),
        ('demo-other-lead', 'Contacto otra agencia (sintético)', '+52 000 000 0103', OTHER_TENANT, USER_IDS['other']),
    ]:
        leads.append({'id': lid, 'name': name, 'phone': phone, 'email': lid + '@demo.example.com',
                      'tenant_id': tenant, 'created_by': USER_IDS['manager'] if tenant == TENANT else USER_IDS['other'],
                      'assigned_broker_id': assigned, 'status': 'nuevo', 'priority': 'alta', 'source': 'demo_meta',
                      'operation_type': 'sale', 'pipeline_type': 'sales', 'budget_mxn': 0,
                      'property_interest': 'Departamento Demo Playa Centro — ficticio', 'interested_product_ids': ['demo-property'] if tenant == TENANT else [],
                      'tags': ['demo', 'sintetico'], 'email_opt_out': True, 'sms_opt_out': True, 'whatsapp_opt_out': True, 'call_opt_out': True,
                      'custom_fields_data': {**CAMPAIGN, 'next_action_at': None}, 'notes': 'Contacto ficticio. No contactar. Sin comunicaciones externas.',
                      'intent_score': 50, 'deleted': False, 'created_at': STAMP, 'updated_at': STAMP})
    return {'users': users, 'tenant_memberships': memberships,
            'tenants': [{'id': t, 'name': 'Inmobiliaria Demo Riviera Maya' if t == TENANT else 'Otra agencia — prueba', 'slug': t,
                         'tenant_type': 'agency', 'owner_user_id': USER_IDS['manager'] if t == TENANT else USER_IDS['other'], 'is_active': True, 'created_at': STAMP} for t in (TENANT, OTHER_TENANT)],
            'leads': leads,
            'products': [{'id': 'demo-property', 'tenant_id': TENANT, 'created_by': USER_IDS['manager'],
                          'sku': 'DEMO-PLAYA-001', 'title': 'Departamento Demo Playa Centro — FICTICIO', 'description': 'Inmueble sintético para demostración; precio ficticio, no es una oferta real.',
                          'product_type': 'real_estate', 'niche': 'Residencial', 'operation_type': 'sale', 'price_mxn': 2800000,
                          'commission_percentage': 0, 'is_active': True, 'features': ['2 recámaras', '2 baños', '100 m² — ficticio'],
                          'images': [], 'assigned_brokers': [USER_IDS['broker_a'], USER_IDS['broker_b']], 'assigned_campaigns': [],
                          'custom_fields_data': {'synthetic': True}, 'created_at': STAMP, 'updated_at': STAMP}],
            'tasks': [], 'calendar_events': []}


def assert_demo_environment(env):
    try:
        url = urlsplit(env.get('MONGO_URL', ''))
        valid = (env.get('PROVISA_DEMO') == '1' and env.get('DB_NAME') == 'provisa_demo'
                 and url.scheme == 'mongodb' and url.netloc == 'mongo:27017'
                 and url.path in ('', '/', '/provisa_demo') and not url.query and not url.fragment)
    except ValueError:
        valid = False
    if not valid:
        raise RuntimeError('PROVISA demo requires dedicated provisa_demo at mongodb://mongo:27017')
