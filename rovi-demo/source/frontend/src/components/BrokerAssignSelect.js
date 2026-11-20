// BUG-013: selector de broker asignado (usa GET /api/brokers y el campo existente assigned_broker_id).
// owner/admin/manager/rovi_admin eligen del roster; el broker solo ve el texto (se asigna a sí mismo).
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export const LEAD_ASSIGN_MANAGER_ROLES = ['owner', 'admin', 'manager', 'rovi_admin'];

export const useCanAssignLeads = () => {
  const { user } = useAuth();
  const role = user?.active_workspace?.role || user?.role;
  return LEAD_ASSIGN_MANAGER_ROLES.includes(role);
};

export const BrokerAssignSelect = ({ api, value, onChange, disabled = false, currentName, testId = 'broker-assign-select', mode = 'create' }) => {
  const { user } = useAuth();
  const canAssign = useCanAssignLeads();
  const [brokers, setBrokers] = useState([]);

  useEffect(() => {
    if (!canAssign) return undefined;
    let cancelled = false;
    api.get('/brokers')
      .then((res) => { if (!cancelled) setBrokers(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (!cancelled) setBrokers([]); });
    return () => { cancelled = true; };
  }, [api, canAssign]);

  if (!canAssign) {
    // BUG-017: el texto refleja lo que hace el backend. Solo el broker se autoasigna al
    // crear; otros roles sin permiso de asignar (p. ej. property_manager) crean sin asignar.
    const role = user?.active_workspace?.role || user?.role;
    const emptyLabel = role === 'broker' && mode === 'create' ? 'Se asignará a ti al guardar' : 'Sin asignar';
    const label = value
      ? (value === user?.id ? `${currentName || user?.name || 'Tú'} (tú)` : (currentName || 'Otro broker'))
      : emptyLabel;
    return <div className="p-3 bg-muted/50 rounded-lg text-sm" data-testid={`${testId}-readonly`}>{label}</div>;
  }

  const active = brokers.filter((b) => b.membership_status !== 'suspended' && b.is_active !== false);
  return (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)} disabled={disabled}>
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder="Sin asignar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin asignar</SelectItem>
        {active.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name || b.email} {b.workspace_role && b.workspace_role !== 'broker' ? `· ${b.workspace_role}` : ''}
          </SelectItem>
        ))}
        {value && !active.some((b) => b.id === value) && (
          <SelectItem value={value}>{currentName || value}</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

export default BrokerAssignSelect;
