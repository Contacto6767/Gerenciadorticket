import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const ROLES = ['USER', 'TECHNICIAN', 'ADMIN'];
const ROLE_LABELS = {
  ADMIN: 'Admin',
  TECHNICIAN: 'Técnico',
  USER: 'Usuário',
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR');
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', login: '', password: '', role: 'USER' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'USER', active: true });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [uRes, pRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/users/password-requests'),
      ]);
      setUsers(uRes.data || []);
      setPasswordRequests(pRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados de usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create User
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.name.trim() || !createForm.login.trim() || !createForm.password.trim()) {
      setCreateError('Preencha todos os campos obrigatórios.');
      return;
    }
    setCreateLoading(true);
    try {
      await api.post('/api/users', createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', login: '', password: '', role: 'USER' });
      setSuccessMsg('Usuário criado com sucesso!');
      await loadData();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Erro ao criar usuário.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit User
  const openEditModal = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name, role: u.role, active: !!u.active });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      await api.put(`/api/users/${editUser.id}`, editForm);
      setEditUser(null);
      setSuccessMsg('Usuário atualizado com sucesso!');
      await loadData();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Erro ao atualizar usuário.');
    } finally {
      setEditLoading(false);
    }
  };

  // Reset Password
  const openResetModal = (u) => {
    setResetUser(u);
    setNewPassword('');
    setResetError('');
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!newPassword.trim()) {
      setResetError('Informe a nova senha.');
      return;
    }
    setResetLoading(true);
    try {
      await api.put(`/api/users/${resetUser.id}/reset-password`, { newPassword: newPassword.trim() });
      setResetUser(null);
      setSuccessMsg(`Senha do usuário "${resetUser.login}" redefinida com sucesso!`);
      await loadData();
    } catch (err) {
      setResetError(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setResetLoading(false);
    }
  };

  // Mark password request as DONE
  const handleMarkRequestDone = async (reqId) => {
    try {
      await api.put(`/api/password-requests/${reqId}/done`);
      setSuccessMsg('Solicitação marcada como concluída.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar solicitação.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestão de Usuários</h1>
          <p className="page-subtitle">Gerencie usuários, permissões e solicitações de senha</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Novo Usuário
        </button>
      </div>

      {successMsg && <div className="alert alert-success mb-4">{successMsg}</div>}
      {error && <div className="alert alert-error mb-4">{error}</div>}

      {loading ? (
        <div className="loading-state">⏳ Carregando dados...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Usuários */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Usuários ({users.length})</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Login</th>
                    <th>Função</th>
                    <th>Status</th>
                    <th>Cadastrado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ color: '#64748b' }}>{u.login}</td>
                      <td>
                        <span className={`badge badge-${u.role}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.active ? 'badge-Baixa' : 'badge-Crítica'}`}>
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(u.created_at)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => openEditModal(u)}
                          >
                            ✏ Editar
                          </button>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => openResetModal(u)}
                          >
                            🔑 Nova Senha
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Solicitações de Senha */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Solicitações de Troca de Senha ({passwordRequests.length})</span>
            </div>
            <div className="table-wrapper">
              {passwordRequests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">Nenhuma solicitação pendente</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Login Solicitante</th>
                      <th>Status</th>
                      <th>Data da Solicitação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passwordRequests.map(pr => (
                      <tr key={pr.id}>
                        <td style={{ color: '#64748b' }}>#{pr.id}</td>
                        <td style={{ fontWeight: 600 }}>{pr.login}</td>
                        <td>
                          <span className={`badge ${pr.status === 'DONE' ? 'badge-RESOLVED' : 'badge-WAITING_USER'}`}>
                            {pr.status === 'DONE' ? 'Concluído' : 'Pendente'}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(pr.created_at)}</td>
                        <td>
                          {pr.status !== 'DONE' && (
                            <button
                              className="btn btn-success btn-xs"
                              onClick={() => handleMarkRequestDone(pr.id)}
                            >
                              ✓ Marcar como concluído
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Usuário */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Novo Usuário</span>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {createError && <div className="alert alert-error mb-3">{createError}</div>}
                <div className="form-group">
                  <label className="form-label">Nome Completo <span className="required">*</span></label>
                  <input
                    className="form-control"
                    type="text"
                    required
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Login de Acesso <span className="required">*</span></label>
                  <input
                    className="form-control"
                    type="text"
                    required
                    value={createForm.login}
                    onChange={e => setCreateForm({ ...createForm, login: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha Inicial <span className="required">*</span></label>
                  <input
                    className="form-control"
                    type="password"
                    required
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Função (Perfil)</label>
                  <select
                    className="form-control"
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {editUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Editar Usuário: {editUser.login}</span>
              <button className="modal-close" onClick={() => setEditUser(null)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editError && <div className="alert alert-error mb-3">{editError}</div>}
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input
                    className="form-control"
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Função (Perfil)</label>
                  <select
                    className="form-control"
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editForm.active}
                      onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                    />
                    <span>Usuário Ativo</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditUser(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Redefinir Senha */}
      {resetUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Redefinir Senha: {resetUser.name} ({resetUser.login})</span>
              <button className="modal-close" onClick={() => setResetUser(null)}>×</button>
            </div>
            <form onSubmit={handleResetSubmit}>
              <div className="modal-body">
                {resetError && <div className="alert alert-error mb-3">{resetError}</div>}
                <div className="form-group">
                  <label className="form-label">Nova Senha</label>
                  <input
                    className="form-control"
                    type="password"
                    placeholder="Digite a nova senha"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetUser(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Salvando...' : 'Definir Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
