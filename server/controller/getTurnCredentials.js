const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');

const getTurnCredentials = async (request, response) => {
    try {
        const token = request.cookies.token || '';
        const user = await getUserDetailsFromToken(token);
        if (!user || user.logout) {
            return response.status(401).json({ message: 'Please sign in again.', error: true });
        }

        const turnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID;
        const turnApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
        if (!turnKeyId || !turnApiToken) {
            return response.status(503).json({
                message: 'TURN relay has not been configured.',
                error: true
            });
        }

        const turnResponse = await fetch(
            `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${turnApiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ttl: 3600 })
            }
        );
        const payload = await turnResponse.json();
        if (!turnResponse.ok || !payload.iceServers) {
            console.error('Cloudflare TURN credential request failed:', payload);
            return response.status(502).json({ message: 'Could not prepare the call relay.', error: true });
        }

        return response.status(200).json({ success: true, iceServers: payload.iceServers });
    } catch (error) {
        console.error('TURN credential error:', error);
        return response.status(500).json({ message: 'Could not prepare the call relay.', error: true });
    }
};

module.exports = getTurnCredentials;
