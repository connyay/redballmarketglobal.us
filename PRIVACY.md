# Privacy Implementation

## Overview

This application implements privacy-preserving phone number storage using HMAC-SHA256 with a secret key. No actual phone numbers are stored in the database, and the hashing method is resistant to rainbow table attacks.

## How It Works

### Phone Number Processing

When a call comes in via Twilio:

1. **Full Hashing**: The complete phone number is hashed using HMAC-SHA256 with a secret key to create a unique identifier for database storage
2. **Display Format**: A clean, privacy-preserving display format is generated:
   - Shows area code (first 3 digits) for geographic context
   - Shows 4-character hash of the remaining 7 digits (also using HMAC-SHA256)
   - Example: `(912) 7B3A` or `(224) 0411`

### Database Storage

The database stores:

- `from_number`: HMAC-SHA256 hash (16 hex characters) - primary storage field
- `from_number_hash`: HMAC-SHA256 hash (16 hex characters) - used as unique identifier
- `from_number_display`: Privacy-preserving display format (e.g., `(912) 7B3A`)
- `from_area_code`: First 3 digits (for geographic analysis)
- `to_number`: Destination number (your Twilio number)
- `city`, `state`, `country`: Geographic data from Twilio

**No actual phone numbers are ever stored in the database.**

### Analytics

- All grouping and aggregation is done using the hashed identifier
- Display formats are shown in the UI for human readability
- Geographic analysis still works using city/state/country from Twilio

## Security Benefits

1. **Rainbow Table Resistant**: HMAC-SHA256 with a secret key prevents pre-computed rainbow table attacks
2. **Privacy Protection**: Even if the database is compromised, actual phone numbers cannot be recovered without the secret key
3. **GDPR/CCPA Friendly**: Reduces PII storage concerns
4. **Consistent Tracking**: Same caller can still be tracked across multiple calls using the hash
5. **Geographic Context**: Area code provides regional information without exposing the full number
6. **Clean Display**: Format like `(912) 7B3A` is easy to read and professional-looking

## Why HMAC Instead of Simple Hashing?

Phone numbers have a limited keyspace (~10 billion US numbers). Without a secret key:

- Attackers could pre-compute hashes for all possible phone numbers
- Create a "rainbow table" to reverse any hash instantly
- Database breach would expose all phone numbers

HMAC-SHA256 with a secret key prevents this:

- **Secret Key**: Stored separately from the database (environment variable)
- **Rainbow Tables Impossible**: Without the key, pre-computation is useless
- **Cryptographically Secure**: Industry-standard keyed hashing algorithm

## Hash Collision Risk

HMAC-SHA256 produces a 256-bit hash (we use first 64 bits):

- Total possible values: 18,446,744,073,709,551,616
- Collision probability is extremely low for any realistic use case
- For a phone-trolling hotline, collision risk is negligible

## Example Data Flow

1. **Incoming Call**: `+19125551234`
2. **Secret Key**: `a57e92af...` (stored in environment variable)
3. **Full HMAC Hash**: `f3c8a9e1b2d4c7f6` (HMAC-SHA256 of complete number with secret)
4. **Display Hash**: `7B3A` (HMAC-SHA256 of last 7 digits: 5551234)
5. **Display Format**: `(912) 7B3A`
6. **Database Record**:

   ```sql
   from_number: 'f3c8a9e1b2d4c7f6'
   from_number_hash: 'f3c8a9e1b2d4c7f6'
   from_number_display: '(912) 7B3A'
   from_area_code: '912'
   city: 'Savannah'
   state: 'GA'
   country: 'US'
   ```

7. **UI Display**: Shows `(912) 7B3A` in analytics

## Setup

To use this implementation, you need to set the `PHONE_HASH_SECRET` environment variable:

### For Production (Cloudflare Workers)

```bash
# Generate a random 256-bit secret
openssl rand -hex 32

# Set as a Cloudflare secret
npx wrangler secret put PHONE_HASH_SECRET
# Paste the generated secret when prompted
```

### For Local Development

Create a `.dev.vars` file (don't commit this):

```
PHONE_HASH_SECRET=your_generated_secret_here
```

**Important**: Never commit the secret to version control. Keep it secure like any other credential.
