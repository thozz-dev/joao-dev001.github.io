const fs = require('fs');
const path = require('path');
const dataPath = path.join(process.cwd(), 'data', 'conversations.json');

function readConversations() {
    try {
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Erreur lecture conversations:', error);
        return [];
    }
}

function writeConversations(conversations) {
    try {
        const dataDir = path.dirname(dataPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(dataPath, JSON.stringify(conversations, null, 2));
        return true;
    } catch (error) {
        console.error('Erreur écriture conversations:', error);
        return false;
    }
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        if (event.httpMethod === 'GET') {
            const conversations = readConversations();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(conversations)
            };
        }

        if (event.httpMethod === 'POST') {
            const conversations = JSON.parse(event.body);
            const success = writeConversations(conversations);
            
            if (success) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Conversations sauvegardées' })
                };
            } else {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Erreur lors de la sauvegarde' })
                };
            }
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Méthode non autorisée' })
        };

    } catch (error) {
        console.error('Erreur dans la fonction conversations:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erreur serveur', details: error.message })
        };
    }
};
