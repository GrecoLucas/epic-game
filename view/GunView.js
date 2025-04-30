class GunView {
    constructor(scene, model) {
        this.scene = scene;
        this.model = model;
        this.meshOnGround = null;
        this.meshInHand = null;
        this.physicalMeshes = [];
        this.onPickupCallback = null; 
        this.init();
    }

    init() {
        // Criar meshes para a arma no chão e na mão
        this.createGroundMesh();
        this.createHandMesh();
        
        // Inicialmente, mostrar apenas a arma no chão se não estiver pega
        this.updateVisibility();
    }

    createGroundMesh() {
        // Method to be overridden by specific gun types
        this.meshOnGround = {
            type: 'box',
            width: 0.5,
            height: 0.2,
            depth: 1.5,
            color: '#303030',
            position: this.model.position,
            rotation: { x: 0, y: 0, z: 0 }
        };
    }

    createHandMesh() {
        // Method to be overridden by specific gun types
        this.meshInHand = {
            type: 'box',
            width: 0.4,
            height: 0.2,
            depth: 1.2,
            color: '#303030',
            position: { x: 0.5, y: -0.3, z: 0.8 },
            rotation: { x: 0, y: 0, z: 0 }
        };
    }
        
    createMaterial(color, scene, options = {}) {
        const mat = new BABYLON.StandardMaterial("gunMaterial", scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString(color);
        mat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        mat.emissiveColor = BABYLON.Color3.FromHexString(options.emissive || '#000000');
        mat.alpha = options.alpha || 1.0;

        if (options.bumpTexture) {
            mat.bumpTexture = new BABYLON.Texture(options.bumpTexture, scene);
        }
        return mat;
    }

    createPhysicalMeshes(scene) {
        // Abstract method that should be implemented by subclasses
        console.warn("createPhysicalMeshes should be implemented by subclasses");
        return [];
    }

    updateVisibility() {
        // Se estamos usando meshes físicos (root nodes)
        if (this.groundMesh && this.handMesh) {
            // Habilitar/desabilitar a arma no chão baseada no estado 'picked up'
            // Use setEnabled para melhor performance e controle da hierarquia
            this.groundMesh.setEnabled(!this.model.isPickedUp);

            // Habilitar/desabilitar a arma na mão baseada no estado 'picked up'
            this.handMesh.setEnabled(this.model.isPickedUp);
        }
    }
        
    update() {
        // Atualizar posição da arma no chão se necessário
        if (!this.model.isPickedUp && this.groundMesh) {
            this.groundMesh.position.x = this.model.position.x;
            this.groundMesh.position.z = this.model.position.z;
        }
        
        this.updateVisibility();
    }

    // Método para criar um efeito visual quando a arma é pega
    playPickupEffect(gunMesh) {
        if (!gunMesh) return;
        
        // Criar sistema de partículas para efeito de "brilho" ao pegar a arma
        const particleSystem = new BABYLON.ParticleSystem("pickupParticles", 50, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        particleSystem.emitter = gunMesh.position.clone(); // Posição atual da arma
        
        // Configuração das partículas
        particleSystem.color1 = new BABYLON.Color4(1, 0.8, 0, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 0.5, 0, 1);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;
        
        particleSystem.emitRate = 100;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.direction1 = new BABYLON.Vector3(-1, 1, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
        
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;
        
        // Iniciar o sistema de partículas e parar após um curto período
        particleSystem.start();
        
        setTimeout(() => {
            particleSystem.stop();
            // Limpar recursos após as partículas terminarem
            setTimeout(() => particleSystem.dispose(), 2000);
        }, 300);
    }

    // Método para mostrar efeito de tiro
    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Encontrar o cano da arma na mão para posicionar o efeito
        const handBarrel = this.physicalMeshes.find(mesh => mesh.name === "gun_hand_barrel");
        const muzzlePoint = this.muzzlePoint;
        
        if (!handBarrel && !muzzlePoint) return;
        
        // Posição de saída do tiro (ponta do cano)
        const emitterPosition = muzzlePoint ? muzzlePoint.getAbsolutePosition() : 
                               handBarrel.getAbsolutePosition().add(new BABYLON.Vector3(0, 0, 0.4));
        
        // Flash no cano
        const flash = BABYLON.MeshBuilder.CreateDisc("muzzleFlash", {
            radius: 0.1,
            tessellation: 12
        }, this.scene);
        
        const flashMaterial = new BABYLON.StandardMaterial("flashMaterial", this.scene);
        flashMaterial.emissiveColor = new BABYLON.Color3(1, 0.7, 0);
        flashMaterial.diffuseColor = new BABYLON.Color3(1, 0.7, 0);
        flashMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        flashMaterial.backFaceCulling = false;
        flash.material = flashMaterial;
        
        flash.position = emitterPosition;
        flash.rotation = new BABYLON.Vector3(0, 0, 0);
        // Orientar o flash para ficar perpendicular ao cano
        if (this.handMesh) {
            flash.rotation.x = Math.PI / 2;
            flash.parent = this.handMesh;
        }
        
        // Criar sistema de partículas para o disparo
        const particleSystem = new BABYLON.ParticleSystem("shootParticles", 30, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        particleSystem.emitter = emitterPosition;
        
        // Configurações das partículas
        particleSystem.color1 = new BABYLON.Color4(1, 0.7, 0, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 0.5, 0, 1);
        particleSystem.colorDead = new BABYLON.Color4(0.5, 0.5, 0.5, 0);
        
        particleSystem.minSize = 0.05;
        particleSystem.maxSize = 0.1;
        
        particleSystem.minLifeTime = 0.05;
        particleSystem.maxLifeTime = 0.2;
        
        particleSystem.emitRate = 300;
        particleSystem.direction1 = new BABYLON.Vector3(0, 0, 1);
        particleSystem.direction2 = new BABYLON.Vector3(0, 0, 1);
        
        particleSystem.minEmitPower = 3;
        particleSystem.maxEmitPower = 5;
        
        particleSystem.updateSpeed = 0.01;
        
        // Efeito de recuo da arma
        if (this.handMesh) {
            const originalPosition = this.handMesh.position.clone();
            this.handMesh.position.z -= 0.1; // Movimento de recuo
            
            // Animação para retornar à posição original
            setTimeout(() => {
                const frames = 10;
                let frame = 0;
                
                const animate = () => {
                    frame++;
                    const progress = frame / frames;
                    this.handMesh.position.z = originalPosition.z - 0.1 * (1 - progress);
                    
                    if (frame < frames) {
                        requestAnimationFrame(animate);
                    }
                };
                
                animate();
            }, 50);
        }
        
        // Iniciar efeitos e depois limpar
        particleSystem.start();
        
        // Remover o flash e partículas após um curto período
        setTimeout(() => {
            flash.dispose();
            particleSystem.stop();
            setTimeout(() => {
                particleSystem.dispose();
            }, 200);
        }, 100);
    }
    
    // Método para mostrar efeito de recarga - pode ser sobrescrito por subclasses
    playReloadEffect() {
        console.warn("playReloadEffect should be implemented by subclasses");
    }
    
    // Método para definir o callback de pickup
    setPickupCallback(callback) {
        this.onPickupCallback = callback;
    }
}

export default GunView;