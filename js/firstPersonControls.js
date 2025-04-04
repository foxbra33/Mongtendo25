import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class FirstPersonControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.controls = null;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = true;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveSpeed = 10;
        this.jumpHeight = 1; // Maximum jump height in meters
        this.gravity = 10; // Gravity in m/s²
        this.isLocked = false;
        this.isActive = false;
        this.collisionMeshes = []; // Array to store collision meshes
        this.playerRadius = 0.5; // Player collision radius
        this.lastCollisionTime = 0; // Track when the last collision occurred
    }

    init() {
        this.controls = new PointerLockControls(this.camera, this.domElement);
        
        // Set up event listeners
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Handle pointer lock
        this.controls.addEventListener('lock', () => {
            this.isActive = true;
        });
        
        this.controls.addEventListener('unlock', () => {
            this.isActive = false;
        });
    }

    onKeyDown(event) {
        if (!this.isActive) return;

        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.canJump) {
                    // Calculate initial velocity needed to reach jumpHeight
                    // Using physics formula: v = sqrt(2 * g * h)
                    this.velocity.y = Math.sqrt(2 * this.gravity * this.jumpHeight);
                    this.canJump = false;
                }
                break;
        }
    }

    onKeyUp(event) {
        if (!this.isActive) return;

        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    // Set collision meshes for the player to collide with
    setCollisionMeshes(meshes) {
        this.collisionMeshes = meshes;
    }
    
    // Check for collisions with collision meshes
    checkCollisions(newPosition) {
        // Create a sphere for player collision detection
        const playerSphere = new THREE.Sphere(newPosition, this.playerRadius);
        
        // Check each collision mesh
        for (const mesh of this.collisionMeshes) {
            // Create a bounding box for the mesh
            const boundingBox = new THREE.Box3().setFromObject(mesh);
            
            // Add a small buffer to prevent getting stuck on edges
            boundingBox.expandByScalar(-0.1);
            
            // Check if the player sphere intersects with the bounding box
            if (boundingBox.intersectsSphere(playerSphere)) {
                return true;
            }
        }
        
        return false;
    }

    update(delta) {
        if (!this.isActive) return;
        
        // Apply gravity
        this.velocity.y -= this.gravity * delta;
        
        // Calculate new position
        const newPosition = this.camera.position.clone();
        
        // Get the camera's forward and right vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        
        // Calculate movement vector
        const movement = new THREE.Vector3();
        
        // Apply movement in the direction the camera is facing
        if (this.moveForward || this.moveBackward) {
            movement.addScaledVector(
                forward, 
                (this.moveForward ? 1 : -1) * this.moveSpeed * delta
            );
        }
        
        if (this.moveLeft || this.moveRight) {
            movement.addScaledVector(
                right, 
                (this.moveRight ? 1 : -1) * this.moveSpeed * delta
            );
        }
        
        // Apply vertical movement (jumping/falling)
        movement.y = this.velocity.y * delta;
        
        // Add movement to current position
        newPosition.add(movement);
        
        // Check for collisions before applying movement
        if (!this.checkCollisions(newPosition)) {
            // No collision, update position
            this.camera.position.copy(newPosition);
        } else {
            // Collision detected, try to slide along the surface
            const slidePosition = this.camera.position.clone();
            
            // Try to move in X direction
            slidePosition.x = newPosition.x;
            if (!this.checkCollisions(slidePosition)) {
                this.camera.position.x = newPosition.x;
            }
            
            // Try to move in Z direction
            slidePosition.z = newPosition.z;
            if (!this.checkCollisions(slidePosition)) {
                this.camera.position.z = newPosition.z;
            }
            
            // Only update Y position if we're not colliding
            const yOnlyPosition = this.camera.position.clone();
            yOnlyPosition.y = newPosition.y;
            if (!this.checkCollisions(yOnlyPosition)) {
                this.camera.position.y = newPosition.y;
            }
        }
        
        // Ground check
        if (this.camera.position.y < 1) {
            this.velocity.y = 0;
            this.camera.position.y = 1;
            this.canJump = true;
        }
    }
    
    // Set player position
    setPosition(position) {
        this.camera.position.copy(position);
    }
    
    // Lock pointer
    lock() {
        this.controls.lock();
    }
    
    // Unlock pointer
    unlock() {
        this.controls.unlock();
    }
}

export default FirstPersonControls; 