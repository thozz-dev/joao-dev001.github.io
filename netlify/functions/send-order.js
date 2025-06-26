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
        if (!orderData.orderNumber || !orderData.customerName || !orderData.productName) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Données manquantes: orderNumber, customerName et productName sont requis.',
                    received: Object.keys(orderData)
                })
            };
        }
        let embedColor;
        if (orderData.isSubscription) {
            embedColor = 0x6f42c1;
        } else if (orderData.total >= 100) {
            embedColor = 0x00ff00;
        } else if (orderData.total >= 50) {
            embedColor = 0x4dd0e1;
        } else {
            embedColor = 0xffa500;
        }
        const embed = {
            title: orderData.isSubscription ? "📋 NOUVEL ABONNEMENT - Every Water" : "🛒 NOUVELLE COMMANDE - Every Water",
            description: `**Numéro:** \`${orderData.orderNumber}\`\n${orderData.isSubscription ? '🔄 **Abonnement mensuel récurrent**' : orderData.total >= 50 ? '🎉 **Commande éligible à la livraison gratuite !**' : '📦 Commande en cours de traitement...'}`,
            color: embedColor,
            fields: [
                {
                    name: "👤 INFORMATIONS CLIENT",
                    value: `**Nom:** ${orderData.customerName}\n**Téléphone:** ${orderData.customerPhone || 'Non renseigné'}`,
                    inline: true
                },
                {
                    name: "📍 ADRESSE",
                    value: `\`\`\`\n${orderData.customerAddress || 'À définir'}\n\`\`\``,
                    inline: true
                },
                {
                    name: orderData.isSubscription ? "📋 DÉTAILS ABONNEMENT" : "🛍️ DÉTAILS PRODUIT",
                    value: orderData.isSubscription ? 
                        `🔄 **${orderData.productName}**\n💰 **Prix mensuel:** ${orderData.price.toFixed(2)}€\n📅 **Facturation:** Mensuelle` :
                        `🛍️ **${orderData.productName}**\n📦 **Quantité:** ${orderData.quantity}\n💰 **Prix unitaire:** ${orderData.price.toFixed(2)}€`,
                    inline: false
                },
                {
                    name: "💳 RÉCAPITULATIF FINANCIER",
                    value: orderData.isSubscription ?
                        `**Montant mensuel:** ${orderData.total.toFixed(2)}€\n**Livraison:** Incluse\n**TOTAL MENSUEL:** **${orderData.total.toFixed(2)}€**` :
                        `**Sous-total:** ${orderData.subtotal.toFixed(2)}€\n**Livraison:** ${orderData.deliveryFee === 0 ? '🆓 Gratuite' : `${orderData.deliveryFee.toFixed(2)}€`}\n**TOTAL:** **${orderData.total.toFixed(2)}€**`,
                    inline: true
                },
                {
                    name: "📅 PLANNING",
                    value: orderData.isSubscription ?
                        `**Début souhaité:** ${orderData.deliveryDate ? new Date(orderData.deliveryDate).toLocaleDateString('fr-FR') : 'À définir'}\n**Prochaine livraison:** Mensuelle` :
                        orderData.deliveryDate ? 
                            `**Date souhaitée:** ${new Date(orderData.deliveryDate).toLocaleDateString('fr-FR', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}` : 
                            '**Date:** À définir avec le client',
                    inline: true
                },
                {
                    name: "📝 INSTRUCTIONS SPÉCIALES",
                    value: orderData.specialInstructions ? 
                        `\`\`\`\n${orderData.specialInstructions}\n\`\`\`` : 
                        '*Aucune instruction particulière*',
                    inline: false
                }
            ],
            author: {
                name: "Every Water - Système de Commandes",
                icon_url: "https://cdn.discordapp.com/attachments/1232583375181582366/1386711049759096833/raw.png?ex=685ab2ce&is=6859614e&hm=1c495883e585e82ba26331cab3699dc8e697706be58b75fad0cdb24688a80a10&"
            },
            thumbnail: {
                url: orderData.isSubscription ? 
                    "https://cdn-icons-png.flaticon.com/512/2917/2917995.png" :
                    "https://cdn-icons-png.flaticon.com/512/3081/3081559.png"
            },
            footer: {
                text: `${orderData.isSubscription ? 'Abonnement' : 'Commande'} reçu(e) le ${orderData.timestamp} • Every Water - ID: ${orderData.orderNumber}`,
                icon_url: "https://cdn-icons-png.flaticon.com/512/1828/1828884.png"
            },
            timestamp: new Date().toISOString()
        };
        const messageContent = {
            content: orderData.isSubscription ?
                `🔄 **NOUVEL ABONNEMENT EVERY WATER** 🔄\n\n` +
                `💰 **Montant mensuel:** ${orderData.total.toFixed(2)}€\n` +
                `📞 **Action requise:** Contacter le client pour finaliser l'abonnement\n` +
                `⏰ **Délai de traitement:** 24h maximum\n\n` +
                `✅ Installation et maintenance incluses` :
                `🚨 **NOUVELLE COMMANDE EVERY WATER** 🚨\n\n` +
                `💰 **Montant:** ${orderData.total.toFixed(2)}€ ${orderData.total >= 100 ? '🔥 **GROSSE COMMANDE !**' : ''}\n` +
                `📞 **Action requise:** Contacter le client dans les plus brefs délais\n` +
                `⏰ **Délai de traitement:** 24h maximum\n\n` +
                `${orderData.total >= 50 ? '✅ Livraison gratuite appliquée' : '⚠️ Frais de livraison: 5€'}\n\n` +
                `**ID Commande:** \`${orderData.orderNumber}\``,
            embeds: [embed]
        };
        const response = await fetch(DISCORD_ORDERS_WEBHOOK, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'EveryWater-OrderFunction/1.0'
            },
            body: JSON.stringify(messageContent)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Discord API Error:', response.status, errorText);
            let errorMessage = `Discord API Error: ${errorText}`;
            if (response.status === 404) {
                errorMessage = 'Le webhook Discord n\'existe plus ou a été supprimé.';
            } else if (response.status === 401) {
                errorMessage = 'Token d\'authentification Discord invalide.';
            } else if (response.status === 429) {
                errorMessage = 'Limite de taux Discord atteinte. Veuillez réessayer plus tard.';
            }
            return { 
                statusCode: response.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: errorMessage }) 
            };
        }
        console.log(`✅ ${orderData.isSubscription ? 'Abonnement' : 'Commande'} ${orderData.orderNumber} envoyé(e) avec succès à Discord`);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: `${orderData.isSubscription ? 'Abonnement' : 'Commande'} envoyé(e) avec succès!`,
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
