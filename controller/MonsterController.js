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
        
        this.lastWallCollisionCheck = 0;
        this.wallCheckInterval = 100; // Verificar a cada 100ms

        this.wallContactTimers = {}; // Novo: Rastrear contato com paredes { wallName: { startTime: timestamp, lastDamageTime: timestamp } }
        this.WALL_CONTACT_DAMAGE_THRESHOLD = 1500; // ms de contato para começar a danificar
        this.WALL_DAMAGE_AMOUNT = 20; // Dano por tick
        this.WALL_DAMAGE_COOLDOWN = 500; // ms entre ticks de dano
    
        
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
            
            // Novo: Verificar colisões com paredes
            const currentTime = Date.now();
            if (currentTime - this.lastWallCollisionCheck > this.wallCheckInterval) {
                this.checkWallCollision();
                this.lastWallCollisionCheck = currentTime;
            }
        });
        
        // Iniciar o comportamento de patrulha
        this.startPatrolBehavior();
    }
    
    // Novo método para verificar colisão com paredes
    checkWallCollision() {
        if (this.isDisposed || this.isStunned || !this.model || !this.model.getMesh()) return;

        const monsterPosition = this.model.getPosition();
        const collisionRadius = 1.5;
        // Direções para verificar (agora em 8 direções para melhor cobertura)
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
            // Procurar por meshes individuais cujo nome começa com "wall_"
            return mesh.isPickable &&
                   mesh.checkCollisions &&
                   mesh.name.startsWith("wall_"); // <<-- ATUALIZADO AQUI
        };

        // Pegar o labirinto da cena global
        const maze = this.scene.gameInstance?.maze;
        if (!maze) return; // Precisa do labirinto para danificar paredes

        const now = Date.now();
        const currentHits = new Set(); // Paredes atingidas nesta verificação

        // Verificar cada direção
        for (const direction of directions) {
            // Criar um raio a partir da posição do monstro na direção específica
            const ray = new BABYLON.Ray(monsterPosition, direction, collisionRadius);
            
            // Verificar colisão
            const hit = this.scene.pickWithRay(ray, predicate);
            
            if (hit.hit && hit.pickedMesh) {
                // Usar o nome do mesh atingido para confirmar que é uma parede
                const wallName = hit.pickedMesh.name;
                const wallCenterPosition = hit.pickedMesh.position; // Posição central da parede
                currentHits.add(wallName); // Marcar como atingida

                // Inicializar timer se for o primeiro contato
                if (!this.wallContactTimers[wallName]) {
                    this.wallContactTimers[wallName] = { startTime: now, lastDamageTime: 0 };
                    console.log(`MONSTRO: Iniciou contato com ${wallName}`);
                }

                // Verificar se já passou tempo suficiente e se o cooldown permite
                const contactDuration = now - this.wallContactTimers[wallName].startTime;
                const canDamage = now - this.wallContactTimers[wallName].lastDamageTime >= this.WALL_DAMAGE_COOLDOWN;

                if (contactDuration >= this.WALL_CONTACT_DAMAGE_THRESHOLD && canDamage) {
                    console.log(`MONSTRO: Tempo de contato suficiente com ${wallName}. Aplicando dano...`);

                    // Aplicar dano através do Maze
                    // A função damageWallAt no Maze/MazeController cuidará de atualizar modelo e view
                    const damageResult = maze.damageWallAt(wallCenterPosition, this.WALL_DAMAGE_AMOUNT);

                    // Atualizar tempo do último dano
                    this.wallContactTimers[wallName].lastDamageTime = now;

                    // Se a parede foi destruída pelo dano, remover o timer
                    if (damageResult && damageResult.destroyed) {
                         console.log(`MONSTRO: Parede ${wallName} foi destruída pelo dano.`);
                         delete this.wallContactTimers[wallName];
                    }
                }
            }
        }

        // Limpar timers de paredes que não estão mais em contato
        for (const wallName in this.wallContactTimers) {
            if (!currentHits.has(wallName)) {
                console.log(`MONSTRO: Perdeu contato com ${wallName}`);
                delete this.wallContactTimers[wallName];
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

    stun(duration) {
        if (this.isStunned || this.isDisposed) return; // Don't stun if already stunned or disposed

        console.log("Monster stunned!");
        this.isStunned = true;
        this.view.showDamageEffect(); // Use damage effect as visual stun indicator

        // Clear any existing stun timer
        if (this.stunTimer) {
            clearTimeout(this.stunTimer);
        }

        // Stop current actions immediately (optional, but good for responsiveness)
        if (this.model.chaseTimeout) clearTimeout(this.model.chaseTimeout);
        if (this.model.moveTimeout) clearTimeout(this.model.moveTimeout);
        this.model.chaseTimeout = null;
        this.model.moveTimeout = null;
        this.model.stopChasing(); // Ensure chasing state is reset if stunned while chasing
        this.view.updateVisualState(false); // Update visual state if needed


        // Set a timer to remove the stun effect
        this.stunTimer = setTimeout(() => {
            if (this.isDisposed) return; // Check again in case disposed during stun
            this.isStunned = false;
            this.stunTimer = null;
            console.log("Monster unstunned.");
            // Restart patrol behavior after stun wears off
            this.startPatrolBehavior();
        }, duration);
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