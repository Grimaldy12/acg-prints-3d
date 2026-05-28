const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const authMiddleware = require('../middleware/auth');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper: generate a signed JWT for the given user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Los campos username, password y name son obligatorios.' });
    }

    const usernameLower = username.toLowerCase().trim();

    // Check for duplicate username
    const userQuery = await db.collection('users').where('username', '==', usernameLower).limit(1).get();
    if (!userQuery.empty) {
      return res.status(409).json({ error: 'El nombre de usuario ya está en uso.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUserRef = await db.collection('users').add({
      username: usernameLower,
      password: hashedPassword,
      name: name.trim(),
      created_at: new Date().toISOString()
    });

    const user = {
      id: newUserRef.id,
      username: usernameLower,
      name: name.trim(),
    };

    const token = generateToken(user);

    res.status(201).json({ data: { user, token } });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Los campos username y password son obligatorios.' });
    }

    const usernameLower = username.toLowerCase().trim();

    const userQuery = await db.collection('users').where('username', '==', usernameLower).limit(1).get();
    if (userQuery.empty) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    const valid = bcrypt.compareSync(password, userData.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const user = { id: userDoc.id, username: userData.username, name: userData.name };
    const token = generateToken(user);

    res.json({ data: { user, token } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ──────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const userData = userDoc.data();
    res.json({
      data: {
        id: userDoc.id,
        username: userData.username,
        name: userData.name,
        created_at: userData.created_at
      }
    });
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ error: 'Error al obtener información del usuario.' });
  }
});

module.exports = router;
