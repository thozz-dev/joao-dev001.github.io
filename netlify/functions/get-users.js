const fs = require('fs').promises;
const path = require('path');

const USERS_DATA_FILE_PATH = path.resolve(__dirname, 'users-data.json');
const ONLINE_THRESHOLD_MS = 60 * 1000;

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        let users = [];
        try {
            const data = await fs.readFile(USERS_DATA_FILE_PATH, 'utf8');
            users = JSON.parse(data);
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([])
                };
            }
            console.error('Error reading users data file:', readError);
            return { statusCode: 500, body: 'Failed to read users data' };
        }

        const now = Date.now();
        const usersWithStatus = users.map(user => ({
            name: user.name,
            lastActive: user.lastActive,
            online: (now - user.lastActive) < ONLINE_THRESHOLD_MS
        }));

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usersWithStatus)
        };

    } catch (error) {
        console.error('Error in get-users function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to retrieve users', details: error.message })
        };
    }
};
