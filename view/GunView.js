class GunView {
    constructor(scene, model) {
        this.scene = scene;
        this.model = model;
        this.meshOnGround = null;
        this.meshInHand = null;
        this.groundMesh = null;
        this.handMesh = null;
        this.muzzlePoint = null;
        this.physicalMeshes = [];
        this.onPickupCallback = null; 
        this.init();
    }

    init() {
        // Inicialmente, mostrar apenas a arma no chão se não estiver pega
        this.updateVisibility();
    }

    // Métodos a serem implementados pelas subclasses específicas de armas
    createPhysicalMeshes(scene) {
        console.warn("createPhysicalMeshes deve ser implementado pelas subclasses");
        return [];
    }
    
    // Material compartilhado para as armas
    createMaterial(color, scene, options = {}) {
        const mat = new BABYLON.StandardMaterial("gunMaterial", scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString(color);
        mat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        mat.emissiveColor = options.emissive ? 
                            BABYLON.Color3.FromHexString(options.emissive) : 
                            BABYLON.Color3.Black();
        mat.alpha = options.alpha || 1.0;

        if (options.bumpTexture) {
            mat.bumpTexture = new BABYLON.Texture(options.bumpTexture, scene);
        }
        return mat;
    }

    updateVisibility() {
        if (!this.groundMesh || !this.handMesh) return;
        
        // A arma no chão só é visível se NÃO estiver no inventário E NÃO estiver equipada
        const showOnGround = !this.model.isInInventory && !this.model.isPickedUp;
        this.groundMesh.setEnabled(showOnGround);
        
        // Desabilitar interações se a arma estiver no inventário
        if (this.model.isInInventory && this.physicalMeshes) {
            this.physicalMeshes
                .filter(mesh => mesh?.name?.includes("gun_ground"))
                .forEach(mesh => mesh.isPickable = false);
        }
        
        // A arma na mão só é visível se estiver equipada
        this.handMesh.setEnabled(this.model.isPickedUp);
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

    // Método base para mostrar efeito de tiro
    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Encontrar o ponto de referência para efeitos visuais
        const emitterNode = this._createEmitterNode();
        if (!emitterNode) return;
        
        // Flash no cano - usando parametrização
        const flashParams = this.getMuzzleFlashParams();
        const flash = this._createMuzzleFlash(emitterNode, flashParams);
        
        // Sistema de partículas de fumaça
        const smokeSystem = this._createSmokeSystem(emitterNode);
        
        // Efeito de recuo da arma (básico - as subclasses podem adicionar mais complexidade)
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
        
        // Gerenciar ciclo de vida dos efeitos visuais
        this._manageEffectLifecycle(flash, smokeSystem, emitterNode);
    }
    
    // Método para obter parâmetros do flash - pode ser sobrescrito pelas subclasses
    getMuzzleFlashParams() {
        return {
            // Parâmetros do flash principal
            radius: 0.05,
            tessellation: 16,
            emissiveColor: new BABYLON.Color3(1, 0.5, 0.1),
            diffuseColor: new BABYLON.Color3(1, 0.5, 0.1),
            specularColor: new BABYLON.Color3(1, 0.7, 0.3),
            position: new BABYLON.Vector3(0, 0.2, -0.1),
            
            // Parâmetros Fresnel para brilho
            fresnelBias: 0.4,
            fresnelPower: 2,
            emissiveIntensity: 2.0,
            
            // Parâmetros do flash interior
            innerRadius: 0.03,
            innerTessellation: 8,
            innerEmissiveColor: new BABYLON.Color3(1, 0.9, 0.5),
            innerDiffuseColor: new BABYLON.Color3(1, 0.9, 0.5),
            innerSpecularColor: new BABYLON.Color3(1, 1, 1)
        };
    }

    _createEmitterNode() {
        // Criar um emissor fixo para todos os efeitos visuais
        const emitterNode = new BABYLON.TransformNode("muzzleEmitter", this.scene);
        
        // Anexar ao ponto correto
        if (this.muzzlePoint) {
            emitterNode.parent = this.muzzlePoint.parent;
            emitterNode.position = this.muzzlePoint.position.clone();
            return emitterNode;
        }
        
        // Fallback para encontrar o cano da arma
        const handBarrel = this.physicalMeshes.find(mesh => mesh.name === "gun_hand_barrel");
        if (handBarrel && this.handMesh) {
            emitterNode.parent = this.handMesh;
            // Posicionar na ponta do cano
            const barrelEnd = handBarrel.getAbsolutePosition().subtract(this.handMesh.getAbsolutePosition());
            emitterNode.position = new BABYLON.Vector3(
                barrelEnd.x,
                barrelEnd.y,
                barrelEnd.z + handBarrel.scaling.y * 0.25
            );
            return emitterNode;
        }
        
        // Último recurso: posição padrão
        if (this.handMesh) {
            emitterNode.parent = this.handMesh;
            emitterNode.position = new BABYLON.Vector3(0, 0.1, 1);
            return emitterNode;
        }
        
        emitterNode.dispose();
        return null;
    }
    
    _createMuzzleFlash(emitterNode, params) {
        // Disco principal com parâmetros customizados
        const flash = BABYLON.MeshBuilder.CreateDisc("muzzleFlash", {
            radius: params.radius,
            tessellation: params.tessellation
        }, this.scene);
        
        const flashMaterial = new BABYLON.StandardMaterial("flashMaterial", this.scene);
        flashMaterial.emissiveColor = params.emissiveColor;
        flashMaterial.diffuseColor = params.diffuseColor;
        flashMaterial.specularColor = params.specularColor;
        flashMaterial.backFaceCulling = false;
        
        // Configuração do brilho baseada nos parâmetros
        flashMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
        flashMaterial.emissiveFresnelParameters.bias = params.fresnelBias;
        flashMaterial.emissiveFresnelParameters.power = params.fresnelPower;
        flashMaterial.emissiveIntensity = params.emissiveIntensity;
        
        flash.material = flashMaterial;
        
        // Orientar o flash perpendicular ao cano com posição customizada
        flash.parent = emitterNode;
        flash.rotation.x = 0;
        flash.position = params.position;
        
        // Adicionar um segundo flash menor no centro para maior realismo
        const innerFlash = BABYLON.MeshBuilder.CreateDisc("innerFlash", {
            radius: params.innerRadius,
            tessellation: params.innerTessellation
        }, this.scene);
        
        const innerMaterial = new BABYLON.StandardMaterial("innerFlashMaterial", this.scene);
        innerMaterial.emissiveColor = params.innerEmissiveColor; 
        innerMaterial.diffuseColor = params.innerDiffuseColor;
        innerMaterial.specularColor = params.innerSpecularColor;
        innerMaterial.backFaceCulling = false;
        innerFlash.material = innerMaterial;
        
        innerFlash.parent = flash;
        innerFlash.position.z = 0.01; // Ligeiramente à frente do flash principal
        
        // Animação de pulsação para todos os flashes
        BABYLON.Animation.CreateAndStartAnimation(
            "flashPulse",
            flash,
            "scaling",
            60,
            5,
            new BABYLON.Vector3(0.8, 0.8, 0.8),
            new BABYLON.Vector3(1.2, 1.2, 1.2),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Encadenar o flash interior no flash exterior para limpar automaticamente
        this.scene.onBeforeRenderObservable.addOnce(() => {
            flash.getChildMeshes().forEach(child => {
                if (child === innerFlash) {
                    innerFlash.parent = flash;
                }
            });
        });
        
        return flash;
    }

    _createSmokeSystem(emitterNode) {
        // Sistema de partículas de fumaça otimizado
        const smokeSystem = new BABYLON.ParticleSystem("muzzleSmoke", 30, this.scene);
        smokeSystem.particleTexture = new BABYLON.Texture("textures/smoke.png", this.scene);
        smokeSystem.emitter = emitterNode;
        
        // Cores e opacidade
        smokeSystem.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.6);
        smokeSystem.color2 = new BABYLON.Color4(0.7, 0.7, 0.7, 0.4);
        smokeSystem.colorDead = new BABYLON.Color4(0.5, 0.5, 0.5, 0);
        
        // Tamanho e duração das partículas
        smokeSystem.minSize = 0.1;
        smokeSystem.maxSize = 0.2;
        smokeSystem.minLifeTime = 0.5;
        smokeSystem.maxLifeTime = 1.0;
        
        // Taxa e direção de emissão
        smokeSystem.emitRate = 50;
        smokeSystem.direction1 = new BABYLON.Vector3(0, 0.1, 1);
        smokeSystem.direction2 = new BABYLON.Vector3(0, 0.2, 1);
        smokeSystem.minEmitPower = 0.5;
        smokeSystem.maxEmitPower = 1.5;
        
        // Gravidade e rotação
        smokeSystem.gravity = new BABYLON.Vector3(0, 0.1, 0);
        smokeSystem.minAngularSpeed = -0.2;
        smokeSystem.maxAngularSpeed = 0.2;
        
        // Mode de mesclagem para fumaça
        smokeSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        
        // Iniciar o sistema
        smokeSystem.start();
        
        return smokeSystem;
    }
    
    _manageEffectLifecycle(flash, smokeSystem, emitterNode) {
        // Remover o flash rapidamente
        setTimeout(() => {
            if (flash) flash.dispose();
            
            // Continuar a emissão de fumaça por menos tempo
            setTimeout(() => {
                if (smokeSystem) smokeSystem.stop();
                
                // Limpar todos os recursos após todas partículas terminarem
                setTimeout(() => {
                    if (smokeSystem) smokeSystem.dispose();
                    if (emitterNode) emitterNode.dispose();
                }, 1000);
            }, 100);
        }, 50);
    }
}

export default GunView;