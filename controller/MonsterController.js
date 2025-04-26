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

        this.obstacleContactTimers = {}; // Renomeado de wallContactTimers { obstacleName: { startTime: timestamp, lastDamageTime: timestamp } }
        this.OBSTACLE_CONTACT_DAMAGE_THRESHOLD = 1500; // Renomeado
        this.OBSTACLE_DAMAGE_AMOUNT = 20; // Renomeado
        this.OBSTACLE_DAMAGE_COOLDOWN = 500; // Renomeado
    
        
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
    
    // Renomeado de checkWallCollision
        checkObstacle_collision() {
            if (this.isDisposed || this.isStunned || !this.model || !this.model.getMesh()) return;
        
            const monsterPosition = this.model.getPosition();
            const collisionRadius = 1.5; // Manter raio de verificação
            
            // NOVO LOG: Posição do monstro
            console.log(`Monster checking for obstacles at position: ${monsterPosition.x.toFixed(2)}, ${monsterPosition.y.toFixed(2)}, ${monsterPosition.z.toFixed(2)}`);
            
            // Direções para verificar (8 direções)
            const directions = [
                new BABYLON.Vector3(1, 0, 0),    // direita
                new BABYLON.Vector3(-1, 0, 0),   // esquerda
                new BABYLON.Vector3(0, 0, 1),    // frente
                new BABYLON.Vector3(0, 0, -1),   // trás
                new BABYLON.Vector3(0.7, 0, 0.7), // diagonal frente-direita
                new BABYLON.Vector3(-0.7, 0, 0.7), // diagonal frente-esquerda
                new BABYLON.Vector3(0.7, 0, -0.7), // diagonal trás-direita
                new BABYLON.Vector3(-0.7, 0, -0.7)  // diagonal trás-esquerda
            ];
            
            // Função para determinar quais objetos considerar para colisão
            const predicate = (mesh) => {
                // Procurar por meshes cujo nome começa com "wall_", "ramp_", "playerWall_" ou "playerRamp_"
                const isValid = mesh.isPickable &&
                       mesh.checkCollisions &&
                       (mesh.name.startsWith("wall_") || 
                        mesh.name.startsWith("ramp_") || 
                        mesh.name.startsWith("playerWall_") || 
                        mesh.name.startsWith("playerRamp_"));
                
                // NOVO LOG: Verificar predicado de forma mais detalhada apenas para playerWall_ e playerRamp_
                if (mesh.name.startsWith("playerWall_") || mesh.name.startsWith("playerRamp_")) {
                    console.log(`Predicado para ${mesh.name}: isPickable=${mesh.isPickable}, checkCollisions=${mesh.checkCollisions}, resultado=${isValid}`);
                }
                
                return isValid;
            };
        
            // Pegar o labirinto da cena global (necessário para chamar damageWallAt/handleRampDamage)
            const maze = this.scene.gameInstance?.maze;
            if (!maze) {
                console.error("Maze não encontrado na cena. Impossível verificar colisões.");
                return; // Precisa do labirinto para danificar paredes
            }
            
            const mazeController = maze.controller; // Obter referência ao MazeController
            if (!mazeController) {
                console.error("MazeController não encontrado. Impossível danificar estruturas.");
                return;
            }
        
            const now = Date.now();
            const currentHits = new Set(); // Paredes atingidas nesta verificação
        
            // Verificar cada direção
            for (const direction of directions) {
                // Criar um raio a partir da posição do monstro na direção específica
                const ray = new BABYLON.Ray(monsterPosition, direction, collisionRadius);
                
                // Verificar colisão
                const hit = this.scene.pickWithRay(ray, predicate);
                
                if (hit && hit.hit && hit.pickedMesh) {
                    // Usar o nome do mesh atingido para identificar o obstáculo
                    const obstacleName = hit.pickedMesh.name;
                    const obstacleMesh = hit.pickedMesh; // Guardar referência ao mesh
                    const obstacleCenterPosition = obstacleMesh.position; // Posição central do obstáculo
                    
                    // NOVO LOG: Colisão detectada
                    console.log(`Colisão detectada com: ${obstacleName} (Distância: ${hit.distance.toFixed(2)})`);
                    
                    currentHits.add(obstacleName); // Marcar como atingida nesta verificação
        
                    // Inicializar timer se for o primeiro contato
                    if (!this.obstacleContactTimers[obstacleName]) {
                        this.obstacleContactTimers[obstacleName] = { startTime: now, lastDamageTime: 0 };
                        console.log(`Novo contato iniciado com ${obstacleName}`);
                    }
        
                    // Verificar se já passou tempo suficiente e se o cooldown permite
                    const contactDuration = now - this.obstacleContactTimers[obstacleName].startTime;
                    const canDamage = now - this.obstacleContactTimers[obstacleName].lastDamageTime >= this.OBSTACLE_DAMAGE_COOLDOWN;
                    
                    // NOVO LOG: Estado do temporizador
                    console.log(`${obstacleName} - Duração do contato: ${contactDuration}ms, Pode danificar: ${canDamage}, Threshold: ${this.OBSTACLE_CONTACT_DAMAGE_THRESHOLD}ms`);
        
                    if (contactDuration >= this.OBSTACLE_CONTACT_DAMAGE_THRESHOLD && canDamage) {
                        let damageResult = null;
                        let wasDestroyed = false;
        
                       // Verificar se é uma estrutura construída pelo jogador
                       if (obstacleName.startsWith("playerWall_") || obstacleName.startsWith("playerRamp_")) {
                           // NOVO LOG: Tentativa de danificar estrutura do player
                           console.log(`Tentando danificar estrutura do player: ${obstacleName}`);
                           
                           // Verificação segura antes de acessar as propriedades
                           if (!obstacleMesh) {
                               console.error(`ERRO: Mesh do obstáculo ${obstacleName} é null ou undefined`);
                               continue; // Pular para a próxima iteração
                           }
                           
                           // Inicializar metadata se não existir
                           if (!obstacleMesh.metadata) {
                               console.log(`Inicializando metadata para ${obstacleName}`);
                               obstacleMesh.metadata = {
                                   isPlayerBuilt: true,
                                   initialHealth: 100,
                                   health: 100
                               };
                           }
                           
                           // NOVO LOG: Verificar metadata
                           console.log(`Metadata existe: ${!!obstacleMesh.metadata}, Health definido: ${obstacleMesh.metadata ? 'health=' + obstacleMesh.metadata.health : 'indefinido'}`);
                           
                           // Verificar se o mesh tem metadata com informações de saúde de forma segura
                           if (obstacleMesh.metadata && typeof obstacleMesh.metadata.health !== 'undefined') {
                               // Reduzir a saúde da estrutura do jogador
                               const oldHealth = obstacleMesh.metadata.health;
                               obstacleMesh.metadata.health -= this.OBSTACLE_DAMAGE_AMOUNT;
                               console.log(`Estrutura do player danificada: ${obstacleName} - Saúde antes: ${oldHealth}, Dano: ${this.OBSTACLE_DAMAGE_AMOUNT}, Saúde atual: ${obstacleMesh.metadata.health}`);

                                // Verificar se a estrutura foi destruída
                                if (obstacleMesh.metadata.health <= 0) {
                                    console.log(`🔨 ESTRUTURA DO PLAYER DESTRUÍDA: ${obstacleName}`);
                                    wasDestroyed = true;
                                    
                                    // Efeito visual para estruturas do player
                                    if (obstacleName.startsWith("playerWall_")) {
                                        console.log(`Chamando destroyWallVisual para ${obstacleName}`);
                                        mazeController.getView().destroyWallVisual(obstacleName, obstacleCenterPosition);
                                    } else if (obstacleName.startsWith("playerRamp_")) {
                                        console.log(`Chamando destroyRampVisual para ${obstacleName}`);
                                        mazeController.getView().destroyRampVisual(obstacleName, obstacleCenterPosition);
                                    }
                                    
                                    // Remover do sistema de colisão se necessário
                                    if (obstacleMesh.physicsImpostor) {
                                        console.log(`Removendo impostor físico de ${obstacleName}`);
                                        obstacleMesh.physicsImpostor.dispose();
                                    }
                                } else {
                                    // Aplicar efeito visual de dano
                                    if (obstacleName.startsWith("playerWall_")) {
                                        console.log(`Aplicando efeito visual de dano à parede ${obstacleName}`);
                                        mazeController.getView().applyWallDamageVisual(
                                            obstacleName, 
                                            obstacleMesh.metadata.health, 
                                            obstacleMesh.metadata.initialHealth || 100
                                        );
                                    } else if (obstacleName.startsWith("playerRamp_")) {
                                        console.log(`Aplicando efeito visual de dano à rampa ${obstacleName}`);
                                        mazeController.getView().applyRampDamageVisual(
                                            obstacleName, 
                                            obstacleMesh.metadata.health, 
                                            obstacleMesh.metadata.initialHealth || 100
                                        );
                                    }
                                }
                                
                            } else {
                                // Se a saúde não estiver definida, inicializá-la
                                console.log(`Inicializando saúde para ${obstacleName}`);
                                if (!obstacleMesh.metadata) {
                                    obstacleMesh.metadata = {};
                                }
                                obstacleMesh.metadata.initialHealth = 100;
                                obstacleMesh.metadata.health = 100 - this.OBSTACLE_DAMAGE_AMOUNT;
                                console.log(`Saúde inicializada: ${obstacleMesh.metadata.health}`);
                            }
                            // Simular formato de retorno para consistência com código existente
                            damageResult = { 
                                destroyed: wasDestroyed, 
                                remainingHealth: obstacleMesh.metadata ? obstacleMesh.metadata.health : 0 
                            };
                        } else {
                            // Código existente para estruturas geradas pelo mapa
                            if (obstacleName.startsWith("wall_")) {
                                console.log(`Danificando parede gerada ${obstacleName}`);
                                damageResult = mazeController.damageWallAt(obstacleCenterPosition, this.OBSTACLE_DAMAGE_AMOUNT);
                                console.log(`Resultado: destruída=${damageResult?.destroyed}, saúde restante=${damageResult?.remainingHealth}`);
                            } else if (obstacleName.startsWith("ramp_")) {
                                console.log(`Danificando rampa gerada ${obstacleName}`);
                                mazeController.handleRampDamage(obstacleName, this.OBSTACLE_DAMAGE_AMOUNT, obstacleCenterPosition);
                                damageResult = { destroyed: false, remainingHealth: 1 };
                            }
                        }
        
                        // Atualizar tempo do último dano
                        this.obstacleContactTimers[obstacleName].lastDamageTime = now;
                        console.log(`Timer de dano atualizado para ${obstacleName}`);
        
                        // Se o obstáculo foi destruído pelo dano, remover o timer
                        if (damageResult && damageResult.destroyed) {
                            console.log(`Removendo timer para obstáculo destruído: ${obstacleName}`);
                            delete this.obstacleContactTimers[obstacleName];
                        }
                    }
                }
            }
        
            // Limpar timers de obstáculos que não estão mais em contato
            for (const obstacleName in this.obstacleContactTimers) {
                if (!currentHits.has(obstacleName)) {
                    console.log(`Contato perdido com ${obstacleName}, removendo timer`);
                    delete this.obstacleContactTimers[obstacleName];
                }
            }
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

            // Se não estiver perseguindo o jogador
            if (!this.model.isPlayerChased()) {
                // Mover para uma direção aleatória
                this.moveRandomly();
            }

            // Continuar o comportamento de patrulha recursively
            this.startPatrolBehavior();
        }, patrolInterval);
    }
    
    // Mover em uma direção aleatória
    moveRandomly() {
        if (!this.model.getMesh() || this.isDisposed) return;
        if (!this.model.getMesh() || this.isDisposed || this.isStunned) return;

        // Gerar um ângulo aleatório
        const angle = Math.random() * Math.PI * 2;
        
        // Criar um vetor de direção com o ângulo
        const direction = new BABYLON.Vector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        );
        
        // Mover na direção com uma pequena distância
        const movement = direction.scale(0.1);
        this.model.moveWithCollision(movement);
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