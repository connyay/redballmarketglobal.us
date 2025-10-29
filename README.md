# Red Ball Market Global (RBMG) - Hold Music Hotline

A fictional company website with an infinite hold music phone line, powered by Cloudflare Workers, D1 Database, and Twilio. Features privacy-preserving call analytics with CRC32 hashed phone numbers.

![RBMG Website](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/cb7cb0a9-6102-4822-633c-b76b7bb25900/public)

## What is this?

This is a parody project that creates a professional-looking corporate website for the fictional "Red Ball Market Global" company (based on The Chair Company on HBO). When visitors call the phone number, they're greeted with a corporate hold message and infinite hold music. The system tracks all calls with privacy-preserving analytics.

## Features

- **🎭 Fictional Corporate Website**: Replica of the RBMG website with professional design
- **📞 Twilio Integration**: Real phone number that plays infinite hold music
- **🔒 Privacy-Preserving Analytics**: Phone numbers are hashed using CRC32 - never stored in plain text
- **📊 Call Tracking**:
  - Longest single hold time
  - Most persistent caller (most calls)
  - Total time champion
  - Geographic statistics by state/city
  - Recent calls list
- **☁️ Cloudflare Stack**:
  - Workers for serverless compute
  - D1 Database for SQL storage
  - Static Assets for the website

## Privacy Implementation

Phone numbers are **never** stored in the database. Instead:

- Full number is hashed with CRC32 for unique identification
- Display shows area code + hash: `(224) A3B4`
- Geographic data (city/state) is preserved from Twilio
- See [PRIVACY.md](PRIVACY.md) for full details

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Telephony**: Twilio Voice API
- **Deployment**: Cloudflare Workers Platform

## Project Structure

```
rbmg/
├── public/
│   ├── index.html          # Main website
│   ├── styles.css          # Website styling
│   ├── app.js              # Frontend analytics
│   └── please-hold.mp3     # Hold music file
├── src/
│   ├── index.ts            # Worker main entry point
│   └── utils.ts            # Phone number hashing utilities
├── migrations/
│   └── 0001_init.sql       # Database schema
├── DEPLOYMENT.md           # Detailed deployment guide
├── PRIVACY.md              # Privacy implementation details
└── wrangler.json           # Cloudflare Worker config
```

## Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Cloudflare Account](https://cloudflare.com)
- [Twilio Account](https://twilio.com)

### Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Apply database migrations locally**

   ```bash
   npm run seedLocalD1
   ```

3. **Start local dev server**

   ```bash
   npm run dev
   ```

4. **Visit** `http://localhost:8787` to see the website

### Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions including:

- Deploying to Cloudflare
- Setting up Twilio phone number
- Configuring webhooks
- Environment variables

**Quick deploy:**

```bash
# Deploy to Cloudflare
npm run deploy

# Apply migrations to production
npm run predeploy

# (Optional) Set worker URL if needed for MP3 file
wrangler secret put WORKER_URL
```

## API Endpoints

### Website

- `GET /` - Main website
- `GET /please-hold.mp3` - Hold music file

### Analytics API

- `GET /api/analytics` - Get call analytics data

### Twilio Webhooks

- `POST /twilio/voice` - Incoming call webhook (returns TwiML)
- `POST /twilio/status` - Call status callback (tracks call completion)

## Database Schema

```sql
CREATE TABLE calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_sid TEXT UNIQUE NOT NULL,
    from_number TEXT NOT NULL,         -- CRC32 hash
    from_number_hash TEXT,             -- CRC32 hash (duplicate for views)
    from_number_display TEXT,          -- Display format: (224) A3B4
    from_area_code TEXT,               -- First 3 digits
    to_number TEXT,                    -- Your Twilio number
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER,
    status TEXT NOT NULL,
    city TEXT,                         -- From Twilio
    state TEXT,                        -- From Twilio
    country TEXT,                      -- From Twilio
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Includes pre-built views for analytics:

- `longest_single_hold` - Top 10 longest hold times
- `most_calls` - Most frequent callers
- `most_time_overall` - Total time champions
- `geographic_stats` - Calls by location

## Customization

### Change Hold Music

Replace `public/please-hold.mp3` with your own file and redeploy.

### Modify Hold Message

Edit the `<Say>` element in `src/index.ts` (handleTwilioVoiceWebhook function):

```typescript
<Say voice="joey" language="en-US">
    Your custom message here
</Say>
```

### Update Website

Edit files in `public/`:

- `index.html` - Structure
- `styles.css` - Styling
- `app.js` - Frontend logic

## Scripts

```bash
npm run dev          # Start local development server
npm run check        # TypeScript check + dry-run deploy
npm run deploy       # Deploy to Cloudflare
npm run predeploy    # Apply DB migrations to production
npm run seedLocalD1  # Apply DB migrations locally
npm run cf-typegen   # Generate TypeScript types
```

## Cost Estimate

- **Cloudflare Workers**: Free tier (100,000 requests/day)
- **Cloudflare D1**: Free tier (5GB storage, 5M reads/day)
- **Twilio**: ~$1/month for phone number + per-minute charges for calls

## Security & Privacy

- Phone numbers are hashed with CRC32 before storage
- No PII is stored in plain text
- Geographic data from Twilio is preserved for analytics
- Suitable for GDPR/CCPA compliance
- See [PRIVACY.md](PRIVACY.md) for details

## License

MIT - This is a parody/joke project. RBMG is a fictional company.

## Acknowledgments

- RBMG design inspired by [The Chair Company on HBO](https://www.hbomax.com/shows/chair-company/eada90f0-b5b6-4fc4-aeeb-a350a9ceb46c)
- Built with Cloudflare Workers and D1
- Powered by Twilio Voice API
