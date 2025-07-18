const fetch = require('node-fetch'); // Assurez-vous d'installer node-fetch si ce n'est pas déjà fait

const GITHUB_URL = 'https://raw.githubusercontent.com/joao-dev001/joao-dev001.github.io/main/data/chatData.json';

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    try {
        if (event.httpMethod === 'GET') {
            try {
                const response = await fetch(GITHUB_URL);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(data)
                };
            } catch (error) {
                console.error('Erreur lors de la récupération des données:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Erreur lors de la récupération des données' })
                };
            }
        }

        if (event.httpMethod === 'POST') {
            let data;
            try {
                data = JSON.parse(event.body);
            } catch (parseError) {
                console.error('Erreur de parsing JSON:', parseError);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid JSON format' })
                };
            }

            // Note: Si vous souhaitez sauvegarder les données, vous devrez gérer cela différemment,
            // car vous ne pouvez pas écrire sur GitHub directement depuis une fonction Netlify.
            // Vous pourriez envisager d'utiliser une base de données ou un autre service pour stocker les données.

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
