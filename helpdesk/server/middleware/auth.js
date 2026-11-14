const db = require('../db/database');

/**
 * Auth middleware — reads Authorization: Bearer <token>
 * Attaches req.user = { id, name, login, role }
 */
function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = header.slice(7);
  const session = db.prepare(
    "SELECT s.*, u.id as uid, u.name, u.login, u.role, u.active FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.revoked = 0"
  ).get(token);

  if (!session) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Compare expires_at as ISO strings (SQLite datetime() is UTC, compare directly)
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  if (session.expires_at < now) {
    return res.status(401).json({ error: 'Token expirado' });
  }

  if (!session.active) {
    return res.status(403).json({ error: 'Usuário inativo' });
  }

  req.user = {
    id: session.uid,
    name: session.name,
    login: session.login,
    role: session.role,
  };

  next();
}

module.exports = auth;
