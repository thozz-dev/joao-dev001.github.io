exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }
    const DISCORD_CONTACT_WEBHOOK = process.env.DISCORD_CONTACT_WEBHOOK;
    if (!DISCORD_CONTACT_WEBHOOK) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Webhook URL not configured.' })
        };
    }
    try {
        const data = JSON.parse(event.body);
        if (!data.nom || !data.email || !data.message) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Données manquantes: nom, email et message sont requis.',
                    received: Object.keys(data)
                })
            };
        }
        const subjectColors = {
            'information': 0x17a2b8,
            'quote': 0x28a745,
            'complaint': 0xdc3545,
            'partnership': 0x6f42c1,
            'other': 0x6c757d
        };
        const getPriority = (subject) => {
            switch(subject) {
                case 'complaint': return '🔴 **URGENT**';
                case 'partnership': return '🟡 **IMPORTANT**';
                case 'quote': return '🟢 **BUSINESS**';
                default: return '🔵 **NORMAL**';
            }
        };
        const embedColor = subjectColors[data.subjectType] || 0x006bb3;
        const messageId = data.messageId || `MSG-${Date.now().toString().slice(-8)}`;
        const embed = {
            title: "📧 NOUVEAU MESSAGE DE CONTACT",
            description: `**Priorité:** ${getPriority(data.subjectType)}\n**Sujet:** ${data.sujet}\n**ID Message:** \`${messageId}\``,
            color: embedColor,
            fields: [
                {
                    name: "👤 INFORMATIONS CLIENT",
                    value: `**Nom:** ${data.nom}\n**Email:** ${data.email}`,
                    inline: true
                },
                {
                    name: "📊 DÉTAILS DE LA DEMANDE",
                    value: `**Type:** ${data.sujet}\n**Reçu le:** ${data.timestamp}`,
                    inline: true
                },
                {
                    name: "💬 MESSAGE COMPLET",
                    value: `\`\`\`\n${data.message.length > 1000 ? data.message.substring(0, 997) + "..." : data.message}\n\`\`\``,
                    inline: false
                }
            ],
            footer: {
                text: `Message ID: ${messageId} • Every Water Support`,
                icon_url: "https://cdn-icons-png.flaticon.com/512/3062/3062634.png"
            },
            timestamp: new Date().toISOString()
        };
        const discordPayload = {
            content: `📨 **NOUVEAU MESSAGE DE CONTACT** 📨\n**De:** ${data.nom} (${data.email})\n**Sujet:** ${data.sujet}`,
            embeds: [embed]
        };
        const response = await fetch(DISCORD_CONTACT_WEBHOOK, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(discordPayload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Discord API Error:', response.status, errorText);
            return { 
                statusCode: response.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: `Discord API Error: ${errorText}` }) 
            };
        }
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Message de contact envoyé avec succès!',
                messageId: messageId
            })
        };
    } catch (error) {
        console.error('Contact function error:', error);
        return { 
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: `Erreur: ${error.message}` 
            }) 
        };
    }
};