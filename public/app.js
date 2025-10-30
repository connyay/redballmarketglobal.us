// Configuration
const TWILIO_PHONE_NUMBER = '+1-912-912-7264'; // 912-912-RBMG

// Format duration from seconds to human-readable format
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '--:--';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Format phone number for display (now uses pre-obfuscated display format from server)
function formatPhoneNumber(displayFormat, fallback) {
    // If we have a display format from the server, use it
    if (displayFormat && displayFormat !== 'Unknown') return displayFormat;
    // Otherwise return fallback or 'Unknown'
    return fallback || 'Unknown';
}

// Fetch and display analytics
async function fetchAnalytics() {
    try {
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics');

        const data = await response.json();

        // Update longest hold
        if (data.longestHold) {
            document.getElementById('longestHold').textContent = formatDuration(data.longestHold.duration_seconds);
            document.getElementById('longestHoldDetail').textContent =
                `${formatPhoneNumber(data.longestHold.from_number_display)} - ${data.longestHold.city || 'Unknown'}, ${data.longestHold.state || ''}`;
        }

        // Update most persistent caller
        if (data.mostCalls) {
            document.getElementById('mostCalls').textContent = `${data.mostCalls.total_calls} calls`;
            document.getElementById('mostCallsDetail').textContent =
                `${formatPhoneNumber(data.mostCalls.from_number_display)} - ${data.mostCalls.city || 'Unknown'}, ${data.mostCalls.state || ''}`;
        }

        // Update total time champion
        if (data.totalTime) {
            document.getElementById('totalTime').textContent = formatDuration(data.totalTime.total_duration_seconds);
            document.getElementById('totalTimeDetail').textContent =
                `${formatPhoneNumber(data.totalTime.from_number_display)} - ${data.totalTime.total_calls} calls`;
        }

        // Update geographic leader
        if (data.geoLeader) {
            document.getElementById('geoLeader').textContent = `${data.geoLeader.state || data.geoLeader.country || 'Unknown'}`;
            document.getElementById('geoLeaderDetail').textContent =
                `${data.geoLeader.total_calls} calls, ${formatDuration(data.geoLeader.total_duration_seconds)} total`;
        }

        // Update active callers
        if (data.activeCalls && data.activeCalls.length > 0) {
            document.getElementById('activeCount').textContent = data.activeCalls.length;
            const activeList = document.getElementById('activeCallersList');
            activeList.innerHTML = data.activeCalls.map(call => `
                <div class="active-caller-item">
                    <div class="active-caller-info">
                        <div class="active-caller-number">${formatPhoneNumber(call.from_number_display, 'Unknown')}</div>
                        <div class="active-caller-location">${call.city || 'Unknown'}, ${call.state || ''} ${call.country || ''}</div>
                    </div>
                    <div class="active-caller-duration">${formatDuration(call.current_duration_seconds)}</div>
                </div>
            `).join('');
        } else {
            document.getElementById('activeCount').textContent = '0';
            document.getElementById('activeCallersList').innerHTML = '';
        }

        // Update recent calls
        if (data.recentCalls && data.recentCalls.length > 0) {
            const callsList = document.getElementById('recentCallsList');
            callsList.innerHTML = data.recentCalls.map(call => `
                <div class="call-item">
                    <div class="call-info">
                        <div class="call-number">${formatPhoneNumber(call.from_number_display, 'Unknown')}</div>
                        <div class="call-location">${call.city || 'Unknown'}, ${call.state || ''} ${call.country || ''}</div>
                    </div>
                    <div class="call-duration">${formatDuration(call.duration_seconds)}</div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error fetching analytics:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set phone number
    const phoneLink = document.getElementById('phoneNumber');
    phoneLink.textContent = '(912) 912-RBMG';
    phoneLink.href = `tel:${TWILIO_PHONE_NUMBER}`;

    // Load analytics
    fetchAnalytics();

    // Refresh analytics every 30 seconds
    setInterval(fetchAnalytics, 30000);
});