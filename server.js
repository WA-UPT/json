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
  res.sendFile(__dirname + '/public/index.html');
});

// Endpoint to update JSON
app.post('/update-link', async (req, res) => {
  const { newLink } = req.body;
  if (!newLink) return res.status(400).json({ error: 'No link provided' });

  try {
    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    const fileRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!fileRes.ok) throw new Error('Failed to fetch file info');
    const fileData = await fileRes.json();

    const contentObj = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    contentObj.channels[0].baseLink = newLink;
    const updatedContent = Buffer.from(JSON.stringify(contentObj, null, 2)).toString('base64');

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

    const result = await updateRes.json();
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Use PORT from Heroku or fallback
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
