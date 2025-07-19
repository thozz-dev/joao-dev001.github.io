const fs = require('fs').promises;
const path = require('path');

// Note: This is a temporary solution. For production, use a proper database
// or Netlify Blobs when properly configured

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Use /tmp directory which is writable in Netlify functions
    const dataPath = '/tmp/chatData.json';

    try {
        if (event.httpMethod === 'GET') {
            try {
                const fileContent = await fs.readFile(dataPath, 'utf8');
                const data = JSON.parse(fileContent);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(data)
                };
            } catch (error) {
                // File doesn't exist or is corrupted, return default
                console.log('No data file found, returning default');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ conversations: [], messages: [] })
                };
            }
        }

        if (event.httpMethod === 'POST') {
            let data;
            try {
                data = JSON.parse(event.body);
                
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid data structure');
                }
                
            } catch (parseError) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid JSON format',
                        details: parseError.message 
                    })
                };
            }

            try {
                await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
                console.log('Data saved to temp file');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true })
                };
            } catch (saveError) {
                console.error('Save error:', saveError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to save data',
                        details: saveError.message 
                    })
                };
            }
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error', 
                details: error.message
            })
        };
    }
};
