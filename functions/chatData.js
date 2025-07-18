const fs = require('fs').promises;
const path = require('path');
const DATA_FILE = path.join(process.cwd(), 'data', 'chatData.json');
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
              const data = await fs.readFile(DATA_FILE, 'utf8');
              return {
                  statusCode: 200,
                  headers,
                  body: data
              };
          } catch (error) {
              if (error.code === 'ENOENT') {
                  return {
                      statusCode: 200,
                      headers,
                      body: JSON.stringify({ conversations: [], messages: [] })
                  };
              }
              console.error('Erreur lors de la lecture du fichier:', error);
              throw error;
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
          await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
          await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
          
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
