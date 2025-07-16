const fs = require('fs').promises;
const path = require('path');

const COMMS_DATA_FILE_PATH = path.resolve(__dirname, 'comms-data.json');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const userName = event.queryStringParameters.user;

    try {
        let allMessages = [];
        try {
            const data = await fs.readFile(COMMS_DATA_FILE_PATH, 'utf8');
            allMessages = JSON.parse(data);
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([])
                };
            }
            console.error('Error reading comms data file:', readError);
            return { statusCode: 500, body: 'Failed to read messages' };
        }

        const filteredMessages = allMessages.filter(msg => {
            if (msg.type === 'global' || msg.type === 'group') {
                return true; 
            } else if (msg.type === 'private') {
                return msg.sender === userName || msg.to === userName;
            }
            return false;
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filteredMessages)
        };

    } catch (error) {
        console.error('Error in get-comms-messages function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to retrieve messages', details: error.message })
        };
    }
};
