import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const STATUS_LABELS = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em atendimento',
  WAITING_USER: 'Aguardando usuário',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const CATEGORIES = ['', 'Hardware', 'Software', 'Rede', 'Acesso/Senha', 'Outros'];
const PRIORITIES = ['', 'Baixa', 'Média', 'Alta', 'Crítica'];
const STATUSES = ['', 'OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'];

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return 'N/A';
  const totalSeconds = Math.round(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(' ');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR');
}

export default function ReportPage() {
  const [reportData, setReportData] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [technicianId, setTechnicianId] = useState('');

  // Fetch technicians for dropdown
  useEffect(() => {
    api.get('/api/users')
      .then(res => {
        const techs = (res.data || []).filter(u => u.role === 'TECHNICIAN');
        setTechnicians(techs);
      })
      .catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (category) params.category = category;
      if (technicianId) params.technician_id = technicianId;

      const res = await api.get('/api/report', { params });
      setReportData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados do relatório.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status, priority, category, technicianId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatus('');
    setPriority('');
    setCategory('');
    setTechnicianId('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatório de Acompanhamento</h1>
          <p className="page-subtitle">Indicadores, produtividade por técnico e histórico de chamados</p>
        </div>
        <button className="btn btn-secondary" onClick={loadReport} disabled={loading}>
          🔄 Atualizar Relatório
        </button>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-header">
          <span className="card-title">Filtros de Pesquisa</span>
          <button className="btn btn-secondary btn-xs" onClick={handleClearFilters}>
            Limpar Filtros
          </button>
        </div>
        <div className="card-body">
          <div className="filters-row" style={{ marginBottom: 0 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Data Início</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Data Fim</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Status</label>
              <select
                className="form-control"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {STATUSES.filter(Boolean).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Prioridade</label>
              <select
                className="form-control"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="">Todas</option>
                {PRIORITIES.filter(Boolean).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Categoria</label>
              <select
                className="form-control"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="">Todas</option>
                {CATEGORIES.filter(Boolean).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Técnico</label>
              <select
                className="form-control"
                value={technicianId}
                onChange={e => setTechnicianId(e.target.value)}
              >
                <option value="">Todos</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">⏳ Processando métricas do relatório...</div>
      ) : reportData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Métricas Principais */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Resumo Geral por Status</h2>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-card-value">{reportData.byStatus?.OPEN || 0}</div>
                <div className="summary-card-label">Abertos</div>
              </div>
              <div className="summary-card">
                <div className="summary-card-value" style={{ color: 'var(--color-warning)' }}>
                  {reportData.byStatus?.IN_PROGRESS || 0}
                </div>
                <div className="summary-card-label">Em Atendimento</div>
              </div>
              <div className="summary-card">
                <div className="summary-card-value" style={{ color: '#d97706' }}>
                  {reportData.byStatus?.WAITING_USER || 0}
                </div>
                <div className="summary-card-label">Aguardando Usuário</div>
              </div>
              <div className="summary-card">
                <div className="summary-card-value" style={{ color: 'var(--color-success)' }}>
                  {reportData.byStatus?.RESOLVED || 0}
                </div>
                <div className="summary-card-label">Resolvidos</div>
              </div>
              <div className="summary-card">
                <div className="summary-card-value" style={{ color: '#64748b' }}>
                  {reportData.byStatus?.CLOSED || 0}
                </div>
                <div className="summary-card-label">Fechados</div>
              </div>
              <div className="summary-card">
                <div className="summary-card-value" style={{ fontSize: 22 }}>
                  {formatDuration(reportData.avgTimeToClose)}
                </div>
                <div className="summary-card-label">Tempo Médio Resolução</div>
              </div>
            </div>
          </div>

          {/* Grids de Prioridade e Categoria */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {/* Por Prioridade */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Chamados por Prioridade</span>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Prioridade</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Crítica', 'Alta', 'Média', 'Baixa'].map(p => (
                        <tr key={p}>
                          <td><span className={`badge badge-${p}`}>{p}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {reportData.byPriority?.[p] || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Por Categoria */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Chamados por Categoria</span>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Hardware', 'Software', 'Rede', 'Acesso/Senha', 'Outros'].map(c => (
                        <tr key={c}>
                          <td style={{ fontWeight: 500 }}>{c}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {reportData.byCategory?.[c] || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Desempenho por Técnico */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Produtividade por Técnico</span>
            </div>
            <div className="table-wrapper">
              {(!reportData.byTechnician || reportData.byTechnician.length === 0) ? (
                <div className="empty-state">
                  <div className="empty-state-title">Nenhum atendimento atribuído registrado no período</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Em Atendimento</th>
                      <th>Fechados</th>
                      <th>Tempo Médio de Fechamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.byTechnician.map(t => {
                      const techAvg = (reportData.avgTimeByTechnician || []).find(
                        x => x.technician_id === t.technician_id
                      );
                      return (
                        <tr key={t.technician_id}>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td>
                            <span className="badge badge-IN_PROGRESS">{t.in_progress}</span>
                          </td>
                          <td>
                            <span className="badge badge-CLOSED">{t.closed}</span>
                          </td>
                          <td>{formatDuration(techAvg?.avg_seconds)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tabela de Chamados Filtrados */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Listagem dos Chamados ({reportData.tickets?.length || 0})</span>
            </div>
            <div className="table-wrapper">
              {(!reportData.tickets || reportData.tickets.length === 0) ? (
                <div className="empty-state">
                  <div className="empty-state-title">Nenhum chamado encontrado com os filtros selecionados</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Título</th>
                      <th>Categoria</th>
                      <th>Prioridade</th>
                      <th>Status</th>
                      <th>Técnico</th>
                      <th>Data Criação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tickets.map(t => (
                      <tr key={t.id}>
                        <td style={{ color: '#64748b', fontWeight: 600 }}>#{t.id}</td>
                        <td style={{ fontWeight: 500 }}>{t.title}</td>
                        <td>{t.category}</td>
                        <td>
                          <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${t.status}`}>
                            {STATUS_LABELS[t.status] || t.status}
                          </span>
                        </td>
                        <td>{t.technician_name || <span className="text-muted">Não atribuído</span>}</td>
                        <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
