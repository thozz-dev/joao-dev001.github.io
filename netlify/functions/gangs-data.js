const fs = require('fs');
const path = require('path');
const DATA_FILE = path.resolve(__dirname, 'gangs.json');
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "code";
exports.handler = async (event, context) => {
    if (event.httpMethod === 'GET') {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: data,
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gangs: [] }),
                };
            }
            console.error("Error reading gangs data:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to read gangs data." }),
            };
        }
    } else if (event.httpMethod === 'POST') {
        const authHeader = event.headers.authorization;
        const providedKey = authHeader ? authHeader.split(' ')[1] : null;
        if (providedKey !== ADMIN_SECRET_KEY) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Forbidden: Invalid or missing authorization key." }),
            };
        }
        let newData;
        try {
            if (event.isBase64Encoded) {
                newData = JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'));
            } else {
                newData = JSON.parse(event.body);
            }
        } catch (parseError) {
            console.error("Error parsing request body:", parseError);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid JSON format in request body." }),
            };
        }
        if (!newData || !Array.isArray(newData.gangs)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid data format. Expected { gangs: [] }." }),
            };
        }
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2), 'utf8');
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Gangs data updated successfully." }),
            };
        } catch (writeError) {
            console.error("Error writing gangs data to file:", writeError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to write data to file." }),
            };
        }
    } else {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }
};
    