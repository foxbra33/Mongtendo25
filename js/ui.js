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
        
        console.log('Available models loaded:', models);
    } catch (error) {
        console.error('Error fetching models:', error);
        alert('Failed to load available models. Please check the server connection.');
    }
}

// Update the project hierarchy panel
function updateProjectHierarchy() {
    const hierarchyPanel = document.getElementById('hierarchy-panel');
    const models = engine.getSceneModels();
    
    // Clear existing items
    hierarchyPanel.innerHTML = '';
    
    // Add scene name
    const sceneItem = document.createElement('div');
    sceneItem.className = 'hierarchy-item scene-item';
    sceneItem.innerHTML = `
        <span class="hierarchy-icon">📁</span>
        <span class="hierarchy-name">${engine.currentSceneName}</span>
    `;
    hierarchyPanel.appendChild(sceneItem);
    
    // Add models
    models.forEach(model => {
        const modelItem = document.createElement('div');
        modelItem.className = 'hierarchy-item model-item';
        modelItem.innerHTML = `
            <span class="hierarchy-icon">🔷</span>
            <span class="hierarchy-name">${model.name}</span>
            <div class="hierarchy-actions">
                <button class="hierarchy-action-btn" onclick="selectModel('${model.name}')">Select</button>
                <button class="hierarchy-action-btn" onclick="deleteModel('${model.name}')">Delete</button>
            </div>
        `;
        hierarchyPanel.appendChild(modelItem);
    });
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchAvailableModels();
    updateProjectHierarchy();
    
    // Set up scene name input
    const sceneNameInput = document.getElementById('scene-name');
    sceneNameInput.value = engine.currentSceneName;
    sceneNameInput.addEventListener('change', () => {
        engine.setSceneName(sceneNameInput.value);
    });
    
    // Set up file input for loading scenes
    const loadSceneInput = document.getElementById('load-scene-input');
    loadSceneInput.addEventListener('change', async (event) => {
        if (event.target.files.length > 0) {
            try {
                await engine.loadSceneFromFile(event.target.files[0]);
                updateProjectHierarchy();
                document.getElementById('scene-name').value = engine.currentSceneName;
                alert('Scene loaded successfully!');
            } catch (error) {
                alert('Error loading scene: ' + error.message);
            }
            // Reset the input
            event.target.value = '';
        }
    });
});

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
        console.log('Attempting to load model:', modelUrl);
        const model = await engine.loadModel(
            modelUrl,
            name,
            { x: posX, y: posY, z: posZ },
            { x: scaleX, y: scaleY, z: scaleZ }
        );
        
        if (model) {
            console.log('Model loaded successfully:', model);
            alert('Model loaded successfully!');
            
            // Update the target model field with the loaded model name
            document.getElementById('target-model').value = name;
            
            // Update the project hierarchy
            updateProjectHierarchy();
        } else {
            console.error('Model loaded but returned null');
            alert('Model loaded but could not be displayed. Check console for details.');
        }
    } catch (error) {
        console.error('Error loading model:', error);
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

    try {
        engine.setModelPosition(name, x, y, z);
        alert('Model moved successfully!');
        updateProjectHierarchy();
    } catch (error) {
        console.error('Error moving model:', error);
        alert('Error moving model: ' + error.message);
    }
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

    try {
        engine.setModelScale(name, x, y, z);
        alert('Model scaled successfully!');
        updateProjectHierarchy();
    } catch (error) {
        console.error('Error scaling model:', error);
        alert('Error scaling model: ' + error.message);
    }
};

window.rotateModel = function() {
    const name = document.getElementById('target-model').value;
    const x = parseFloat(document.getElementById('rotate-x').value) || 0;
    const y = parseFloat(document.getElementById('rotate-y').value) || 0;
    const z = parseFloat(document.getElementById('rotate-z').value) || 0;

    if (!name) {
        alert('Please provide a model name');
        return;
    }

    try {
        engine.setModelRotation(name, x, y, z);
        alert('Model rotated successfully!');
        updateProjectHierarchy();
    } catch (error) {
        console.error('Error rotating model:', error);
        alert('Error rotating model: ' + error.message);
    }
};

window.deleteModel = function(name) {
    if (!name) {
        name = document.getElementById('target-model').value;
    }
    
    if (!name) {
        alert('Please provide a model name');
        return;
    }

    try {
        engine.deleteModel(name);
        alert('Model deleted successfully!');
        updateProjectHierarchy();
    } catch (error) {
        console.error('Error deleting model:', error);
        alert('Error deleting model: ' + error.message);
    }
};

window.getPosition = function() {
    const name = document.getElementById('target-model').value;

    if (!name) {
        alert('Please provide a model name');
        return;
    }

    try {
        const position = engine.getModelPosition(name);
        if (position) {
            document.getElementById('position-display').innerHTML = 
                `Position: X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`;
        } else {
            document.getElementById('position-display').innerHTML = 'Model not found';
        }
    } catch (error) {
        console.error('Error getting model position:', error);
        document.getElementById('position-display').innerHTML = 'Error: ' + error.message;
    }
};

window.saveScene = function() {
    try {
        engine.saveSceneToFile();
        alert('Scene saved successfully!');
    } catch (error) {
        console.error('Error saving scene:', error);
        alert('Error saving scene: ' + error.message);
    }
};

window.newScene = function() {
    if (confirm('Are you sure you want to create a new scene? All unsaved changes will be lost.')) {
        engine.newScene();
        document.getElementById('scene-name').value = engine.currentSceneName;
        updateProjectHierarchy();
        alert('New scene created!');
    }
};

window.selectModel = function(name) {
    document.getElementById('target-model').value = name;
    
    // Get model properties
    const position = engine.getModelPosition(name);
    const scale = engine.getModelScale(name);
    const rotation = engine.getModelRotation(name);
    
    // Update UI with model properties
    if (position) {
        document.getElementById('move-x').value = position.x.toFixed(2);
        document.getElementById('move-y').value = position.y.toFixed(2);
        document.getElementById('move-z').value = position.z.toFixed(2);
    }
    
    if (scale) {
        document.getElementById('new-scale-x').value = scale.x.toFixed(2);
        document.getElementById('new-scale-y').value = scale.y.toFixed(2);
        document.getElementById('new-scale-z').value = scale.z.toFixed(2);
    }
    
    if (rotation) {
        document.getElementById('rotate-x').value = rotation.x.toFixed(2);
        document.getElementById('rotate-y').value = rotation.y.toFixed(2);
        document.getElementById('rotate-z').value = rotation.z.toFixed(2);
    }
    
    // Update position display
    document.getElementById('position-display').innerHTML = 
        `Position: X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`;
}; 