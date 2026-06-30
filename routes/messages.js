const express = require('express');
const { prisma } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all conversations (inbox)
router.get('/', auth, async (req, res) => {
  try {
    // Get all unique users this user has messaged with
    const sent = await prisma.message.findMany({
      where: { senderId: req.userId },
      select: { receiverId: true },
      distinct: ['receiverId']
    });
    const received = await prisma.message.findMany({
      where: { receiverId: req.userId },
      select: { senderId: true },
      distinct: ['senderId']
    });

    const userIds = [...new Set([
      ...sent.map(m => m.receiverId),
      ...received.map(m => m.senderId)
    ])];

    // Get conversations with last message and unread count
    const conversations = await Promise.all(userIds.map(async (otherId) => {
      const lastMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: req.userId, receiverId: otherId },
            { senderId: otherId, receiverId: req.userId }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { username: true } } }
      });

      const unread = await prisma.message.count({
        where: { senderId: otherId, receiverId: req.userId, read: false }
      });

      const otherUser = await prisma.user.findUnique({
        where: { id: otherId },
        select: { id: true, username: true, avatar: true, discordId: true, role: true }
      });

      return { user: otherUser, lastMessage: lastMsg, unread };
    }));

    // Sort by last message date
    conversations.sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread count
router.get('/unread', auth, async (req, res) => {
  try {
    const count = await prisma.message.count({
      where: { receiverId: req.userId, read: false }
    });
    res.json({ unread: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get conversation with specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.userId, receiverId: req.params.userId },
          { senderId: req.params.userId, receiverId: req.userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, username: true, avatar: true, discordId: true } }
      }
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: { senderId: req.params.userId, receiverId: req.userId, read: false },
      data: { read: true }
    });

    const otherUser = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, username: true, avatar: true, discordId: true, role: true }
    });

    res.json({ messages, user: otherUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ error: 'Mangler mottaker eller melding' });
    }
    if (receiverId === req.userId) {
      return res.status(400).json({ error: 'Du kan ikke sende melding til deg selv' });
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return res.status(404).json({ error: 'Bruker ikke funnet' });

    const message = await prisma.message.create({
      data: {
        content: content.trim().slice(0, 2000),
        senderId: req.userId,
        receiverId
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true, discordId: true } }
      }
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (for new message)
router.get('/users/all', auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.userId } },
      select: { id: true, username: true, avatar: true, discordId: true, role: true },
      orderBy: { username: 'asc' }
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
