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
    const DISCORD_DARKWEBORDER_WEBHOOK = process.env.DISCORD_DARKWEBORDER_WEBHOOK;
    if (!DISCORD_DARKWEBORDER_WEBHOOK) {
        console.error('DISCORD_DARKWEBORDER_WEBHOOK environment variable not set.');
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
        let embedDescription, embedTitle;
        if (orderData.type === 'checkout') {
            embedTitle = "🛒 Nouvelle Commande - Panier";
            embedDescription = `**Commande Panier**\nRéférence: \`${orderData.orderRef}\`\nUtilisateur: \`${orderData.userName}\`\n\n**Articles Commandés:**\n${orderData.orderDetails}\n\n**Montant Total:** \`$${orderData.totalAmount.toLocaleString()}\``;
        } else if (orderData.type === 'direct_buy') {
            embedTitle = "⚡ Achat Direct";
            embedDescription = `**Achat Direct**\nRéférence: \`${orderData.orderRef}\`\nUtilisateur: \`${orderData.userName}\`\n\n**Article Acheté:**\n${orderData.product.name} ($${orderData.product.price.toLocaleString()})\n\n**Montant Total:** \`$${orderData.totalAmount.toLocaleString()}\``;
        }
        const embed = {
            title: embedTitle,
            description: embedDescription,
            color: 0xDC143C,
            timestamp: new Date().toISOString(),
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
                },
                {
                    name: "Type de Commande",
                    value: orderData.type === 'checkout' ? 'Panier Multiple' : 'Achat Direct',
                    inline: true
                }
            ],
            footer: {
                text: "El Cartel - Secure Access Portal",
                icon_url: "https://media.discordapp.net/attachments/1232583375181582366/1387087700313505852/3fcf2fe3-dd13-4798-9041-e8af8b338b51.png?ex=685c1196&is=685ac016&hm=0b98e6a808a15974a5bf2b1dd9d6467734bb0c31341970e093e34bee56b17fbb&=&format=webp&quality=lossless&width=930&height=930"
            }
        };
        const discordPayload = {
            content: `🚨 **NOUVELLE COMMANDE EL CARTEL** 🚨\n💰 **Montant:** $${orderData.totalAmount.toLocaleString()}\n👤 **Client:** ${orderData.userName}`,
            embeds: [embed]
        };
        const response = await fetch(DISCORD_DARKWEBORDER_WEBHOOK, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'ElCartel-OrderFunction/1.0'
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
        console.log(`✅ Commande darkweb ${orderData.orderRef} envoyée avec succès à Discord`);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Commande darkweb envoyée avec succès!',
                orderRef: orderData.orderRef
            })
        };
    } catch (error) {
        console.error('Darkweb order function error:', error);
        return { 
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: `Erreur lors de l'envoi de la commande darkweb: ${error.message}` 
            }) 
        };
    }
};
