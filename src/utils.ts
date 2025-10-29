// Twilio signature validation
export async function validateTwilioSignature(
    signature: string,
    url: string,
    params: Record<string, string>,
    authToken: string
): Promise<boolean> {
    // 1. Start with the full URL
    let data = url;

    // 2. Sort parameters alphabetically and append to URL
    const sortedKeys = Object.keys(params).sort();
    for (const key of sortedKeys) {
        data += key + params[key];
    }

    // 3. Compute HMAC-SHA1 with auth token as key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(authToken);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

    // 4. Base64 encode the result
    const signatureArray = new Uint8Array(signatureBuffer);
    const base64Signature = btoa(String.fromCharCode(...signatureArray));

    // 5. Compare with provided signature
    return base64Signature === signature;
}

// HMAC-SHA256 implementation for secure phone number hashing
// This prevents rainbow table attacks by using a secret key
async function hmacHash(str: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(str);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Structure for storing phone number data
export interface PhoneNumberData {
    hashedNumber: string;  // Full hash for uniqueness
    displayFormat: string; // Partially obfuscated for display
    areaCode?: string;     // First 3 digits (if available)
}

// Process phone number for secure storage
// Uses HMAC-SHA256 with a secret key to prevent rainbow table attacks
export async function processPhoneNumber(phoneNumber: string | null, secret: string): Promise<PhoneNumberData> {
    if (!phoneNumber) {
        return {
            hashedNumber: 'anonymous',
            displayFormat: 'Anonymous'
        };
    }

    // Clean the number
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Generate full hash for storage using HMAC-SHA256
    // This is cryptographically secure and prevents rainbow table attacks
    const fullHash = await hmacHash(phoneNumber, secret);
    const hashedNumber = fullHash.substring(0, 16); // Use first 64 bits (16 hex chars)

    // Handle different phone number formats for display
    if (cleaned.length >= 10) {
        // Get the last 10 digits (removing country code if present)
        const last10 = cleaned.slice(-10);
        const areaCode = last10.substring(0, 3);
        const remainingDigits = last10.substring(3); // Last 7 digits

        // Hash just the last 7 digits for display
        const remainingHash = await hmacHash(remainingDigits, secret);
        const displayHash = remainingHash.substring(0, 4).toUpperCase();

        return {
            hashedNumber,
            displayFormat: `(${areaCode}) ${displayHash}`,
            areaCode,
        };
    }

    // For shorter numbers, hash the whole thing
    if (cleaned.length >= 7) {
        const shortHash = await hmacHash(cleaned, secret);
        const displayHash = shortHash.substring(0, 6).toUpperCase();
        return {
            hashedNumber,
            displayFormat: `${displayHash}`,
        };
    }

    // For very short numbers, use a generic format
    return {
        hashedNumber,
        displayFormat: `Unknown`
    };
}