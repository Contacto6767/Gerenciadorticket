import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS = {
  ADMIN: 'Admin',
  TECHNICIAN: 'Técnico',
  USER: 'Usuário',
};

const TICKET_LIST_LABELS = {
  USER: 'Meus Tickets',
  TECHNICIAN: 'Meus Atendimentos',
  ADMIN: 'Todos os Tickets',
};

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        Help<span>Desk</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/tickets/new">
          <span className="nav-icon">➕</span>
          Cadastro de Ticket
        </NavLink>

        {(role === 'ADMIN' || role === 'TECHNICIAN') && (
          <NavLink to="/tickets/open">
            <span className="nav-icon">📬</span>
            Novos Tickets
          </NavLink>
        )}

        <NavLink to="/tickets" end>
          <span className="nav-icon">🎫</span>
          Meus Tickets
        </NavLink>

        {role === 'ADMIN' && (
          <NavLink to="/report">
            <span className="nav-icon">📊</span>
            Relatório de Acompanhamento
          </NavLink>
        )}

        {role === 'ADMIN' && (
          <NavLink to="/users">
            <span className="nav-icon">👥</span>
            Gestão de Usuários
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
