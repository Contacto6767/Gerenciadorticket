const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

function notifyUsers(userIds, ticketId, type, message) {
  const insert = db.prepare(
    'INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)'
  );
  for (const uid of userIds) {
    insert.run(uid, ticketId, type, message);
  }
}

// ─── POST /api/tickets/:id/comments ──────────────────────────────────────────
router.post('/:id/comments', auth, (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const { role, id: userId } = req.user;

  if (!message) return res.status(400).json({ error: 'message é obrigatório' });

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  // Permission checks
  if (role === 'USER') {
    if (ticket.created_by !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    if (ticket.status === 'CLOSED') {
      return res.status(403).json({ error: 'Ticket fechado não aceita comentários' });
    }
  } else if (role === 'TECHNICIAN') {
    if (ticket.technician_id !== userId) {
      return res.status(403).json({ error: 'Você não está atribuído a este ticket' });
    }
  }
  // ADMIN: any non-deleted (already checked above)

  const result = db.prepare(
    'INSERT INTO comments (ticket_id, user_id, message) VALUES (?, ?, ?)'
  ).run(id, userId, message);

  const comment = db.prepare(`
    SELECT c.*, u.name AS user_name FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  // Notifications
  if (role === 'TECHNICIAN' || role === 'ADMIN') {
    // Notify ticket creator (if not the commenter)
    if (ticket.created_by !== userId) {
      notifyUsers([ticket.created_by], id, 'NEW_COMMENT', `Novo comentário no seu ticket "${ticket.title}"`);
    }
  } else {
    // USER: notify assigned technician + all admins
    const recipients = new Set();
    if (ticket.technician_id) recipients.add(ticket.technician_id);
    const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' AND active = 1").all();
    admins.forEach(a => recipients.add(a.id));
    recipients.delete(userId); // don't notify self
    notifyUsers([...recipients], id, 'NEW_COMMENT', `Novo comentário no ticket "${ticket.title}"`);
  }

  return res.status(201).json(comment);
});

module.exports = router;
