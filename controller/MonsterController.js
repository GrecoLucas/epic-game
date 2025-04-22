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
        
        // Inicializar o controlador
        this.initialize();
    }
    
    initialize() {
        // Configurar o view com o mesh do model
        this.view.initialize(this.model.getMesh());
        
        // Registrar para atualização a cada frame
        this.scene.registerBeforeRender(() => {
            if (this.isDisposed) return;
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
        if (this.isDisposed) return;
        
        // Movimento aleatório a cada 3-6 segundos
        const patrolInterval = 300;
        
        this.model.moveTimeout = setTimeout(() => {
            if (this.isDisposed) return;
            
            // Se não estiver perseguindo o jogador
            if (!this.model.isPlayerChased()) {
                // Mover para uma direção aleatória
                this.moveRandomly();
            }
            
            // Continuar o comportamento de patrulha
            this.startPatrolBehavior();
        }, patrolInterval);
    }
    
    // Mover em uma direção aleatória
    moveRandomly() {
        if (!this.model.getMesh() || this.isDisposed) return;
        
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
    
    // Tomar dano
    takeDamage(amount) {
        // Efeito visual de dano
        this.view.showDamageEffect();
        
        // Aplicar dano ao modelo
        const isDead = this.model.takeDamage(amount);
        
        // Se o monstro morreu, mostrar animação de morte
        if (isDead) {
            this.die();
        }
        
        return isDead;
    }
    
    // Monstro morre
    die() {
        // Mostrar efeito de morte
        this.view.showDeathEffect();
        
        // Limpar timeouts
        if (this.model.chaseTimeout) {
            clearTimeout(this.model.chaseTimeout);
        }
        
        if (this.model.moveTimeout) {
            clearTimeout(this.model.moveTimeout);
        }
        
        // Marcar como disposto para evitar atualizações
        this.isDisposed = true;
    }
    
    // Obter mesh do monstro
    getMesh() {
        return this.model.getMesh();
    }
}

export default MonsterController;