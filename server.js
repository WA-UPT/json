// server.js
const express = require('express');
const fetch = require('node-fetch'); // npm install node-fetch@2
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // serve static files

const { GITHUB_USER, GITHUB_REPO, GITHUB_FILE_PATH, GITHUB_TOKEN } = process.env;

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Endpoint to update JSON
app.post('/update-link', async (req, res) => {
  const { newLink } = req.body;
  if (!newLink) return res.status(400).json({ error: 'No link provided' });

  try {
    if (!GITHUB_USER || !GITHUB_REPO || !GITHUB_FILE_PATH || !GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GitHub environment variables not properly set' });
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    console.log('Fetching file info from GitHub API:', apiUrl);

    // Fetch file info
    const fileRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const fileText = await fileRes.text();
    if (!fileRes.ok) {
      console.error('GitHub API error:', fileText);
      throw new Error(`Failed to fetch file info: ${fileRes.status} ${fileRes.statusText}`);
    }

    const fileData = JSON.parse(fileText);

    // Decode, update, and re-encode content
    const contentObj = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    if (!contentObj.channels || !Array.isArray(contentObj.channels) || !contentObj.channels[0]) {
      return res.status(500).json({ error: 'Invalid JSON structure in GitHub file' });
    }

    contentObj.channels[0].baseLink = newLink;
    const updatedContent = Buffer.from(JSON.stringify(contentObj, null, 2)).toString('base64');

    // Send PUT request to update file
    const updateRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Update baseLink to ${newLink}`,
        content: updatedContent,
        sha: fileData.sha
      })
    });

    const updateResult = await updateRes.json();
    if (!updateRes.ok) {
      console.error('GitHub update error:', updateResult);
      throw new Error(`Failed to update file: ${updateRes.status} ${updateRes.statusText}`);
    }

    res.json({ success: true, result: updateResult });

  } catch (err) {
    console.error('Error in /update-link:', err);
    res.status(500).json({ error: err.message });
  }
});

// Use PORT from Heroku or fallback
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
