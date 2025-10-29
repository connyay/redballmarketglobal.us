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

// Simple CRC32 implementation for phone number hashing
function crc32(str: string): string {
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0');
}

// CRC32 lookup table
const crc32Table = (() => {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    return table;
})();

// Structure for storing phone number data
export interface PhoneNumberData {
    hashedNumber: string;  // Full hash for uniqueness
    displayFormat: string; // Partially obfuscated for display
    areaCode?: string;     // First 3 digits (if available)
}

// Process phone number for secure storage
export function processPhoneNumber(phoneNumber: string | null): PhoneNumberData {
    if (!phoneNumber) {
        return {
            hashedNumber: 'anonymous',
            displayFormat: 'Anonymous'
        };
    }

    // Clean the number
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Generate full hash for storage (this is what we store in DB as unique ID)
    const hashedNumber = crc32(phoneNumber);

    // Handle different phone number formats for display
    if (cleaned.length >= 10) {
        // Get the last 10 digits (removing country code if present)
        const last10 = cleaned.slice(-10);
        const areaCode = last10.substring(0, 3);
        const remainingDigits = last10.substring(3); // Last 7 digits

        // Hash just the last 7 digits for display
        const remainingHash = crc32(remainingDigits).substring(0, 4).toUpperCase();

        return {
            hashedNumber,
            displayFormat: `(${areaCode}) ${remainingHash}`,
            areaCode,
        };
    }

    // For shorter numbers, hash the whole thing
    if (cleaned.length >= 7) {
        const shortHash = crc32(cleaned).substring(0, 6).toUpperCase();
        return {
            hashedNumber,
            displayFormat: `${shortHash}`,
        };
    }

    // For very short numbers, use a generic format
    return {
        hashedNumber,
        displayFormat: `Unknown`
    };
}