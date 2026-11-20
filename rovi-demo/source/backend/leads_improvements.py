"""
LEADS IMPROVEMENTS - ROVI CRM
Implementación de mejoras para Semana 1

Tasks:
1. Validación de email/phone únicos
2. Filtros avanzados con debounce
3. Búsqueda en tiempo real
4. Bulk operations
5. DELETE endpoint
"""

from fastapi import HTTPException, Depends, Query, status as http_status
from typing import List, Optional
from datetime import datetime, timezone
from models import LeadCreate, LeadUpdate, LeadStatus, LeadPriority
from auth import get_current_user


# BUG-008: vista de "leads activos" para dashboard/estadísticas: excluye deleted=true
# en find/find_one/count_documents y antepone un $match en aggregate. Solo lectura.
NOT_DELETED = {"deleted": {"$ne": True}}


def _with_not_deleted(filter_doc):
    query = dict(filter_doc or {})
    if "deleted" not in query:
        query["deleted"] = {"$ne": True}
    return query


class _ActiveLeads:
    """Vista de solo lectura: excluye soft-delete y, opcionalmente, aplica un alcance
    extra (BUG-012: alcance del broker) a find/find_one/count_documents/aggregate."""

    def __init__(self, collection, scope: Optional[dict] = None):
        self._collection = collection
        self._scope = dict(scope) if scope else None

    def _q(self, filter_doc):
        query = _with_not_deleted(filter_doc)
        if self._scope:
            query["$and"] = list(query.get("$and", [])) + [self._scope]
        return query

    def find(self, filter=None, *args, **kwargs):
        return self._collection.find(self._q(filter), *args, **kwargs)

    async def find_one(self, filter=None, *args, **kwargs):
        return await self._collection.find_one(self._q(filter), *args, **kwargs)

    async def count_documents(self, filter=None, *args, **kwargs):
        return await self._collection.count_documents(self._q(filter), *args, **kwargs)

    def distinct(self, key, filter=None, *args, **kwargs):
        return self._collection.distinct(key, self._q(filter), *args, **kwargs)

    def aggregate(self, pipeline, *args, **kwargs):
        return self._collection.aggregate([{"$match": self._q(None)}] + list(pipeline), *args, **kwargs)


def active_leads(db, scope: Optional[dict] = None):
    return _ActiveLeads(db.leads, scope)


# BUG-012: alcance de leads por rol. owner/admin/manager/rovi_admin ven todo el workspace;
# broker solo los leads asignados a él o creados por él. Otros roles conservan el
# comportamiento previo (el contrato de property_manager está pendiente de definir).
LEAD_SCOPED_ROLES = {"broker"}


def lead_scope_filter(current_user: dict) -> dict:
    role = current_user.get("active_role") or current_user.get("role") or "broker"
    if role in LEAD_SCOPED_ROLES:
        uid = current_user.get("user_id")
        return {"$or": [{"assigned_broker_id": uid}, {"created_by": uid}]}
    return {}


def is_lead_scoped(current_user: dict) -> bool:
    return bool(lead_scope_filter(current_user))


def scoped_leads(db, current_user: dict):
    """active_leads + alcance del rol (broker: asignados a él o creados por él)."""
    return _ActiveLeads(db.leads, lead_scope_filter(current_user) or None)


def scoped_lead_query(base: dict, current_user: dict) -> dict:
    """Agrega el alcance del rol a una consulta de leads sin pisar otros $or."""
    scope = lead_scope_filter(current_user)
    if not scope:
        return base
    query = dict(base)
    query["$and"] = list(query.get("$and", [])) + [scope]
    return query


async def validate_lead_unique_fields(db, lead_data: dict, tenant_id: str, exclude_lead_id: str = None):
    """
    Validar que email y phone del lead sean únicos dentro del tenant
    """
    errors = []

    email = lead_data.get("email")
    phone = lead_data.get("phone")

    # Build query
    query = {"tenant_id": tenant_id}

    if exclude_lead_id:
        query["_id"] = {"$ne": exclude_lead_id}

    # Check email uniqueness
    if email:
        email_query = query.copy()
        email_query["email"] = email
        existing_email = await db.leads.find_one(email_query)
        if existing_email:
            errors.append({"field": "email", "message": "Email ya registrado en otro lead"})

    # Check phone uniqueness
    if phone:
        phone_query = query.copy()
        phone_query["phone"] = phone
        existing_phone = await db.leads.find_one(phone_query)
        if existing_phone:
            errors.append({"field": "phone", "message": "Teléfono ya registrado en otro lead"})

    if errors:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail={"message": "Validación fallida", "errors": errors}
        )

    return {"valid": True}


async def get_leads_advanced_filters(
    db,
    tenant_id: str,
    current_user: dict,
    status: Optional[List[LeadStatus]] = Query(None),
    priority: Optional[List[LeadPriority]] = Query(None),
    operation_type: Optional[str] = None,
    pipeline_type: Optional[str] = None,
    source: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,  # Búsqueda en tiempo real
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 50
):
    """
    Get leads con filtros avanzados y búsqueda en tiempo real
    Incluye debounce logic (implementado en frontend)
    """
    try:
        # Build query
        # BUG-002: excluir leads con soft-delete de las consultas normales
        query = {"tenant_id": tenant_id, "deleted": {"$ne": True}}

        # Filtros de status (múltiples)
        if status:
            query["status"] = {"$in": [s.value for s in status]}

        # Filtros de priority (múltiples)
        if priority:
            query["priority"] = {"$in": [p.value for p in priority]}

        if operation_type:
            query["operation_type"] = operation_type

        if pipeline_type:
            query["pipeline_type"] = pipeline_type

        # Filtro de source
        if source:
            query["source"] = source

        # Filtro de rango de fechas
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            query["created_at"] = date_query

        # Búsqueda en tiempo real (full-text search)
        if search:
            # Buscar en múltiples campos
            search_query = {
                "$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}},
                    {"phone": {"$regex": search, "$options": "i"}},
                    {"property": {"$regex": search, "$options": "i"}},
                    {"notes": {"$regex": search, "$options": "i"}}
                ]
            }
            query.update(search_query)

        # BUG-012: alcance por rol (broker solo ve lo suyo)
        query = scoped_lead_query(query, current_user)

        # Count total
        total = await db.leads.count_documents(query)

        # Sorting
        sort_order_int = -1 if sort_order == "desc" else 1
        sort_spec = [(sort_by, sort_order_int)]

        # Pagination
        skip = (page - 1) * page_size

        # Execute query
        cursor = db.leads.find(query).sort(sort_spec).skip(skip).limit(page_size)
        leads = await cursor.to_list(length=page_size)

        return {
            "leads": leads,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener leads: {str(e)}"
        )


async def delete_lead(db, lead_id: str, current_user: dict):
    """
    Soft delete de un lead (marca como deleted)
    Previene pérdida de datos accidental
    """
    try:
        # Verificar que el lead existe y pertenece al tenant
        lead = await db.leads.find_one(scoped_lead_query({
            "id": lead_id,
            "tenant_id": current_user["tenant_id"],
            "deleted": {"$ne": True},
        }, current_user))  # BUG-012

        if not lead:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Lead no encontrado"
            )

        # Soft delete
        await db.leads.update_one(
            {"id": lead_id},
            {
                "$set": {
                    "deleted": True,
                    "deleted_at": datetime.now(timezone.utc),
                    "deleted_by": current_user["user_id"]
                }
            }
        )

        return {"message": "Lead eliminado correctamente", "lead_id": lead_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar lead: {str(e)}"
        )


async def bulk_update_leads_status(
    db,
    lead_ids: List[str],
    new_status: LeadStatus,
    current_user: dict
):
    """
    Bulk update: actualizar status de múltiples leads
    """
    try:
        # Verificar que todos los leads pertenecen al tenant
        leads = await db.leads.find(scoped_lead_query({
            "id": {"$in": lead_ids},
            "tenant_id": current_user["tenant_id"],
            "deleted": {"$ne": True},
        }, current_user)).to_list(None)  # BUG-012

        if len(leads) != len(lead_ids):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Algunos leads no existen. Encontrados: {len(leads)}, Solicitados: {len(lead_ids)}"
            )

        # Actualizar todos
        result = await db.leads.update_many(
            {
                "id": {"$in": lead_ids},
                "tenant_id": current_user["tenant_id"]
            },
            {
                "$set": {
                    "status": new_status.value,
                    "status_updated_at": datetime.now(timezone.utc),
                    "status_updated_by": current_user["user_id"]
                }
            }
        )

        return {
            "message": "Status actualizado correctamente",
            "updated_count": result.modified_count
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en bulk update: {str(e)}"
        )


async def bulk_delete_leads(db, lead_ids: List[str], current_user: dict):
    """
    Bulk delete: soft delete de múltiples leads
    """
    try:
        # Verificar que todos los leads pertenecen al tenant
        leads = await db.leads.find(scoped_lead_query({
            "id": {"$in": lead_ids},
            "tenant_id": current_user["tenant_id"],
            "deleted": {"$ne": True},
        }, current_user)).to_list(None)  # BUG-012

        if len(leads) != len(lead_ids):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Algunos leads no existen. Encontrados: {len(leads)}, Solicitados: {len(lead_ids)}"
            )

        # Soft delete todos
        result = await db.leads.update_many(
            {
                "id": {"$in": lead_ids},
                "tenant_id": current_user["tenant_id"]
            },
            {
                "$set": {
                    "deleted": True,
                    "deleted_at": datetime.now(timezone.utc),
                    "deleted_by": current_user["user_id"]
                }
            }
        )

        return {
            "message": "Leads eliminados correctamente",
            "deleted_count": result.modified_count
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en bulk delete: {str(e)}"
        )
