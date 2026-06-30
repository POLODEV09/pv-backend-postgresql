const express = require('express');
const { prisma } = require('../server');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ threads: [], posts: [] });

    const threads = await prisma.thread.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 10,
      include: { author: { select: { username: true } } }
    });

    const posts = await prisma.post.findMany({
      where: { content: { contains: q, mode: 'insensitive' } },
      take: 10,
      include: { author: { select: { username: true } } }
    });

    res.json({ threads, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
