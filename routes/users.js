const express = require('express');
const { prisma } = require('../server');
const auth = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
