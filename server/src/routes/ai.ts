import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware } from '../middleware/auth';
import { parseSingleLine } from '../utils/nlp';

const router = Router();

// Secure all endpoints in this router
router.use(authMiddleware);

router.post('/parse', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input is required.' });
  }

  try {
    const userId = req.user!.id;

    // Load categories once
    const categories = await query(
      'SELECT id, name, type FROM categories WHERE user_id IS NULL OR user_id = ?',
      [userId]
    );

    // Split text by comma or newline
    const lines = text.split(/,|\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsedItems: any[] = [];

    for (const line of lines) {
      const parsed = parseSingleLine(line, categories);
      // Only include if we found a valid amount (avoids empty/garbage sentences)
      if (parsed && parsed.amount > 0) {
        parsedItems.push(parsed);
      }
    }

    res.json({
      success: true,
      parsed: parsedItems
    });

  } catch (error: any) {
    console.error('[AI Parse Error]', error);
    res.status(500).json({ error: 'Failed to parse text.' });
  }
});

export default router;
