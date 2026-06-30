# Project Vision Backend - PostgreSQL + Prisma

## Setup Lokalt

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

## Deploy til Render

1. Push til GitHub
2. Gå til https://render.com
3. Opprett **New PostgreSQL Database**
4. Opprett **New Web Service** fra GitHub repo
5. Set environment variables:
   - `DATABASE_URL` = connection string fra PostgreSQL
   - `JWT_SECRET` = random string
   - `DISCORD_CLIENT_ID` = 1513484851721011210
   - `DISCORD_CLIENT_SECRET` = ovVBLTJyijCCChYR9lWeik01oQVmXyBj
   - `DISCORD_REDIRECT_URI` = https://your-render-url.onrender.com/api/auth/callback

6. Build command: `npm install && npx prisma migrate deploy`
7. Start command: `npm start`

## API Endpoints

- `POST /api/auth/callback` - Discord login
- `GET /api/threads` - List threads
- `GET /api/threads/:id` - Get thread
- `POST /api/threads` - Create thread (auth required)
- `GET /api/posts/thread/:threadId` - Get posts
- `POST /api/posts` - Create post (auth required)
- `POST /api/likes/thread/:threadId` - Like thread
- `POST /api/likes/post/:postId` - Like post
- `GET /api/search?q=...` - Search
