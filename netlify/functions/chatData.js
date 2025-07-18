const https = require('https');

// Configuration GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Token GitHub à ajouter dans les variables d'environnement Netlify
const GITHUB_OWNER = process.env.GITHUB_OWNER; // Ton nom d'utilisateur GitHub
const GITHUB_REPO = process.env.GITHUB_REPO;   // Nom de ton repository
const DATA_FILE_PATH = 'data/chatData.json';   // Chemin du fichier dans ton repo

// Fonction pour faire des requêtes HTTPS
const makeRequest = (options, data = null) => {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, data: response });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
};

// Fonction pour récupérer le fichier depuis GitHub
const getFileFromGitHub = async () => {
    const options = {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`,
        method: 'GET',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'netlify-function',
            'Accept': 'application/vnd.github.v3+json'
        }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 404) {
        // Fichier n'existe pas encore
        return null;
    }
    
    if (response.statusCode !== 200) {
        throw new Error(`GitHub API error: ${response.statusCode}`);
    }
    
    // Décoder le contenu base64
    const content = Buffer.from(response.data.content, 'base64').toString('utf8');
    return {
        content: JSON.parse(content),
        sha: response.data.sha
    };
};

// Fonction pour sauvegarder le fichier sur GitHub
const saveFileToGitHub = async (data, sha = null) => {
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    
    const requestData = {
        message: `Update chat data - ${new Date().toISOString()}`,
        content: content,
        branch: 'main' // ou 'master' selon ton repo
    };
    
    if (sha) {
        requestData.sha = sha;
    }
    
    const options = {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`,
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'netlify-function',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options, requestData);
    
    if (response.statusCode !== 200 && response.statusCode !== 201) {
        throw new Error(`GitHub API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }
    
    return response.data;
};

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

    // Vérifier que les variables d'environnement sont définies
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Missing GitHub configuration' })
        };
    }

    try {
        if (event.httpMethod === 'GET') {
            const fileData = await getFileFromGitHub();
            
            if (!fileData) {
                // Fichier n'existe pas, retourner une structure vide
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ conversations: [], messages: [] })
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(fileData.content)
            };
        }

        if (event.httpMethod === 'POST') {
            let data;
            try {
                data = JSON.parse(event.body);
            } catch (parseError) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid JSON format' })
                };
            }

            // Récupérer le SHA du fichier actuel pour la mise à jour
            const currentFile = await getFileFromGitHub();
            const sha = currentFile ? currentFile.sha : null;
            
            // Sauvegarder sur GitHub
            await saveFileToGitHub(data, sha);
            
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
            body: JSON.stringify({ 
                error: 'Internal server error', 
                details: error.message
            })
        };
    }
};