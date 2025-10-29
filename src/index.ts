import { processPhoneNumber, validateTwilioSignature } from './utils';

interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    WORKER_URL?: string;
    TWILIO_AUTH_TOKEN?: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // Serve static assets for the website
        if (path === '/' || path.startsWith('/index.html') || path.startsWith('/styles.css') || path.startsWith('/app.js') || path === '/favicon.ico') {
            return env.ASSETS.fetch(request);
        }

        // Serve the hold music file
        if (path === '/please-hold.mp3') {
            return env.ASSETS.fetch(request);
        }

        // API endpoints
        if (path === '/api/analytics') {
            return handleAnalyticsRequest(env);
        }

        // Twilio webhook endpoints
        if (path === '/twilio/voice') {
            return handleTwilioVoiceWebhook(request, env);
        }

        if (path === '/twilio/status') {
            return handleTwilioStatusCallback(request, env);
        }

        // Default 404
        return new Response('Not Found', { status: 404 });
    },
} satisfies ExportedHandler<Env>;

// Handle analytics request
async function handleAnalyticsRequest(env: Env): Promise<Response> {
    try {
        // Fetch all analytics in parallel
        const [longestHold, mostCalls, totalTime, geoLeader, recentCalls] = await Promise.all([
            env.DB.prepare(`SELECT * FROM longest_single_hold LIMIT 1`).first(),
            env.DB.prepare(`SELECT * FROM most_calls LIMIT 1`).first(),
            env.DB.prepare(`SELECT * FROM most_time_overall LIMIT 1`).first(),
            env.DB.prepare(`SELECT * FROM geographic_stats LIMIT 1`).first(),
            env.DB.prepare(`
                SELECT * FROM calls
                WHERE status = 'completed'
                ORDER BY start_time DESC
                LIMIT 10
            `).all()
        ]);

        return new Response(JSON.stringify({
            longestHold,
            mostCalls,
            totalTime,
            geoLeader,
            recentCalls: recentCalls.results
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle Twilio voice webhook (incoming call)
async function handleTwilioVoiceWebhook(request: Request, env: Env): Promise<Response> {
    try {
        // Parse Twilio's form data
        const formData = await request.formData();

        // Validate Twilio signature if auth token is configured
        if (env.TWILIO_AUTH_TOKEN) {
            const signature = request.headers.get('X-Twilio-Signature');
            if (!signature) {
                console.error('Missing X-Twilio-Signature header');
                return new Response('Unauthorized', { status: 401 });
            }

            // Convert FormData to params object
            const params: Record<string, string> = {};
            for (const [key, value] of formData.entries()) {
                params[key] = value.toString();
            }

            const isValid = await validateTwilioSignature(
                signature,
                request.url,
                params,
                env.TWILIO_AUTH_TOKEN
            );

            if (!isValid) {
                console.error('Invalid Twilio signature');
                return new Response('Unauthorized', { status: 401 });
            }
        }

        const callSid = formData.get('CallSid') as string;
        const from = formData.get('From') as string;
        const to = formData.get('To') as string;
        const fromCity = formData.get('FromCity') as string;
        const fromState = formData.get('FromState') as string;
        const fromCountry = formData.get('FromCountry') as string;

        // Process phone number for privacy
        const phoneData = processPhoneNumber(from);

        // Record call start in database with hashed phone number
        await env.DB.prepare(`
            INSERT INTO calls (
                call_sid,
                from_number,
                from_number_hash,
                from_number_display,
                from_area_code,
                to_number,
                start_time,
                status,
                city, state, country
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'answered', ?, ?, ?)
            ON CONFLICT(call_sid) DO UPDATE SET
                status = 'answered',
                updated_at = datetime('now')
        `).bind(
            callSid,
            phoneData.hashedNumber,
            phoneData.hashedNumber,
            phoneData.displayFormat,
            phoneData.areaCode || null,
            to,
            fromCity, fromState, fromCountry
        ).run();

        // Generate TwiML response
        const workerUrl = env.WORKER_URL || request.url.split('/twilio')[0];
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="joey" language="en-US">
        Thank you for calling Red Ball Market Global.
        Please hold for the next available agent.
    </Say>
    <Play loop="0">${workerUrl}/please-hold.mp3</Play>
</Response>`;

        return new Response(twiml, {
            headers: {
                'Content-Type': 'text/xml',
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error('Voice webhook error:', error);
        // Return simple TwiML on error
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>We're experiencing technical difficulties. Please try again later.</Say>
    <Hangup/>
</Response>`, {
            headers: { 'Content-Type': 'text/xml' }
        });
    }
}

// Handle Twilio status callback (call events)
async function handleTwilioStatusCallback(request: Request, env: Env): Promise<Response> {
    try {
        // Parse Twilio's form data
        const formData = await request.formData();

        // Validate Twilio signature if auth token is configured
        if (env.TWILIO_AUTH_TOKEN) {
            const signature = request.headers.get('X-Twilio-Signature');
            if (!signature) {
                console.error('Missing X-Twilio-Signature header');
                return new Response('Unauthorized', { status: 401 });
            }

            // Convert FormData to params object
            const params: Record<string, string> = {};
            for (const [key, value] of formData.entries()) {
                params[key] = value.toString();
            }

            const isValid = await validateTwilioSignature(
                signature,
                request.url,
                params,
                env.TWILIO_AUTH_TOKEN
            );

            if (!isValid) {
                console.error('Invalid Twilio signature');
                return new Response('Unauthorized', { status: 401 });
            }
        }

        const callSid = formData.get('CallSid') as string;
        const callStatus = formData.get('CallStatus') as string;
        const callDuration = formData.get('CallDuration') as string;
        const timestamp = formData.get('Timestamp') as string;

        if (callStatus === 'completed' && callDuration) {
            // Update call with duration
            await env.DB.prepare(`
                UPDATE calls
                SET
                    end_time = ?,
                    duration_seconds = ?,
                    status = ?,
                    updated_at = datetime('now')
                WHERE call_sid = ?
            `).bind(
                timestamp || new Date().toISOString(),
                parseInt(callDuration),
                callStatus,
                callSid
            ).run();
        } else if (callStatus) {
            // Update call status
            await env.DB.prepare(`
                UPDATE calls
                SET
                    status = ?,
                    updated_at = datetime('now')
                WHERE call_sid = ?
            `).bind(callStatus, callSid).run();
        }

        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Status callback error:', error);
        return new Response('Error', { status: 500 });
    }
}