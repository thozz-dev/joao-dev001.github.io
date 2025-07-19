const { getStore } = require('@netlify/blobs');

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
        const store = getStore({
            name: 'chatData',
            siteID: process.env.NETLIFY_SITE_ID
        });

        if (event.httpMethod === 'GET') {
            try {
                const data = await store.get('data', { type: 'json' });
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(data || { conversations: [], messages: [] })
                };
            } catch (error) {
                console.error('Erreur lecture:', error);
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
                console.error('Parse error:', parseError);
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
                await store.set('data', data);
                console.log('Data saved successfully');
                
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
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};