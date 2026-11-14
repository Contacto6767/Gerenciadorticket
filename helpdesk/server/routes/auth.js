const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Login e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'Usuário inativo' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = randomUUID();

  // expires_at = now + 8 hours in SQLite datetime format
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, user.id, expiresAt);

  return res.json({
    token,
    user: { id: user.id, name: user.name, login: user.login, role: user.role },
  });
});

// ─── POST /api/auth/logoff ────────────────────────────────────────────────────
router.post('/logoff', auth, (req, res) => {
  const header = req.headers['authorization'];
  const token = header.slice(7);
  db.prepare('UPDATE sessions SET revoked = 1 WHERE token = ?').run(token);
  return res.json({ message: 'Logout realizado com sucesso' });
});

// ─── POST /api/auth/password-request ─────────────────────────────────────────
router.post('/password-request', (req, res) => {
  const { login } = req.body;
  if (!login) {
    return res.status(400).json({ error: 'Login é obrigatório' });
  }

  db.prepare('INSERT INTO password_requests (login) VALUES (?)').run(login);

  // Notify all admins
  const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' AND active = 1").all();
  const insertNotif = db.prepare(
    'INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, NULL, ?, ?)'
  );
  for (const admin of admins) {
    insertNotif.run(admin.id, 'PASSWORD_REQUEST', `Usuário ${login} solicitou troca de senha`);
  }

  return res.json({ message: 'Solicitação registrada com sucesso' });
});

module.exports = router;
