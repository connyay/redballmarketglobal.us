# Privacy Implementation

## Overview

This application implements privacy-preserving phone number storage using CRC32 hashing. No actual phone numbers are stored in the database.

## How It Works

### Phone Number Processing

When a call comes in via Twilio:

1. **Full Hashing**: The complete phone number is hashed using CRC32 to create a unique identifier for database storage
2. **Display Format**: A clean, privacy-preserving display format is generated:
   - Shows area code (first 3 digits) for geographic context
   - Shows 4-character hash of the remaining 7 digits
   - Example: `(912) 7B3A` or `(224) 0411`

### Database Storage

The database stores:

- `from_number`: Full CRC32 hash (8 characters) - primary storage field
- `from_number_hash`: Full CRC32 hash (8 characters) - used as unique identifier
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

1. **Privacy Protection**: Even if the database is compromised, actual phone numbers cannot be recovered
2. **GDPR/CCPA Friendly**: Reduces PII storage concerns
3. **Consistent Tracking**: Same caller can still be tracked across multiple calls using the hash
4. **Geographic Context**: Area code provides regional information without exposing the full number
5. **Clean Display**: Format like `(912) 7B3A` is easy to read and professional-looking

## Hash Collision Risk

CRC32 produces a 32-bit hash (8 hex characters):

- Total possible values: 4,294,967,296
- Collision probability is very low for typical use cases
- For a phone-trolling hotline, unlikely to have millions of unique callers
- If collisions become an issue, can upgrade to SHA-256 or similar

## Example Data Flow

1. **Incoming Call**: `+19125551234`
2. **Full CRC32 Hash**: `a3b2c4d5` (hash of complete number)
3. **Display Hash**: `7B3A` (hash of last 7 digits: 5551234)
4. **Display Format**: `(912) 7B3A`
5. **Database Record**:

   ```sql
   from_number: 'a3b2c4d5'
   from_number_hash: 'a3b2c4d5'
   from_number_display: '(912) 7B3A'
   from_area_code: '912'
   city: 'Savannah'
   state: 'GA'
   country: 'US'
   ```

6. **UI Display**: Shows `(912) 7B3A` in analytics
