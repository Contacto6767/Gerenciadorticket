import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import NewTicketPage from './pages/NewTicketPage';
import TicketListPage from './pages/TicketListPage';
import OpenTicketsPage from './pages/OpenTicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import UserManagementPage from './pages/UserManagementPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/tickets" replace />} />
              <Route path="/tickets/new" element={<NewTicketPage />} />
              <Route path="/tickets" element={<TicketListPage />} />
              <Route path="/tickets/open" element={<OpenTicketsPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/report" element={<ReportPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
