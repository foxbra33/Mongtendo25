import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

class GameEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, (window.innerWidth - 300) / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.models = new Map();
        this.axesHelper = null;
        this.gridHelper = null;
        this.originMarker = null;
        this.currentSceneName = "Untitled Scene";
        this.sceneHistory = [];
        this.historyIndex = -1;

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('Initializing engine...');
        
        // Set up renderer
        this.renderer.setSize(window.innerWidth - 300, window.innerHeight);
        this.renderer.setClearColor(0x1a1a1a);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        const container = document.getElementById('engine-container');
        if (!container) {
            console.error('Engine container not found!');
            return;
        }
        
        container.appendChild(this.renderer.domElement);
        console.log('Renderer initialized');
        
        // Set up camera
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        console.log('Camera initialized');
        
        // Set up controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        console.log('Controls initialized');
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        console.log('Lights added');
        
        // Add axes helper
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);
        
        // Add grid helper
        this.gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(this.gridHelper);
        console.log('Grid helper added');
        
        // Add origin marker (green dot)
        const geometry = new THREE.SphereGeometry(0.2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.originMarker = new THREE.Mesh(geometry, material);
        this.scene.add(this.originMarker);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const width = window.innerWidth - 300;
            const height = window.innerHeight;
            
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            
            this.renderer.setSize(width, height);
        });
        
        // Start animation loop
        this.animate();
        console.log('Animation loop started');
        
        // Save initial scene state
        this.saveSceneState();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    // Scene management methods
    saveSceneState() {
        // Create a snapshot of the current scene
        const sceneState = {
            name: this.currentSceneName,
            models: Array.from(this.models.entries()).map(([name, model]) => ({
                name: name,
                url: model.userData.url || '',
                position: {
                    x: model.position.x,
                    y: model.position.y,
                    z: model.position.z
                },
                scale: {
                    x: model.scale.x,
                    y: model.scale.y,
                    z: model.scale.z
                },
                rotation: {
                    x: model.rotation.x,
                    y: model.rotation.y,
                    z: model.rotation.z
                }
            })),
            camera: {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                target: {
                    x: this.controls.target.x,
                    y: this.controls.target.y,
                    z: this.controls.target.z
                }
            }
        };
        
        // Add to history
        this.sceneHistory.push(JSON.stringify(sceneState));
        this.historyIndex = this.sceneHistory.length - 1;
        
        // Limit history size
        if (this.sceneHistory.length > 50) {
            this.sceneHistory.shift();
            this.historyIndex--;
        }
        
        return sceneState;
    }
    
    saveSceneToFile() {
        const sceneState = this.saveSceneState();
        const blob = new Blob([JSON.stringify(sceneState, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentSceneName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return sceneState;
    }
    
    async loadSceneFromFile(file) {
        try {
            const text = await file.text();
            const sceneState = JSON.parse(text);
            await this.loadSceneState(sceneState);
            return true;
        } catch (error) {
            console.error('Error loading scene file:', error);
            throw error;
        }
    }
    
    async loadSceneState(sceneState) {
        // Clear current scene
        this.clearScene();
        
        // Set scene name
        this.currentSceneName = sceneState.name || "Untitled Scene";
        
        // Load all models
        for (const modelData of sceneState.models) {
            try {
                await this.loadModel(
                    modelData.url,
                    modelData.name,
                    modelData.position,
                    modelData.scale
                );
                
                // Set rotation if available
                const model = this.models.get(modelData.name);
                if (model && modelData.rotation) {
                    model.rotation.set(
                        modelData.rotation.x,
                        modelData.rotation.y,
                        modelData.rotation.z
                    );
                }
            } catch (error) {
                console.error(`Error loading model ${modelData.name}:`, error);
            }
        }
        
        // Set camera position and target if available
        if (sceneState.camera) {
            if (sceneState.camera.position) {
                this.camera.position.set(
                    sceneState.camera.position.x,
                    sceneState.camera.position.y,
                    sceneState.camera.position.z
                );
            }
            
            if (sceneState.camera.target) {
                this.controls.target.set(
                    sceneState.camera.target.x,
                    sceneState.camera.target.y,
                    sceneState.camera.target.z
                );
                this.controls.update();
            }
        }
        
        // Save this state to history
        this.saveSceneState();
    }
    
    newScene() {
        // Clear current scene
        this.clearScene();
        
        // Reset scene name
        this.currentSceneName = "Untitled Scene";
        
        // Save initial state
        this.saveSceneState();
    }
    
    clearScene() {
        // Remove all models
        for (const [name, model] of this.models.entries()) {
            this.scene.remove(model);
        }
        this.models.clear();
        
        // Reset camera
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
    
    setSceneName(name) {
        this.currentSceneName = name;
        this.saveSceneState();
    }
    
    getSceneModels() {
        return Array.from(this.models.entries()).map(([name, model]) => ({
            name: name,
            position: {
                x: model.position.x,
                y: model.position.y,
                z: model.position.z
            },
            scale: {
                x: model.scale.x,
                y: model.scale.y,
                z: model.scale.z
            }
        }));
    }

    // Model management methods
    async loadModel(url, name, position = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 }) {
        console.log(`Loading model: ${url} with name: ${name}`);
        console.log(`Position: ${position.x}, ${position.y}, ${position.z}`);
        console.log(`Scale: ${scale.x}, ${scale.y}, ${scale.z}`);
        
        try {
            let model;
            const fileExtension = url.split('.').pop().toLowerCase();
            
            if (fileExtension === 'obj') {
                // Load OBJ file
                console.log('Loading OBJ file...');
                const objLoader = new OBJLoader();
                
                // Check if there's a corresponding MTL file
                const mtlUrl = url.replace('.obj', '.mtl');
                try {
                    const mtlLoader = new MTLLoader();
                    const materials = await mtlLoader.loadAsync(mtlUrl);
                    materials.preload();
                    objLoader.setMaterials(materials);
                    console.log('MTL materials loaded successfully');
                } catch (mtlError) {
                    console.warn('No MTL file found or error loading MTL:', mtlError);
                }
                
                model = await objLoader.loadAsync(url);
                console.log('OBJ model loaded successfully');
            } else {
                // Load GLTF/GLB file
                console.log('Loading GLTF/GLB file...');
                const loader = new GLTFLoader();
                const gltf = await loader.loadAsync(url);
                model = gltf.scene;
                console.log('GLTF/GLB model loaded successfully');
            }
            
            if (!model) {
                throw new Error('Failed to load model');
            }
            
            console.log('Model loaded, setting position and scale');
            model.position.set(position.x, position.y, position.z);
            model.scale.set(scale.x, scale.y, scale.z);
            
            // Store the URL in the model's userData for saving/loading
            model.userData.url = url;
            
            console.log('Adding model to scene');
            this.scene.add(model);
            this.models.set(name, model);
            
            // Log the model's position after adding to scene
            console.log(`Model added to scene at position: ${model.position.x}, ${model.position.y}, ${model.position.z}`);
            
            // Center camera on the model
            this.centerCameraOnModel(model);
            
            // Save scene state after adding model
            this.saveSceneState();
            
            return model;
        } catch (error) {
            console.error('Error loading model:', error);
            throw error;
        }
    }
    
    centerCameraOnModel(model) {
        // Calculate the bounding box of the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Calculate the distance needed to see the entire model
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;
        
        // Position the camera
        this.camera.position.set(
            center.x + distance,
            center.y + distance,
            center.z + distance
        );
        
        // Look at the center of the model
        this.camera.lookAt(center);
        
        // Update controls
        this.controls.target.copy(center);
        this.controls.update();
        
        console.log(`Camera centered on model at ${center.x}, ${center.y}, ${center.z}`);
    }

    setModelPosition(name, x, y, z) {
        const model = this.models.get(name);
        if (model) {
            model.position.set(x, y, z);
            console.log(`Model ${name} moved to position: ${x}, ${y}, ${z}`);
            this.saveSceneState();
        } else {
            console.warn(`Model ${name} not found`);
        }
    }

    setModelScale(name, x, y, z) {
        const model = this.models.get(name);
        if (model) {
            model.scale.set(x, y, z);
            console.log(`Model ${name} scaled to: ${x}, ${y}, ${z}`);
            this.saveSceneState();
        } else {
            console.warn(`Model ${name} not found`);
        }
    }
    
    setModelRotation(name, x, y, z) {
        const model = this.models.get(name);
        if (model) {
            model.rotation.set(x, y, z);
            console.log(`Model ${name} rotated to: ${x}, ${y}, ${z}`);
            this.saveSceneState();
        } else {
            console.warn(`Model ${name} not found`);
        }
    }

    deleteModel(name) {
        const model = this.models.get(name);
        if (model) {
            this.scene.remove(model);
            this.models.delete(name);
            console.log(`Model ${name} deleted`);
            this.saveSceneState();
        } else {
            console.warn(`Model ${name} not found`);
        }
    }

    getModelPosition(name) {
        const model = this.models.get(name);
        if (model) {
            return {
                x: model.position.x,
                y: model.position.y,
                z: model.position.z
            };
        }
        return null;
    }
    
    getModelScale(name) {
        const model = this.models.get(name);
        if (model) {
            return {
                x: model.scale.x,
                y: model.scale.y,
                z: model.scale.z
            };
        }
        return null;
    }
    
    getModelRotation(name) {
        const model = this.models.get(name);
        if (model) {
            return {
                x: model.rotation.x,
                y: model.rotation.y,
                z: model.rotation.z
            };
        }
        return null;
    }
}

// Create and export a single instance
const engine = new GameEngine();
export default engine; 