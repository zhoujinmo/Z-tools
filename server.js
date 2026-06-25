require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

require('./config/db');

const authRoutes = require('./routes/auth');
const ledgerRoutes = require('./routes/ledgers');
const transactionRoutes = require('./routes/transactions');
const syncRoutes = require('./routes/sync');
const backupRoutes = require('./routes/backup');

app.use('/api/auth', authRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/backup', backupRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});