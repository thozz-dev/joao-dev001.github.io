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
        let discordPayload;
        if (data.type === 'general_alert') {
            discordPayload = {
                embeds: [{
                    title: "El Cartel",
                    description: data.message,
                    color: data.color,
                    timestamp: data.timestamp,
                    fields: [
                        {
                            name: "Statut",
                            value: "Vérification en cours...",
                            inline: true
                        },
                        {
                            name: "Date et Heure",
                            value: new Date().toLocaleString(),
                            inline: true
                        }
                    ],
                    footer: {
                        text: "Secure Access Portal",
                        icon_url: "https://media.discordapp.net/attachments/1232583375181582366/1387087700313505852/3fcf2fe3-dd13-4798-9041-e8af8b338b51.png?ex=685c1196&is=685ac016&hm=0b98e6a808a15974a5bf2b1dd9d6467734bb0c31341970e093e34bee56b17fbb&=&format=webp&quality=lossless&width=930&height=930"
                    }
                }]
            };
        } else {
            let embedTitle = "🚨 ALERTE DARKWEB - ACCÈS DÉTECTÉ 🚨";
            let embedColor = 0xFF5733;
            let description = `Un accès spécial a été détecté pour la page : **${data.accessConfig?.redirectPage || 'Page sécurisée'}**`;
            if (data.type === 'failed_attempt') {
                embedTitle = "⚠️ ALERTE : TENTATIVE D'ACCÈS ÉCHOUÉE ⚠️";
                embedColor = 0xffc107;
                description = `Une tentative d'accès à la page **${data.accessConfig?.redirectPage || 'Page sécurisée'}** a échoué.`;
            }
            discordPayload = {
                content: `⚠️ **ALERTE SÉCURITÉ** ⚠️\n${data.type === 'failed_attempt' ? 'Une tentative d\'accès non autorisée' : 'Un accès spécial'} a été détecté.`,
                embeds: [{
                    title: embedTitle,
                    description: description,
                    color: embedColor,
                    fields: [
                        {
                            name: "👤 Informations de l'utilisateur",
                            value: `**Nom:** ${data.contactData?.name || 'N/A'}\n**Email:** ${data.contactData?.email || 'N/A'}`,
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };
        }
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
        console.log(`✅ Alerte darkweb envoyée avec succès à Discord`);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Alerte darkweb envoyée avec succès!'
            })
        };
    } catch (error) {
        console.error('Darkweb function error:', error);
        return { 
            statusCode: 500 ,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: `Erreur lors de l'envoi de l'alerte darkweb: ${error.message}` 
            }) 
        };
    }
};