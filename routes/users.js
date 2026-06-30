const express = require('express');
const { prisma } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const ADMIN_USERS = ['polosop', 'endzzern'];

// Get current user
router.get('/', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List all members (for admin)
router.get('/list', auth, async (req, res) => {
  try {
    const requester = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!requester || (!ADMIN_USERS.includes(requester.username?.toLowerCase()) && requester.role !== 'moderator')) {
      return res.status(403).json({ error: 'Ingen tilgang' });
    }
    const users = await prisma.user.findMany({
      select: { id: true, username: true, avatar: true, discordId: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ users, total: users.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Forum stats
router.get('/stats', async (req, res) => {
  try {
    const [threads, posts, members] = await Promise.all([
      prisma.thread.count(),
      prisma.post.count(),
      prisma.user.count()
    ]);
    res.json({ threads, posts, members });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Set user role (admin only)
router.put('/role', auth, async (req, res) => {
  try {
    const requester = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!requester || !ADMIN_USERS.includes(requester.username?.toLowerCase())) {
      return res.status(403).json({ error: 'Kun admins kan endre roller' });
    }
    const { username, role } = req.body;
    if (!username || !role) return res.status(400).json({ error: 'Mangler brukernavn eller rolle' });
    if (!['user', 'moderator', 'admin', 'verifiseringsagent'].includes(role)) return res.status(400).json({ error: 'Ugyldig rolle' });

    const target = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } }
    });
    if (!target) return res.status(404).json({ error: `Bruker "${username}" finnes ikke. De må logge inn på forummet først!` });

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role }
    });
    res.json({ success: true, user: { username: updated.username, role: updated.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get user profile (must be last - catches all)
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { threads: { select: { id: true } }, posts: { select: { id: true } } }
    });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ ...user, threadCount: user.threads.length, postCount: user.posts.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
