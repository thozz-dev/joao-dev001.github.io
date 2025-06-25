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
    const DISCORD_DARKWEB_WEBHOOK = process.env.DISCORD_DARKWEB_WEBHOOK;
    if (!DISCORD_DARKWEB_WEBHOOK) {
        console.error('DISCORD_DARKWEB_WEBHOOK environment variable not set.');
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
        if (!data.type || !data.contactData || !data.accessConfig) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Données manquantes: type, contactData et accessConfig sont requis.' })
            };
        }
        let embedTitle = "🚨 ALERTE DARKWEB - ACCÈS DÉTECTÉ 🚨";
        let embedColor = 0xFF5733;
        let description = `Un accès spécial a été détecté pour la page : **${data.accessConfig.redirectPage}**`;
        let fields = [
            {
                name: "👤 Informations de l'utilisateur",
                value: `**Nom:** ${data.contactData.name}\n**Email:** ${data.contactData.email}\n**Sujet:** ${data.contactData.subject}`,
                inline: false
            },
            {
                name: "💬 Message soumis",
                value: `\`\`\`\n${data.contactData.message.substring(0, 1000)}\n\`\`\``,
                inline: false
            },
            {
                name: "⏰ Heure de l'accès",
                value: `<t:${Math.floor(new Date(data.contactData.timestamp).getTime() / 1000)}:F>`,
                inline: true
            }
        ];
        if (data.type === 'failed_attempt') {
            embedTitle = "⚠️ ALERTE : TENTATIVE D'ACCÈS ÉCHOUÉE ⚠️";
            embedColor = 0xffc107;
            description = `Une tentative d'accès à la page **${data.accessConfig.redirectPage}** a échoué.`;
            fields.unshift({
                name: "Motif de l'échec",
                value: "Les informations fournies ne correspondent pas aux critères d'accès.",
                inline: false
            });
        }
        const embed = {
            title: embedTitle,
            description: description,
            color: embedColor,
            fields: fields,
            thumbnail: {
                url: "https://cdn-icons-png.flaticon.com/512/2889/2889676.png"
            },
            footer: {
                text: `Accès Sécurisé • ${new Date().getFullYear()}`,
                icon_url: "https://cdn-icons-png.flaticon.com/512/1828/1828884.png"
            },
            timestamp: new Date().toISOString()
        };
        const discordPayload = {
            content: `⚠️ **ALERTE SÉCURITÉ** ⚠️\n${data.type === 'failed_attempt' ? 'Une tentative d\'accès non autorisée' : 'Un accès spécial'} a été détecté.`,
            embeds: [embed]
        };
        const response = await fetch(DISCORD_DARKWEB_WEBHOOK, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'EveryWater-DarkwebFunction/1.0'
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
        console.log(`✅ Notification darkweb (${data.type}) envoyée avec succès à Discord`);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: `Notification darkweb (${data.type}) envoyée avec succès!` 
            })
        };
    } catch (error) {
        console.error('Darkweb function error:', error);
        return { 
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: `Erreur lors de l'envoi de la notification darkweb: ${error.message}` 
            }) 
        };
    }
};
