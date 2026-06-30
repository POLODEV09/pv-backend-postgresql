const express = require('express');
const { prisma } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Admin users (Discord usernames)
const ADMIN_USERS = ['polosop', 'polo', 'polodev09'];

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        threads: { select: { id: true } },
        posts: { select: { id: true } }
      }
    });

    if (!user) return res.status(404).json({ error: 'Not found' });

    res.json({
      ...user,
      threadCount: user.threads.length,
      postCount: user.posts.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set user role (admin only)
router.put('/role', auth, async (req, res) => {
  try {
    // Check if requester is admin
    const requester = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!requester || !ADMIN_USERS.includes(requester.username?.toLowerCase())) {
      return res.status(403).json({ error: 'Kun admins kan endre roller' });
    }

    const { username, role } = req.body;
    if (!username || !role) return res.status(400).json({ error: 'Mangler brukernavn eller rolle' });
    if (!['user', 'moderator', 'admin'].includes(role)) return res.status(400).json({ error: 'Ugyldig rolle' });

    const target = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } }
    });

    if (!target) return res.status(404).json({ error: `Bruker "${username}" ikke funnet` });

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role }
    });

    res.json({ success: true, user: { username: updated.username, role: updated.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
