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

        this.isStunned = false; // Add stun state
        this.stunTimer = null;
        
        this.lastObstacleCollisionCheck = 0; // Renomeado de lastWallCollisionCheck
        this.obstacleCheckInterval = 100; // Renomeado de wallCheckInterval

        this.obstacleContactTimers = {}; 
        this.OBSTACLE_CONTACT_DAMAGE_THRESHOLD = 2500; 
        this.OBSTACLE_DAMAGE_AMOUNT = 15;
        this.OBSTACLE_DAMAGE_COOLDOWN = 3000;
    
        
        // Inicializar o controlador
        this.initialize();
    }
    
    // Inicializar a vida do monstro quando ele é criado
    initialize() {
        // Configurar o view com o mesh do model
        this.view.initialize(this.model.getMesh());
        
        // Inicializar o texto de vida com a vida inicial do monstro
        this.updateHealthText();
        
        // Registrar para atualização a cada frame
        this.scene.registerBeforeRender(() => {
            // Check isDisposed first
            if (this.isDisposed) return;
            // If stunned, skip the update logic
            if (this.isStunned) return;
            this.update();
            
            // Novo: Verificar colisões com obstáculos (paredes e rampas)
            const currentTime = Date.now();
            if (currentTime - this.lastObstacleCollisionCheck > this.obstacleCheckInterval) {
                this.checkObstacle_collision(); // Chamada renomeada
                this.lastObstacleCollisionCheck = currentTime;
            }
        });
        
        // Iniciar o comportamento de patrulha
        this.startPatrolBehavior();
    }
    
    // Verificar colisões com obstáculos - mantendo a estrutura original com otimizações
    checkObstacle_collision() {
        if (this.isDisposed || this.isStunned || !this.model || !this.model.getMesh()) return;
    
        const monsterPosition = this.model.getPosition();
        const collisionRadius = 1.5; // Manter raio de verificação
        
        // Verificar se é hora de executar esta verificação (limitação de frequência)
        const now = Date.now();
        if (now - this.lastObstacleCollisionCheck < this.obstacleCheckInterval) return;
        this.lastObstacleCollisionCheck = now;
        
        // Direções para verificar (8 direções horizontais + direção para baixo)
        // OTIMIZAÇÃO 1: Reutilizar array de direções em vez de recriar a cada chamada
        if (!this._directions) {
            this._directions = [
                new BABYLON.Vector3(1, 0, 0),    // direita
                new BABYLON.Vector3(-1, 0, 0),   // esquerda
                new BABYLON.Vector3(0, 0, 1),    // frente
                new BABYLON.Vector3(0, 0, -1),   // trás
                new BABYLON.Vector3(0.7, 0, 0.7), // diagonal frente-direita
                new BABYLON.Vector3(-0.7, 0, 0.7), // diagonal frente-esquerda
                new BABYLON.Vector3(0.7, 0, -0.7), // diagonal trás-direita
                new BABYLON.Vector3(-0.7, 0, -0.7),  // diagonal trás-esquerda
                new BABYLON.Vector3(0, -1, 0)    // direção para baixo
            ];
        }
        
        // Função para determinar quais objetos considerar para colisão
        // OTIMIZAÇÃO 2: Reutilizar predicado para evitar criar função a cada chamada
        if (!this._obstaclePredicate) {
            this._obstaclePredicate = (mesh) => {
                return mesh.isPickable &&
                    mesh.checkCollisions &&
                    (mesh.name.startsWith("wall_") || 
                    mesh.name.startsWith("ramp_") || 
                    mesh.name.startsWith("playerWall_") || 
                    mesh.name.startsWith("playerRamp_") ||
                    mesh.name.startsWith("playerBarricade_") ||
                    mesh.name.startsWith("playerTurret_"));
            };
        }
    
        // Determinar o modo de jogo atual (Open World ou Maze)
        const isOpenWorldMode = this.scene.gameInstance?.gameMode === 'openworld';
        
        // Diferentes modos de obter o controlador de labirinto
        let mazeController = null;
        
        if (!isOpenWorldMode) {
            // Pegar o labirinto da cena global no modo Maze
            const maze = this.scene.gameInstance?.maze;
            if (maze) {
                mazeController = maze.controller;
            }
        }
    
        const currentHits = new Set(); // Paredes atingidas nesta verificação
    
        // OTIMIZAÇÃO 3: Armazenar ray para reutilização
        if (!this._collisionRay) {
            this._collisionRay = new BABYLON.Ray();
        }
        
        // Verificar cada direção
        for (const direction of this._directions) {
            // Determinar origem do raio com base na direção
            let rayLength = direction.y < 0 ? 2.0 : collisionRadius;
            
            // OTIMIZAÇÃO 4: Reutilizar o ray em vez de criar um novo
            this._collisionRay.origin = monsterPosition.clone();
            this._collisionRay.direction = direction;
            this._collisionRay.length = rayLength;
            
            // Verificar colisão - MANTEMOS o pickWithRay da cena original que está funcionando
            const hit = this.scene.pickWithRay(this._collisionRay, this._obstaclePredicate);
            
            if (hit && hit.hit && hit.pickedMesh) {
                // Usar o nome do mesh atingido para identificar o obstáculo
                const obstacleName = hit.pickedMesh.name;
                const obstacleMesh = hit.pickedMesh;
                const obstacleCenterPosition = obstacleMesh.position;
                
                currentHits.add(obstacleName); // Marcar como atingida nesta verificação
    
                // Inicializar timer se for o primeiro contato
                if (!this.obstacleContactTimers[obstacleName]) {
                    this.obstacleContactTimers[obstacleName] = { startTime: now, lastDamageTime: 0 };
                }
    
                // Verificar se já passou tempo suficiente e se o cooldown permite
                const contactDuration = now - this.obstacleContactTimers[obstacleName].startTime;
                const canDamage = now - this.obstacleContactTimers[obstacleName].lastDamageTime >= this.OBSTACLE_DAMAGE_COOLDOWN;
                
                if (contactDuration >= this.OBSTACLE_CONTACT_DAMAGE_THRESHOLD && canDamage) {
                    let damageResult = null;
                    let wasDestroyed = false;
    
                    // Verificar se é uma estrutura construída pelo jogador
                    if (obstacleName.startsWith("playerWall_") || obstacleName.startsWith("playerRamp_") || obstacleName.startsWith("playerBarricade_") || obstacleName.startsWith("playerTurret_")) {
                           
                        // Verificação segura antes de acessar as propriedades
                        if (!obstacleMesh) {
                            continue; // Pular para a próxima iteração
                        }
                        
                        // Inicializar metadata se não existir
                        if (!obstacleMesh.metadata) {
                            obstacleMesh.metadata = {
                                isPlayerBuilt: true,
                                initialHealth: 100,
                                health: 100
                            };
                        }
                        
                        
                        // Verificar se o mesh tem metadata com informações de saúde de forma segura
                        if (obstacleMesh.metadata && typeof obstacleMesh.metadata.health !== 'undefined') {
                            // Reduzir a saúde da estrutura do jogador
                            const oldHealth = obstacleMesh.metadata.health;
                            obstacleMesh.metadata.health -= this.OBSTACLE_DAMAGE_AMOUNT;
    
                            // Verificar se a estrutura foi destruída
                            if (obstacleMesh.metadata.health <= 0) {
                                wasDestroyed = true;
                                
                                // Efeito visual para estruturas do player
                                if (obstacleName.startsWith("playerWall_")) {
                                    if (mazeController) {
                                        mazeController.getView().destroyWallVisual(obstacleName, obstacleCenterPosition);
                                    } else {
                                        // Fallback para modo Open World - remover o mesh diretamente
                                        obstacleMesh.dispose();
                                    }
                                } else if (obstacleName.startsWith("playerRamp_")) {
                                    if (mazeController) {
                                        mazeController.getView().destroyRampVisual(obstacleName, obstacleCenterPosition);
                                    } else {
                                        // Fallback para modo Open World - remover o mesh diretamente
                                        obstacleMesh.dispose();
                                    }
                                } else if (obstacleName.startsWith("playerBarricade_")) {
                                    if (mazeController) {
                                        mazeController.getView().destroyBarricadeVisual(obstacleName, obstacleCenterPosition);
                                    } else {
                                        // Fallback para modo Open World - remover o mesh diretamente
                                        obstacleMesh.dispose();
                                    }
                                } else if (obstacleName.startsWith("playerTurret_")) {
                                    // Novo: Suporte para destruir torretas
                                    if (mazeController) {
                                        mazeController.getView().destroyTurretVisual(obstacleName, obstacleCenterPosition);
                                    } else {
                                        // Fallback para modo Open World - remover o mesh diretamente
                                        obstacleMesh.dispose();
                                    }
                                }
                                
                                // Remover do sistema de colisão se necessário
                                if (obstacleMesh.physicsImpostor) {
                                    obstacleMesh.physicsImpostor.dispose();
                                }
                            } else {
                                // Aplicar efeito visual de dano
                                if (mazeController && mazeController.getView) {
                                    if (obstacleName.startsWith("playerWall_")) {
                                        mazeController.getView().applyWallDamageVisual(
                                            obstacleName, 
                                            obstacleMesh.metadata.health, 
                                            obstacleMesh.metadata.initialHealth || 100
                                        );
                                    } else if (obstacleName.startsWith("playerRamp_")) {
                                        mazeController.getView().applyRampDamageVisual(
                                            obstacleName, 
                                            obstacleMesh.metadata.health, 
                                            obstacleMesh.metadata.initialHealth || 100
                                        );
                                    } else if (obstacleName.startsWith("playerBarricade_")) {
                                        mazeController.getView().applyBarricadeDamageVisual(
                                            obstacleName,
                                            obstacleMesh.metadata.health,
                                            obstacleMesh.metadata.initialHealth || 75
                                        );
                                    } else if (obstacleName.startsWith("playerTurret_")) {
                                        // Novo: Suporte para aplicar efeito visual de dano às torretas
                                        mazeController.getView().applyTurretDamageVisual(
                                            obstacleName,
                                            obstacleMesh.metadata.health,
                                            obstacleMesh.metadata.initialHealth || 150
                                        );
                                    }
                                } else {
                                    // Fallback para modo Open World - efeito visual básico
                                    this._applyBasicDamageVisual(obstacleMesh);
                                }
                            }
                            
                        } else {
                            // Se a saúde não estiver definida, inicializá-la
                            if (!obstacleMesh.metadata) {
                                obstacleMesh.metadata = {};
                            }
                            obstacleMesh.metadata.initialHealth = 100;
                            obstacleMesh.metadata.health = 100 - this.OBSTACLE_DAMAGE_AMOUNT;
                        }
                        
                        // Simular formato de retorno para consistência com código existente
                        damageResult = { 
                            destroyed: wasDestroyed, 
                            remainingHealth: obstacleMesh.metadata ? obstacleMesh.metadata.health : 0 
                        };
                    } else if (mazeController) {
                        // Código existente para estruturas geradas pelo mapa (apenas no modo Maze)
                        if (obstacleName.startsWith("wall_")) {
                            damageResult = mazeController.damageWallAt(obstacleCenterPosition, this.OBSTACLE_DAMAGE_AMOUNT);
                        } else if (obstacleName.startsWith("ramp_")) {
                            mazeController.handleRampDamage(obstacleName, this.OBSTACLE_DAMAGE_AMOUNT, obstacleCenterPosition);
                            damageResult = { destroyed: false, remainingHealth: 1 };
                        }
                    } else {
                        // Fallback para obstáculos genéricos no modo Open World 
                        if (!obstacleMesh.metadata) {
                            obstacleMesh.metadata = { health: 100, initialHealth: 100 };
                        }
                        
                        obstacleMesh.metadata.health -= this.OBSTACLE_DAMAGE_AMOUNT;
                        
                        if (obstacleMesh.metadata.health <= 0) {
                            obstacleMesh.dispose();
                            damageResult = { destroyed: true, remainingHealth: 0 };
                        } else {
                            this._applyBasicDamageVisual(obstacleMesh);
                            damageResult = { destroyed: false, remainingHealth: obstacleMesh.metadata.health };
                        }
                    }
    
                    // Atualizar tempo do último dano
                    this.obstacleContactTimers[obstacleName].lastDamageTime = now;
    
                    // Se o obstáculo foi destruído pelo dano, remover o timer
                    if (damageResult && damageResult.destroyed) {
                        delete this.obstacleContactTimers[obstacleName];
                    }
                }
            }
        }
    
        // Limpar timers de obstáculos que não estão mais em contato
        for (const obstacleName in this.obstacleContactTimers) {
            if (!currentHits.has(obstacleName)) {
                delete this.obstacleContactTimers[obstacleName];
            }
        }
    }
    // Novo método para efeito visual básico de dano no Open World
    _applyBasicDamageVisual(mesh) {
        if (!mesh || !mesh.material) return;
        
        // Guardar cor original
        if (!mesh.metadata.originalColor) {
            if (mesh.material.diffuseColor) {
                mesh.metadata.originalColor = mesh.material.diffuseColor.clone();
            } else {
                mesh.metadata.originalColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            }
        }
        
        // Aplicar cor de dano (piscar vermelho)
        mesh.material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Vermelho
        
        // Retornar à cor original após um breve período
        setTimeout(() => {
            if (mesh && mesh.material && !mesh.isDisposed()) {
                mesh.material.diffuseColor = mesh.metadata.originalColor;
            }
        }, 200);
    }

    // Método para criar efeito visual de destruição da parede
    update() {
        // Calcular delta entre frames para movimento suave
        const currentTime = Date.now();
        const delta = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Verificar se o jogador existe
        if (!this.player) return;
        
        // Garantir que o monstro permaneça na altura correta
        this.model.applyGravity(delta);

        // Obter a posição atual do jogador
        this.playerPosition = this.player.getPosition();
        
        // Verificar se o jogador está no raio de detecção
        if (this.model.canDetectPlayer(this.playerPosition)) {
            // Se ainda não estiver perseguindo, iniciar a perseguição
            if (!this.model.isPlayerChased()) {
                this.model.startChasing();
                this.view.updateVisualState(true);
            }
            
            // Mover em direção ao jogador
            this.model.moveTowardsPlayer(this.playerPosition, delta);
            
            // Verificar se pode atacar o jogador
            if (this.model.canAttackPlayer(this.playerPosition)) {
                this.attackPlayer();
            }
        } else {
            // Se estava perseguindo, parar
            if (this.model.isPlayerChased()) {
                this.model.stopChasing();
                this.view.updateVisualState(false);
                
                // Reiniciar comportamento de patrulha
                this.startPatrolBehavior();
            }
        }
    }
    
    // Atacar o jogador
    attackPlayer() {
        // Executar a animação de ataque
        this.view.playAttackAnimation();
        
        // Calcular o dano
        const damage = this.model.attack();
        
        // Aplicar dano ao jogador se tiver um método takeDamage
        if (this.player && typeof this.player.takeDamage === 'function') {
            this.player.takeDamage(damage);
        }
    }
    
    // Iniciar comportamento de patrulha
    startPatrolBehavior() {
        // Check if disposed or stunned before starting/continuing patrol
        if (this.isDisposed || this.isStunned) return;

        // Clear existing timer before setting a new one
        if (this.model.moveTimeout) {
            clearTimeout(this.model.moveTimeout);
            this.model.moveTimeout = null;
        }

        // Movimento aleatório a cada 3-6 segundos (adjust interval as needed)
        const patrolInterval = 3000 + Math.random() * 3000;

        this.model.moveTimeout = setTimeout(() => {
            // Check again inside the timeout
            if (this.isDisposed || this.isStunned) return;

            // Continuar o comportamento de patrulha recursively
            this.startPatrolBehavior();
        }, patrolInterval);
    }
    
    // Método para atualizar o texto da vida do monstro
    updateHealthText() {
        if (this.view && this.model) {
            this.view.updateHealthText(this.model.health);
        }
    }
    
    // Tomar dano
    takeDamage(amount) {
        if (this.isDisposed) return false; // Check if already disposed

        // Efeito visual de dano
        this.view.showDamageEffect();

        // Aplicar dano ao modelo
        const isDead = this.model.takeDamage(amount);
        console.log(`Monster took ${amount} damage. Health: ${this.model.health}`);
        
        // Atualizar o texto da vida
        this.updateHealthText();

        // Se o monstro morreu, mostrar animação de morte
        if (isDead) {
            console.log("Monster died.");
            this.die();
        }

        return isDead;
    }
    
    // Monstro morre
    die() {
        if (this.isDisposed) return; // Prevent multiple deaths/disposals

        // Marcar como disposto PRIMEIRO para evitar race conditions
        this.isDisposed = true;

        // Adicionar dinheiro ao jogador quando um monstro morre
        if (this.player && typeof this.player.addMoney === 'function') {
            // Recompensa aleatória entre 25 e 75 moedas
            const moneyReward = Math.floor(25 + Math.random() * 50);
            this.player.addMoney(moneyReward);
        }

        // Mostrar efeito de morte
        this.view.showDeathEffect();

        // Limpar timeouts
        if (this.model.chaseTimeout) {
            clearTimeout(this.model.chaseTimeout);
            this.model.chaseTimeout = null;
        }
        if (this.model.moveTimeout) {
            clearTimeout(this.model.moveTimeout);
            this.model.moveTimeout = null;
        }
         if (this.stunTimer) { // Clear stun timer on death
            clearTimeout(this.stunTimer);
            this.stunTimer = null;
        }

    }
    // Obter mesh do monstro
    getMesh() {
        return this.model.getMesh();
    }
}

export default MonsterController;