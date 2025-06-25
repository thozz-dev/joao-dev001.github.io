const fetch = require('node-fetch');
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_ORDERS_WEBHOOK; 
    if (!DISCORD_WEBHOOK_URL) {
        console.error('DISCORD_ORDERS_WEBHOOK environment variable not set.');
        return { statusCode: 500, body: 'Webhook URL not configured.' };
    }
    try {
        const data = JSON.parse(event.body);
        const discordPayload = {
            content: data.content,
            embeds: data.embeds
        };
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'EveryWater-ServerlessFunction/1.0'
            },
            body: JSON.stringify(discordPayload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Discord API Error:', response.status, errorText);
            return { statusCode: response.status, body: `Discord API Error: ${errorText}` };
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhook sent successfully!' })
        };
    } catch (error) {
        console.error('Function error:', error);
        return { statusCode: 500, body: `Error sending webhook: ${error.message}` };
    }
};
