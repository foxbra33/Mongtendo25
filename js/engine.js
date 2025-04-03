import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

class GameEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.models = new Map();
        this.axesHelper = null;
        this.gridHelper = null;
        this.originMarker = null;

        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
        document.body.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Add axes helper
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);

        // Add grid helper
        this.gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(this.gridHelper);

        // Add origin marker (green dot)
        const geometry = new THREE.SphereGeometry(0.2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.originMarker = new THREE.Mesh(geometry, material);
        this.scene.add(this.originMarker);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Start animation loop
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
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
            
            console.log('Adding model to scene');
            this.scene.add(model);
            this.models.set(name, model);
            
            // Log the model's position after adding to scene
            console.log(`Model added to scene at position: ${model.position.x}, ${model.position.y}, ${model.position.z}`);
            
            // Center camera on the model
            this.centerCameraOnModel(model);
            
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
        } else {
            console.warn(`Model ${name} not found`);
        }
    }

    setModelScale(name, x, y, z) {
        const model = this.models.get(name);
        if (model) {
            model.scale.set(x, y, z);
            console.log(`Model ${name} scaled to: ${x}, ${y}, ${z}`);
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
}

// Create and export the engine instance
const engine = new GameEngine();
export default engine; 