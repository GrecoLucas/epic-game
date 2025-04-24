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
        this.meshOnGround = {
            type: 'box',
            width: 0.5,
            height: 0.2,
            depth: 1.5,
            color: '#FF5733',
            position: this.model.position,
            rotation: { x: 0, y: 0, z: 0 }
        };
    }

    createHandMesh() {
        this.meshInHand = {
            type: 'box',
            width: 0.4,
            height: 0.2,
            depth: 1.2,
            color: '#FF5733',
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
        if (!scene) scene = this.scene;
        this.physicalMeshes.forEach(mesh => mesh.dispose?.());
        this.physicalMeshes = [];
    
        // Base do corpo da arma (chão)
        const base = BABYLON.MeshBuilder.CreateBox("gun_ground_root", {
            width: 0.2,
            height: 0.2,
            depth: 1.2
        }, scene);
    
        const handle = BABYLON.MeshBuilder.CreateBox("gun_ground_handle", {
            width: 0.15,
            height: 0.4,
            depth: 0.15
        }, scene);
        handle.parent = base;
        handle.position = new BABYLON.Vector3(0, -0.3, -0.3);
    
        const barrel = BABYLON.MeshBuilder.CreateCylinder("gun_ground_barrel", {
            height: 0.6,
            diameter: 0.1
        }, scene);
        barrel.parent = base;
        barrel.rotation.x = Math.PI / 2;
        barrel.position = new BABYLON.Vector3(0, 0, 0.6);
    
        const scope = BABYLON.MeshBuilder.CreateBox("gun_ground_scope", {
            width: 0.3,
            height: 0.1,
            depth: 0.1
        }, scene);
        scope.parent = base;
        scope.position = new BABYLON.Vector3(0, 0.15, 0.2);
    
        // Material com textura metálica
        const material = this.createMaterial(this.meshOnGround.color, scene, {
            emissive: '#FF2500',
            bumpTexture: 'textures/flare.png'  // Usar textura disponível
        });
    
        // Criar array com todas as partes da arma
        const gunParts = [base, handle, barrel, scope];
        
        // Tornar todas as partes visíveis, coletáveis e configurar material
        gunParts.forEach(part => {
            part.material = material;
            part.isPickable = true;  // Tornar todas as partes detectáveis por raycast
            
            // Registrar cada parte na lista de meshes físicos
            this.physicalMeshes.push(part);
            
            // Configurar ActionManager para cada parte individual
            part.actionManager = new BABYLON.ActionManager(scene);
            
            // Adicionar ação de pickup para cada parte
            part.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => {
                    if (this.onPickupCallback) {
                        console.log(`Pickup acionado na parte: ${part.name}`);
                        this.onPickupCallback();
                        this.playPickupEffect(base);
                    }
                }
            ));
            
            // Efeito de hover para cada parte
            part.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                    // Destacar todas as partes ao passar o mouse sobre qualquer uma delas
                    gunParts.forEach(p => {
                        if (p.material) {
                            p.material.emissiveColor = BABYLON.Color3.FromHexString('#FF0000');
                        }
                    });
                    document.body.style.cursor = 'pointer';
                }
            ));
            
            part.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    // Restaurar todas as partes ao normal
                    gunParts.forEach(p => {
                        if (p.material) {
                            p.material.emissiveColor = BABYLON.Color3.FromHexString('#FF2500');
                        }
                    });
                    document.body.style.cursor = 'auto';
                }
            ));
        });
    
        base.position = new BABYLON.Vector3(
            this.model.position.x,
            this.model.position.y + 0.1,
            this.model.position.z
        );
    
        // Animação
        const animateGun = () => {
            if (this.model.isPickedUp) return;
            base.rotation.y += 0.01;
            const t = performance.now() * 0.001;
            base.position.y = this.model.position.y + 0.1 + Math.sin(t * 2) * 0.05;
        };
        scene.registerBeforeRender(animateGun);
    
        // ARMA NA MÃO (DETALHADA) - Criar com as mesmas partes que a arma no chão
        const handRoot = new BABYLON.TransformNode("gun_hand_root", scene);
        handRoot.parent = scene.activeCamera;
        handRoot.position = new BABYLON.Vector3(
            this.meshInHand.position.x,
            this.meshInHand.position.y,
            this.meshInHand.position.z
        );
        handRoot.rotation = new BABYLON.Vector3(0, -0.2, 0); // Leve rotação para posição natural
        
        // Criar corpo da arma na mão
        const handBase = BABYLON.MeshBuilder.CreateBox("gun_hand_body", {
            width: 0.2,
            height: 0.2,
            depth: 1.0
        }, scene);
        handBase.parent = handRoot;
        
        // Criar cabo da arma na mão
        const handHandle = BABYLON.MeshBuilder.CreateBox("gun_hand_handle", {
            width: 0.15,
            height: 0.4,
            depth: 0.15
        }, scene);
        handHandle.parent = handRoot;
        handHandle.position = new BABYLON.Vector3(0, -0.3, -0.3);
        
        // Criar cano da arma na mão
        const handBarrel = BABYLON.MeshBuilder.CreateCylinder("gun_hand_barrel", {
            height: 0.6,
            diameter: 0.1
        }, scene);
        handBarrel.parent = handRoot;
        handBarrel.rotation.x = Math.PI / 2;
        handBarrel.position = new BABYLON.Vector3(0, 0, 0.5);
        
        // Criar mira da arma na mão
        const handScope = BABYLON.MeshBuilder.CreateBox("gun_hand_scope", {
            width: 0.3,
            height: 0.1,
            depth: 0.1
        }, scene);
        handScope.parent = handRoot;
        handScope.position = new BABYLON.Vector3(0, 0.15, 0.1);
        
        // Aplicar material à arma na mão
        const handMaterial = this.createMaterial(this.meshInHand.color, scene, {
            emissive: '#FF2500',
            bumpTexture: 'textures/flare.png'
        });
        
        [handBase, handHandle, handBarrel, handScope].forEach(part => {
            part.material = handMaterial;
            this.physicalMeshes.push(part);
        });
        
        handRoot.isVisible = false;
        this.handMesh = handRoot;
        this.physicalMeshes.push(handRoot);
        
        // Criar ponto de efeito para o tiro
        const muzzle = BABYLON.MeshBuilder.CreateSphere("muzzle_point", {diameter: 0.05}, scene);
        muzzle.parent = handRoot;
        muzzle.position = new BABYLON.Vector3(0, 0, 0.8);
        muzzle.isVisible = false;
        this.muzzlePoint = muzzle;
        
        this.groundMesh = base;
        this.updateVisibility();
    
        return this.physicalMeshes;
    }
    

    updateVisibility() {
        // Se estamos usando meshes físicos
        if (this.groundMesh && this.handMesh) {
            // Atualizar a visibilidade de todas as partes da arma
            for (const mesh of this.physicalMeshes) {
                // Esconder todas as partes que começam com "gun_ground"
                if (mesh.name && mesh.name.includes("gun_ground")) {
                    mesh.isVisible = !this.model.isPickedUp;
                }
                
                // Mostrar todas as partes que começam com "gun_hand"
                if (mesh.name && mesh.name.includes("gun_hand")) {
                    mesh.isVisible = this.model.isPickedUp;
                }
            }
            return;
        }
        
        // Log para depuração
        if (this.model.isPickedUp) {
            console.log("Arma no modo POV (na mão do jogador)");
        } else {
            console.log("Arma no modo de coleta (no chão)");
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
    
    // Método para mostrar efeito de recarga
    playReloadEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Encontrar o cabo da arma na mão
        const handHandle = this.physicalMeshes.find(mesh => mesh.name === "gun_hand_handle");
        
        if (!handHandle) return;
        
        // Salvar posição original
        const originalPosition = handHandle.position.clone();
        
        // Animação de remoção do carregador
        const frames = 20;
        let frame = 0;
        
        const animateOut = () => {
            frame++;
            const progress = frame / frames;
            handHandle.position.y = originalPosition.y - 0.4 * progress;
            
            if (frame < frames) {
                requestAnimationFrame(animateOut);
            } else {
                // Quando terminar de remover, iniciar animação de colocar novo carregador
                frame = 0;
                setTimeout(() => {
                    const animateIn = () => {
                        frame++;
                        const progress = frame / frames;
                        handHandle.position.y = originalPosition.y - 0.4 * (1 - progress);
                        
                        if (frame < frames) {
                            requestAnimationFrame(animateIn);
                        }
                    };
                    
                    animateIn();
                }, 300);
            }
        };
        
        animateOut();
    }

    // Método para definir o callback de pickup
    setPickupCallback(callback) {
        this.onPickupCallback = callback;
    }
}

export default GunView;
