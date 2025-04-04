import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import BackgroundEffects from './backgroundEffects.js';
import FirstPersonControls from './firstPersonControls.js';

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
        this.pulseTime = 0;
        this.pulseSpeed = 2; // Speed of the pulse animation

        // Model editing properties
        this.isEditingModel = false;
        this.selectedModel = null;
        this.modelOutline = null;
        this.modelPlane = new THREE.Plane();
        this.modelIntersection = new THREE.Vector3();
        this.modelOffset = new THREE.Vector3();
        this.modelOriginalScale = new THREE.Vector3();
        this.modelMoveSpeed = 0.2; // Increased from 0.1 to 0.2 (2x faster)
        this.collisionMeshes = new Map(); // Store collision meshes for models

        // Bind event handlers to maintain 'this' context
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseClick = this.onMouseClick.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);

        // Initialize background effects
        this.backgroundEffects = new BackgroundEffects(this.scene);
        this.backgroundEffects.init();

        // Initialize first-person controls
        this.firstPersonControls = new FirstPersonControls(this.camera, this.renderer.domElement);
        this.firstPersonControls.init();

        // Mode state
        this.currentMode = 'edit';
        this.lastEditCameraPosition = new THREE.Vector3();
        this.lastEditCameraTarget = new THREE.Vector3();

        // Set up mode switching
        this.setupModeControls();

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    setupModeControls() {
        const editModeBtn = document.getElementById('edit-mode');
        const playModeBtn = document.getElementById('play-mode');
        const exitPlayModeBtn = document.getElementById('exit-play-mode');

        editModeBtn.addEventListener('click', () => {
            if (this.currentMode === 'play') {
                this.switchToEditMode();
            }
        });

        playModeBtn.addEventListener('click', () => {
            if (this.currentMode === 'edit') {
                this.switchToPlayMode();
            }
        });
        
        exitPlayModeBtn.addEventListener('click', () => {
            if (this.currentMode === 'play') {
                this.switchToEditMode();
            }
        });
    }

    switchToEditMode() {
        this.currentMode = 'edit';
        document.getElementById('edit-mode').classList.add('active');
        document.getElementById('play-mode').classList.remove('active');

        // Restore editor camera
        this.camera.position.copy(this.lastEditCameraPosition);
        this.controls.target.copy(this.lastEditCameraTarget);
        this.controls.enabled = true;
        this.firstPersonControls.unlock();

        // Show UI elements
        document.getElementById('controls-panel').style.display = 'block';
        
        // Hide exit play mode button
        document.getElementById('exit-play-mode').style.display = 'none';
    }

    switchToPlayMode() {
        if (this.currentMode === 'play') return;
        
        // Check if there are spawn points
        if (this.spawnPoints.length === 0) {
            alert('No spawn points found. Please add at least one spawn point before entering play mode.');
            return;
        }
        
        // Show spawn point selection dialog
        const spawnPointList = document.createElement('div');
        spawnPointList.style.position = 'fixed';
        spawnPointList.style.top = '50%';
        spawnPointList.style.left = '50%';
        spawnPointList.style.transform = 'translate(-50%, -50%)';
        spawnPointList.style.backgroundColor = 'var(--panel-bg)';
        spawnPointList.style.padding = '20px';
        spawnPointList.style.borderRadius = '8px';
        spawnPointList.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        spawnPointList.style.zIndex = '1000';
        spawnPointList.style.color = 'var(--text-color)';

        const title = document.createElement('h3');
        title.textContent = 'Select Spawn Point';
        title.style.marginBottom = '10px';
        spawnPointList.appendChild(title);

        this.spawnPoints.forEach((spawnPoint, index) => {
            const button = document.createElement('button');
            button.textContent = `Spawn Point ${index + 1}`;
            button.style.display = 'block';
            button.style.width = '100%';
            button.style.marginBottom = '5px';
            button.style.padding = '8px';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.backgroundColor = 'var(--button-bg)';
            button.style.color = 'white';
            button.style.cursor = 'pointer';

            button.addEventListener('click', () => {
                document.body.removeChild(spawnPointList);
                this.startPlayMode(spawnPoint);
            });

            spawnPointList.appendChild(button);
        });

        document.body.appendChild(spawnPointList);
    }

    startPlayMode(spawnPoint) {
        // Switch to play mode
        this.currentMode = 'play';
        
        // Update UI
        document.getElementById('edit-mode').classList.remove('active');
        document.getElementById('play-mode').classList.add('active');
        
        // Hide edit mode UI
        document.getElementById('controls-panel').style.display = 'none';
        
        // Show exit play mode button
        document.getElementById('exit-play-mode').style.display = 'block';
        
        // Store editor camera position
        this.lastEditCameraPosition.copy(this.camera.position);
        this.lastEditCameraTarget.copy(this.controls.target);
        
        // Disable orbit controls
        this.controls.enabled = false;
        
        // Enable first-person controls
        this.firstPersonControls.init();
        this.firstPersonControls.lock();
        
        // Set player position to the selected spawn point
        this.firstPersonControls.setPosition(spawnPoint.position);
        
        // Pass collision meshes to first-person controls
        const collisionMeshesArray = Array.from(this.collisionMeshes.values());
        this.firstPersonControls.setCollisionMeshes(collisionMeshesArray);
        
        console.log('Switched to play mode');
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
        const rendererElement = this.renderer.domElement;
        rendererElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
        rendererElement.addEventListener('click', (event) => this.onMouseClick(event));
        rendererElement.addEventListener('wheel', (event) => this.onMouseWheel(event));
        
        // Set up model editing
        this.setupModelEditing();
        
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
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = 0.016; // Assuming 60fps
        
        if (this.currentMode === 'edit') {
            this.controls.update();
        } else {
            this.firstPersonControls.update(delta);
        }
        
        this.backgroundEffects.update();
        
        // Update spawn point pulse animation
        if (this.spawnPoints.length > 0) {
            const time = Date.now() * 0.001;
            this.spawnPoints.forEach(spawnPoint => {
                const scale = 1 + Math.sin(time * 2) * 0.2;
                spawnPoint.scale.set(scale, scale, scale);
                
                const opacity = 0.5 + Math.sin(time * 2) * 0.3;
                spawnPoint.material.opacity = opacity;
            });
        }
        
        // Update model outline animation
        if (this.modelOutline) {
            const time = Date.now() * 0.001;
            const pulse = 1 + Math.sin(time * 3) * 0.1;
            this.modelOutline.material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
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
                },
                hasCollisionMesh: this.collisionMeshes.has(name)
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
        
        // Check if a model with this name already exists
        if (this.models.has(name)) {
            console.error(`A model with the name "${name}" already exists. Please use a different name.`);
            throw new Error(`A model with the name "${name}" already exists. Please use a different name.`);
        }
        
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
        
        // Create a new spawn point mesh with pulsing material
        const spawnPoint = new THREE.Mesh(this.spawnPointGeometry, this.spawnPointGlowMaterial.clone());
        spawnPoint.rotation.x = -Math.PI / 2; // Rotate to lie flat on the ground
        spawnPoint.position.y = 0.01; // Slightly above the ground to prevent z-fighting
        
        // Make sure the spawn point is visible
        spawnPoint.visible = true;
        spawnPoint.material.visible = true;
        spawnPoint.material.opacity = 0.8;
        spawnPoint.material.transparent = true;
        spawnPoint.material.depthWrite = false; // Prevent z-fighting
        
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
        
        // Change material to static and reset scale
        this.selectedSpawnPoint.material = this.spawnPointMaterial.clone();
        this.selectedSpawnPoint.scale.set(1, 1, 1);
        this.selectedSpawnPoint.material.opacity = 0.8;
        
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
            
            if (this.raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
                // Update spawn point position
                this.selectedSpawnPoint.position.x = intersectionPoint.x;
                this.selectedSpawnPoint.position.z = intersectionPoint.z;
                // Keep y position slightly above ground to prevent z-fighting
                this.selectedSpawnPoint.position.y = 0.01;
                
                // Make sure the spawn point is visible
                this.selectedSpawnPoint.visible = true;
                this.selectedSpawnPoint.material.visible = true;
                this.selectedSpawnPoint.material.opacity = 0.8;
                
                // Log the position for debugging
                console.log('Spawn point position:', this.selectedSpawnPoint.position);
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
        
        // If in model editing mode, check for model selection
        if (this.isEditingModel) {
            // Get all models in the scene
            const modelObjects = Array.from(this.models.values());
            
            // Check for intersections with models
            const intersects = this.raycaster.intersectObjects(modelObjects, true);
            
            if (intersects.length > 0) {
                // Find the top-level model that was clicked
                let clickedModel = intersects[0].object;
                while (clickedModel.parent && !this.models.has(this.getModelName(clickedModel))) {
                    clickedModel = clickedModel.parent;
                }
                
                // Select the model
                this.selectModel(clickedModel);
                
                // Set up the model's plane for dragging
                this.modelPlane.setFromNormalAndCoplanarPoint(
                    new THREE.Vector3(0, 1, 0),
                    clickedModel.position
                );
                
                // Calculate offset from intersection to model center
                this.modelOffset.set(
                    clickedModel.position.x - this.modelIntersection.x,
                    0,
                    clickedModel.position.z - this.modelIntersection.z
                );
                
                return;
            }
        }
        // If placing a spawn point and a spawn point is selected, place it
        else if (this.isPlacingSpawnPoint && this.selectedSpawnPoint) {
            // Place the spawn point
            this.placeSpawnPoint();
        }
        // If moving a spawn point, check for spawn point selection
        else if (this.isMovingSpawnPoint) {
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
        }
        // Otherwise, check for spawn point selection
        else {
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
        // If placing or moving a spawn point, adjust its height
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

    setupModelEditing() {
        const selectModelBtn = document.getElementById('select-model');
        const cancelModelEditBtn = document.getElementById('cancel-model-edit');
        const modelScaleSlider = document.getElementById('model-scale-slider');
        const modelScaleValue = document.getElementById('model-scale-value');
        const placeModelBtn = document.getElementById('place-model');
        const modelPosX = document.getElementById('model-pos-x');
        const modelPosY = document.getElementById('model-pos-y');
        const modelPosZ = document.getElementById('model-pos-z');
        const createCollisionMeshBtn = document.getElementById('create-collision-mesh');
        
        selectModelBtn.addEventListener('click', () => {
            if (!this.isEditingModel) {
                this.startModelEditing();
            }
        });
        
        cancelModelEditBtn.addEventListener('click', () => {
            if (this.isEditingModel) {
                this.cancelModelEditing();
            }
        });
        
        modelScaleSlider.addEventListener('input', () => {
            if (this.selectedModel) {
                const scale = parseFloat(modelScaleSlider.value);
                modelScaleValue.textContent = scale.toFixed(1);
                this.selectedModel.scale.set(
                    this.modelOriginalScale.x * scale,
                    this.modelOriginalScale.y * scale,
                    this.modelOriginalScale.z * scale
                );
                
                // Update collision mesh if it exists
                this.updateCollisionMesh(this.selectedModel);
            }
        });
        
        // Add event listeners for manual position inputs
        modelPosX.addEventListener('input', () => {
            if (this.selectedModel) {
                const x = parseFloat(modelPosX.value);
                this.selectedModel.position.x = x;
                this.updateModelOutline();
                
                // Update collision mesh if it exists
                this.updateCollisionMesh(this.selectedModel);
            }
        });
        
        modelPosY.addEventListener('input', () => {
            if (this.selectedModel) {
                const y = parseFloat(modelPosY.value);
                this.selectedModel.position.y = y;
                this.updateModelOutline();
                
                // Update collision mesh if it exists
                this.updateCollisionMesh(this.selectedModel);
            }
        });
        
        modelPosZ.addEventListener('input', () => {
            if (this.selectedModel) {
                const z = parseFloat(modelPosZ.value);
                this.selectedModel.position.z = z;
                this.updateModelOutline();
                
                // Update collision mesh if it exists
                this.updateCollisionMesh(this.selectedModel);
            }
        });
        
        // Add event listener for create collision mesh button
        createCollisionMeshBtn.addEventListener('click', () => {
            if (this.selectedModel) {
                this.createCollisionMesh(this.selectedModel);
            }
        });
        
        placeModelBtn.addEventListener('click', () => {
            if (this.selectedModel) {
                // Place the model at its current position
                this.saveSceneState();
                console.log(`Placed model ${this.getModelName(this.selectedModel)} at current position`);
                
                // Show a confirmation message
                const confirmationMsg = document.createElement('div');
                confirmationMsg.textContent = 'Model placed successfully!';
                confirmationMsg.style.position = 'fixed';
                confirmationMsg.style.top = '50%';
                confirmationMsg.style.left = '50%';
                confirmationMsg.style.transform = 'translate(-50%, -50%)';
                confirmationMsg.style.backgroundColor = 'var(--panel-bg)';
                confirmationMsg.style.padding = '20px';
                confirmationMsg.style.borderRadius = '8px';
                confirmationMsg.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
                confirmationMsg.style.zIndex = '1000';
                confirmationMsg.style.color = 'var(--text-color)';
                
                document.body.appendChild(confirmationMsg);
                
                // Remove the message after 2 seconds
                setTimeout(() => {
                    document.body.removeChild(confirmationMsg);
                }, 2000);
            }
        });
        
        // Add keyboard event listeners for WASD movement
        document.addEventListener('keydown', (event) => {
            if (this.isEditingModel && this.selectedModel) {
                switch (event.key.toLowerCase()) {
                    case 'w':
                        this.selectedModel.position.z -= this.modelMoveSpeed;
                        this.updateModelOutline();
                        this.updatePositionInputs();
                        
                        // Update collision mesh if it exists
                        this.updateCollisionMesh(this.selectedModel);
                        break;
                    case 's':
                        this.selectedModel.position.z += this.modelMoveSpeed;
                        this.updateModelOutline();
                        this.updatePositionInputs();
                        
                        // Update collision mesh if it exists
                        this.updateCollisionMesh(this.selectedModel);
                        break;
                    case 'a':
                        this.selectedModel.position.x -= this.modelMoveSpeed;
                        this.updateModelOutline();
                        this.updatePositionInputs();
                        
                        // Update collision mesh if it exists
                        this.updateCollisionMesh(this.selectedModel);
                        break;
                    case 'd':
                        this.selectedModel.position.x += this.modelMoveSpeed;
                        this.updateModelOutline();
                        this.updatePositionInputs();
                        
                        // Update collision mesh if it exists
                        this.updateCollisionMesh(this.selectedModel);
                        break;
                    case 'q':
                        this.selectedModel.position.y += this.modelMoveSpeed;
                        this.updateModelOutline();
                        this.updatePositionInputs();
                        
                        // Update collision mesh if it exists
                        this.updateCollisionMesh(this.selectedModel);
                        break;
                    case 'e':
                        this.selectedModel.position.y -= this.modelMoveSpeed;
                        this.updateModelOutline();
                        this.updatePositionInputs();
                        
                        // Update collision mesh if it exists
                        this.updateCollisionMesh(this.selectedModel);
                        break;
                }
            }
        });
    }
    
    startModelEditing() {
        this.isEditingModel = true;
        document.getElementById('select-model').textContent = 'Selecting...';
        document.getElementById('select-model').disabled = true;
        document.getElementById('cancel-model-edit').disabled = false;
        document.getElementById('model-edit-info').style.display = 'block';
        document.getElementById('selected-model-info').style.display = 'none';
        
        // Change cursor style
        this.renderer.domElement.style.cursor = 'crosshair';
        
        console.log('Started model editing mode');
    }
    
    cancelModelEditing() {
        this.isEditingModel = false;
        document.getElementById('select-model').textContent = 'Select Model';
        document.getElementById('select-model').disabled = false;
        document.getElementById('cancel-model-edit').disabled = true;
        document.getElementById('model-edit-info').style.display = 'block';
        document.getElementById('selected-model-info').style.display = 'none';
        
        // Remove outline if a model was selected
        if (this.selectedModel) {
            this.removeModelOutline();
            this.selectedModel = null;
        }
        
        // Change cursor style
        this.renderer.domElement.style.cursor = 'auto';
        
        console.log('Cancelled model editing mode');
    }
    
    selectModel(model) {
        if (this.selectedModel === model) return;
        
        // Remove outline from previously selected model
        if (this.selectedModel) {
            this.removeModelOutline();
        }
        
        this.selectedModel = model;
        
        // Create outline for the selected model
        this.createModelOutline(model);
        
        // Store original scale
        this.modelOriginalScale.copy(model.scale);
        
        // Update UI
        document.getElementById('selected-model-name').textContent = this.getModelName(model);
        document.getElementById('model-scale-slider').value = '1';
        document.getElementById('model-scale-value').textContent = '1';
        
        // Update position inputs
        this.updatePositionInputs();
        
        document.getElementById('model-edit-info').style.display = 'none';
        document.getElementById('selected-model-info').style.display = 'block';
        
        console.log(`Selected model: ${this.getModelName(model)}`);
    }
    
    getModelName(model) {
        for (const [name, m] of this.models.entries()) {
            if (m === model) {
                return name;
            }
        }
        return 'Unknown Model';
    }
    
    createModelOutline(model) {
        // Create a box geometry that encompasses the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.modelOutline = new THREE.Mesh(geometry, material);
        this.modelOutline.position.copy(center);
        this.scene.add(this.modelOutline);
    }
    
    removeModelOutline() {
        if (this.modelOutline) {
            this.scene.remove(this.modelOutline);
            this.modelOutline = null;
        }
    }
    
    updateModelOutline() {
        if (this.modelOutline && this.selectedModel) {
            const box = new THREE.Box3().setFromObject(this.selectedModel);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            this.modelOutline.scale.set(
                size.x / this.modelOutline.geometry.parameters.width,
                size.y / this.modelOutline.geometry.parameters.height,
                size.z / this.modelOutline.geometry.parameters.depth
            );
            this.modelOutline.position.copy(center);
        }
    }

    // Add a new method to update the position input fields
    updatePositionInputs() {
        if (this.selectedModel) {
            document.getElementById('model-pos-x').value = this.selectedModel.position.x.toFixed(2);
            document.getElementById('model-pos-y').value = this.selectedModel.position.y.toFixed(2);
            document.getElementById('model-pos-z').value = this.selectedModel.position.z.toFixed(2);
        }
    }

    // Create a collision mesh for a model
    createCollisionMesh(model) {
        const modelName = this.getModelName(model);
        
        // Check if a collision mesh already exists for this model
        if (this.collisionMeshes.has(modelName)) {
            // If it exists, remove it first
            const existingMesh = this.collisionMeshes.get(modelName);
            this.scene.remove(existingMesh);
            this.collisionMeshes.delete(modelName);
        }
        
        // Create a simplified collision mesh
        const collisionMesh = model.clone();
        
        // Remove all materials and make it invisible
        collisionMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshBasicMaterial({ 
                    visible: false,
                    transparent: true,
                    opacity: 0
                });
            }
        });
        
        // Add a prefix to the name
        collisionMesh.name = `collision_${modelName}`;
        
        // Add to scene and store reference
        this.scene.add(collisionMesh);
        this.collisionMeshes.set(modelName, collisionMesh);
        
        // Update the collision mesh to match the model's current transform
        this.updateCollisionMesh(model);
        
        // Show a confirmation message
        const confirmationMsg = document.createElement('div');
        confirmationMsg.textContent = 'Collision mesh created successfully!';
        confirmationMsg.style.position = 'fixed';
        confirmationMsg.style.top = '50%';
        confirmationMsg.style.left = '50%';
        confirmationMsg.style.transform = 'translate(-50%, -50%)';
        confirmationMsg.style.backgroundColor = 'var(--panel-bg)';
        confirmationMsg.style.padding = '20px';
        confirmationMsg.style.borderRadius = '8px';
        confirmationMsg.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        confirmationMsg.style.zIndex = '1000';
        confirmationMsg.style.color = 'var(--text-color)';
        
        document.body.appendChild(confirmationMsg);
        
        // Remove the message after 2 seconds
        setTimeout(() => {
            document.body.removeChild(confirmationMsg);
        }, 2000);
        
        console.log(`Created collision mesh for model: ${modelName}`);
    }
    
    // Update a collision mesh to match its model's transform
    updateCollisionMesh(model) {
        const modelName = this.getModelName(model);
        
        if (this.collisionMeshes.has(modelName)) {
            const collisionMesh = this.collisionMeshes.get(modelName);
            
            // Update position
            collisionMesh.position.copy(model.position);
            
            // Update rotation
            collisionMesh.rotation.copy(model.rotation);
            
            // Update scale
            collisionMesh.scale.copy(model.scale);
            
            console.log(`Updated collision mesh for model: ${modelName}`);
        }
    }
    
    // Remove a collision mesh
    removeCollisionMesh(modelName) {
        if (this.collisionMeshes.has(modelName)) {
            const collisionMesh = this.collisionMeshes.get(modelName);
            this.scene.remove(collisionMesh);
            this.collisionMeshes.delete(modelName);
            console.log(`Removed collision mesh for model: ${modelName}`);
        }
    }

    // Override the removeModel method to also remove collision meshes
    removeModel(modelName) {
        if (this.models.has(modelName)) {
            const model = this.models.get(modelName);
            this.scene.remove(model);
            this.models.delete(modelName);
            
            // Also remove the collision mesh if it exists
            this.removeCollisionMesh(modelName);
            
            console.log(`Removed model: ${modelName}`);
        }
    }
}

// Create and export a single instance
const engine = new GameEngine();
export default engine; 