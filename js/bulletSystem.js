import * as THREE from 'three';

class BulletSystem {
    constructor(scene) {
        this.scene = scene;
        this.bullets = [];
        this.smokeObjects = [];
        this.bulletSpeed = 30;
        this.bulletLifetime = 2; // seconds
        this.smokeLifetime = 2; // seconds
        this.lastShotTime = 0;
        this.shotCooldown = 0.067; // seconds between shots
        
        // Create audio listener
        this.listener = new THREE.AudioListener();
        this.camera = scene.getObjectByProperty('type', 'PerspectiveCamera');
        if (this.camera) {
            this.camera.add(this.listener);
        }
        
        // Load gunshot sound
        this.gunshotSound = new THREE.Audio(this.listener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('./sounds/GunshotPistol_BW.56967.wav', (buffer) => {
            this.gunshotSound.setBuffer(buffer);
            this.gunshotSound.setVolume(0.5);
        });
        
        // Create bullet geometry and material
        this.bulletGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
        this.bulletMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700, // Gold color
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x553311,
            emissiveIntensity: 0.2
        });
        
        // Create smoke geometry and material
        this.smokeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        this.smokeMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaaaaa,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        console.log("Bullet system initialized with mesh-based smoke");
    }
    
    // Create smoke at position
    createSmoke(position, direction) {
        // Create multiple smoke objects
        const smokeCount = 3;
        
        for (let i = 0; i < smokeCount; i++) {
            // Create smoke mesh
            const smoke = new THREE.Mesh(this.smokeGeometry, this.smokeMaterial.clone());
            
            // Position smoke slightly behind bullet with some randomness
            const offset = new THREE.Vector3().copy(direction).multiplyScalar(-0.4);
            const randomOffset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.15,
                (Math.random() - 0.5) * 0.15,
                (Math.random() - 0.5) * 0.15
            );
            const smokePos = position.clone().add(offset).add(randomOffset);
            
            smoke.position.copy(smokePos);
            
            // Random scale for variety
            const scale = Math.random() * 0.3 + 0.2;
            smoke.scale.set(scale, scale, scale);
            
            // Add to scene and smoke objects array
            this.scene.add(smoke);
            this.smokeObjects.push({
                mesh: smoke,
                created: performance.now() / 1000,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5 + 0.2, // Slight upward bias
                    (Math.random() - 0.5) * 0.5
                ),
                scale: scale,
                active: true
            });
        }
    }
    
    // Shoot a bullet from the camera
    shoot(camera) {
        const currentTime = performance.now() / 1000;
        
        // Check cooldown
        if (currentTime - this.lastShotTime < this.shotCooldown) {
            return;
        }
        
        this.lastShotTime = currentTime;
        
        // Play gunshot sound - restart if already playing
        if (this.gunshotSound && this.gunshotSound.buffer) {
            if (this.gunshotSound.isPlaying) {
                this.gunshotSound.stop();
            }
            this.gunshotSound.play();
        }
        
        // Create bullet
        const bullet = new THREE.Mesh(this.bulletGeometry, this.bulletMaterial);
        
        // Position bullet at camera
        bullet.position.copy(camera.position);
        
        // Set bullet direction based on camera direction
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        
        // Rotate bullet to align with direction
        bullet.lookAt(bullet.position.clone().add(direction));
        bullet.rotateX(Math.PI / 2); // Rotate to align cylinder with direction
        
        // Add to scene and bullets array
        this.scene.add(bullet);
        this.bullets.push({
            mesh: bullet,
            direction: direction,
            created: currentTime,
            active: true
        });
        
        // Create initial smoke at bullet position
        this.createSmoke(bullet.position, direction);
        
        console.log("Bullet fired with smoke trail");
    }
    
    // Update bullets and smoke
    update(delta) {
        const currentTime = performance.now() / 1000;
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            if (!bullet.active) continue;
            
            // Move bullet
            bullet.mesh.position.addScaledVector(bullet.direction, this.bulletSpeed * delta);
            
            // Create smoke trail more frequently
            if (Math.random() > 0.3) { // Even more frequent smoke
                this.createSmoke(bullet.mesh.position, bullet.direction);
            }
            
            // Check if bullet is expired
            if (currentTime - bullet.created > this.bulletLifetime) {
                this.scene.remove(bullet.mesh);
                bullet.active = false;
                this.bullets.splice(i, 1);
            }
        }
        
        // Update smoke objects
        this.updateSmokeObjects(delta);
    }
    
    // Update smoke objects
    updateSmokeObjects(delta) {
        const currentTime = performance.now() / 1000;
        
        for (let i = this.smokeObjects.length - 1; i >= 0; i--) {
            const smoke = this.smokeObjects[i];
            
            if (!smoke.active) continue;
            
            // Move smoke
            smoke.mesh.position.addScaledVector(smoke.velocity, delta);
            
            // Add some turbulence
            smoke.velocity.x += (Math.random() - 0.5) * 0.1 * delta;
            smoke.velocity.y += (Math.random() - 0.5) * 0.1 * delta;
            smoke.velocity.z += (Math.random() - 0.5) * 0.1 * delta;
            
            // Expand smoke
            const age = currentTime - smoke.created;
            const expansionFactor = 1 + age * 0.3;
            smoke.mesh.scale.set(
                smoke.scale * expansionFactor,
                smoke.scale * expansionFactor,
                smoke.scale * expansionFactor
            );
            
            // Fade out smoke
            const opacity = Math.max(0, 0.3 - age / this.smokeLifetime);
            smoke.mesh.material.opacity = opacity;
            
            // Check if smoke is expired
            if (age > this.smokeLifetime || opacity <= 0) {
                this.scene.remove(smoke.mesh);
                smoke.active = false;
                this.smokeObjects.splice(i, 1);
            }
        }
    }
}

export default BulletSystem; 