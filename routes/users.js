const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/admin');

// Middleware: verifica token y rol admin
async function verifyAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const decoded = await auth.verifyIdToken(header.split('Bearer ')[1]);
    const snap = await db.collection('users').doc(decoded.uid).get();
    if (!snap.exists || snap.data().rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.uid = decoded.uid;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// GET /api/users — listar usuarios
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const snap = await db.collection('users').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users/create — crear nuevo usuario
router.post('/create', verifyAdmin, async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    const userRecord = await auth.createUser({ email, password, displayName: nombre });
    await db.collection('users').doc(userRecord.uid).set({
      nombre,
      email,
      rol: rol || 'empleado',
      creadoEn: new Date().toISOString()
    });
    res.json({ success: true, uid: userRecord.uid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/users/:uid — eliminar usuario
router.delete('/:uid', verifyAdmin, async (req, res) => {
  if (req.params.uid === req.uid) {
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  }
  try {
    await auth.deleteUser(req.params.uid);
    await db.collection('users').doc(req.params.uid).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
