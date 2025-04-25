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
        });
        
        // Iniciar o comportamento de patrulha
        this.startPatrolBehavior();
    }
    
    update() {
        // Calcular delta entre frames para movimento suave
        const currentTime = Date.now();
        const delta = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Verificar se o jogador existe
        if (!this.player) return;
        
        // Garantir que o monstro permaneça na altura correta
        if (this.model.getMesh()) {
            this.model.getMesh().position.y = this.model.position.y;
        }

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