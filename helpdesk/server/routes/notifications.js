const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/notifications ───────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ? AND read = 0
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  return res.json(notifications);
});

// ─── PUT /api/notifications/read-all ─────────────────────────────────────────
// Must be before /:id/read to avoid route conflict
router.put('/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  return res.json({ message: 'Todas as notificações marcadas como lidas' });
});

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────
router.put('/:id/read', auth, (req, res) => {
  const { id } = req.params;
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!notif) return res.status(404).json({ error: 'Notificação não encontrada' });

  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  return res.json({ message: 'Notificação marcada como lida' });
});

module.exports = router;
