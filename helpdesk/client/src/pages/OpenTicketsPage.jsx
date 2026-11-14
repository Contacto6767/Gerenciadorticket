import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const PRIORITY_ORDER = {
  'Crítica': 1,
  'Alta': 2,
  'Média': 3,
  'Baixa': 4,
};

function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR');
}

export default function OpenTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isTechnician = user?.role === 'TECHNICIAN';

  const loadOpenTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/tickets/open-unassigned');
      const data = res.data || [];
      // Sort by priority Crítica -> Alta -> Média -> Baixa
      data.sort((a, b) => {
        const pA = PRIORITY_ORDER[a.priority] || 99;
        const pB = PRIORITY_ORDER[b.priority] || 99;
        return pA - pB;
      });
      setTickets(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar novos chamados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpenTickets();
  }, [loadOpenTickets]);

  const handleTakeTicket = async (e, ticketId) => {
    e.stopPropagation();
    setActionLoading(ticketId);
    setError('');
    setSuccessMsg('');
    try {
      await api.put(`/api/tickets/${ticketId}/take`);
      setSuccessMsg(`Ticket #${ticketId} assumido com sucesso! Redirecionando...`);
      setTimeout(() => {
        navigate(`/tickets/${ticketId}`);
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao assumir chamado. Pode já ter sido assumido por outro técnico.';
      setError(msg);
      loadOpenTickets();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Novos Tickets (Não Atribuídos)</h1>
          <p className="page-subtitle">Chamados abertos aguardando atendimento técnico</p>
        </div>
        <button className="btn btn-secondary" onClick={loadOpenTickets} disabled={loading}>
          🔄 Atualizar
        </button>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}
      {successMsg && <div className="alert alert-success mb-4">{successMsg}</div>}

      {loading ? (
        <div className="loading-state">⏳ Carregando chamados abertos...</div>
      ) : (
        <div className="card">
          {tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <div className="empty-state-title">Nenhum chamado pendente</div>
              <div className="empty-state-desc">Todos os chamados já foram assumidos ou resolvidos!</div>
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
                    <th>Criado por</th>
                    <th>Aberto em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr
                      key={t.id}
                      className="clickable"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td style={{ color: '#64748b', fontWeight: 600 }}>#{t.id}</td>
                      <td style={{ fontWeight: 600, maxWidth: 300 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                      </td>
                      <td>{t.category}</td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td>{t.creator_name || t.created_by_name || '-'}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(t.created_at)}</td>
                      <td>
                        {isTechnician ? (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={actionLoading === t.id}
                            onClick={(e) => handleTakeTicket(e, t.id)}
                          >
                            {actionLoading === t.id ? 'Assumindo...' : '✋ Assumir'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${t.id}`);
                            }}
                          >
                            Ver detalhes
                          </button>
                        )}
                      </td>
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
