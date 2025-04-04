import engine from './engine.js';

// Theme management
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('.theme-toggle-icon');
    const themeLabel = document.querySelector('.theme-toggle-label');
    
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
        themeIcon.textContent = '☀️';
        themeLabel.textContent = 'Light Mode';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.checked = false;
        themeIcon.textContent = '🌙';
        themeLabel.textContent = 'Dark Mode';
    }
    
    // Add event listener for theme toggle
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeIcon.textContent = '☀️';
            themeLabel.textContent = 'Light Mode';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeIcon.textContent = '🌙';
            themeLabel.textContent = 'Dark Mode';
        }
    });
}

// Fetch available models from the server
async function fetchAvailableModels() {
    try {
        console.log('Fetching available models from server...');
        const response = await fetch('/api/models');
        console.log('Server response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }
        
        const models = await response.json();
        console.log('Models received from server:', models);
        
        const modelSelector = document.getElementById('model-selector');
        if (!modelSelector) {
            console.error('Model selector element not found in the DOM');
            return;
        }
        
        // Clear existing options except the first one
        while (modelSelector.options.length > 1) {
            modelSelector.remove(1);
        }
        
        // Add models to the dropdown
        if (models && models.length > 0) {
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = `/Assets/${model}`;
                option.textContent = model;
                modelSelector.appendChild(option);
            });
            console.log('Available models loaded into dropdown:', models);
        } else {
            console.warn('No models found in the response');
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No models available";
            option.disabled = true;
            modelSelector.appendChild(option);
        }
    } catch (error) {
        console.error('Error fetching models:', error);
        alert('Failed to load available models. Please check the server connection.');
    }
}

// Update the project hierarchy panel
function updateProjectHierarchy() {
    const hierarchyPanel = document.getElementById('hierarchy-panel');
    const models = engine.getSceneModels();
    const spawnPoints = engine.getSpawnPoints();
    
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
    
    // Add models section
    if (models.length > 0) {
        const modelsSection = document.createElement('div');
        modelsSection.className = 'hierarchy-section';
        modelsSection.innerHTML = '<div class="hierarchy-section-title">Models</div>';
        
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
            modelsSection.appendChild(modelItem);
        });
        
        hierarchyPanel.appendChild(modelsSection);
    }
    
    // Add spawn points section
    if (spawnPoints.length > 0) {
        const spawnPointsSection = document.createElement('div');
        spawnPointsSection.className = 'hierarchy-section';
        spawnPointsSection.innerHTML = '<div class="hierarchy-section-title">Spawn Points</div>';
        
        spawnPoints.forEach((spawnPoint, index) => {
            const spawnPointItem = document.createElement('div');
            spawnPointItem.className = 'hierarchy-item spawn-point-item';
            spawnPointItem.innerHTML = `
                <span class="hierarchy-icon">📍</span>
                <span class="hierarchy-name">Spawn Point ${index + 1}</span>
                <div class="hierarchy-actions">
                    <button class="hierarchy-action-btn" onclick="selectSpawnPoint(${index})">Select</button>
                    <button class="hierarchy-action-btn" onclick="deleteSpawnPoint(${index})">Delete</button>
                </div>
            `;
            spawnPointsSection.appendChild(spawnPointItem);
        });
        
        hierarchyPanel.appendChild(spawnPointsSection);
    }
}

// Update spawn point buttons based on current state
window.updateSpawnPointButtons = function() {
    const createBtn = document.getElementById('create-spawn-point');
    const moveBtn = document.getElementById('move-spawn-point');
    const deleteBtn = document.getElementById('delete-spawn-point');
    const cancelBtn = document.getElementById('cancel-spawn-point');
    
    if (!createBtn || !moveBtn || !deleteBtn || !cancelBtn) {
        console.warn('Some spawn point buttons are not found in the DOM');
        return;
    }

    // Reset all buttons to default state
    createBtn.style.display = 'block';
    moveBtn.style.display = 'block';
    deleteBtn.style.display = 'block';
    cancelBtn.style.display = 'none';
    
    // Remove active class from all buttons
    createBtn.classList.remove('active');
    moveBtn.classList.remove('active');
    deleteBtn.classList.remove('active');
    cancelBtn.classList.remove('active');

    // If we're placing a spawn point, show only the cancel button and highlight create button
    if (engine.isPlacingSpawnPoint) {
        createBtn.style.display = 'none';
        moveBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        cancelBtn.style.display = 'block';
        createBtn.classList.add('active');
    }
    // If we're moving a spawn point, show only the cancel button and highlight move button
    else if (engine.isMovingSpawnPoint) {
        createBtn.style.display = 'none';
        moveBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        cancelBtn.style.display = 'block';
        moveBtn.classList.add('active');
    }
};

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme
    initTheme();
    
    // Fetch available models
    await fetchAvailableModels();
    
    // Set up scene name input
    const sceneNameInput = document.getElementById('scene-name');
    if (sceneNameInput) {
        sceneNameInput.value = engine.currentSceneName;
        sceneNameInput.addEventListener('change', () => {
            engine.setSceneName(sceneNameInput.value);
        });
    }
    
    // Set up file input for loading scenes
    const loadSceneInput = document.getElementById('load-scene-input');
    if (loadSceneInput) {
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
    }

    // Add event listeners for spawn point buttons
    const createSpawnPointBtn = document.getElementById('create-spawn-point');
    const moveSpawnPointBtn = document.getElementById('move-spawn-point');
    const deleteSpawnPointBtn = document.getElementById('delete-spawn-point');
    const cancelSpawnPointBtn = document.getElementById('cancel-spawn-point');

    if (createSpawnPointBtn) {
        createSpawnPointBtn.addEventListener('click', () => {
            engine.startPlacingSpawnPoint();
            updateSpawnPointButtons();
        });
    }

    if (moveSpawnPointBtn) {
        moveSpawnPointBtn.addEventListener('click', () => {
            engine.startMovingSpawnPoint();
            updateSpawnPointButtons();
        });
    }

    if (deleteSpawnPointBtn) {
        deleteSpawnPointBtn.addEventListener('click', () => {
            engine.deleteSelectedSpawnPoint();
            updateProjectHierarchy();
        });
    }

    if (cancelSpawnPointBtn) {
        cancelSpawnPointBtn.addEventListener('click', () => {
            engine.cancelPlacingSpawnPoint();
            updateSpawnPointButtons();
        });
    }

    // Initial update of spawn point buttons
    updateSpawnPointButtons();
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
    const centerCamera = document.getElementById('center-camera-checkbox')?.checked ?? false;

    console.log('Loading model with parameters:', {
        modelUrl,
        name,
        position: { x: posX, y: posY, z: posZ },
        scale: { x: scaleX, y: scaleY, z: scaleZ },
        centerCamera
    });

    if (!modelUrl) {
        console.error('No model URL selected');
        alert('Please select a model from the dropdown');
        return;
    }

    if (!name) {
        console.error('No model name provided');
        alert('Please provide a name for the model');
        return;
    }

    try {
        console.log('Attempting to load model:', modelUrl);
        const model = await engine.loadModel(
            modelUrl,
            name,
            { x: posX, y: posY, z: posZ },
            { x: scaleX, y: scaleY, z: scaleZ },
            !centerCamera // Skip camera centering if checkbox is unchecked
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
        alert('Failed to load model: ' + error.message);
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

window.selectSpawnPoint = function(index) {
    const spawnPoints = engine.getSpawnPoints();
    if (index >= 0 && index < spawnPoints.length) {
        const spawnPoint = spawnPoints[index];
        engine.selectedSpawnPoint = engine.spawnPoints[index];
        updateSpawnPointButtons();
        
        // Update position display
        document.getElementById('position-display').innerHTML = 
            `Spawn Point Position: X: ${spawnPoint.position.x.toFixed(2)}, Y: ${spawnPoint.position.y.toFixed(2)}, Z: ${spawnPoint.position.z.toFixed(2)}`;
    }
};

window.deleteSpawnPoint = function(index) {
    const spawnPoints = engine.getSpawnPoints();
    if (index >= 0 && index < spawnPoints.length) {
        engine.selectedSpawnPoint = engine.spawnPoints[index];
        engine.deleteSelectedSpawnPoint();
        updateProjectHierarchy();
        updateSpawnPointButtons();
    }
}; 