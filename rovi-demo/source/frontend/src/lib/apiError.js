// BUG-011: mensaje legible para errores de la API (incluye 422 de FastAPI/Pydantic).
const FIELD_LABELS = {
  name: 'Nombre',
  phone: 'Teléfono',
  email: 'Email',
  budget_mxn: 'Presupuesto',
  assigned_broker_id: 'Broker asignado',
  source: 'Fuente',
  notes: 'Notas',
};

const translateMsg = (msg = '') => {
  if (/valid email address/i.test(msg)) return 'no es un email válido';
  if (/field required/i.test(msg)) return 'es obligatorio';
  if (/valid number/i.test(msg)) return 'debe ser un número';
  return msg.replace(/^Value error,\s*/i, '');
};

export const getApiErrorMessage = (error, fallback = 'Ocurrió un error') => {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((item) => {
        const loc = Array.isArray(item?.loc) ? item.loc.filter((part) => part !== 'body') : [];
        const field = loc.length ? loc[loc.length - 1] : '';
        const label = FIELD_LABELS[field] || field;
        const msg = translateMsg(item?.msg || '');
        return label ? `${label}: ${msg}` : msg;
      })
      .join(' · ');
  }
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') return detail.message;
  if (status === 403) return 'No tienes permisos para esta acción';
  if (status === 404) return 'No encontrado';
  if (!error?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  return fallback;
};

export default getApiErrorMessage;
