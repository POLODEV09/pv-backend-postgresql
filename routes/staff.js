const express = require('express');
const { prisma } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const STAFF = ['polosop', 'endzzern'];

// Middleware: check if user is staff
async function requireStaff(req, res, next) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: 'Ikke innlogget' });
  const isStaff = STAFF.includes(user.username?.toLowerCase()) ||
    ['admin', 'moderator', 'verifiseringsagent'].includes(user.role);
  if (!isStaff) return res.status(403).json({ error: 'Kun staff har tilgang' });
  req.user = user;
  next();
}

// Get staff chat messages
router.get('/chat', auth, requireStaff, async (req, res) => {
  try {
    const messages = await prisma.staffMessage.findMany({
      where: { channel: 'chat' },
      include: { author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Send staff chat message
router.post('/chat', auth, requireStaff, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Tom melding' });

    const message = await prisma.staffMessage.create({
      data: { content: content.trim().slice(0, 2000), channel: 'chat', authorId: req.userId },
      include: { author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } } }
    });
    res.json(message);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get info/announcements
router.get('/info', auth, requireStaff, async (req, res) => {
  try {
    const messages = await prisma.staffMessage.findMany({
      where: { channel: 'info' },
      include: { author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Post info/announcement (owners only)
router.post('/info', auth, requireStaff, async (req, res) => {
  try {
    if (!STAFF.includes(req.user.username?.toLowerCase())) {
      return res.status(403).json({ error: 'Kun eiere kan poste info' });
    }
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Tom melding' });

    const message = await prisma.staffMessage.create({
      data: { content: content.trim().slice(0, 5000), channel: 'info', authorId: req.userId },
      include: { author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } } }
    });
    res.json(message);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete message (author or owner)
router.delete('/message/:id', auth, requireStaff, async (req, res) => {
  try {
    const msg = await prisma.staffMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: 'Ikke funnet' });
    if (msg.authorId !== req.userId && !STAFF.includes(req.user.username?.toLowerCase())) {
      return res.status(403).json({ error: 'Ingen tilgang' });
    }
    await prisma.staffMessage.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all staff members
router.get('/members', auth, requireStaff, async (req, res) => {
  try {
    const members = await prisma.user.findMany({
      where: { role: { in: ['admin', 'moderator', 'verifiseringsagent'] } },
      select: { id: true, username: true, avatar: true, discordId: true, role: true, createdAt: true }
    });
    // Add owners
    const owners = await prisma.user.findMany({
      where: { username: { in: STAFF, mode: 'insensitive' } },
      select: { id: true, username: true, avatar: true, discordId: true, role: true, createdAt: true }
    });
    const all = [...owners, ...members.filter(m => !owners.find(o => o.id === m.id))];
    res.json({ members: all });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
