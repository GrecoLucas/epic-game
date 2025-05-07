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
            // A arma no chão só é visível se NÃO estiver no inventário E NÃO estiver equipada
            const showOnGround = !this.model.isInInventory && !this.model.isPickedUp;
            this.groundMesh.setEnabled(showOnGround);
            
            // Desabilitar todas as interações se a arma estiver no inventário
            if (this.physicalMeshes && this.model.isInInventory) {
                this.physicalMeshes.forEach(mesh => {
                    if (mesh && mesh.actionManager && mesh.name.includes("gun_ground")) {
                        mesh.isPickable = false;
                    }
                });
            }
            
            // A arma na mão só é visível se estiver equipada
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

    
    // Método para definir o callback de pickup
    setPickupCallback(callback) {
        this.onPickupCallback = callback;
    }

    // Método para mostrar efeito de tiro
    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Encontrar o cano da arma na mão para posicionar o efeito
        const handBarrel = this.physicalMeshes.find(mesh => mesh.name === "gun_hand_barrel");
        const muzzlePoint = this.muzzlePoint;
        
        if (!handBarrel && !muzzlePoint) return;
        
        // Criar um emissor fixo que será parent de todos os efeitos visuais
        const emitterNode = new BABYLON.TransformNode("muzzleEmitter", this.scene);
        
        // Anexar o emissor ao ponto correto (muzzlePoint ou ponta do cano)
        if (muzzlePoint) {
            emitterNode.parent = muzzlePoint.parent;
            emitterNode.position = muzzlePoint.position.clone();
        } else {
            emitterNode.parent = this.handMesh;
            // Posicionar na ponta do cano
            const barrelEnd = handBarrel.getAbsolutePosition().subtract(this.handMesh.getAbsolutePosition());
            emitterNode.position = new BABYLON.Vector3(
                barrelEnd.x,
                barrelEnd.y,
                barrelEnd.z + handBarrel.scaling.y * 0.25
            );
        }
        
        // Flash no cano - agora usando o mesmo emissor como referência
        const flash = BABYLON.MeshBuilder.CreateDisc("muzzleFlash", {
            radius: 0.1,
            tessellation: 12
        }, this.scene);
        
        // Adicionar material ao flash para torná-lo visível
        const flashMaterial = new BABYLON.StandardMaterial("flashMaterial", this.scene);
        flashMaterial.emissiveColor = new BABYLON.Color3(1, 0.7, 0);
        flashMaterial.diffuseColor = new BABYLON.Color3(1, 0.7, 0);
        flashMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        flashMaterial.backFaceCulling = false;
        flash.material = flashMaterial;
        
        // Orientar o flash para ficar perpendicular ao cano
        flash.parent = emitterNode;
        flash.rotation.x = Math.PI / 2;
        flash.position = new BABYLON.Vector3(0, 0, 0); // Centralizado no emissor
        
        // SISTEMA DE PARTÍCULAS DE FUMAÇA - usando o mesmo emissor (reduzido)
        const smokeSystem = new BABYLON.ParticleSystem("muzzleSmoke", 30, this.scene); // Reduzido para 30 partículas
        smokeSystem.particleTexture = new BABYLON.Texture("textures/smoke.png", this.scene);
        smokeSystem.emitter = emitterNode; // Usar o nó emissor como fonte das partículas
        
        // Configurar partículas de fumaça com cores cinza mais sutis
        smokeSystem.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.6); // Mais transparente
        smokeSystem.color2 = new BABYLON.Color4(0.7, 0.7, 0.7, 0.4); // Mais transparente
        smokeSystem.colorDead = new BABYLON.Color4(0.5, 0.5, 0.5, 0); // Desaparece no final
        
        // Partículas menores para fumaça mais sutil
        smokeSystem.minSize = 0.1;
        smokeSystem.maxSize = 0.2;
        
        // Menor duração para a fumaça
        smokeSystem.minLifeTime = 0.5;
        smokeSystem.maxLifeTime = 1.0;
        
        // Emitir menos partículas
        smokeSystem.emitRate = 50;
        
        // Direcionar a fumaça na direção do cano com leve variação
        smokeSystem.direction1 = new BABYLON.Vector3(0, 0.1, 1);
        smokeSystem.direction2 = new BABYLON.Vector3(0, 0.2, 1);
        
        // Velocidade reduzida para fumaça mais sutil
        smokeSystem.minEmitPower = 0.5;
        smokeSystem.maxEmitPower = 1.5;
        
        // Gravidade positiva para a fumaça subir
        smokeSystem.gravity = new BABYLON.Vector3(0, 0.1, 0);
        
        // Rotação para movimento natural
        smokeSystem.minAngularSpeed = -0.2;
        smokeSystem.maxAngularSpeed = 0.2;
        
        // Propriedades de blending para fumaça
        smokeSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        
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
        
        // Iniciar o sistema de partículas
        smokeSystem.start();
        
        // Gerenciamento de recursos: remover o flash rapidamente
        setTimeout(() => {
            flash.dispose();
            
            // Continuar a emissão de fumaça por menos tempo
            setTimeout(() => {
                smokeSystem.stop(); // Parar fumaça depois de 100ms
                
                // Limpar todos os recursos após todas partículas terminarem
                setTimeout(() => {
                    smokeSystem.dispose();
                    emitterNode.dispose();
                }, 1000); // Tempo reduzido para que todas as partículas desapareçam
            }, 100);
        }, 50);
    }
}

export default GunView;