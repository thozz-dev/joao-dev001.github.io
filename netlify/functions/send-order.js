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
    const DISCORD_ORDERS_WEBHOOK = process.env.DISCORD_ORDERS_WEBHOOK;
    if (!DISCORD_ORDERS_WEBHOOK) {
        console.error('DISCORD_ORDERS_WEBHOOK environment variable not set.');
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
        const orderData = JSON.parse(event.body);
        const embed = {
            title: "🛒 NOUVELLE COMMANDE - Every Water",
            description: `**Numéro de commande:** ${orderData.orderNumber}`,
            color: 0x00ff00,
            fields: [
                {
                    name: "👤 Client",
                    value: `**Nom:** ${orderData.customerName}\n**Email:** ${orderData.customerEmail}`,
                    inline: true
                },
                {
                    name: "📦 Produit",
                    value: `**Type:** ${orderData.productType}\n**Quantité:** ${orderData.quantity}`,
                    inline: true
                },
                {
                    name: "💰 Total",
                    value: `**Prix:** ${orderData.totalPrice}€`,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };
        const discordPayload = {
            content: "🛒 **NOUVELLE COMMANDE REÇUE !**",
            embeds: [embed]
        };
        const response = await fetch(DISCORD_ORDERS_WEBHOOK, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'EveryWater-OrderFunction/1.0'
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
        console.log('✅ Commande envoyée avec succès à Discord');
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Commande envoyée avec succès!',
                orderNumber: orderData.orderNumber
            })
        };
    } catch (error) {
        console.error('Order function error:', error);
        return { 
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: `Erreur lors de l'envoi de la commande: ${error.message}` 
            }) 
        };
    }
};
