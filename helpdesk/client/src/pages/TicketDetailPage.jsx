import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em atendimento',
  WAITING_USER: 'Aguardando usuário',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

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

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Attachment upload state
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Admin assign state
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Status change state
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await api.get(`/api/tickets/${id}`);
      setTicket(res.data);
      if (res.data.technician_id) {
        setSelectedTech(res.data.technician_id.toString());
      } else {
        setSelectedTech('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar detalhes do ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Load technicians if user is ADMIN
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/api/users')
        .then(res => {
          const techs = (res.data || []).filter(u => u.role === 'TECHNICIAN' && u.active);
          setTechnicians(techs);
        })
        .catch(() => {});
    }
  }, [user]);

  // Download attachment
  const handleDownloadAttachment = async (attachment) => {
    try {
      const res = await api.get(`/api/tickets/${id}/attachments/${attachment.id}/download`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', attachment.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      alert('Erro ao baixar anexo.');
    }
  };

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    setActionSuccess('');
    setError('');
    try {
      await api.post(`/api/tickets/${id}/comments`, { message: commentText.trim() });
      setCommentText('');
      setActionSuccess('Comentário adicionado com sucesso!');
      await fetchTicket();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar comentário.');
    } finally {
      setCommentLoading(false);
    }
  };

  // Upload attachments
  const handleUploadFiles = async (e) => {
    e.preventDefault();
    if (filesToUpload.length === 0) return;
    setUploadLoading(true);
    setUploadError('');
    setActionSuccess('');
    const fd = new FormData();
    filesToUpload.forEach(f => fd.append('files', f));

    try {
      await api.post(`/api/tickets/${id}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFilesToUpload([]);
      setActionSuccess('Anexos enviados com sucesso!');
      await fetchTicket();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Erro ao enviar anexos.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Change status
  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'CLOSED') {
      const ok = window.confirm('Esta ação não poderá ser desfeita. Deseja realmente fechar o chamado?');
      if (!ok) return;
    }
    setStatusLoading(true);
    setError('');
    setActionSuccess('');
    try {
      await api.put(`/api/tickets/${id}/status`, { status: newStatus });
      setActionSuccess(`Status alterado para "${STATUS_LABELS[newStatus] || newStatus}" com sucesso!`);
      await fetchTicket();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar status.');
    } finally {
      setStatusLoading(false);
    }
  };

  // Admin assign technician
  const handleAssignTechnician = async () => {
    setAssignLoading(true);
    setError('');
    setActionSuccess('');
    try {
      await api.put(`/api/tickets/${id}/assign`, {
        technician_id: selectedTech ? Number(selectedTech) : null,
      });
      setActionSuccess('Técnico atribuído com sucesso!');
      await fetchTicket();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atribuir técnico.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Admin soft delete
  const handleDeleteTicket = async () => {
    const ok = window.confirm('Tem certeza que deseja excluir este ticket?');
    if (!ok) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/tickets/${id}`);
      navigate('/tickets');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir ticket.');
      setDeleteLoading(false);
    }
  };

  // Unified timeline items (comments + status_history)
  const timelineItems = useMemo(() => {
    if (!ticket) return [];
    const items = [];

    (ticket.comments || []).forEach(c => {
      items.push({
        id: `c-${c.id}`,
        type: 'COMMENT',
        author: c.user_name || 'Usuário',
        message: c.message,
        created_at: c.created_at,
      });
    });

    (ticket.status_history || []).forEach(sh => {
      let desc = '';
      if (sh.type === 'STATUS') {
        const prev = STATUS_LABELS[sh.previous_value] || sh.previous_value || 'Nenhum';
        const next = STATUS_LABELS[sh.new_value] || sh.new_value;
        desc = `Alterou o status de "${prev}" para "${next}"`;
      } else if (sh.type === 'ASSIGNMENT') {
        desc = `Atribuiu o chamado para: ${sh.new_value}`;
      } else {
        desc = `${sh.type}: ${sh.new_value}`;
      }

      items.push({
        id: `sh-${sh.id}`,
        type: 'HISTORY',
        author: sh.user_name || 'Sistema',
        message: desc,
        created_at: sh.created_at,
      });
    });

    items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return items;
  }, [ticket]);

  if (loading) {
    return <div className="loading-state">⏳ Carregando chamado #{id}...</div>;
  }

  if (error && !ticket) {
    return (
      <div>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary mt-3" onClick={() => navigate('/tickets')}>
          Voltar para Tickets
        </button>
      </div>
    );
  }

  if (!ticket) return null;

  const isOwner = ticket.created_by === user?.id;
  const isAssignedTech = ticket.technician_id === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const isTech = user?.role === 'TECHNICIAN';

  const canComment =
    isAdmin ||
    (isTech && isAssignedTech) ||
    (isOwner && ticket.status !== 'CLOSED');

  const canUploadAttachment =
    (isOwner && ticket.status !== 'CLOSED') ||
    isAdmin ||
    (isTech && isAssignedTech);

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm mb-2" onClick={() => navigate('/tickets')}>
            ← Voltar
          </button>
          <h1 className="page-title">#{ticket.id} - {ticket.title}</h1>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      {actionSuccess && <div className="alert alert-success mb-4">{actionSuccess}</div>}
      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="ticket-detail-grid">
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card Detalhes / Descrição */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Informações do Chamado</span>
              <span className="text-muted text-sm">Criado em: {formatDate(ticket.created_at)}</span>
            </div>
            <div className="card-body">
              <div className="detail-meta-grid">
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Categoria</span>
                  <span className="detail-meta-value">{ticket.category}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Criado por</span>
                  <span className="detail-meta-value">{ticket.creator_name || ticket.created_by_name || '-'}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Técnico Responsável</span>
                  <span className="detail-meta-value">
                    {ticket.technician_name || <span className="text-muted">Não atribuído</span>}
                  </span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Última Atualização</span>
                  <span className="detail-meta-value">{formatDate(ticket.updated_at)}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                <span className="detail-meta-label" style={{ display: 'block', marginBottom: 8 }}>
                  Descrição
                </span>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ticket.description}</p>
              </div>
            </div>
          </div>

          {/* Anexos */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Anexos ({ticket.attachments?.length || 0})</span>
            </div>
            <div className="card-body">
              {ticket.attachments?.length === 0 ? (
                <p className="text-muted text-sm">Nenhum anexo neste chamado.</p>
              ) : (
                <div className="attachment-list">
                  {ticket.attachments.map(att => (
                    <div key={att.id} className="attachment-item">
                      <span className="attachment-icon">📎</span>
                      <span className="attachment-name">{att.original_name}</span>
                      <span className="attachment-size">({(att.size / 1024).toFixed(1)} KB)</span>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleDownloadAttachment(att)}
                      >
                        ⬇ Baixar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {canUploadAttachment && (
                <form onSubmit={handleUploadFiles} style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                  <label className="form-label">Adicionar Anexos</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.pdf,.txt,.docx,.xlsx"
                      className="form-control"
                      onChange={e => setFilesToUpload(Array.from(e.target.files))}
                    />
                    <button
                      type="submit"
                      className="btn btn-secondary btn-sm"
                      disabled={uploadLoading || filesToUpload.length === 0}
                    >
                      {uploadLoading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                  {uploadError && <p className="form-error">{uploadError}</p>}
                </form>
              )}
            </div>
          </div>

          {/* Linha do Tempo e Comentários */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Histórico & Comentários</span>
            </div>
            <div className="card-body">
              {timelineItems.length === 0 ? (
                <p className="text-muted text-sm mb-4">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="timeline mb-4">
                  {timelineItems.map(item => (
                    <div key={item.id} className="timeline-item">
                      <div className={`timeline-dot ${item.type === 'COMMENT' ? 'timeline-dot-comment' : 'timeline-dot-history'}`}>
                        {item.type === 'COMMENT' ? '💬' : '🔄'}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-meta">
                          <span className="timeline-author">{item.author}</span>
                          <span>•</span>
                          <span>{formatDate(item.created_at)}</span>
                          {item.type === 'COMMENT' && <span className="badge badge-USER">Comentário</span>}
                        </div>
                        <div className="timeline-message">{item.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canComment ? (
                <form onSubmit={handleAddComment} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Adicionar Comentário</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Escreva sua resposta ou atualização..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={commentLoading || !commentText.trim()}
                  >
                    {commentLoading ? 'Enviando...' : '💬 Enviar Comentário'}
                  </button>
                </form>
              ) : (
                <p className="text-muted text-sm">Este ticket não aceita mais comentários.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Actions Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Painel de Ações</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Technician Actions */}
              {isTech && isAssignedTech && (
                <div className="action-group">
                  <span className="action-group-title">Alterar Status</span>
                  {ticket.status === 'CLOSED' ? (
                    <p className="text-muted text-sm">
                      Chamado fechado. Apenas o Administrador pode reabri-lo.
                    </p>
                  ) : (
                    <>
                      {ticket.status !== 'OPEN' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={statusLoading}
                          onClick={() => handleStatusChange('OPEN')}
                        >
                          Aberto
                        </button>
                      )}
                      {ticket.status !== 'IN_PROGRESS' && (
                        <button
                          className="btn btn-warning btn-sm"
                          disabled={statusLoading}
                          onClick={() => handleStatusChange('IN_PROGRESS')}
                        >
                          Em atendimento
                        </button>
                      )}
                      {ticket.status !== 'WAITING_USER' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={statusLoading}
                          onClick={() => handleStatusChange('WAITING_USER')}
                        >
                          Aguardando usuário
                        </button>
                      )}
                      {ticket.status !== 'RESOLVED' && (
                        <button
                          className="btn btn-success btn-sm"
                          disabled={statusLoading}
                          onClick={() => handleStatusChange('RESOLVED')}
                        >
                          Resolvido
                        </button>
                      )}
                      <button
                        className="btn btn-dark btn-sm"
                        style={{ marginTop: 6 }}
                        disabled={statusLoading}
                        onClick={() => handleStatusChange('CLOSED')}
                      >
                        🔒 Fechar Chamado (Concluir)
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <>
                  <div className="action-group">
                    <span className="action-group-title">Alterar Status (Admin)</span>
                    <select
                      className="form-control mb-2"
                      value={ticket.status}
                      onChange={e => handleStatusChange(e.target.value)}
                      disabled={statusLoading}
                    >
                      {Object.keys(STATUS_LABELS).map(st => (
                        <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="action-group">
                    <span className="action-group-title">Atribuir Técnico</span>
                    <select
                      className="form-control mb-2"
                      value={selectedTech}
                      onChange={e => setSelectedTech(e.target.value)}
                    >
                      <option value="">Nenhum (Não atribuído)</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleAssignTechnician}
                      disabled={assignLoading}
                    >
                      {assignLoading ? 'Salvando...' : 'Salvar Atribuição'}
                    </button>
                  </div>

                  <div className="action-group" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    <span className="action-group-title" style={{ color: 'var(--color-danger)' }}>Zona de Perigo</span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleDeleteTicket}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? 'Excluindo...' : '🗑 Excluir Ticket'}
                    </button>
                  </div>
                </>
              )}

              {!isAdmin && (!isTech || !isAssignedTech) && (
                <p className="text-muted text-sm">
                  {ticket.status === 'CLOSED'
                    ? 'Este chamado está fechado e não permite modificações.'
                    : 'Aguardando ação dos técnicos de suporte.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
