# Deployment Guide

This guide covers deploying ClawLens to production using Vercel.

## Prerequisites

- [Vercel Account](https://vercel.com)
- [GitHub Repository](https://github.com/monsoonx9/clawlens)
- [Upstash Account](https://upstash.com) for Redis caching

## Environment Variables

ClawLens requires the following environment variables:

| Variable                        | Required | Description                                           |
| ------------------------------- | -------- | ----------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`        | Yes      | Upstash Redis REST URL                                |
| `UPSTASH_REDIS_REST_TOKEN`      | Yes      | Upstash Redis REST Token                              |
| `VAULT_SECRET`                  | Yes      | Secret key for encrypting API keys (min 32 chars)     |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase Project URL                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase Publishable (Anon) Key                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase Legacy Service Role Key (for backend ops)    |
| `NEXT_PUBLIC_APP_URL`           | No       | Production URL (e.g., `https://clawlens-beta.vercel.app`) |
| `TELEGRAM_BOT_TOKEN`            | No       | Telegram Bot Token from @BotFather                    |
| `TELEGRAM_WEBHOOK_SECRET`       | No       | Secret for Telegram webhook verification              |

### Getting Upstash Credentials

1. Create a free account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the `REST URL` and `REST Token` from the dashboard

### Generating VAULT_SECRET

```bash
# Generate a secure random key
openssl rand -base64 32
```

## Deployment Options

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

Follow the prompts:

- Set up and deploy? Yes
- Which scope? Your username
- Link to existing project? No
- Project name: `clawlens`
- Directory? Current directory
- Want to modify settings? Yes
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Development Command: `npm run dev`

### Option 2: Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Add the environment variables in the "Environment Variables" section
4. Click "Deploy"

## Environment Variables in Vercel

Add these in your Vercel project settings:

```
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxx
VAULT_SECRET=your-generated-secret-key
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## Domain Configuration

After deployment, you can add a custom domain:

1. Go to Project Settings → Domains
2. Add `clawlens-beta.vercel.app`
3. Update your DNS records as instructed by Vercel

## Setting up the Telegram Webhook (Optional)

If you have provided `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in your Vercel environment:

1. After your app is deployed, you must register the webhook with Telegram.
2. Run this command in your terminal (replace placeholders with your actual values):

```bash
curl -F "url=https://[YOUR-VERCEL-DOMAIN]/api/telegram/webhook" \
     -F "secret_token=[YOUR-WEBHOOK-SECRET]" \
     https://api.telegram.org/bot[YOUR-BOT-TOKEN]/setWebhook
```

3. The API should return `{"ok":true,"result":true,"description":"Webhook was set"}`.

## Post-Deployment

### Verify Deployment

1. Visit your deployed URL
2. Complete the onboarding flow
3. Test the Council feature by asking a question
4. Test the Personal Assistant (New Chat)
5. (Optional) Connect Telegram bot in Settings and test messaging
6. Verify all pages load correctly

### Performance Optimization

The project is pre-configured with:

- Server-side rendering (SSR)
- Static optimization where applicable
- Image optimization via next/image

## Troubleshooting

### Build Failures

If the build fails:

```bash
# Test locally first
npm run build
npm run lint
```

### Redis Connection Issues

- Verify `UPSTASH_REDIS_REST_URL` is correct
- Ensure your Upstash database is active
- Check that your IP is not blocked

### API Rate Limiting

If you hit rate limits:

- The app includes built-in rate limiting (200 req/min)
- Consider upgrading your Upstash plan for higher limits

### Session Issues

Sessions are stored in Redis with a 30-day TTL. If sessions aren't persisting:

- Check Redis connection
- Verify `VAULT_SECRET` hasn't changed (it would invalidate encrypted data)

## Monitoring

Vercel provides built-in:

- Deployment logs
- Function logs
- Performance metrics
- Analytics (enable in project settings)

## Security Notes

- API keys are encrypted with AES-256 before storage
- Keys never leave the server (stored in Redis)
- The app recommends read-only Binance API keys
- No telemetry or analytics tracking

## Scaling

For production use:

- Upgrade Upstash to a paid plan for higher limits
- Consider adding Vercel Analytics
- Enable Edge Caching in project settings

## Support

For issues specific to deployment:

1. Check Vercel function logs
2. Review this deployment guide
3. Open an issue on GitHub
