import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { initAudioContext } from '../utils/notificationSound';
import api from '../utils/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginVal, setLoginVal] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [pwLogin, setPwLogin] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginVal.trim() || !password.trim()) {
      setLoginError('Preencha login e senha.');
      return;
    }
    setLoginLoading(true);
    initAudioContext();
    try {
      await login(loginVal.trim(), password);
      navigate('/tickets');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.';
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePasswordRequest = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwMsg('');
    if (!pwLogin.trim()) {
      setPwError('Informe o login.');
      return;
    }
    setPwLoading(true);
    try {
      await api.post('/api/auth/password-request', { login: pwLogin.trim() });
      setPwMsg('Solicitação enviada com sucesso! Aguarde o administrador.');
      setPwLogin('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao enviar solicitação.';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <h1>HelpDesk</h1>
          <p>Sistema de Gestão de Chamados</p>
        </div>

        <form onSubmit={handleLogin}>
          {loginError && <div className="alert alert-error">{loginError}</div>}
          <div className="form-group">
            <label className="form-label">Login</label>
            <input
              className="form-control"
              type="text"
              value={loginVal}
              onChange={e => setLoginVal(e.target.value)}
              placeholder="Seu login"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loginLoading}
            style={{ justifyContent: 'center' }}
          >
            {loginLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <hr className="login-divider" />

        <p className="login-secondary-title">Solicitar troca de senha</p>
        <form onSubmit={handlePasswordRequest}>
          {pwError && <div className="alert alert-error">{pwError}</div>}
          {pwMsg && <div className="alert alert-success">{pwMsg}</div>}
          <div className="form-group">
            <input
              className="form-control"
              type="text"
              value={pwLogin}
              onChange={e => setPwLogin(e.target.value)}
              placeholder="Informe seu login"
            />
          </div>
          <button
            type="submit"
            className="btn btn-secondary w-full"
            disabled={pwLoading}
            style={{ justifyContent: 'center' }}
          >
            {pwLoading ? 'Enviando...' : 'Solicitar troca de senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
