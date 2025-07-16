const fs = require('fs').promises;
const path = require('path');

const COMMS_DATA_FILE_PATH = path.resolve(__dirname, 'comms-data.json');
const USERS_DATA_FILE_PATH = path.resolve(__dirname, 'users-data.json');
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL_COM;

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { sender, message, timestamp, type = 'global', to = 'all' } = JSON.parse(event.body);

        if (!sender || !message || !timestamp) {
            return { statusCode: 400, body: 'Missing required fields: sender, message, timestamp' };
        }

        const newMessage = { sender, message, timestamp, type, to };

        let commsMessages = [];
        try {
            const data = await fs.readFile(COMMS_DATA_FILE_PATH, 'utf8');
            commsMessages = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                console.error('Error reading comms data file:', readError);
            }
        }
        commsMessages.push(newMessage);
        await fs.writeFile(COMMS_DATA_FILE_PATH, JSON.stringify(commsMessages, null, 2), 'utf8');

        let users = [];
        try {
            const data = await fs.readFile(USERS_DATA_FILE_PATH, 'utf8');
            users = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                console.error('Error reading users data file:', readError);
            }
        }

        const userIndex = users.findIndex(u => u.name === sender);
        if (userIndex > -1) {
            users[userIndex].lastActive = Date.now();
        } else {
            users.push({ name: sender, lastActive: Date.now() });
        }
        await fs.writeFile(USERS_DATA_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');

        let embedTitle = `Nouveau Message de ${sender}`;
        let embedColor = 3066993;

        if (type === 'private') {
            embedTitle = `Message Privé de ${sender} à ${to}`;
            embedColor = 16776960;
        } else if (type === 'group') {
            embedTitle = `Message de Groupe de ${sender}`;
            embedColor = 65535;
        }

        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Comms Cryptées Bot',
                avatar_url: 'https://i.ibb.co/JwF5G9Kz/3fcf2fe3-dd13-4798-9041-e8af8b338b51.png',
                embeds: [{
                    title: embedTitle,
                    description: message,
                    color: embedColor,
                    timestamp: timestamp,
                    footer: {
                        text: `Type: ${type} | Cible: ${to}`
                    }
                }]
            })
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ status: 'Message sent and saved', message: newMessage })
        };

    } catch (error) {
        console.error('Error in send-comms-message function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to send or save message', details: error.message })
        };
    }
};