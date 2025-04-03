import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

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
        
        // Spawn point properties
        this.spawnPoints = [];
        this.isPlacingSpawnPoint = false;
        this.isMovingSpawnPoint = false;
        this.selectedSpawnPoint = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.spawnPointGeometry = new THREE.CircleGeometry(0.5, 32);
        this.spawnPointMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        this.spawnPointGlowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });

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
        
        // Add mouse event listeners for spawn point placement
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        this.renderer.domElement.addEventListener('wheel', (event) => this.onMouseWheel(event));
        
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
        
        // Update spawn point glow effect
        if (this.isPlacingSpawnPoint && this.selectedSpawnPoint) {
            this.selectedSpawnPoint.material.opacity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    // Scene management methods
    saveSceneState() {
        const sceneState = {
            name: this.currentSceneName,
            models: Array.from(this.models.entries()).map(([name, model]) => ({
                name,
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
            spawnPoints: this.getSpawnPoints(),
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
        this.sceneHistory = this.sceneHistory.slice(0, this.historyIndex + 1);
        this.sceneHistory.push(sceneState);
        this.historyIndex = this.sceneHistory.length - 1;
        
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
        
        // Load spawn points
        for (const spawnPointData of sceneState.spawnPoints) {
            const spawnPoint = new THREE.Mesh(this.spawnPointGeometry, this.spawnPointMaterial.clone());
            spawnPoint.rotation.x = -Math.PI / 2;
            spawnPoint.position.set(
                spawnPointData.position.x,
                spawnPointData.position.y,
                spawnPointData.position.z
            );
            
            this.scene.add(spawnPoint);
            this.spawnPoints.push(spawnPoint);
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
        
        // Remove all spawn points
        for (const spawnPoint of this.spawnPoints) {
            this.scene.remove(spawnPoint);
        }
        this.spawnPoints = [];
        
        // Reset state
        this.selectedSpawnPoint = null;
        this.isPlacingSpawnPoint = false;
        this.isMovingSpawnPoint = false;
        this.renderer.domElement.style.cursor = 'auto';
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
    async loadModel(url, name, position = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 }, skipCameraCenter = false) {
        console.log(`Loading model: ${url} with name: ${name}`);
        console.log(`Position: ${position.x}, ${position.y}, ${position.z}`);
        console.log(`Scale: ${scale.x}, ${scale.y}, ${scale.z}`);
        console.log(`Skip camera centering: ${skipCameraCenter}`);
        
        try {
            let model;
            const fileExtension = url.split('.').pop().toLowerCase();
            console.log(`File extension: ${fileExtension}`);
            
            if (fileExtension === 'obj') {
                // Load OBJ file
                console.log('Loading OBJ file...');
                const objLoader = new OBJLoader();
                
                // Check if there's a corresponding MTL file
                const mtlUrl = url.replace('.obj', '.mtl');
                console.log(`Looking for MTL file at: ${mtlUrl}`);
                try {
                    const mtlLoader = new MTLLoader();
                    const materials = await mtlLoader.loadAsync(mtlUrl);
                    materials.preload();
                    objLoader.setMaterials(materials);
                    console.log('MTL materials loaded successfully');
                } catch (mtlError) {
                    console.warn('No MTL file found or error loading MTL:', mtlError);
                }
                
                try {
                    model = await objLoader.loadAsync(url);
                    console.log('OBJ model loaded successfully');
                } catch (objError) {
                    console.error('Error loading OBJ file:', objError);
                    throw new Error(`Failed to load OBJ file: ${objError.message}`);
                }
            } else if (fileExtension === 'fbx') {
                // Load FBX file
                console.log('Loading FBX file...');
                const loader = new FBXLoader();
                try {
                    model = await loader.loadAsync(url);
                    console.log('FBX model loaded successfully');
                } catch (fbxError) {
                    console.error('Error loading FBX file:', fbxError);
                    throw new Error(`Failed to load FBX file: ${fbxError.message}`);
                }
            } else {
                // Load GLTF/GLB file
                console.log('Loading GLTF/GLB file...');
                const loader = new GLTFLoader();
                try {
                    const gltf = await loader.loadAsync(url);
                    model = gltf.scene;
                    console.log('GLTF/GLB model loaded successfully');
                } catch (gltfError) {
                    console.error('Error loading GLTF/GLB file:', gltfError);
                    throw new Error(`Failed to load GLTF/GLB file: ${gltfError.message}`);
                }
            }
            
            if (!model) {
                console.error('Model is null after loading');
                throw new Error('Failed to load model: Model is null');
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
            
            // Center camera on the model only if skipCameraCenter is false
            if (!skipCameraCenter) {
                this.centerCameraOnModel(model);
            } else {
                console.log('Skipping camera centering as requested');
            }
            
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

    // Spawn point methods
    startPlacingSpawnPoint() {
        this.isPlacingSpawnPoint = true;
        this.isMovingSpawnPoint = false;
        this.selectedSpawnPoint = null;
        
        // Create a new spawn point mesh
        const spawnPoint = new THREE.Mesh(this.spawnPointGeometry, this.spawnPointGlowMaterial.clone());
        spawnPoint.rotation.x = -Math.PI / 2; // Rotate to lie flat on the ground
        spawnPoint.position.y = 0.01; // Slightly above the ground to prevent z-fighting
        
        this.scene.add(spawnPoint);
        this.selectedSpawnPoint = spawnPoint;
        
        // Change cursor style
        this.renderer.domElement.style.cursor = 'crosshair';
        
        console.log('Started placing spawn point');
    }
    
    cancelPlacingSpawnPoint() {
        if (this.selectedSpawnPoint && this.isPlacingSpawnPoint) {
            this.scene.remove(this.selectedSpawnPoint);
            this.selectedSpawnPoint = null;
        }
        
        this.isPlacingSpawnPoint = false;
        this.isMovingSpawnPoint = false;
        this.renderer.domElement.style.cursor = 'auto';
        
        console.log('Cancelled placing spawn point');
    }
    
    placeSpawnPoint() {
        if (!this.selectedSpawnPoint || !this.isPlacingSpawnPoint) return;
        
        // Change material to static
        this.selectedSpawnPoint.material = this.spawnPointMaterial.clone();
        
        // Add to spawn points array
        this.spawnPoints.push(this.selectedSpawnPoint);
        
        // Reset state
        this.selectedSpawnPoint = null;
        this.isPlacingSpawnPoint = false;
        this.renderer.domElement.style.cursor = 'auto';
        
        // Save scene state
        this.saveSceneState();
        
        console.log('Spawn point placed');
    }
    
    startMovingSpawnPoint() {
        if (this.spawnPoints.length === 0) {
            console.log('No spawn points to move');
            return;
        }
        
        this.isMovingSpawnPoint = true;
        this.isPlacingSpawnPoint = false;
        this.renderer.domElement.style.cursor = 'move';
        
        console.log('Started moving spawn point mode');
    }
    
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // If placing or moving a spawn point, update its position
        if ((this.isPlacingSpawnPoint || this.isMovingSpawnPoint) && this.selectedSpawnPoint) {
            // Find intersection with ground plane (y=0)
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const intersectionPoint = new THREE.Vector3();
            
            this.raycaster.ray.intersectPlane(groundPlane, intersectionPoint);
            
            if (intersectionPoint) {
                this.selectedSpawnPoint.position.x = intersectionPoint.x;
                this.selectedSpawnPoint.position.z = intersectionPoint.z;
            }
        }
    }
    
    onMouseClick(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        if (this.isPlacingSpawnPoint && this.selectedSpawnPoint) {
            // Place the spawn point
            this.placeSpawnPoint();
        } else if (this.isMovingSpawnPoint) {
            // Check if we clicked on a spawn point
            const intersects = this.raycaster.intersectObjects(this.spawnPoints);
            
            if (intersects.length > 0) {
                // Select the spawn point
                this.selectedSpawnPoint = intersects[0].object;
                console.log('Selected spawn point for moving');
            } else {
                // Deselect if we clicked elsewhere
                this.selectedSpawnPoint = null;
            }
        } else {
            // Check if we clicked on a spawn point
            const intersects = this.raycaster.intersectObjects(this.spawnPoints);
            
            if (intersects.length > 0) {
                // Select the spawn point
                this.selectedSpawnPoint = intersects[0].object;
                console.log('Selected spawn point');
            } else {
                // Deselect if we clicked elsewhere
                this.selectedSpawnPoint = null;
            }
        }
    }
    
    onMouseWheel(event) {
        if (this.selectedSpawnPoint && (this.isPlacingSpawnPoint || this.isMovingSpawnPoint)) {
            // Move the spawn point up or down
            const delta = event.deltaY * 0.01;
            this.selectedSpawnPoint.position.y += delta;
            
            // Ensure it doesn't go below the ground
            if (this.selectedSpawnPoint.position.y < 0.01) {
                this.selectedSpawnPoint.position.y = 0.01;
            }
        }
    }
    
    deleteSelectedSpawnPoint() {
        if (this.selectedSpawnPoint) {
            // Remove from scene
            this.scene.remove(this.selectedSpawnPoint);
            
            // Remove from spawn points array
            const index = this.spawnPoints.indexOf(this.selectedSpawnPoint);
            if (index !== -1) {
                this.spawnPoints.splice(index, 1);
            }
            
            // Reset state
            this.selectedSpawnPoint = null;
            this.isPlacingSpawnPoint = false;
            this.isMovingSpawnPoint = false;
            this.renderer.domElement.style.cursor = 'auto';
            
            // Save scene state
            this.saveSceneState();
            
            console.log('Spawn point deleted');
        }
    }
    
    getSpawnPoints() {
        return this.spawnPoints.map(spawnPoint => ({
            position: {
                x: spawnPoint.position.x,
                y: spawnPoint.position.y,
                z: spawnPoint.position.z
            }
        }));
    }
}

// Create and export a single instance
const engine = new GameEngine();
export default engine; 