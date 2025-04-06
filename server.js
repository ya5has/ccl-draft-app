const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const port = 3000;

// Enable JSON parsing for POST requests
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));
app.use(express.static('.')); // Keep this to serve files from root directory

// State file path
const STATE_FILE = path.join(__dirname, 'draft-state.json');

// Save draft state
app.post('/api/save-state', async (req, res) => {
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving state:', error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// Load draft state
app.get('/api/load-state', async (req, res) => {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return empty response with 204 status
      res.status(204).end();
    } else {
      console.error('Error loading state:', error);
      res.status(500).json({ error: 'Failed to load state' });
    }
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Draft app listening at http://localhost:${port}`);
});