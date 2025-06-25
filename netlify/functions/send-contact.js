
const fetch = require('node-fetch');
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }
    const DISCORD_CONTACT_WEBHOOK = process.env.DISCORD_CONTACT_WEBHOOK;
    if (!DISCORD_CONTACT_WEBHOOK) {
        console.error('DISCORD_CONTACT_WEBHOOK environment variable not set.');
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Webhook URL not configured.' }) 
        };
    }
    try {
        const data = JSON.parse(event.body);
        if (!data.nom || !data.email || !data.message || !data.sujet) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Données manquantes: nom, email, sujet et message sont requis.' })
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
                },
                {
                    name: "🎯 ACTIONS A FAIRE",
                    value: data.subjectType === 'complaint' ? 
                        '⚡ **Réponse immédiate requise**\n📞 Appeler le client en priorité' :
                        data.subjectType === 'quote' ?
                        '💼 **Préparer un devis personnalisé**\n📧 Répondre sous 24h' :
                        '📧 **Répondre par email**\n📞 Ou contacter par téléphone si nécessaire',
                    inline: false
                }
            ],
            author: {
                name: "Every Water - Centre de Contact",
                icon_url: "https://cdn.discordapp.com/attachments/1232583375181582366/1386711049759096833/raw.png?ex=685ab2ce&is=6859614e&hm=1c495883e585e82ba26331cab3699dc8e697706be58b75fad0cdb24688a80a10&"
            },
            thumbnail: {
                url: data.subjectType === 'complaint' ? 
                    "https://cdn-icons-png.flaticon.com/512/1828/1828843.png" :
                    "https://cdn.discordapp.com/attachments/1232583375181582366/1386711049759096833/raw.png?ex=685ab2ce&is=6859614e&hm=1c495883e585e82ba26331cab3699dc8e697706be58b75fad0cdb24688a80a10&"
            },
            footer: {
                text: `Message ID: ${messageId} • Every Water Support`,
                icon_url: "https://cdn-icons-png.flaticon.com/512/3062/3062634.png"
            },
            timestamp: new Date().toISOString()
        };
        const discordPayload = {
            content: `📨 **NOUVEAU MESSAGE DE CONTACT** 📨\n\n` +
                    `**De:** ${data.nom} (${data.email})\n` +
                    `**Sujet:** ${data.sujet}\n` +
                    `**Priorité:** ${getPriority(data.subjectType)}\n\n` +
                    `📞 **Rappel:** Ce client souhaite être recontacté directement par téléphone ou mail.\n\n` +
                    `**ID Message:** \`${messageId}\``,
            embeds: [embed]
        };
        const response = await fetch(DISCORD_CONTACT_WEBHOOK, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'EveryWater-ContactFunction/1.0'
            },
            body: JSON.stringify(discordPayload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Discord API Error:', response.status, errorText);
            return { 
                statusCode: response.status, 
                body: JSON.stringify({ error: `Discord API Error: ${errorText}` }) 
            };
        }
        console.log('✅ Message de contact envoyé avec succès à Discord');
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
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
            body: JSON.stringify({ 
                error: `Erreur lors de l'envoi du message de contact: ${error.message}` 
            }) 
        };
    }
};
