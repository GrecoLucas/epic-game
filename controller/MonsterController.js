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
        
        // Iniciar o comportamento de patrulha
        this.startPatrolBehavior();
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


    // Atualizar o estado do monstro
    update() {
        const currentTime = Date.now();
        const delta = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        if (!this.player) return;
        
        // Aplicar gravidade
        this.model.applyGravity(delta);

        // Obter posição do jogador
        this.playerPosition = this.player.getPosition();
        
        // Verificar detecção do jogador
        if (this.model.canDetectPlayer(this.playerPosition)) {
            // Perseguir o jogador
            if (!this.model.isPlayerChased()) {
                this.model.startChasing();
                this.view.updateVisualState(true);
            }
            
            // Mover em direção ao jogador
            this.model.moveTowardsPlayer(this.playerPosition, delta);
            
            // Verificar se pode atacar
            if (this.model.canAttackPlayer(this.playerPosition)) {
                this.attackPlayer();
            }
        } else if (this.model.isPlayerChased()) {
            // Parar perseguição
            this.model.stopChasing();
            this.view.updateVisualState(false);
            
            // Reiniciar patrulha
            this.startPatrolBehavior();
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
    
    // Iniciar comportamento de patrulha
    startPatrolBehavior() {
        if (this.isDisposed || this.isStunned) return;

        if (this.model.moveTimeout) {
            clearTimeout(this.model.moveTimeout);
        }

        const patrolInterval = 3000 + Math.random() * 3000;
        this.model.moveTimeout = setTimeout(() => {
            if (this.isDisposed || this.isStunned) return;
            this.startPatrolBehavior();
        }, patrolInterval);
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
            }
        }
    }
    
    // Obter mesh do monstro
    getMesh() {
        return this.model?.getMesh();
    }
}

export default MonsterController;