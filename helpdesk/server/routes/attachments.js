const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

// Multer disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
  },
}).array('files', MAX_FILES);

// ─── Ticket visibility helper ─────────────────────────────────────────────────
function getVisibleTicket(id, user) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!ticket) return null;

  if (user.role === 'USER' && ticket.created_by !== user.id) return null;
  if (user.role === 'TECHNICIAN' && ticket.technician_id !== user.id && !(ticket.status === 'OPEN' && !ticket.technician_id)) return null;

  return ticket;
}

// ─── POST /api/tickets/:id/attachments ───────────────────────────────────────
router.post('/:id/attachments', auth, (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  const ticket = getVisibleTicket(id, req.user);
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado ou acesso negado' });

  // Permission same as comments
  if (role === 'USER') {
    if (ticket.created_by !== userId) return res.status(403).json({ error: 'Acesso negado' });
    if (ticket.status === 'CLOSED') return res.status(403).json({ error: 'Ticket fechado' });
  } else if (role === 'TECHNICIAN') {
    if (ticket.technician_id !== userId) return res.status(403).json({ error: 'Acesso negado' });
  }

  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Count existing attachments
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM attachments WHERE ticket_id = ?').get(id);
    if (existing.cnt + files.length > MAX_FILES) {
      // Remove uploaded files since we won't store them
      files.forEach(f => fs.unlink(f.path, () => {}));
      return res.status(400).json({ error: `Limite de ${MAX_FILES} anexos por ticket atingido` });
    }

    const insert = db.prepare(
      'INSERT INTO attachments (ticket_id, user_id, original_name, path, mimetype, size) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const created = [];
    for (const file of files) {
      const result = insert.run(id, userId, file.originalname, file.filename, file.mimetype, file.size);
      created.push(db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid));
    }

    return res.status(201).json(created);
  });
});

// ─── GET /api/tickets/:id/attachments/:attachmentId/download ─────────────────
router.get('/:id/attachments/:attachmentId/download', auth, (req, res) => {
  const { id, attachmentId } = req.params;

  const ticket = getVisibleTicket(id, req.user);
  if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado ou acesso negado' });

  const attachment = db.prepare(
    'SELECT * FROM attachments WHERE id = ? AND ticket_id = ?'
  ).get(attachmentId, id);

  if (!attachment) return res.status(404).json({ error: 'Anexo não encontrado' });

  const filePath = path.join(UPLOADS_DIR, attachment.path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.original_name)}"`);
  res.setHeader('Content-Type', attachment.mimetype);
  res.sendFile(filePath);
});

module.exports = router;
