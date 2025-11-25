const express = require('express');
const fetch = require('node-fetch'); 
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const GITHUB_USER = 'WA-UPT';
const GITHUB_REPO = 'json';
const GITHUB_FILE_PATH = 'data.json';
const GITHUB_TOKEN = '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'; 

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


app.post('/update-link', async (req, res) => {
  const { newLink } = req.body;
  if (!newLink) return res.status(400).json({ error: 'No link provided' });

  try {
    if (!GITHUB_USER || !GITHUB_REPO || !GITHUB_FILE_PATH || !GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GitHub credentials not set' });
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    console.log('Fetching file info from GitHub API:',apiUrl);

    const fileRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const fileText = await fileRes.text();
    if (fileRes.status === 401) {
      return res.status(401).json({ error: 'GitHub token is invalid or missing permissions' });
    }
    if (!fileRes.ok) {
      console.error('GitHub API error:', fileText);
      throw new Error(`Failed to fetch file info: ${fileRes.status} ${fileRes.statusText}`);
    }

    const fileData = JSON.parse(fileText);

    const contentObj = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    if (!contentObj.channels || !Array.isArray(contentObj.channels) || !contentObj.channels[0]) {
      return res.status(500).json({ error: 'Invalid JSON structure in GitHub file' });
    }

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

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
