const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/report ──────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }

  const { startDate, endDate, status, technician_id, priority, category } = req.query;

  // Build dynamic WHERE for tickets
  const whereClauses = ['t.deleted_at IS NULL'];
  const params = [];

  if (startDate) {
    whereClauses.push("t.created_at >= ?");
    params.push(`${startDate} 00:00:00`);
  }
  if (endDate) {
    whereClauses.push("t.created_at <= ?");
    params.push(`${endDate} 23:59:59`);
  }
  if (status) { whereClauses.push('t.status = ?'); params.push(status); }
  if (technician_id) { whereClauses.push('t.technician_id = ?'); params.push(technician_id); }
  if (priority) { whereClauses.push('t.priority = ?'); params.push(priority); }
  if (category) { whereClauses.push('t.category = ?'); params.push(category); }

  const whereSQL = whereClauses.join(' AND ');

  // ── byStatus ────────────────────────────────────────────────────────────────
  const byStatusRaw = db.prepare(`
    SELECT status, COUNT(*) as count FROM tickets t
    WHERE ${whereSQL}
    GROUP BY status
  `).all(...params);

  const byStatus = {};
  for (const row of byStatusRaw) byStatus[row.status] = row.count;

  // ── byPriority ───────────────────────────────────────────────────────────────
  const byPriorityRaw = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tickets t
    WHERE ${whereSQL}
    GROUP BY priority
  `).all(...params);

  const byPriority = {};
  for (const row of byPriorityRaw) byPriority[row.priority] = row.count;

  // ── byCategory ───────────────────────────────────────────────────────────────
  const byCategoryRaw = db.prepare(`
    SELECT category, COUNT(*) as count FROM tickets t
    WHERE ${whereSQL}
    GROUP BY category
  `).all(...params);

  const byCategory = {};
  for (const row of byCategoryRaw) byCategory[row.category] = row.count;

  // ── byTechnician ─────────────────────────────────────────────────────────────
  const byTechnician = db.prepare(`
    SELECT
      t.technician_id,
      u.name,
      SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN t.status = 'CLOSED' THEN 1 ELSE 0 END) as closed
    FROM tickets t
    JOIN users u ON u.id = t.technician_id
    WHERE t.technician_id IS NOT NULL AND ${whereSQL}
    GROUP BY t.technician_id
  `).all(...params);

  // ── avgTimeToClose (overall) ──────────────────────────────────────────────
  // Find first CLOSED entry in status_history for each ticket
  const closeTimes = db.prepare(`
    SELECT t.created_at as ticket_created,
           sh.created_at as closed_at
    FROM tickets t
    JOIN status_history sh ON sh.ticket_id = t.id
    WHERE sh.new_value = 'CLOSED' AND sh.type = 'STATUS' AND ${whereSQL}
    GROUP BY t.id
    HAVING sh.created_at = MIN(sh.created_at)
  `).all(...params);

  let avgTimeToClose = null;
  if (closeTimes.length > 0) {
    const totalSecs = closeTimes.reduce((acc, row) => {
      const diff = (new Date(row.closed_at.replace(' ', 'T') + 'Z') - new Date(row.ticket_created.replace(' ', 'T') + 'Z')) / 1000;
      return acc + diff;
    }, 0);
    avgTimeToClose = totalSecs / closeTimes.length;
  }

  // ── avgTimeByTechnician ───────────────────────────────────────────────────
  const closeTimesByTech = db.prepare(`
    SELECT t.technician_id,
           u.name,
           t.created_at as ticket_created,
           sh.created_at as closed_at
    FROM tickets t
    JOIN users u ON u.id = t.technician_id
    JOIN status_history sh ON sh.ticket_id = t.id
    WHERE sh.new_value = 'CLOSED' AND sh.type = 'STATUS'
      AND t.technician_id IS NOT NULL AND ${whereSQL}
    GROUP BY t.id
    HAVING sh.created_at = MIN(sh.created_at)
  `).all(...params);

  const techMap = {};
  for (const row of closeTimesByTech) {
    if (!techMap[row.technician_id]) {
      techMap[row.technician_id] = { name: row.name, total: 0, count: 0 };
    }
    const diff = (new Date(row.closed_at.replace(' ', 'T') + 'Z') - new Date(row.ticket_created.replace(' ', 'T') + 'Z')) / 1000;
    techMap[row.technician_id].total += diff;
    techMap[row.technician_id].count += 1;
  }

  const avgTimeByTechnician = Object.entries(techMap).map(([techId, v]) => ({
    technician_id: Number(techId),
    name: v.name,
    avg_seconds: v.total / v.count,
  }));

  // ── tickets list ──────────────────────────────────────────────────────────
  const tickets = db.prepare(`
    SELECT t.id, t.title, t.status, t.priority, t.category,
      u.name AS technician_name,
      t.created_at, t.deleted_at
    FROM tickets t
    LEFT JOIN users u ON u.id = t.technician_id
    WHERE ${whereSQL}
    ORDER BY t.created_at DESC
  `).all(...params);

  return res.json({
    byStatus,
    byPriority,
    byCategory,
    byTechnician,
    avgTimeToClose,
    avgTimeByTechnician,
    tickets,
  });
});

module.exports = router;
