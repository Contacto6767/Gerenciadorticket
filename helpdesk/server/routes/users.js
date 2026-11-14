const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();
const passwordRequestRouter = express.Router();

// ─── Admin guard ──────────────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', auth, adminOnly, (req, res) => {
  const users = db.prepare(
    'SELECT id, name, login, role, active, created_at FROM users ORDER BY name'
  ).all();
  return res.json(users);
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post('/', auth, adminOnly, (req, res) => {
  const { name, login, password, role } = req.body;
  if (!name || !login || !password || !role) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, login, password, role' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existing) {
    return res.status(400).json({ error: 'Login já existe' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, login, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(name, login, hash, role);

  const user = db.prepare(
    'SELECT id, name, login, role, active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  return res.status(201).json(user);
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put('/:id', auth, adminOnly, (req, res) => {
  const { id } = req.params;
  const { name, role, active } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  db.prepare(
    'UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?'
  ).run(
    name !== undefined ? name : user.name,
    role !== undefined ? role : user.role,
    active !== undefined ? (active ? 1 : 0) : user.active,
    id
  );

  // If deactivating, revoke all active sessions
  if (active === false || active === 0) {
    db.prepare(
      'UPDATE sessions SET revoked = 1 WHERE user_id = ? AND revoked = 0'
    ).run(id);
  }

  const updated = db.prepare(
    'SELECT id, name, login, role, active, created_at FROM users WHERE id = ?'
  ).get(id);

  return res.json(updated);
});

// ─── PUT /api/users/:id/reset-password ───────────────────────────────────────
router.put('/:id/reset-password', auth, adminOnly, (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: 'newPassword é obrigatório' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);

  // Mark password_requests for this login as DONE
  db.prepare(
    "UPDATE password_requests SET status = 'DONE' WHERE login = ? AND status = 'PENDING'"
  ).run(user.login);

  return res.json({ message: 'Senha redefinida com sucesso' });
});

// ─── GET /api/users/password-requests ────────────────────────────────────────
router.get('/password-requests', auth, adminOnly, (req, res) => {
  const requests = db.prepare(
    'SELECT * FROM password_requests ORDER BY created_at DESC'
  ).all();
  return res.json(requests);
});

// ─── PUT /api/password-requests/:id/done ─────────────────────────────────────
passwordRequestRouter.put('/:id/done', auth, adminOnly, (req, res) => {
  const { id } = req.params;
  const req_ = db.prepare('SELECT * FROM password_requests WHERE id = ?').get(id);
  if (!req_) return res.status(404).json({ error: 'Solicitação não encontrada' });

  db.prepare("UPDATE password_requests SET status = 'DONE' WHERE id = ?").run(id);
  return res.json({ message: 'Solicitação marcada como concluída' });
});

module.exports = router;
module.exports.passwordRequestRouter = passwordRequestRouter;
