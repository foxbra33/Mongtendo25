import * as THREE from 'three';

class BackgroundEffects {
    constructor(scene) {
        this.scene = scene;
        this.particles = null;
        this.currentEffect = 'solid';
        this.particleCount = 1000;
        this.particleSpeed = 1;
        this.particleSize = 1;
        this.backgroundColor = new THREE.Color(0x000000);
    }

    init() {
        this.setupEventListeners();
        this.updateBackground();
    }

    setupEventListeners() {
        const backgroundType = document.getElementById('background-type');
        const backgroundColor = document.getElementById('background-color');
        const particleCount = document.getElementById('particle-count');
        const particleSpeed = document.getElementById('particle-speed');
        const particleSize = document.getElementById('particle-size');

        backgroundType.addEventListener('change', () => {
            this.currentEffect = backgroundType.value;
            this.updateBackground();
        });

        backgroundColor.addEventListener('input', () => {
            this.backgroundColor.set(backgroundColor.value);
            this.updateBackground();
        });

        particleCount.addEventListener('input', () => {
            this.particleCount = parseInt(particleCount.value);
            document.getElementById('particle-count-value').textContent = this.particleCount;
            this.updateBackground();
        });

        particleSpeed.addEventListener('input', () => {
            this.particleSpeed = parseFloat(particleSpeed.value);
            document.getElementById('particle-speed-value').textContent = this.particleSpeed;
        });

        particleSize.addEventListener('input', () => {
            this.particleSize = parseFloat(particleSize.value);
            document.getElementById('particle-size-value').textContent = this.particleSize;
            if (this.particles) {
                this.particles.material.size = this.particleSize;
            }
        });
    }

    updateBackground() {
        // Clear existing particles
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles = null;
        }

        // Update scene background
        this.scene.background = this.backgroundColor;

        // Show/hide controls based on effect type
        const particleControls = document.getElementById('particle-controls');
        const solidColorControls = document.getElementById('solid-color-controls');

        if (this.currentEffect === 'solid') {
            particleControls.classList.remove('active');
            solidColorControls.style.display = 'block';
        } else {
            particleControls.classList.add('active');
            solidColorControls.style.display = 'none';
            this.createParticleEffect();
        }
    }

    createParticleEffect() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 2000;
            positions[i3 + 1] = (Math.random() - 0.5) * 2000;
            positions[i3 + 2] = (Math.random() - 0.5) * 2000;

            velocities[i3] = 0;
            velocities[i3 + 1] = this.currentEffect === 'snow' ? -1 : 1;
            velocities[i3 + 2] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const material = new THREE.PointsMaterial({
            size: this.particleSize,
            color: this.currentEffect === 'space' ? 0xFFFFFF : 0x88CCFF,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    update() {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        const velocities = this.particles.geometry.attributes.velocity.array;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += velocities[i + 1] * this.particleSpeed;

            // Reset position when particle goes out of bounds
            if (this.currentEffect === 'snow' && positions[i + 1] < -1000) {
                positions[i + 1] = 1000;
                positions[i] = (Math.random() - 0.5) * 2000;
                positions[i + 2] = (Math.random() - 0.5) * 2000;
            } else if (this.currentEffect === 'rain' && positions[i + 1] > 1000) {
                positions[i + 1] = -1000;
                positions[i] = (Math.random() - 0.5) * 2000;
                positions[i + 2] = (Math.random() - 0.5) * 2000;
            } else if (this.currentEffect === 'space') {
                // Space particles move in random directions
                positions[i] += velocities[i] * this.particleSpeed * 0.1;
                positions[i + 2] += velocities[i + 2] * this.particleSpeed * 0.1;

                if (Math.abs(positions[i]) > 1000 || Math.abs(positions[i + 2]) > 1000) {
                    positions[i] = (Math.random() - 0.5) * 2000;
                    positions[i + 2] = (Math.random() - 0.5) * 2000;
                }
            }
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }
}

export default BackgroundEffects; 