const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notifyUsers(userIds, ticketId, type, message) {
  const insert = db.prepare(
    'INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)'
  );
  for (const uid of userIds) {
    insert.run(uid, ticketId, type, message);
  }
}

function getAdminAndTechnicianIds() {
  return db.prepare("SELECT id FROM users WHERE role IN ('ADMIN','TECHNICIAN') AND active = 1").all().map(r => r.id);
}

function getAdminIds() {
  return db.prepare("SELECT id FROM users WHERE role = 'ADMIN' AND active = 1").all().map(r => r.id);
}

const PRIORITY_ORDER = { 'Crítica': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };

const STATUS_LABELS = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em atendimento',
  WAITING_USER: 'Aguardando usuário',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

// ─── POST /api/tickets ────────────────────────────────────────────────────────
router.post('/', auth, (req, res) => {
  const { title, description, category, priority } = req.body;
  if (!title || !description || !category || !priority) {
    return res.status(400).json({ error: 'Campos obrigatórios: title, description, category, priority' });
  }

  const result = db.prepare(
    "INSERT INTO tickets (title, description, category, priority, created_by) VALUES (?, ?, ?, ?, ?)"
  ).run(title, description, category, priority, req.user.id);

  const ticketId = result.lastInsertRowid;

  // Notify all admins and technicians
  const recipients = getAdminAndTechnicianIds();
  notifyUsers(recipients, ticketId, 'NEW_TICKET', `Novo ticket criado: ${title}`);

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  return res.status(201).json(ticket);
});

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const { status, priority, category, search } = req.query;
  const { role, id: userId } = req.user;

  let whereClauses = ['t.deleted_at IS NULL'];
  const params = [];

  // Role-based visibility
  if (role === 'USER') {
    whereClauses.push('t.created_by = ?');
    params.push(userId);
  } else if (role === 'TECHNICIAN') {
    whereClauses.push("(( t.status = 'OPEN' AND t.technician_id IS NULL ) OR t.technician_id = ?)");
    params.push(userId);
  }
  // ADMIN sees all non-deleted

  if (status) { whereClauses.push('t.status = ?'); params.push(status); }
  if (priority) { whereClauses.push('t.priority = ?'); params.push(priority); }
  if (category) { whereClauses.push('t.category = ?'); params.push(category); }
  if (search) {
    whereClauses.push('(t.title LIKE ? OR t.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const sql = `
    SELECT t.*,
      u_creator.name AS creator_name,
      u_tech.name AS technician_name
    FROM tickets t
    LEFT JOIN users u_creator ON u_creator.id = t.created_by
    LEFT JOIN users u_tech ON u_tech.id = t.technician_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY t.created_at DESC
  `;

  const tickets = db.prepare(sql).all(...params);
  return res.json(tickets);
});

// ─── GET /api/tickets/open-unassigned ─────────────────────────────────────────
router.get('/open-unassigned', auth, (req, res) => {
  if (req.user.role === 'USER') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const tickets = db.prepare(`
    SELECT t.*,
      u_creator.name AS creator_name
    FROM tickets t
    LEFT JOIN users u_creator ON u_creator.id = t.created_by
    WHERE t.status = 'OPEN' AND t.technician_id IS NULL AND t.deleted_at IS NULL
    ORDER BY t.created_at ASC
  `).all();

  // Sort by priority descending
  tickets.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] || 0;
    const pb = PRIORITY_ORDER[b.priority] || 0;
    if (pb !== pa) return pb - pa;
    return a.created_at.localeCompare(b.created_at);
  });

  return res.json(tickets);
});

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
router.get('/:id', auth, (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  const ticket = db.prepare(`
    SELECT t.*,
      u_creator.name AS creator_name,
      u_tech.name AS technician_name
    FROM tickets t
    LEFT JOIN users u_creator ON u_creator.id = t.created_by
    LEFT JOIN users u_tech ON u_tech.id = t.technician_id
    WHERE t.id = ? AND t.deleted_at IS NULL
  `).get(id);

  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  // Visibility check
  if (role === 'USER' && ticket.created_by !== userId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (role === 'TECHNICIAN' && ticket.technician_id !== userId && !(ticket.status === 'OPEN' && !ticket.technician_id)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const comments = db.prepare(`
    SELECT c.*, u.name AS user_name FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.ticket_id = ?
    ORDER BY c.created_at ASC
  `).all(id);

  const attachments = db.prepare(
    'SELECT * FROM attachments WHERE ticket_id = ? ORDER BY created_at ASC'
  ).all(id);

  const statusHistory = db.prepare(`
    SELECT sh.*, u.name AS user_name FROM status_history sh
    JOIN users u ON u.id = sh.user_id
    WHERE sh.ticket_id = ?
    ORDER BY sh.created_at ASC
  `).all(id);

  return res.json({ ...ticket, comments, attachments, status_history: statusHistory });
});

// ─── PUT /api/tickets/:id/take ────────────────────────────────────────────────
router.put('/:id/take', auth, (req, res) => {
  if (req.user.role !== 'TECHNICIAN') {
    return res.status(403).json({ error: 'Apenas técnicos podem assumir tickets' });
  }

  const { id } = req.params;

  const result = db.prepare(
    'UPDATE tickets SET technician_id = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ? AND technician_id IS NULL AND deleted_at IS NULL'
  ).run(req.user.id, 'IN_PROGRESS', id);

  if (result.changes === 0) {
    return res.status(409).json({ error: 'Ticket já assumido por outro técnico' });
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);

  // Log STATUS change OPEN→IN_PROGRESS
  db.prepare(
    "INSERT INTO status_history (ticket_id, user_id, type, previous_value, new_value) VALUES (?, ?, 'STATUS', ?, ?)"
  ).run(id, req.user.id, 'OPEN', 'IN_PROGRESS');

  // Log ASSIGNMENT
  db.prepare(
    "INSERT INTO status_history (ticket_id, user_id, type, previous_value, new_value) VALUES (?, ?, 'ASSIGNMENT', NULL, ?)"
  ).run(id, req.user.id, req.user.name);

  // Notify ticket creator
  if (ticket.created_by !== req.user.id) {
    notifyUsers([ticket.created_by], id, 'TICKET_TAKEN', `Seu ticket "${ticket.title}" foi assumido por ${req.user.name}`);
  }

  return res.json(ticket);
});

// ─── PUT /api/tickets/:id/status ──────────────────────────────────────────────
router.put('/:id/status', auth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { role, id: userId } = req.user;

  if (!status) return res.status(400).json({ error: 'status é obrigatório' });

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  if (role === 'TECHNICIAN') {
    if (ticket.technician_id !== userId) {
      return res.status(403).json({ error: 'Você não está atribuído a este ticket' });
    }
    if (ticket.status === 'CLOSED') {
      return res.status(403).json({ error: 'Chamado fechado só pode ser reaberto pelo Administrador' });
    }
    const technicianAllowed = ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'];
    if (!technicianAllowed.includes(status)) {
      return res.status(400).json({ error: 'Status inválido para técnico' });
    }
  } else if (role === 'USER') {
    return res.status(403).json({ error: 'Usuários não podem alterar o status do ticket' });
  }

  const prevStatus = ticket.status;
  db.prepare(
    "UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, id);

  // Log status history
  db.prepare(
    "INSERT INTO status_history (ticket_id, user_id, type, previous_value, new_value) VALUES (?, ?, 'STATUS', ?, ?)"
  ).run(id, userId, prevStatus, status);

  // Notify creator if changer is not the creator
  if (ticket.created_by !== userId) {
    const label = STATUS_LABELS[status] || status;
    notifyUsers([ticket.created_by], id, 'STATUS_CHANGE', `Status do seu ticket "${ticket.title}" foi alterado para ${label}`);
  }

  const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  return res.json(updated);
});

// ─── PUT /api/tickets/:id/assign ──────────────────────────────────────────────
router.put('/:id/assign', auth, (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores podem reatribuir tickets' });
  }

  const { id } = req.params;
  const { technician_id } = req.body;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  // Get old technician name
  let prevName = null;
  if (ticket.technician_id) {
    const prevTech = db.prepare('SELECT name FROM users WHERE id = ?').get(ticket.technician_id);
    if (prevTech) prevName = prevTech.name;
  }

  // Get new technician name
  let newName = null;
  if (technician_id) {
    const newTech = db.prepare('SELECT name FROM users WHERE id = ?').get(technician_id);
    if (!newTech) return res.status(400).json({ error: 'Técnico não encontrado' });
    newName = newTech.name;
  }

  db.prepare(
    "UPDATE tickets SET technician_id = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(technician_id || null, id);

  // Log ASSIGNMENT
  db.prepare(
    "INSERT INTO status_history (ticket_id, user_id, type, previous_value, new_value) VALUES (?, ?, 'ASSIGNMENT', ?, ?)"
  ).run(id, req.user.id, prevName, newName || 'Não atribuído');

  // Notify new technician
  if (technician_id) {
    notifyUsers([technician_id], id, 'TICKET_ASSIGNED', `Ticket "${ticket.title}" foi atribuído a você`);
  }

  const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  return res.json(updated);
});

// ─── DELETE /api/tickets/:id ──────────────────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores podem excluir tickets' });
  }

  const { id } = req.params;
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

  db.prepare(
    "UPDATE tickets SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);

  return res.json({ message: 'Ticket excluído com sucesso' });
});

module.exports = router;
