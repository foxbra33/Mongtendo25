import engine from './engine.js';

// Example of how to use the engine
async function init() {
    // Example: Load a 3D model
    // Note: Replace 'path/to/your/model.gltf' with an actual GLTF model path
    const model = await engine.loadModel(
        'path/to/your/model.gltf',
        'myModel',
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 }
    );

    if (model) {
        // Example: Move the model
        engine.setModelPosition('myModel', 2, 0, 2);
        
        // Example: Scale the model
        engine.setModelScale('myModel', 2, 2, 2);
        
        // Example: Get model position
        const position = engine.getModelPosition('myModel');
        console.log('Model position:', position);
        
        // Example: Delete the model
        // engine.deleteModel('myModel');
    }
}

init(); 