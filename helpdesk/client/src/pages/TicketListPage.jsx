import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
const STATUSES = Object.keys(STATUS_LABELS);

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR');
}

export default function TicketListPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/api/tickets')
      .then(res => setTickets(res.data || []))
      .catch(() => setError('Erro ao carregar tickets.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search || 
      (t.title && t.title.toLowerCase().includes(q)) || 
      (t.description && t.description.toLowerCase().includes(q));
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchPriority = !filterPriority || t.priority === filterPriority;
    const matchCategory = !filterCategory || t.category === filterCategory;
    return matchSearch && matchStatus && matchPriority && matchCategory;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-subtitle">{tickets.length} ticket(s) no total</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tickets/new')}>
          + Novo Ticket
        </button>
      </div>

      <div className="filters-row">
        <input
          className="form-control search-input"
          type="text"
          placeholder="Buscar por título..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="form-control"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select
          className="form-control"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          {PRIORITIES.map((p, i) => (
            <option key={i} value={p}>{p || 'Todas prioridades'}</option>
          ))}
        </select>
        <select
          className="form-control"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          {CATEGORIES.map((c, i) => (
            <option key={i} value={c}>{c || 'Todas categorias'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state">⏳ Carregando tickets...</div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎫</div>
              <div className="empty-state-title">Nenhum ticket encontrado</div>
              <div className="empty-state-desc">Tente ajustar os filtros ou crie um novo ticket.</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Título</th>
                    <th>Categoria</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Criado por</th>
                    <th>Técnico</th>
                    <th>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr
                      key={t.id}
                      className="clickable"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td style={{ color: '#64748b', fontWeight: 600 }}>#{t.id}</td>
                      <td style={{ fontWeight: 500, maxWidth: 280 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                      </td>
                      <td>{t.category}</td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>{t.creator_name || t.created_by_name || '-'}</td>
                      <td>{t.technician_name || <span style={{ color: '#94a3b8' }}>Não atribuído</span>}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(t.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
