import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, execute, get } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'venke-finance-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user: { id: number; email: string }) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

// ─── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  try {
    // Check if email already exists
    const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await execute(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email.toLowerCase(), passwordHash]
    );

    const userId = result.lastID || result.id;
    const token = generateToken({ id: userId, email: email.toLowerCase() });

    res.status(201).json({
      success: true,
      token,
      user: { id: userId, email: email.toLowerCase() },
    });
  } catch (error: any) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, currency: user.currency, theme: user.theme },
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await get('SELECT id, email, currency, theme, created_at FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/auth/change-password ───────────────────────────────────────
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    return;
  }

  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user!.id]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', (_req: Request, res: Response) => {
  // JWT is stateless; client clears the token from localStorage
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
