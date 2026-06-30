const express = require('express');
const { prisma } = require('../server');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all threads
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const threads = await prisma.thread.findMany({
      skip,
      take: limit,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        posts: { select: { id: true } },
        likes: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.thread.count();

    res.json({
      threads: threads.map(t => ({
        ...t,
        views: t.views,
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
        author: { select: { id: true, username: true, avatar: true } },
        posts: {
          include: {
            author: { select: { id: true, username: true, avatar: true } },
            likes: { select: { id: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        likes: { select: { userId: true } }
      }
    });

    if (!thread) return res.status(404).json({ error: 'Not found' });

    // Increment views
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
      include: { author: { select: { id: true, username: true, avatar: true } } }
    });

    res.json(thread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update thread
router.put('/:id', auth, async (req, res) => {
  try {
    const thread = await prisma.thread.findUnique({ where: { id: req.params.id } });
    if (!thread || thread.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.thread.update({
      where: { id: req.params.id },
      data: req.body,
      include: { author: { select: { id: true, username: true, avatar: true } } }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete thread
router.delete('/:id', auth, async (req, res) => {
  try {
    const thread = await prisma.thread.findUnique({ where: { id: req.params.id } });
    if (!thread || thread.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    await prisma.thread.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
