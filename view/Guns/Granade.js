import GunView from '../GunView.js';

class Granade extends GunView {
    constructor(scene, model) {
        super(scene, model);
        this.thrownGrenades = []; // Array para rastrear granadas atiradas
    }

    createPhysicalMeshes(scene) {
        if (!scene) scene = this.scene;
        this.physicalMeshes.forEach(mesh => mesh.dispose?.());
        this.physicalMeshes = [];

        // --- GRANADA NO CHÃO ---
        const groundRoot = this._createGroundGrenadeMesh(scene);
        
        // --- GRANADA NA MÃO (POV) ---
        const handRoot = this._createHandGrenadeMesh(scene);

        this.updateVisibility();
        return this.physicalMeshes;
    }
      _createGroundGrenadeMesh(scene) {
        const groundRoot = new BABYLON.TransformNode("gun_ground_root", scene);

        BABYLON.SceneLoader.ImportMesh("", "models/Gun/granade/", "scene.gltf", scene, (meshes) => {
            meshes.forEach(mesh => {
                if (mesh.name !== "gun_ground_root") {
                    mesh.parent = groundRoot;
                    mesh.name = "gun_ground_" + mesh.name;
                    mesh.isPickable = true;
                    this.physicalMeshes.push(mesh);
                    
                    
                    // ActionManager para interações
                    this._setupMeshInteractions(mesh, meshes);
                }
            });

            groundRoot.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
        }, (progress) => {
        }, (error) => {
        });

        groundRoot.position = new BABYLON.Vector3(
            this.model.position.x,
            this.model.position.y,
            this.model.position.z
        );
        
        this.groundMesh = groundRoot;
        this.physicalMeshes.push(groundRoot);

        // Animação de flutuação
        this._setupFloatingAnimation(groundRoot);
        
        return groundRoot;
    }
    
    _createHandGrenadeMesh(scene) {
        const handRoot = new BABYLON.TransformNode("gun_hand_root", scene);
        handRoot.parent = scene.activeCamera;
        handRoot.position = new BABYLON.Vector3(0.8, -0.5, 1.0);
        handRoot.rotation = new BABYLON.Vector3(-(Math.PI / 2), 0, 0);

        BABYLON.SceneLoader.ImportMesh("", "models/Gun/granade/", "scene.gltf", scene, (meshes) => {
            meshes.forEach(mesh => {
                if (mesh.name !== "gun_hand_root") {
                    mesh.parent = handRoot;
                    mesh.name = "gun_hand_" + mesh.name;
                    mesh.isPickable = false;
                    this.physicalMeshes.push(mesh);
                }
            });

            handRoot.scaling = new BABYLON.Vector3(0.05, 0.05, 0.05);
        });

        this.handMesh = handRoot;
        this.physicalMeshes.push(handRoot);
        
        return handRoot;
    }
    
    _setupMeshInteractions(mesh, meshes) {
        mesh.actionManager = new BABYLON.ActionManager(this.scene);

        // Ação de pickup
        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => {
                if (this.onPickupCallback) {
                    this.onPickupCallback();
                }
            }
        ));

        // Efeito de hover
        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            () => {
                meshes.forEach(p => {
                    if (p.material) p.material.emissiveColor = BABYLON.Color3.FromHexString('#555555');
                });
                document.body.style.cursor = 'pointer';
            }
        ));

        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            () => {
                meshes.forEach(p => {
                    if (p.material) p.material.emissiveColor = BABYLON.Color3.Black();
                });
                document.body.style.cursor = 'default';
            }
        ));
    }
    
    _setupFloatingAnimation(mesh) {
        const floatAnimation = BABYLON.Animation.CreateAndStartAnimation(
            "float",
            mesh,
            "position.y",
            30,
            60,
            mesh.position.y,
            mesh.position.y + 0.2,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const rotateAnimation = BABYLON.Animation.CreateAndStartAnimation(
            "rotate",
            mesh,
            "rotation.y",
            30,
            120,
            0,
            Math.PI * 2,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
    }

    // Override do método playShootEffect para lançar granada
    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        this._throwGrenade();
    }    
    _throwGrenade() {
        const camera = this.scene.activeCamera;
        
        // Efeito visual: fazer a granada na mão "desaparecer" temporariamente
        if (this.handMesh) {
            this.handMesh.setEnabled(false);
            
            // Fazer a granada reaparecer na mão após um breve momento
            setTimeout(() => {
                if (this.handMesh && this.model.isPickedUp) {
                    this.handMesh.setEnabled(true);
                }
            }, 500);
        }
        
        // Usar a posição do jogador em vez da câmera
        let startPosition;
        if (this.scene.gameInstance && this.scene.gameInstance.player) {
            // Obter a posição real do jogador
            const playerPosition = this.scene.gameInstance.player.getPosition();
            
            // Ajustar posição para ser ligeiramente à frente do jogador (como se saindo da mão)
            const forwardDirection = camera.getForwardRay().direction.normalize();
            const handOffset = forwardDirection.scale(0.8); // 0.8 metros à frente
            
            startPosition = new BABYLON.Vector3(
                playerPosition.x + handOffset.x, 
                playerPosition.y + 1.5, // Altura do peito/ombro
                playerPosition.z + handOffset.z
            );
        } else {
            startPosition = camera.position.clone();
            startPosition.y = camera.position.y - 1.0; // Assumindo que a câmera está na "cabeça"
        }
        
        // Criar granada física que será lançada
        const grenade = this._createThrownGrenade(startPosition);
        
        // Calcular direção de lançamento (arco parabólico simples)
        const forwardDirection = camera.getForwardRay().direction.normalize();
        const velocity = forwardDirection.scale(15); // Velocidade horizontal
        velocity.y = 8; // Componente vertical para o arco
        
        // Aplicar física de arco
        this._applyGrenadePhysics(grenade, velocity);
        
        // Iniciar timer de explosão
        this._startExplosionTimer(grenade);
        
        this.thrownGrenades.push(grenade);
    }
      _createThrownGrenade(position) {
        // Criar um container para a granada arremessada
        const grenadeRoot = new BABYLON.TransformNode("thrownGrenadeRoot", this.scene);
        grenadeRoot.position = position.clone();
        
        // Carregar o modelo 3D da granada
        BABYLON.SceneLoader.ImportMesh("", "models/Gun/granade/", "scene.gltf", this.scene, (meshes) => {
            meshes.forEach(mesh => {
                if (mesh.name !== "thrownGrenadeRoot") {
                    mesh.parent = grenadeRoot;
                    mesh.name = "thrown_" + mesh.name;
                    mesh.isPickable = false; // Granada voando não deve ser clicável
                }
            });
            
            // Escala menor para a granada arremessada
            grenadeRoot.scaling = new BABYLON.Vector3(0.05, 0.05, 0.05);
            
            // Adicionar uma pequena rotação contínua para realismo
            BABYLON.Animation.CreateAndStartAnimation(
                "grenadeSpinX",
                grenadeRoot,
                "rotation.x",
                30,
                30,
                0,
                Math.PI * 2,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            BABYLON.Animation.CreateAndStartAnimation(
                "grenadeSpinZ",
                grenadeRoot,
                "rotation.z",
                30,
                20,
                0,
                Math.PI,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
        }, (progress) => {
            // Progress callback
        }, (error) => {
            console.error("❌ Erro ao carregar modelo da granada arremessada:", error);
            
            // Fallback: criar uma esfera simples se o modelo não carregar
            const fallbackGrenade = BABYLON.MeshBuilder.CreateSphere("fallbackGrenade", {diameter: 0.2}, this.scene);
            fallbackGrenade.parent = grenadeRoot;
            
            const material = new BABYLON.StandardMaterial("fallbackGrenadeMaterial", this.scene);
            material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            fallbackGrenade.material = material;
        });
        
        // Dados de física (anexados ao root)
        grenadeRoot.velocity = new BABYLON.Vector3(0, 0, 0);
        grenadeRoot.gravity = -20;
        grenadeRoot.hasExploded = false;
        
        return grenadeRoot;
    }
    
    _applyGrenadePhysics(grenade, initialVelocity) {
        grenade.velocity = initialVelocity.clone();
        
        const physicsLoop = () => {
            if (grenade.hasExploded || grenade.isDisposed()) {
                return;
            }
            
            const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
            
            // Aplicar gravidade
            grenade.velocity.y += grenade.gravity * deltaTime;
            
            // Atualizar posição
            grenade.position.addInPlace(grenade.velocity.scale(deltaTime));
            
            // Verificar colisão com o chão
            if (grenade.position.y <= 0.15) {
                grenade.position.y = 0.15;
                grenade.velocity.y = Math.abs(grenade.velocity.y) * 0.3; // Bounce reduzido
                grenade.velocity.x *= 0.7; // Atrito
                grenade.velocity.z *= 0.7;
            }
            
            // Continuar física
            requestAnimationFrame(physicsLoop);
        };
        
        physicsLoop();
    }
    
    _startExplosionTimer(grenade) {
        // Visual de warning (piscar vermelho nos últimos segundos)
        const warningTimer = setTimeout(() => {
            if (!grenade.hasExploded && !grenade.isDisposed()) {
                this._startWarningBlink(grenade);
            }
        }, this.model.fuseTime - 1000); // 1 segundo antes da explosão
        
        // Explosão
        const explosionTimer = setTimeout(() => {
            if (!grenade.hasExploded && !grenade.isDisposed()) {
                this._explodeGrenade(grenade);
            }
        }, this.model.fuseTime);
    }
    
    _startWarningBlink(grenade) {
        let blinkCount = 0;
        const originalColor = grenade.material.emissiveColor.clone();
        
        const blinkInterval = setInterval(() => {
            if (grenade.hasExploded || grenade.isDisposed()) {
                clearInterval(blinkInterval);
                return;
            }
            
            blinkCount++;
            const isRed = blinkCount % 2 === 1;
            grenade.material.emissiveColor = isRed ? 
                new BABYLON.Color3(0.8, 0.1, 0.1) : 
                originalColor;
                
            if (blinkCount >= 10) { // 5 piscadas
                clearInterval(blinkInterval);
            }
        }, 100);
    }
    
    _explodeGrenade(grenade) {
        grenade.hasExploded = true;
        const explosionPosition = grenade.position.clone();
        
        // Som de explosão
        if (this.scene.gameInstance && this.scene.gameInstance.soundManager) {
            this.scene.gameInstance.soundManager.play('granade_explosion', 0.3);
        }
        
        // Efeito visual de explosão
        this._createExplosionEffect(explosionPosition);
        
        // Dano aos zumbis próximos
        this._damageNearbyEnemies(explosionPosition);
        
        // Remover a granada
        grenade.dispose();
        
        // Remover da lista
        const index = this.thrownGrenades.indexOf(grenade);
        if (index > -1) {
            this.thrownGrenades.splice(index, 1);
        }
    }
    
    _createExplosionEffect(position) {
        // Sistema de partículas de explosão
        const explosionSystem = new BABYLON.ParticleSystem("explosion", 100, this.scene);
        explosionSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        
        // Posicionar no local da explosão
        const emitter = BABYLON.MeshBuilder.CreateSphere("explosionEmitter", {diameter: 0.1}, this.scene);
        emitter.position = position.clone();
        explosionSystem.emitter = emitter;
        
        // Configurar partículas
        explosionSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
        explosionSystem.color2 = new BABYLON.Color4(1, 0.2, 0, 1);
        explosionSystem.colorDead = new BABYLON.Color4(0.5, 0.2, 0, 0);
        
        explosionSystem.minSize = 0.3;
        explosionSystem.maxSize = 1.0;
        explosionSystem.minLifeTime = 0.3;
        explosionSystem.maxLifeTime = 0.8;
        
        explosionSystem.emitRate = 200;
        explosionSystem.direction1 = new BABYLON.Vector3(-1, 0, -1);
        explosionSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
        explosionSystem.minEmitPower = 3;
        explosionSystem.maxEmitPower = 8;
        
        explosionSystem.gravity = new BABYLON.Vector3(0, -5, 0);
        explosionSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        // Iniciar explosão
        explosionSystem.start();
        
        // Flash de luz
        const flashLight = new BABYLON.PointLight("explosionLight", position, this.scene);
        flashLight.diffuse = new BABYLON.Color3(1, 0.5, 0);
        flashLight.intensity = 2;
        flashLight.range = this.model.explosionRadius * 2;
        
        // Limpar efeitos após um tempo
        setTimeout(() => {
            explosionSystem.stop();
            flashLight.dispose();
            emitter.dispose();
            
            setTimeout(() => {
                explosionSystem.dispose();
            }, 1000);
        }, 500);
    }
    
    _damageNearbyEnemies(explosionPosition) {
        console.log("🎯 Iniciando verificação de dano da granada na posição:", explosionPosition);
        
        // Obter referência aos zumbis do jogo através do gameInstance
        if (!this.scene.gameInstance) {
            console.warn("❌ gameInstance não encontrado");
            return;
        }
        
        let monsters = [];
        
        // Tentar diferentes formas de acessar a lista de monstros
        if (this.scene.gameInstance.getMonsters) {
            monsters = this.scene.gameInstance.getMonsters();
        } else if (this.scene.gameInstance.monsters) {
            monsters = this.scene.gameInstance.monsters;
        } else {
            console.warn("❌ Lista de monstros não encontrada");
            return;
        }
        
        console.log(`🔍 Verificando ${monsters.length} monstros para dano da granada`);
        
        if (monsters.length === 0) {
            console.log("⚠️ Nenhum monstro encontrado para aplicar dano");
            return;
        }
        
        let monstersHit = 0;
        
        monsters.forEach((monster, index) => {
            // Obter posição do monstro
            let monsterPosition;
            
            if (monster.model && monster.model.getPosition) {
                monsterPosition = monster.model.getPosition();
            } else if (monster.getController && monster.getController().model) {
                monsterPosition = monster.getController().model.getPosition();
            } else if (monster.getMesh && monster.getMesh()) {
                monsterPosition = monster.getMesh().position;
            } else {
                console.warn(`⚠️ Não foi possível obter posição do monstro ${index}`);
                return;
            }
            
            // Calcular distância da explosão até o monstro
            const distance = BABYLON.Vector3.Distance(explosionPosition, monsterPosition);
            
            console.log(`🔍 Monstro ${index}: distância = ${distance.toFixed(2)}, raio = ${this.model.explosionRadius}`);
            
            // Verificar se o monstro está dentro do raio da explosão
            if (distance <= this.model.explosionRadius) {
                // Calcular dano baseado na distância (quanto mais próximo, mais dano)
                const damageMultiplier = Math.max(0.2, 1 - (distance / this.model.explosionRadius));
                const damage = Math.floor(this.model.damage * damageMultiplier);
                
                // Obter o controlador do monstro
                let monsterController;
                
                if (monster.getController) {
                    monsterController = monster.getController();
                } else if (monster.controller) {
                    monsterController = monster.controller;
                }
                
                // Aplicar dano se o controlador estiver disponível e não estiver morto
                if (monsterController && 
                    monsterController.takeDamage && 
                    !monsterController.isDisposed) {
                    
                    const isDead = monsterController.takeDamage(damage);
                    monstersHit++;
                    
                    console.log(`💥 Granada causou ${damage} de dano a zumbi à distância ${distance.toFixed(2)} (multiplicador: ${damageMultiplier.toFixed(2)})${isDead ? ' - MORTO!' : ''}`);
                    
                    // Criar efeito visual no monstro atingido
                    this._createMonsterHitEffect(monsterPosition);
                } else {
                    console.warn(`⚠️ Controlador do monstro ${index} não disponível ou monstro já morto`);
                }
            }
        });
        
        console.log(`✅ Granada atingiu ${monstersHit} monstro(s) de ${monsters.length} total`);
    }
        
    // Criar efeito visual quando um monstro é atingido pela explosão
    _createMonsterHitEffect(monsterPosition) {
        // Criar partículas de sangue/dano no monstro
        const hitEffect = new BABYLON.ParticleSystem("monsterHit", 30, this.scene);
        hitEffect.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        
        // Posicionar no monstro atingido
        const emitter = BABYLON.MeshBuilder.CreateSphere("monsterHitEmitter", {diameter: 0.1}, this.scene);
        emitter.position = monsterPosition.clone();
        emitter.position.y += 1; // Elevar um pouco para ficar na altura do corpo
        hitEffect.emitter = emitter;
        
        // Configurar partículas de dano
        hitEffect.color1 = new BABYLON.Color4(1, 0, 0, 1); // Vermelho
        hitEffect.color2 = new BABYLON.Color4(0.8, 0, 0, 1); // Vermelho escuro
        hitEffect.colorDead = new BABYLON.Color4(0.5, 0, 0, 0); // Desaparecer
        
        hitEffect.minSize = 0.1;
        hitEffect.maxSize = 0.3;
        hitEffect.minLifeTime = 0.2;
        hitEffect.maxLifeTime = 0.5;
        
        hitEffect.emitRate = 50;
        hitEffect.direction1 = new BABYLON.Vector3(-0.5, 0.5, -0.5);
        hitEffect.direction2 = new BABYLON.Vector3(0.5, 1.5, 0.5);
        hitEffect.minEmitPower = 2;
        hitEffect.maxEmitPower = 4;
        
        hitEffect.gravity = new BABYLON.Vector3(0, -3, 0);
        hitEffect.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        // Iniciar efeito
        hitEffect.start();
        
        // Limpar após um tempo
        setTimeout(() => {
            hitEffect.stop();
            emitter.dispose();
            
            setTimeout(() => {
                hitEffect.dispose();
            }, 500);
        }, 300);
    }

    // Limpeza quando a arma é removida
    dispose() {
        this.thrownGrenades.forEach(grenade => {
            if (!grenade.isDisposed()) {
                grenade.dispose();
            }
        });
        this.thrownGrenades = [];
        
        super.dispose && super.dispose();
    }
}

export default Granade;
