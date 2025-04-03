import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
        const loader = new GLTFLoader();
        try {
            const gltf = await loader.loadAsync(url);
            const model = gltf.scene;
            
            model.position.set(position.x, position.y, position.z);
            model.scale.set(scale.x, scale.y, scale.z);
            
            this.scene.add(model);
            this.models.set(name, model);
            return model;
        } catch (error) {
            console.error('Error loading model:', error);
            return null;
        }
    }

    setModelPosition(name, x, y, z) {
        const model = this.models.get(name);
        if (model) {
            model.position.set(x, y, z);
        }
    }

    setModelScale(name, x, y, z) {
        const model = this.models.get(name);
        if (model) {
            model.scale.set(x, y, z);
        }
    }

    deleteModel(name) {
        const model = this.models.get(name);
        if (model) {
            this.scene.remove(model);
            this.models.delete(name);
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