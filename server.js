const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Endpoint to list files in the Assets directory
app.get('/api/models', (req, res) => {
    const assetsPath = path.join(__dirname, 'Assets');
    fs.readdir(assetsPath, (err, files) => {
        if (err) {
            console.error('Error reading Assets directory:', err);
            return res.status(500).json({ error: 'Failed to read Assets directory' });
        }
        
        // Filter for 3D model files
        const modelFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.gltf', '.glb', '.obj', '.fbx'].includes(ext);
        });
        
        res.json(modelFiles);
    });
});

// Serve files from Assets directory
app.use('/Assets', express.static(path.join(__dirname, 'Assets')));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 