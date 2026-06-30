const express = require('express');
const { prisma } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const STAFF = ['polosop', 'endzzern'];

// Get all threads (pinned first, then by date)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const where = search ? { title: { contains: search, mode: 'insensitive' } } : {};

    const threads = await prisma.thread.findMany({
      where,
      skip,
      take: limit,
      include: {
        author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } },
        posts: { select: { id: true } },
        likes: { select: { id: true } }
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }]
    });

    const total = await prisma.thread.count({ where });

    res.json({
      threads: threads.map(t => ({
        ...t,
        postCount: t.posts.length,
        likeCount: t.likes.length
      })),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single thread
router.get('/:id', async (req, res) => {
  try {
    const thread = await prisma.thread.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } },
        posts: {
          include: {
            author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } },
            likes: { select: { userId: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        likes: { select: { userId: true } }
      }
    });

    if (!thread) return res.status(404).json({ error: 'Not found' });

    await prisma.thread.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } }
    });

    res.json(thread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create thread
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Missing fields' });

    const thread = await prisma.thread.create({
      data: {
        title,
        content,
        category: category || 'Generelt',
        authorId: req.userId
      },
      include: { author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } } }
    });
    res.json(thread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update thread (author or staff)
router.put('/:id', auth, async (req, res) => {
  try {
    const thread = await prisma.thread.findUnique({ where: { id: req.params.id } });
    if (!thread) return res.status(404).json({ error: 'Not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isStaff = STAFF.includes(user?.username?.toLowerCase()) || user?.role === 'moderator';

    // Only author can edit content, staff can pin/lock
    const data = {};
    if (thread.authorId === req.userId) {
      if (req.body.title) data.title = req.body.title;
      if (req.body.content) data.content = req.body.content;
    }
    if (isStaff) {
      if (req.body.pinned !== undefined) data.pinned = req.body.pinned;
      if (req.body.locked !== undefined) data.locked = req.body.locked;
    }

    if (Object.keys(data).length === 0) return res.status(403).json({ error: 'Ingen tilgang' });

    const updated = await prisma.thread.update({
      where: { id: req.params.id },
      data,
      include: { author: { select: { id: true, username: true, avatar: true, discordId: true, role: true } } }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete thread (author or staff)
router.delete('/:id', auth, async (req, res) => {
  try {
    const thread = await prisma.thread.findUnique({ where: { id: req.params.id } });
    if (!thread) return res.status(404).json({ error: 'Not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isStaff = STAFF.includes(user?.username?.toLowerCase()) || user?.role === 'moderator';

    if (thread.authorId !== req.userId && !isStaff) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.thread.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
