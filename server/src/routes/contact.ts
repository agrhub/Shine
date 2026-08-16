import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';

const router = Router();

// Store inquiries in memory (Sprint 2+: persist to DB via getDatabaseProvider)
const inquiries: Array<{
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  created_at: string;
}> = [];

/**
 * POST /api/contact
 * FR-008: Contact & Support Form submission
 * Accepts user inquiry and stores to in-memory queue (DB integration Sprint 2)
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, subject, message, category } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: 'Name, email, subject, and message are required' });
      return;
    }

    const ticketId = `ticket_${nanoid(8)}`;
    const inquiry = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      category: category || 'GENERAL',
      created_at: new Date().toISOString(),
    };

    inquiries.push(inquiry);

    console.log(`[Contact] New support inquiry from ${email}: [${ticketId}] ${subject}`);

    res.status(201).json({
      message: `Thank you, ${name}! Your inquiry has been received. We will respond to ${email} within 24 hours.`,
      ticket_id: ticketId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/contact/tickets
 * Admin: List all contact inquiries
 */
router.get('/tickets', async (_req: Request, res: Response): Promise<void> => {
  res.json({ count: inquiries.length, tickets: inquiries });
});

export default router;
