"""Private PROVISA adapter. Import guard runs BEFORE CRM/Mongo imports.

No production configuration, credentials, generic seed, or alternate lead store.
"""
import os
from demo_scenario import (assert_demo_environment, route_allowed, scenario_documents,
                           TENANT, OTHER_TENANT, USER_IDS, SCENARIO, CAMPAIGN, VERSION)
assert_demo_environment(os.environ)

import asyncio
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field, ConfigDict
from pymongo.errors import DuplicateKeyError
import server
from auth import decode_token, get_current_user, create_access_token, create_refresh_token, JWT_EXPIRATION_MINUTES
from models import TokenResponse, UserResponse, LeadCreate
from leads_improvements import scoped_lead_query
from tasks import visible_task_query

app = server.app
db = server.db
_lock = asyncio.Lock()


def guard():
    assert_demo_environment(os.environ)
    if db.name != 'provisa_demo' or server.mongo_url != os.environ['MONGO_URL']:
        raise RuntimeError('Demo database identity mismatch')


async def seed_synthetic():
    guard()
    docs = scenario_documents()
    for collection, rows in docs.items():
        for row in rows:
            row = dict(row)
            if collection == 'users':
                # Login remains the real CRM endpoint; no published shared passwords.
                row['password_hash'] = server.get_password_hash(secrets.token_urlsafe(24))
            await db[collection].update_one({'id': row['id']}, {'$setOnInsert': row}, upsert=True)
    await db.demo_meta.update_one({'_id': 'scenario'}, {'$set': {'version': VERSION, 'tenant_id': TENANT}}, upsert=True)
    await db.demo_intake.create_index([('tenant_id', 1), ('key_hash', 1)], unique=True)


@app.on_event('startup')
async def initialize_demo():
    guard()
    await db.command('ping')
    async with _lock:
        await seed_synthetic()


async def validate_session(current_user):
    tenant = current_user.get('active_tenant_id') or current_user.get('tenant_id')
    uid = current_user.get('user_id')
    if tenant not in (TENANT, OTHER_TENANT) or uid not in USER_IDS.values():
        raise HTTPException(403, 'Session outside synthetic sandbox')
    user = await db.users.find_one({'id': uid, 'tenant_id': tenant, 'is_active': True}, {'_id': 0})
    membership = await db.tenant_memberships.find_one({'user_id': uid, 'tenant_id': tenant, 'status': 'active'}, {'_id': 0})
    if not user or not membership or membership['role'] != current_user['role']:
        raise HTTPException(403, 'Inactive synthetic sandbox membership')
    return current_user


async def demo_user(current_user: dict = Depends(get_current_user)):
    return await validate_session(current_user)


@app.middleware('http')
async def demo_boundary(request: Request, call_next):
    try:
        guard()
        path = request.url.path
        if not route_allowed(request.method, path):
            return JSONResponse({'detail': 'Disabled in private sandbox', 'code': 'demo_route_disabled'}, status_code=403)
        public = {'/api/demo/info', '/api/demo/enter', '/api/auth/login', '/api/auth/refresh', '/api/health', '/api', '/api/'}
        if path not in public:
            header = request.headers.get('authorization', '')
            if not header.lower().startswith('bearer '):
                raise HTTPException(401, 'Sandbox authentication required')
            payload = decode_token(header.split(' ', 1)[1])
            if payload.get('type') != 'access':
                raise HTTPException(401, 'Access token required')
            await validate_session({'user_id': payload.get('sub'),
                                    'tenant_id': payload.get('active_tenant_id') or payload.get('tenant_id'),
                                    'role': payload.get('active_role') or payload.get('role')})
        return await call_next(request)
    except HTTPException as exc:
        return JSONResponse({'detail': exc.detail}, status_code=exc.status_code)
    except RuntimeError:
        return JSONResponse({'detail': 'Sandbox guard failed', 'code': 'demo_guard_failed'}, status_code=503)


class RejectDemoWebSockets:
    """HTTP middleware alone does not protect original websocket routes."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'websocket':
            await send({'type': 'websocket.close', 'code': 1008, 'reason': 'Disabled in private sandbox'})
            return
        await self.app(scope, receive, send)


app.add_middleware(RejectDemoWebSockets)


class EnterRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    role: Literal['manager', 'broker_a', 'broker_b', 'other']


class ResetRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    confirm: str


class IntakeRequest(BaseModel):
    # Explicitly ignore names/contact details: this demo never collects real PII.
    model_config = ConfigDict(extra='ignore')
    idempotency_key: str = Field(default='demo-meta-form-1', min_length=1, max_length=128, pattern=r'^[A-Za-z0-9_-]+$')
    purpose: Literal['Comprar para vivir', 'Evaluar inversión', 'Información inicial'] = 'Comprar para vivir'


@app.get('/api/demo/info')
async def demo_info():
    return {'sandbox': True, 'name': 'PROVISA — demostración privada', 'synthetic_only': True,
            'communications_enabled': False, 'ai_enabled': False, 'external_integrations_enabled': False,
            'roles': ['manager', 'broker_a', 'broker_b'], 'reset_confirmation': 'RESET_DEMO_PROVISA',
            'scenario_version': VERSION, 'campaign': CAMPAIGN,
            'notice': 'Datos, personas e inmuebles ficticios. No se envían mensajes ni se ejecuta IA.'}


@app.post('/api/demo/enter', response_model=TokenResponse)
async def demo_enter(body: EnterRequest):
    guard()
    user = await db.users.find_one({'id': USER_IDS[body.role]}, {'_id': 0})
    if not user:
        raise HTTPException(503, 'Synthetic initialization not ready')
    workspaces = await server.get_user_workspaces(user)
    active = server.select_active_workspace(workspaces, user['tenant_id'])
    access = create_access_token(server.build_access_token_payload(user, active))
    jti, refresh = create_refresh_token({'sub': user['id'], 'tenant_id': user['tenant_id'],
                                        'active_tenant_id': active['tenant_id'], 'active_membership_id': active['membership_id'],
                                        'active_role': active['role'], 'account_type': user['account_type']})
    now = datetime.now(timezone.utc)
    await db.refresh_tokens.insert_one({'jti': jti, 'user_id': user['id'], 'tenant_id': user['tenant_id'],
                                       'created_at': now.isoformat(), 'expires_at': (now + timedelta(days=7)).isoformat(),
                                       'revoked': False, 'used': False})
    return TokenResponse(access_token=access, refresh_token=refresh, token_type='bearer',
                         expires_in=JWT_EXPIRATION_MINUTES * 60,
                         user=UserResponse(**server.build_user_response_payload(user)),
                         active_workspace=active, available_workspaces=workspaces)


@app.get('/api/demo/state')
async def demo_state(user: dict = Depends(demo_user)):
    tenant = user['tenant_id']
    manager = user['role'] == 'manager' and tenant == TENANT
    query = scoped_lead_query({'tenant_id': tenant, 'deleted': {'$ne': True}}, user)
    leads = await db.leads.find(query, {'_id': 0}).sort('created_at', 1).to_list(None)
    visible_ids = {lead['id'] for lead in leads}
    events_query = {'tenant_id': tenant}
    if not manager:
        events_query['user_id'] = user['user_id']
    events = await db.calendar_events.find(events_query, {'_id': 0}).sort('start_time', 1).to_list(None)
    # Never reveal lead references that the caller cannot read through native CRM scope.
    events = [e for e in events if not e.get('lead_id') or e['lead_id'] in visible_ids]
    tasks = await db.tasks.find(visible_task_query(user), {'_id': 0}).to_list(None)
    tasks = [t for t in tasks if not t.get('lead_id') or t['lead_id'] in visible_ids]
    products = await db.products.find({'tenant_id': tenant, 'is_active': True}, {'_id': 0}).to_list(None)
    by_stage, by_source = {}, {}
    for lead in leads:
        stage, source = lead.get('status') or 'nuevo', lead.get('source') or 'unknown'
        by_stage[stage] = by_stage.get(stage, 0) + 1
        by_source[source] = by_source.get(source, 0) + 1
    scenario = dict(SCENARIO) if manager else {}
    if not manager and SCENARIO['lead_id'] in visible_ids:
        scenario = {'lead_id': SCENARIO['lead_id'], 'property_id': SCENARIO['property_id'], 'broker_a_id': user['user_id']} if user['user_id'] == USER_IDS['broker_a'] else {'lead_id': SCENARIO['lead_id'], 'property_id': SCENARIO['property_id']}
    return jsonable_encoder({'sandbox': True, 'tenant_id': tenant, 'role': user['role'], 'user_id': user['user_id'],
                             'scenario': scenario, 'leads': leads, 'events': events, 'tasks': tasks,
                             'properties': products, 'stages': ['nuevo', 'contactado', 'calificacion', 'presentacion', 'apartado', 'venta', 'perdido'],
                             'metrics': {'total_leads': len(leads), 'by_stage': by_stage, 'assigned': sum(bool(l.get('assigned_broker_id')) for l in leads),
                                         'visits': sum(e.get('event_type') == 'visita' for e in events), 'by_source': by_source},
                             'status': {'communications': 'disabled', 'ai': 'disabled', 'data': 'synthetic'},
                             'metrics_note': 'Conteos actuales de registros visibles. Una cita no cambia la etapa ni registra contacto automáticamente.'})


@app.post('/api/demo/reset')
async def demo_reset(body: ResetRequest, user: dict = Depends(demo_user)):
    guard()
    if user['role'] != 'manager' or user['user_id'] != USER_IDS['manager'] or user['tenant_id'] != TENANT:
        raise HTTPException(403, 'Only synthetic PROVISA manager can reset')
    if body.confirm != 'RESET_DEMO_PROVISA':
        raise HTTPException(400, 'Exact reset confirmation required')
    async with _lock:
        # Fixed scoped collections ONLY; never drop a DB and never touch demo-other.
        for collection in ('leads', 'products', 'activities', 'calendar_events', 'tasks', 'task_comments', 'lead_product_interests', 'quotations', 'point_ledger', 'demo_intake'):
            await db[collection].delete_many({'tenant_id': TENANT})
        await seed_synthetic()
        remaining = await db.leads.count_documents({'tenant_id': TENANT, 'deleted': {'$ne': True}})
        if remaining != 2:
            raise HTTPException(500, 'Reset verification failed')
    return {'reset': True, 'tenant_id': TENANT, 'scenario': SCENARIO, 'total_leads': remaining}


@app.post('/api/demo/intake')
async def demo_intake(body: IntakeRequest, user: dict = Depends(demo_user)):
    guard()
    if user['tenant_id'] != TENANT:
        raise HTTPException(403, 'Intake only available in PROVISA sandbox')
    key_hash = hashlib.sha256(body.idempotency_key.encode()).hexdigest()
    selector = {'tenant_id': TENANT, 'key_hash': key_hash}
    # Native creator scoping must not permit one broker to replay another's lead.
    async with _lock:
        previous = await db.demo_intake.find_one(selector)
        if previous and previous.get('created_by') != user['user_id'] and user['role'] != 'manager':
            raise HTTPException(409, 'Idempotency key belongs to another sandbox session')
        marker = {'tenant_id': TENANT, 'custom_fields_data.demo_intake_key': key_hash}
        recovered = await db.leads.find_one(marker, {'_id': 0})
        if recovered:
            if not await db.leads.find_one(scoped_lead_query({'id': recovered['id'], 'tenant_id': TENANT}, user), {'_id': 0, 'id': 1}):
                raise HTTPException(409, 'Idempotency result not visible to this session')
            await db.demo_intake.update_one(selector, {'$set': {'lead_id': recovered['id'], 'status': 'complete'}}, upsert=True)
            return {'lead_id': recovered['id'], 'replayed': True, 'lead': recovered}
        if previous:
            # A crashed/in-progress request is never blindly repeated; reset is recovery.
            raise HTTPException(409, 'Intake pending or removed; reset sandbox before retrying')
        try:
            await db.demo_intake.insert_one({**selector, 'created_by': user['user_id'], 'status': 'pending'})
        except DuplicateKeyError:
            raise HTTPException(409, 'Intake already in progress; retry state')
        # Zero-area synthetic number, never a provided contact. All opt-outs forced.
        suffix = str(int(key_hash[:10], 16) % 10000000).zfill(7)
        payload = LeadCreate(name='Valeria Demo', phone='+52 000 ' + suffix[:3] + ' ' + suffix[3:],
                             email='intake-' + key_hash[:16] + '@demo.example.com', source='demo_meta', status='nuevo', priority='alta',
                             budget_mxn=0, property_interest='Departamento Demo Playa Centro — FICTICIO', preferred_zone='Playa Centro — demo',
                             notes='Captación sintética. No contactar. Sin integración Meta real.',
                             email_opt_out=True, sms_opt_out=True, whatsapp_opt_out=True, call_opt_out=True,
                             tags=['demo', 'sintetico'], custom_fields_data={**CAMPAIGN, 'demo_intake_key': key_hash, 'next_action_at': None, 'finalidad': body.purpose})
        # The existing route function applies native validation, assignment, persistence and realtime events.
        result = await server.create_lead(payload, user)
        lead = await db.leads.find_one({'id': result['id'], 'tenant_id': TENANT}, {'_id': 0})
        if not lead:
            raise HTTPException(500, 'CRM intake persistence verification failed')
        await db.demo_intake.update_one(selector, {'$set': {'lead_id': lead['id'], 'status': 'complete'}})
        return jsonable_encoder({'lead_id': lead['id'], 'replayed': False, 'lead': lead})
