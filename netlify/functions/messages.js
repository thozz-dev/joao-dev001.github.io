const fs = require('fs');
const path = require('path');
const dataPath = path.join(process.cwd(), 'data', 'messages.json');

function readMessages() {
    try {
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Erreur lecture messages:', error);
        return [];
    }
}

function writeMessages(messages) {
    try {
        const dataDir = path.dirname(dataPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(dataPath, JSON.stringify(messages, null, 2));
        return true;
    } catch (error) {
        console.error('Erreur écriture messages:', error);
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
            const messages = readMessages();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(messages)
            };
        }

        if (event.httpMethod === 'POST') {
            const messages = JSON.parse(event.body);
            const success = writeMessages(messages);
            
            if (success) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Messages sauvegardés' })
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
        console.error('Erreur dans la fonction messages:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erreur serveur', details: error.message })
        };
    }
};
