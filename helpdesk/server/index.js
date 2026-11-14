const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize DB (creates tables + seeds admin)
require('./db/database');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const commentRoutes = require('./routes/comments');
const attachmentRoutes = require('./routes/attachments');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/report');
const { passwordRequestRouter } = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tickets', commentRoutes);
app.use('/api/tickets', attachmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/password-requests', passwordRequestRouter);

app.listen(3001, () => console.log('Server running on port 3001'));
