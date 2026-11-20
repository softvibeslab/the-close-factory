// BUG-005 · Fase A: Cotizaciones en modo solo lectura (lista + detalle).
// Crear/editar/PDF (Fase B) NO está incluido en el piloto.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Receipt, Search } from 'lucide-react';

export const QUOTATION_STATUS_LABELS = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
};

export const formatMXN = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const QuotationStatusBadge = ({ status }) => (
  <Badge variant={status === 'aceptada' ? 'default' : 'secondary'}>
    {QUOTATION_STATUS_LABELS[status] || status || 'Sin estado'}
  </Badge>
);

const errorMessage = (error, fallback) => (
  error?.response?.status === 403
    ? 'Tu rol no tiene acceso a cotizaciones.'
    : (typeof error?.response?.data?.detail === 'string' ? error.response.data.detail : fallback)
);

export const QuotationsPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/quotations');
        if (!cancelled) setQuotations(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'No se pudieron cargar las cotizaciones'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  const statuses = useMemo(() => Array.from(new Set(quotations.map((q) => q.status).filter(Boolean))), [quotations]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotations.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (!term) return true;
      return [q.title, q.lead?.name, q.created_by_name].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [quotations, search, statusFilter]);
  const total = filtered.reduce((acc, q) => acc + (Number(q.amount_mxn) || 0), 0);

  return (
    <div className="space-y-6 p-6" data-testid="quotations-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-6 h-6" /> Cotizaciones</h1>
          <p className="text-sm text-muted-foreground">Consulta de cotizaciones del workspace (solo lectura en el piloto).</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{filtered.length} cotizaciones</div>
          <div className="text-lg font-semibold">{formatMXN(total)}</div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por título, lead o broker" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} className="rounded-full" onClick={() => setStatusFilter('all')}>Todas</Button>
            {statuses.map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} className="rounded-full" onClick={() => setStatusFilter(s)}>
                {QUOTATION_STATUS_LABELS[s] || s}
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando cotizaciones…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cotizaciones para mostrar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cotización</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)} data-testid={`quotation-row-${q.id}`}>
                    <TableCell className="font-medium">{q.title || q.id}</TableCell>
                    <TableCell>{q.lead?.name || '—'}</TableCell>
                    <TableCell className="text-right">{formatMXN(q.amount_mxn)}</TableCell>
                    <TableCell><QuotationStatusBadge status={q.status} /></TableCell>
                    <TableCell>{formatDate(q.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const QuotationDetailPage = () => {
  const { api } = useAuth();
  const { quotationId } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/quotations/${encodeURIComponent(quotationId)}`);
        if (!cancelled) setQuotation(res.data);
      } catch (err) {
        if (!cancelled) setError(err?.response?.status === 404 ? 'Cotización no encontrada' : errorMessage(err, 'No se pudo cargar la cotización'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, quotationId]);

  return (
    <div className="space-y-6 p-6" data-testid="quotation-detail-page">
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link to="/quotations"><ArrowLeft className="w-4 h-4 mr-1" /> Cotizaciones</Link>
      </Button>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : quotation ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{quotation.title || quotation.id}</CardTitle>
                <CardDescription>Folio {quotation.id}{quotation.is_demo ? ' · demo' : ''}</CardDescription>
              </div>
              <QuotationStatusBadge status={quotation.status} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">Monto</div>
              <div className="text-2xl font-semibold">{formatMXN(quotation.amount_mxn)}</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">Lead</div>
              <div className="font-medium">{quotation.lead?.name || '—'}</div>
              {quotation.lead?.status && <div className="text-xs text-muted-foreground">Etapa: {quotation.lead.status}</div>}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">Creada por</div>
              <div className="font-medium">{quotation.created_by_name || '—'}</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">Fecha</div>
              <div className="font-medium">{formatDate(quotation.created_at)}</div>
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Vista de solo lectura. Crear, editar o generar PDF de cotizaciones no está incluido en el piloto.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

// Tarjeta para el detalle del lead: cotizaciones vinculadas (solo lectura).
// Si el rol no tiene acceso (403) no se muestra nada.
export const LeadQuotationsCard = ({ api, leadId }) => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!leadId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/quotations?lead_id=${encodeURIComponent(leadId)}`);
        if (!cancelled) { setQuotations(Array.isArray(res.data) ? res.data : []); setHidden(false); }
      } catch (err) {
        if (!cancelled) { setQuotations([]); setHidden(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, leadId]);

  if (hidden) return null;
  return (
    <div className="space-y-2" data-testid="lead-quotations-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2"><Receipt className="w-4 h-4" /> Cotizaciones</span>
        <Badge variant="outline">{quotations.length}</Badge>
      </div>
      <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : quotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este lead no tiene cotizaciones.</p>
        ) : (
          quotations.map((q) => (
            <Link key={q.id} to={`/quotations/${q.id}`} className="flex items-center justify-between gap-3 rounded-md bg-card/70 p-2 hover:bg-muted">
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{q.title || q.id}</span>
                {/* BUG-009: fecha de la cotización */}
                <span className="block text-xs text-muted-foreground">{formatDate(q.created_at)}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-sm">{formatMXN(q.amount_mxn)}</span>
                <QuotationStatusBadge status={q.status} />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default QuotationsPage;
