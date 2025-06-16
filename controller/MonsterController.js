// Controller - Responsável pelo controle do monstro e interação com o jogador
class MonsterController {
    constructor(scene, monsterModel, monsterView, player) {
        this.scene = scene;
        this.model = monsterModel;
        this.view = monsterView;
        this.player = player;
        this.lastFrameTime = Date.now();
        this.playerPosition = null;
        this.isDisposed = false;
        this.isStunned = false;
        this.stunTimer = null;
        
        // Configuração de colisão com obstáculos
        this.lastObstacleCollisionCheck = 0;
        this.obstacleCheckInterval = 200; // Aumentado para melhorar performance
        this.obstacleContactTimers = {};
        this.OBSTACLE_CONTACT_DAMAGE_THRESHOLD = 2500;
        this.OBSTACLE_DAMAGE_AMOUNT = 15;
        this.OBSTACLE_DAMAGE_COOLDOWN = 3000;

        // Cache para raycasts
        this._directions = null; 
        this._obstaclePredicate = null;
        this._collisionRay = null;

        // Wired fence interaction tracking
        this.currentWiredFenceEffects = new Set();
        this.wiredFenceContactTimes = {};
        this.WIRED_FENCE_DAMAGE_INTERVAL = 2000; // Damage every second
        this.WIRED_FENCE_DETECTION_RANGE = 2.0; // Range for detecting fence zones
        this.WIRED_FENCE_DAMAGE_AMOUNT = 2; // Damage per contact
        this.WIRED_FENCE_DEFAULT_SLOWDOWN = 0.6; // Default slowdown factor
        
        // Sound
        this.soundManager = scene.gameInstance?.soundManager;
        this.soundCooldown = 5000 + Math.random() * 5000;
        this.lastSoundTime = 0;

        this.initialize();
    }
    
    initialize() {
        // Configurar o view com o mesh do model
        this.view.initialize(this.model.getMesh());
        
        // Inicializar o texto de vida
        this.updateHealthText();
        
        // Remover qualquer luz existente que possa estar prejudicando a performance
        const monsterMesh = this.model.getMesh();
        if (monsterMesh) {
            const lightMeshes = monsterMesh.getChildMeshes(false, (node) => node.name === "monsterLight");
            for (const light of lightMeshes) {
                if (light) {
                    light.dispose();
                }
            }
        }
        
        // Registrar para atualização a cada frame
        this.scene.registerBeforeRender(() => {
            if (this.isDisposed || this.isStunned) return;
            
            this.update();
            
            // Verificar colisões com obstáculos menos frequentemente
            const currentTime = Date.now();
            if (currentTime - this.lastObstacleCollisionCheck > this.obstacleCheckInterval) {
                this.checkObstacleCollision();
                this.lastObstacleCollisionCheck = currentTime;
            }
        });
    }
    
    // Verificar colisões com obstáculos
    checkObstacleCollision() {
        if (this.isDisposed || this.isStunned || !this.model || !this.model.getMesh()) return;
        
        const monsterPosition = this.model.getPosition();
        const collisionRadius = 1.5;
        const now = Date.now();
        
        // Inicializar direções de verificação se necessário
        if (!this._directions) {
            this._directions = [
                new BABYLON.Vector3(1, 0, 0),    // direita
                new BABYLON.Vector3(-1, 0, 0),   // esquerda
                new BABYLON.Vector3(0, 0, 1),    // frente
                new BABYLON.Vector3(0, 0, -1),   // trás
                new BABYLON.Vector3(0, -1, 0)    // baixo
            ];
        }
        
        // Inicializar predicado de colisão se necessário
        if (!this._obstaclePredicate) {
            this._obstaclePredicate = (mesh) => {
                return mesh.isPickable && 
                       mesh.checkCollisions &&
                       (mesh.name.startsWith("wall_") || 
                        mesh.name.startsWith("ramp_") || 
                        mesh.name.startsWith("barricade_") ||
                        mesh.name.startsWith("turret_") ||
                        mesh.name.startsWith("player"));
            };
        }
        
        // Determinar modo de jogo atual
        const isOpenWorldMode = this.scene.gameInstance?.gameMode === 'openworld';
        let mazeController = !isOpenWorldMode ? this.scene.gameInstance?.maze?.controller : null;
        
        const currentHits = new Set();
        
        // Inicializar raycast se necessário
        if (!this._collisionRay) {
            this._collisionRay = new BABYLON.Ray();
        }
        
        // Verificar cada direção
        for (const direction of this._directions) {
            const rayLength = direction.y < 0 ? 2.0 : collisionRadius;
            
            // Configurar o ray
            this._collisionRay.origin = monsterPosition.clone();
            this._collisionRay.direction = direction;
            this._collisionRay.length = rayLength;
            
            // Verificar colisão
            const hit = this.scene.pickWithRay(this._collisionRay, this._obstaclePredicate);
            
            if (!hit || !hit.hit || !hit.pickedMesh) continue;
                
            const obstacleName = hit.pickedMesh.name;
            const obstacleMesh = hit.pickedMesh;
            const obstacleCenterPosition = obstacleMesh.position;
            
            currentHits.add(obstacleName);
            
            // Inicializar timer para dano
            if (!this.obstacleContactTimers[obstacleName]) {
                this.obstacleContactTimers[obstacleName] = { 
                    startTime: now, 
                    lastDamageTime: 0 
                };
            }
            
            // Verificar tempo de contato e cooldown
            const contactDuration = now - this.obstacleContactTimers[obstacleName].startTime;
            const canDamage = now - this.obstacleContactTimers[obstacleName].lastDamageTime >= this.OBSTACLE_DAMAGE_COOLDOWN;
            
            if (contactDuration >= this.OBSTACLE_CONTACT_DAMAGE_THRESHOLD && canDamage) {
                // Aplicar dano à estrutura
                if (this.applyDamageToObstacle(obstacleName, obstacleMesh, obstacleCenterPosition, mazeController)) {
                    // Atualizar tempo do último dano - CORRIGIDO
                    // Verificar se o objeto ainda existe antes de acessar suas propriedades
                    if (this.obstacleContactTimers[obstacleName]) {
                        this.obstacleContactTimers[obstacleName].lastDamageTime = now;
                    } else {
                        // Recriar o objeto se foi removido
                        this.obstacleContactTimers[obstacleName] = {
                            startTime: now,
                            lastDamageTime: now
                        };
                    }
                }
            }
        }
        
        // Limpar timers de obstáculos não mais em contato
        for (const obstacleName in this.obstacleContactTimers) {
            if (!currentHits.has(obstacleName)) {
                delete this.obstacleContactTimers[obstacleName];
            }
        }
    }
    
    // Método auxiliar para aplicar dano a um obstáculo
    applyDamageToObstacle(obstacleName, obstacleMesh, obstacleCenterPosition, mazeController) {
        if (!obstacleMesh) return false;
        
        // Inicializar metadata se necessário
        if (!obstacleMesh.metadata) {
            obstacleMesh.metadata = {
                isPlayerBuilt: obstacleName.startsWith("player"),
                initialHealth: 100,
                health: 100
            };
        }
        
        // Reduzir saúde
        obstacleMesh.metadata.health -= this.OBSTACLE_DAMAGE_AMOUNT;
        
        // Verificar se foi destruído
        if (obstacleMesh.metadata.health <= 0) {
            // Remover o obstáculo
            if (mazeController && mazeController.getView) {
                const view = mazeController.getView();
                if (obstacleName.startsWith("playerWall_")) {
                    view.destroyWallVisual(obstacleName, obstacleCenterPosition);
                } else if (obstacleName.startsWith("playerRamp_")) {
                    view.destroyRampVisual(obstacleName, obstacleCenterPosition);
                } else if (obstacleName.startsWith("playerBarricade_")) {
                    view.destroyBarricadeVisual(obstacleName, obstacleCenterPosition);
                } else if (obstacleName.startsWith("playerTurret_")) {
                    view.destroyTurretVisual(obstacleName, obstacleCenterPosition);
                } else if (obstacleName.startsWith("wall_")) {
                    mazeController.damageWallAt(obstacleCenterPosition, 9999);
                }
            } else {
                // Fallback para modo Open World
                obstacleMesh.dispose();
            }
            
            delete this.obstacleContactTimers[obstacleName];
            return true;
        } else {
            // Aplicar efeito visual de dano
            if (mazeController && mazeController.getView) {
                const view = mazeController.getView();
                
                if (obstacleName.startsWith("playerWall_")) {
                    view.applyWallDamageVisual(
                        obstacleName, 
                        obstacleMesh.metadata.health, 
                        obstacleMesh.metadata.initialHealth || 100
                    );
                } else if (obstacleName.startsWith("playerRamp_")) {
                    view.applyRampDamageVisual(
                        obstacleName, 
                        obstacleMesh.metadata.health, 
                        obstacleMesh.metadata.initialHealth || 100
                    );
                } else if (obstacleName.startsWith("playerBarricade_")) {
                    view.applyBarricadeDamageVisual(
                        obstacleName,
                        obstacleMesh.metadata.health,
                        obstacleMesh.metadata.initialHealth || 75
                    );
                } else if (obstacleName.startsWith("playerTurret_")) {
                    view.applyTurretDamageVisual(
                        obstacleName,
                        obstacleMesh.metadata.health,
                        obstacleMesh.metadata.initialHealth || 150
                    );
                }
            } 
                  return true;
        }
    }    
    // Check for wired fence interactions
    checkWiredFenceInteraction() {
        if (this.isDisposed || !this.model || !this.model.getMesh()) return;
        
        const monsterPosition = this.model.getPosition();
        const now = Date.now();
        
        // Find all meshes within range that could be wired fence damage zones
        const nearbyMeshes = this.scene.meshes.filter(mesh => {
            if (!mesh.metadata?.isWiredFenceDamageZone) return false;
            
            // CORREÇÃO: Usar absolutePosition em vez de position para meshes com parent
            const meshPosition = mesh.parent ? mesh.absolutePosition : mesh.position;
            const distance = BABYLON.Vector3.Distance(monsterPosition, meshPosition);
            
            return distance < this.WIRED_FENCE_DETECTION_RANGE; // Use constant from constructor
        });
        
        this.currentWiredFenceEffects = this.currentWiredFenceEffects || new Set();
        const currentFrameFences = new Set();
        
        for (const damageZone of nearbyMeshes) {
            const fenceName = damageZone.metadata.parentFence;
            currentFrameFences.add(fenceName);
            
            if (!this.currentWiredFenceEffects.has(fenceName)) {
                // Just entered wired fence
                this.currentWiredFenceEffects.add(fenceName);
                this.wiredFenceContactTimes = this.wiredFenceContactTimes || {};
                this.wiredFenceContactTimes[fenceName] = now;
                
                // Registrar que este zumbi entrou em contato com a cerca
                this.registerZombieContact(fenceName);
                            }
              // Apply damage over time while in contact
            const contactTime = now - (this.wiredFenceContactTimes[fenceName] || now);
            const damageInterval = this.WIRED_FENCE_DAMAGE_INTERVAL; // Use constant from constructor
            
            if (contactTime > 0 && contactTime % damageInterval < 50) { // Damage tick
                const damageAmount = damageZone.metadata.damageAmount || this.WIRED_FENCE_DAMAGE_AMOUNT;
                this.takeDamage(damageAmount);
            }
        }
        
        // Clean up fences no longer in contact and destroy them if limit reached
        for (const fenceName of this.currentWiredFenceEffects) {
            if (!currentFrameFences.has(fenceName)) {
                this.currentWiredFenceEffects.delete(fenceName);
                if (this.wiredFenceContactTimes) {
                    delete this.wiredFenceContactTimes[fenceName];
                }
                
                console.log(`Zombie left wired fence: ${fenceName} - removing slowdown effect`);
                
                // Verificar se a cerca deve ser destruída baseado no limite de contatos
                if (this.shouldDestroyFenceAfterContact(fenceName)) {
                    console.log(`Zombie left wired fence: ${fenceName} - DESTROYING FENCE (contact limit reached)`);
                    this.destroyWiredFenceOnContact(fenceName);
                } else {
                    console.log(`Zombie left wired fence: ${fenceName} - Fence still has uses remaining`);
                }
            }
        }    }
    
    // Registrar que um zumbi entrou em contato com a cerca
    registerZombieContact(fenceName) {
        const fenceMesh = this.scene.getMeshByName(fenceName) || this.scene.getTransformNodeByName(fenceName);
        
        if (!fenceMesh || !fenceMesh.metadata) return;
        
        // Verificar se este zumbi já foi contado para esta cerca
        const zombieId = this.model?.getMesh()?.uniqueId || Math.random().toString(36);
        
        if (!fenceMesh.metadata.zombiesInContact.has(zombieId)) {
            // Adicionar zumbi ao set de contato atual
            fenceMesh.metadata.zombiesInContact.add(zombieId);
            
            // Incrementar contador total
            fenceMesh.metadata.zombieContactCount++;
            
            console.log(`Zombie ${zombieId} registered contact with fence ${fenceName}. Total contacts: ${fenceMesh.metadata.zombieContactCount}/${fenceMesh.metadata.maxZombieContacts}`);
        }
    }
    
    // Verificar se a cerca deve ser destruída após o contato
    shouldDestroyFenceAfterContact(fenceName) {
        const fenceMesh = this.scene.getMeshByName(fenceName) || this.scene.getTransformNodeByName(fenceName);
        
        if (!fenceMesh || !fenceMesh.metadata) return true; // Default: destroy if no metadata
        
        // Remover este zumbi do set de contato atual
        const zombieId = this.model?.getMesh()?.uniqueId || Math.random().toString(36);
        fenceMesh.metadata.zombiesInContact.delete(zombieId);
        
        // Verificar se o limite foi atingido
        const contactLimit = fenceMesh.metadata.maxZombieContacts || 1;
        const currentContacts = fenceMesh.metadata.zombieContactCount || 0;
        
        console.log(`Fence ${fenceName}: ${currentContacts}/${contactLimit} zombie contacts`);
        
        return currentContacts >= contactLimit;
    }

    // Destroy wired fence when zombie leaves contact
    destroyWiredFenceOnContact(fenceName) {
        try {
            // Find the fence mesh or transform node
            const fenceMesh = this.scene.getMeshByName(fenceName) || this.scene.getTransformNodeByName(fenceName);
            
            if (!fenceMesh) {
                console.warn(`Wired fence not found for destruction: ${fenceName}`);
                return false;
            }
            
            console.log(`Destroying wired fence: ${fenceName}`);
            
            // Get fence position for destruction effect
            const fencePosition = fenceMesh.position.clone();
            
            // Determine game mode
            const isOpenWorldMode = this.scene.gameInstance?.gameMode === 'openworld';
            const mazeController = !isOpenWorldMode ? this.scene.gameInstance?.maze?.controller : null;
            
            // Try to use the proper destruction method from MazeView
            if (mazeController && mazeController.getView) {
                const view = mazeController.getView();
                if (view.destroyWiredFenceVisual) {
                    const destroyResult = view.destroyWiredFenceVisual(
                        fenceName, 
                        fencePosition,
                        null, // onDestroy effect (optional)
                        (blockName, blockPosition) => {
                            // Callback for destroying dependent blocks if necessary
                            console.log(`Destroying dependent block: ${blockName} at ${blockPosition}`);
                        }
                    );
                    
                    if (destroyResult) {
                        console.log(`Successfully destroyed wired fence: ${fenceName}`);
                        return true;
                    }
                }
            }
            
            // Fallback: Direct destruction for Open World mode or if MazeView method fails
            console.log(`Using fallback destruction for fence: ${fenceName}`);
            
            // Find and destroy all related components
            const relatedMeshes = this.scene.meshes.filter(mesh => 
                mesh.name.includes(fenceName) || 
                (mesh.metadata && mesh.metadata.parentFence === fenceName)
            );
            
            for (const relatedMesh of relatedMeshes) {
                if (relatedMesh && !relatedMesh.isDisposed()) {
                    console.log(`Disposing related mesh: ${relatedMesh.name}`);
                    relatedMesh.dispose();
                }
            }
            
            // Dispose main fence mesh/node if it still exists
            if (fenceMesh && !fenceMesh.isDisposed()) {
                // Dispose all children first
                if (fenceMesh.getChildren) {
                    fenceMesh.getChildren().forEach(child => {
                        if (child && child.dispose && !child.isDisposed()) {
                            child.dispose();
                        }
                    });
                }
                
                fenceMesh.dispose();
                console.log(`Disposed main fence mesh: ${fenceName}`);
            }
            
            return true;
            
        } catch (error) {
            console.error(`Error destroying wired fence ${fenceName}:`, error);
            return false;
        }
    }    // Get speed multiplier based on wired fence contact
    getWiredFenceSpeedMultiplier() {
        if (!this.currentWiredFenceEffects || this.currentWiredFenceEffects.size === 0) {
            return 1.0; // Normal speed
        }
        
        // Find the strongest slowdown effect
        let maxSlowdown = 1.0;
        for (const fenceName of this.currentWiredFenceEffects) {
            // Find the damage zone to get slowdown factor
            const damageZone = this.scene.meshes.find(mesh => 
                mesh.metadata?.isWiredFenceDamageZone && 
                mesh.metadata?.parentFence === fenceName
            );
              if (damageZone && damageZone.metadata.slowdownFactor) {
                maxSlowdown = Math.min(maxSlowdown, damageZone.metadata.slowdownFactor);
            } else {
                // Use default slowdown from constructor if no specific metadata
                maxSlowdown = Math.min(maxSlowdown, this.WIRED_FENCE_DEFAULT_SLOWDOWN);
            }
        }
        
        return maxSlowdown;
    }
    


    update() {
        const currentTime = Date.now();
        const delta = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        if (!this.player) return;
          // Aplicar gravidade
        this.model.applyGravity(delta);
        
        // Check for wired fence interactions
        this.checkWiredFenceInteraction();
    
        // Obter posição do jogador
        this.playerPosition = this.player.getPosition();
        
        // Calcular distância ao jogador para otimização de LOD
        const distanceToPlayer = BABYLON.Vector3.Distance(
            this.model.getPosition(), 
            this.playerPosition
        );
        
        // Always play zombie sound periodically regardless of distance
        if (this.soundManager) {
            if (currentTime - this.lastSoundTime > this.soundCooldown) {
                // Base volume on distance but ensure it's audible
                const volume = Math.min(0.5, 1.0 / (1 + distanceToPlayer/10));
                
                this.soundManager.playMonsterSound('zombie', volume);
                
                this.lastSoundTime = currentTime;
                // Random cooldown between 3-8 seconds
                this.soundCooldown = 3000 + Math.random() * 5000;
            }
        }
        if (distanceToPlayer > 50) {
            // Zumbis muito distantes (otimização máxima)
            if (this.view.textPlane) {
                this.view.textPlane.isVisible = false;
            }
              // Reduzir frequência de atualizações
            const speedMultiplier = this.getWiredFenceSpeedMultiplier();
            this.model.moveTowardsPlayer(this.playerPosition, delta * 0.6 * speedMultiplier);
            
            // Reduzir verificações de colisão
            this.obstacleCheckInterval = 2000;
            
        } else if (distanceToPlayer > 25) {
            // Zumbis a média distância
            if (this.view.textPlane) {
                this.view.textPlane.isVisible = true;
            }            
            const speedMultiplier = this.getWiredFenceSpeedMultiplier();
            this.model.moveTowardsPlayer(this.playerPosition, delta * 0.8 * speedMultiplier);
            
            // Verificar ataques apenas se estiver realmente próximo
            if (this.model.canAttackPlayer(this.playerPosition)) {
                this.attackPlayer();
            }
            
            // Verificações médias de colisão
            this.obstacleCheckInterval = 500;
            
        } else {
            // Zumbis próximos (comportamento completo)
            if (this.view.textPlane) {
                this.view.textPlane.isVisible = true;
            }            
            const speedMultiplier = this.getWiredFenceSpeedMultiplier();
            this.model.moveTowardsPlayer(this.playerPosition, delta * speedMultiplier);
            
            if (this.model.canAttackPlayer(this.playerPosition)) {
                this.attackPlayer();
            }
            
            // Verificações frequentes de colisão
            this.obstacleCheckInterval = 200;
        }
    }
    
    // Atacar o jogador
    attackPlayer() {
        // Calcular e aplicar dano
        const damage = this.model.attack();
        if (this.player?.takeDamage) {
            this.player.takeDamage(damage);
        }
    }
    
    
    // Atualizar o texto da vida
    updateHealthText() {
        if (this.view && this.model) {
            // Usar a altura da barra de vida definida manualmente para este tipo de zumbi
            const healthBarHeight = this.model.healthBarHeight || 5.0; 
            // Passar a saúde e a altura específica da barra para o view
            this.view.updateHealthText(this.model.health, healthBarHeight);
        }
    }
    
    // Aplicar dano ao monstro
    takeDamage(amount) {
        if (this.isDisposed) return false;

        // Aplicar dano e verificar morte
        const isDead = this.model.takeDamage(amount);
        
        // Atualizar texto da vida
        this.updateHealthText();

        // Processar morte se necessário
        if (isDead) {
            this.die();
        }

        return isDead;
    }
    
    // Processar morte do monstro
    die() {
        if (this.isDisposed) return;
        
        this.isDisposed = true;
          // Limpar timers
        if (this.model.moveTimeout) {
            clearTimeout(this.model.moveTimeout);
            this.model.moveTimeout = null;
        }
        if (this.stunTimer) {
            clearTimeout(this.stunTimer);
            this.stunTimer = null;
        }
        
        // Clean up wired fence effects
        if (this.currentWiredFenceEffects) {
            this.currentWiredFenceEffects.clear();
        }
        if (this.wiredFenceContactTimes) {
            this.wiredFenceContactTimes = {};
        }

        // Recompensa ao jogador
        if (this.player?.addMoney) {
            const moneyReward = Math.floor(25 + Math.random() * 50);
            this.player.addMoney(moneyReward);
        }
        
        // Remover mesh e seus filhos
        if (this.model?.mesh && !this.model.mesh.isDisposed()) {
            this.model.mesh.checkCollisions = false;
            this.model.mesh.isPickable = false;
            
            const children = this.model.mesh.getChildMeshes();
            for (const child of children) {
                if (child && !child.isDisposed()) {
                    child.dispose();
                }
            }
            
            this.model.mesh.dispose();
            this.model.mesh = null;
        }
          // Remover da lista de monstros do jogo
        if (this.scene.gameInstance?.monsters?.length > 0) {
            const index = this.scene.gameInstance.monsters.findIndex(
                monster => monster.getController?.() === this
            );
            
            if (index !== -1) {
                this.scene.gameInstance.monsters.splice(index, 1);
                
                // Notificar o sistema de hordas que um zumbi morreu
                if (this.scene.gameInstance.zombieSpawner?.controller) {
                    // Chamar verificação imediata de conclusão de horda
                    setTimeout(() => {
                        this.scene.gameInstance.zombieSpawner.controller.checkHordeCompletion();
                    }, 100); // Pequeno delay para garantir que o monstro foi removido da lista
                }
            }
        }
    }
    
    // Obter mesh do monstro
    getMesh() {
        return this.model?.getMesh();
    }
}

export default MonsterController;