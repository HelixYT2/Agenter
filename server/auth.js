import express from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Secret for JWT (in production, use ENV)
const JWT_SECRET = process.env.JWT_SECRET || 'helix-agent-secret-key-change-me';

// Mock User Database
// We will initialize this with a default user on startup for demo purposes
let users = [];

(async () => {
  const hashedPassword = await argon2.hash('password');
  users.push({
    id: 'user-1',
    username: 'admin',
    password: hashedPassword,
  });
  console.log('Mock user "admin" initialized with password "password"');
})();

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await argon2.verify(user.password, password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  // Log audit event (simplified)
  console.log(`[AUDIT] User ${username} logged in at ${new Date().toISOString()}`);

  res.json({ token, user: { id: user.id, username: user.username } });
});

// GET /api/v1/auth/verify
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: payload });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

export default router;
