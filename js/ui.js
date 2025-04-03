import engine from './engine.js';

// Fetch available models from the server
async function fetchAvailableModels() {
    try {
        const response = await fetch('/api/models');
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        const models = await response.json();
        
        const modelSelector = document.getElementById('model-selector');
        // Clear existing options except the first one
        while (modelSelector.options.length > 1) {
            modelSelector.remove(1);
        }
        
        // Add models to the dropdown
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = `/Assets/${model}`;
            option.textContent = model;
            modelSelector.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        alert('Failed to load available models. Please check the server connection.');
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', fetchAvailableModels);

// Make functions available globally
window.loadModel = async function() {
    const modelUrl = document.getElementById('model-selector').value;
    const name = document.getElementById('model-name').value;
    const posX = parseFloat(document.getElementById('pos-x').value) || 0;
    const posY = parseFloat(document.getElementById('pos-y').value) || 0;
    const posZ = parseFloat(document.getElementById('pos-z').value) || 0;
    const scaleX = parseFloat(document.getElementById('scale-x').value) || 1;
    const scaleY = parseFloat(document.getElementById('scale-y').value) || 1;
    const scaleZ = parseFloat(document.getElementById('scale-z').value) || 1;

    if (!modelUrl || !name) {
        alert('Please select a model and provide a name');
        return;
    }

    try {
        await engine.loadModel(
            modelUrl,
            name,
            { x: posX, y: posY, z: posZ },
            { x: scaleX, y: scaleY, z: scaleZ }
        );
        alert('Model loaded successfully!');
    } catch (error) {
        alert('Error loading model: ' + error.message);
    }
};

window.moveModel = function() {
    const name = document.getElementById('target-model').value;
    const x = parseFloat(document.getElementById('move-x').value) || 0;
    const y = parseFloat(document.getElementById('move-y').value) || 0;
    const z = parseFloat(document.getElementById('move-z').value) || 0;

    if (!name) {
        alert('Please provide a model name');
        return;
    }

    engine.setModelPosition(name, x, y, z);
    alert('Model moved successfully!');
};

window.scaleModel = function() {
    const name = document.getElementById('target-model').value;
    const x = parseFloat(document.getElementById('new-scale-x').value) || 1;
    const y = parseFloat(document.getElementById('new-scale-y').value) || 1;
    const z = parseFloat(document.getElementById('new-scale-z').value) || 1;

    if (!name) {
        alert('Please provide a model name');
        return;
    }

    engine.setModelScale(name, x, y, z);
    alert('Model scaled successfully!');
};

window.deleteModel = function() {
    const name = document.getElementById('target-model').value;

    if (!name) {
        alert('Please provide a model name');
        return;
    }

    engine.deleteModel(name);
    alert('Model deleted successfully!');
};

window.getPosition = function() {
    const name = document.getElementById('target-model').value;

    if (!name) {
        alert('Please provide a model name');
        return;
    }

    const position = engine.getModelPosition(name);
    if (position) {
        document.getElementById('position-display').innerHTML = 
            `Position: X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`;
    } else {
        document.getElementById('position-display').innerHTML = 'Model not found';
    }
}; 