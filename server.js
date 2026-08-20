const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// SPA fallback
app.get('*', (req, res) => {
  const file = req.path === '/login' ? 'login.html' : 'index.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// Solo escucha localmente; Vercel importa el módulo directamente
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
