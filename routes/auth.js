const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { prisma } = require('../server');

const router = express.Router();

router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code' });

    // Get Discord token
    const tokenRes = await axios.post('https://discord.com/api/v10/oauth2/token', {
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenRes.data.access_token;

    // Get user info from Discord
    const userRes = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const discordUser = userRes.data;

    // Find or create user in DB
    let user = await prisma.user.findUnique({
      where: { discordId: discordUser.id }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: discordUser.id,
          username: discordUser.username,
          avatar: discordUser.avatar,
          email: discordUser.email
        }
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
