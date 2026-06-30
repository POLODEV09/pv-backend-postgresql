const express = require('express');
const { prisma } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Like/unlike thread
router.post('/thread/:threadId', auth, async (req, res) => {
  try {
    const existing = await prisma.like.findUnique({
      where: {
        userId_threadId: {
          userId: req.userId,
          threadId: req.params.threadId
        }
      }
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      res.json({ liked: false });
    } else {
      await prisma.like.create({
        data: {
          userId: req.userId,
          threadId: req.params.threadId
        }
      });
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like/unlike post
router.post('/post/:postId', auth, async (req, res) => {
  try {
    const existing = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: req.userId,
          postId: req.params.postId
        }
      }
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      res.json({ liked: false });
    } else {
      await prisma.like.create({
        data: {
          userId: req.userId,
          postId: req.params.postId
        }
      });
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
