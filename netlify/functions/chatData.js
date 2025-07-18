const https = require('https');

// Configuration GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const DATA_FILE_PATH = 'data/chatData.json';

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

    console.log('Requête GitHub:', `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`);
    
    const response = await makeRequest(options);
    
    console.log('Réponse GitHub:', response.statusCode, response.data);
    
    if (response.statusCode === 404) {
        return null;
    }
    
    if (response.statusCode !== 200) {
        throw new Error(`GitHub API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }
    
    const content = Buffer.from(response.data.content, 'base64').toString('utf8');
    return {
        content: JSON.parse(content),
        sha: response.data.sha
    };
};

// Fonction pour créer le fichier initial s'il n'existe pas
const createInitialFile = async () => {
    const initialData = { conversations: [], messages: [] };
    const content = Buffer.from(JSON.stringify(initialData, null, 2)).toString('base64');
    
    const requestData = {
        message: 'Create initial chat data file',
        content: content,
        branch: 'main'
    };
    
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
    
    if (response.statusCode !== 201) {
        throw new Error(`Failed to create initial file: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }
    
    return response.data;
};

// Fonction pour sauvegarder le fichier sur GitHub
const saveFileToGitHub = async (data, sha = null) => {
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    
    const requestData = {
        message: `Update chat data - ${new Date().toISOString()}`,
        content: content,
        branch: 'main'
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

    // Debug des variables d'environnement
    console.log('Variables d\'environnement:');
    console.log('GITHUB_TOKEN:', GITHUB_TOKEN ? 'Défini' : 'Non défini');
    console.log('GITHUB_OWNER:', GITHUB_OWNER);
    console.log('GITHUB_REPO:', GITHUB_REPO);

    // Vérifier que les variables d'environnement sont définies
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Missing GitHub configuration',
                details: {
                    token: GITHUB_TOKEN ? 'OK' : 'Missing',
                    owner: GITHUB_OWNER || 'Missing',
                    repo: GITHUB_REPO || 'Missing'
                }
            })
        };
    }

    try {
        if (event.httpMethod === 'GET') {
            let fileData = await getFileFromGitHub();
            
            if (!fileData) {
                // Fichier n'existe pas, créer le fichier initial
                console.log('Fichier non trouvé, création du fichier initial...');
                try {
                    await createInitialFile();
                    // Essayer de récupérer le fichier nouvellement créé
                    fileData = await getFileFromGitHub();
                } catch (createError) {
                    console.error('Erreur lors de la création du fichier initial:', createError);
                    // Retourner une structure vide si on ne peut pas créer le fichier
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ conversations: [], messages: [] })
                    };
                }
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(fileData ? fileData.content : { conversations: [], messages: [] })
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
            let currentFile = await getFileFromGitHub();
            
            // Si le fichier n'existe pas, le créer d'abord
            if (!currentFile) {
                console.log('Fichier non trouvé pour la sauvegarde, création...');
                await createInitialFile();
                currentFile = await getFileFromGitHub();
            }
            
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
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
