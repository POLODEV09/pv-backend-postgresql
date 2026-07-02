const express = require('express');
const { prisma } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const STAFF = ['polosop', 'endzzern'];

const authorSelect = { id: true, username: true, avatar: true, discordId: true, role: true };

// Get posts for thread
router.get('/thread/:threadId', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { threadId: req.params.threadId },
      include: { author: { select: authorSelect }, likes: { select: { userId: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(posts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create post (check if thread is locked)
router.post('/', auth, async (req, res) => {
  try {
    const { content, threadId } = req.body;
    if (!content || !threadId) return res.status(400).json({ error: 'Missing fields' });

    const thread = await prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) return res.status(404).json({ error: 'Tråd ikke funnet' });
    if (thread.locked) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const isStaff = STAFF.includes(user?.username?.toLowerCase()) || ['moderator','admin','verifiseringsagent'].includes(user?.role);
      if (!isStaff) return res.status(403).json({ error: 'Denne tråden er låst' });
    }

    const post = await prisma.post.create({
      data: { content, threadId, authorId: req.userId },
      include: { author: { select: authorSelect } }
    });
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Edit post (author only)
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: { content: req.body.content },
      include: { author: { select: authorSelect } }
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete post (author or staff)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isStaff = STAFF.includes(user?.username?.toLowerCase()) || ['moderator','admin','verifiseringsagent'].includes(user?.role);

    if (post.authorId !== req.userId && !isStaff) return res.status(403).json({ error: 'Forbidden' });

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
