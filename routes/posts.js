const express = require('express');
const { prisma } = require('../server');
const auth = require('../middleware/auth');

const router = express.Router();

// Get posts for thread
router.get('/thread/:threadId', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { threadId: req.params.threadId },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        likes: { select: { userId: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create post
router.post('/', auth, async (req, res) => {
  try {
    const { content, threadId } = req.body;
    if (!content || !threadId) return res.status(400).json({ error: 'Missing fields' });

    const post = await prisma.post.create({
      data: {
        content,
        threadId,
        authorId: req.userId
      },
      include: { author: { select: { id: true, username: true, avatar: true } } }
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update post
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: { content: req.body.content },
      include: { author: { select: { id: true, username: true, avatar: true } } }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
