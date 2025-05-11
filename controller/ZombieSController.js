import ZombieSModel from '../model/ZombieSModel.js';
import ZombieSView from '../view/ZombieSView.js';

class ZombieSController {
    constructor(scene, game, zombieSpawner) {
        this.scene = scene;
        this.game = game;
        this.zombieSpawner = zombieSpawner;
        this.model = new ZombieSModel();
        this.view = new ZombieSView(scene);
        
        // Array para armazenar posições possíveis de spawn
        this.spawnPositions = [];
        
        // Flags para controle de estado
        this.waitingForKeyPress = false;
        this.keyListener = null;
    }

    initialize() {
        // Coletar posições de spawn possíveis
        this.collectSpawnPositions();
        
        // Configurar listener de input para a tecla H
        this._setupKeyListener();
        
        // Inicializar display
        this.view.showReadyToStart(1);
        
        return this.zombieSpawner;
    }

    // Configurar listener para tecla H
    _setupKeyListener() {
        // Remover listener existente se houver
        if (this.keyListener) {
            window.removeEventListener("keydown", this.keyListener);
        }
        
        // Criar novo listener
        this.keyListener = (event) => {
            // Verificar se a tecla H foi pressionada e está aguardando interação
            if (event.key === "h" || event.key === "H") {
                if (this.waitingForKeyPress && this.model.hordeActive) {
                    this.waitingForKeyPress = false;
                    
                    // Iniciar horda imediatamente (sempre)
                    this.startHorde();
                } else if (!this.model.hordeActive) {
                    // Se o sistema está inativo, ativar e aguardar tecla
                    this.startHordeSystem();
                }
            }
        };
        
        // Adicionar listener
        window.addEventListener("keydown", this.keyListener);
    }

    // Coletar pontos potenciais de spawn no labirinto
    collectSpawnPositions() {
        // Verificar se o labirinto já está carregado
        if (this.game && this.game.maze) {
            // Tentar obter posições de monstros do labirinto
            const mazeMonsterPositions = this.game.maze.getMonsterPositions();
            
            if (mazeMonsterPositions && mazeMonsterPositions.length > 0) {
                this.spawnPositions = [...mazeMonsterPositions];
                console.log(`Coletadas ${this.spawnPositions.length} posições de spawn do labirinto.`);
            } else {
                // Se não houver posições definidas, criar algumas padrão
                this.createDefaultSpawnPositions();
            }
        } else {
            // Se o labirinto não estiver disponível, criar posições padrão
            this.createDefaultSpawnPositions();
        }
    }

    // Criar posições padrão de spawn caso não exista no labirinto
    createDefaultSpawnPositions() {
        console.log("Criando posições padrão para spawn de monstros.");
        
        // Criar 4 posições em cantos diferentes
        this.spawnPositions = [
            new BABYLON.Vector3(10, 1, 10),
            new BABYLON.Vector3(-10, 1, 10),
            new BABYLON.Vector3(10, 1, -10),
            new BABYLON.Vector3(-10, 1, -10)
        ];
    }

    // Iniciar o sistema de hordas
    startHordeSystem() {
        if (!this.model.isHordeActive()) {
            this.model.hordeActive = true;
            this.model.resetCounters();
            
            // Aguardar o jogador pressionar H para iniciar a primeira horda
            this.waitingForKeyPress = true;
            this.view.showReadyToStart(1);
            
            console.log("Sistema de hordas iniciado! Aguardando jogador pressionar H para iniciar.");
        }
    }

    // Parar o sistema de hordas
    stopHordeSystem() {
        this.model.hordeActive = false;
        this.waitingForKeyPress = false;
        
        // Limpar todos os timers
        if (this.model.hordeTimer) {
            clearTimeout(this.model.hordeTimer);
        }
        
        if (this.model.countdownTimer) {
            clearInterval(this.model.countdownTimer);
        }
        
        console.log("Sistema de hordas parado.");
    }

    // Iniciar uma horda de monstros
    startHorde() {
        // Incrementar o contador de hordas
        this.model.currentHorde++;
        const hordeNumber = this.model.currentHorde;
        
        // Calcular número de monstros para esta horda
        const monsterCount = this.model.calculateMonstersForNextHorde();
        
        // Calcular atributos dos monstros da horda atual
        const monsterHealth = this.model.calculateMonsterHealth();
        const monsterSpeed = this.model.calculateMonsterSpeed();
        
        // Log detalhado sobre o início da horda
        console.log(`========== HORDA #${hordeNumber} INICIADA ==========`);
        console.log(`Quantidade de zumbis: ${monsterCount}`);
        console.log(`Vida dos zumbis: ${monsterHealth}`);
        console.log(`Velocidade dos zumbis: ${monsterSpeed.toFixed(2)}`);
        console.log(`==========================================`);
        
        // Notificar o início da horda - agora passando saúde e velocidade
        this.view.showHordeStarting(hordeNumber, monsterCount, monsterHealth, monsterSpeed);
        
        // Spawnar os monstros
        this.spawnMonsters(monsterCount);
        
        // Agendar para mostrar mensagem para a próxima horda após um intervalo
        this.model.hordeTimer = setTimeout(() => {
            // Ao terminar a horda, ficar aguardando o jogador apertar H novamente
            this.waitingForKeyPress = true;
            this.view.showReadyToStart(this.model.currentHorde + 1);
            console.log(`Horda ${this.model.currentHorde} completa. Pressione H para iniciar a próxima horda.`);
        }, 5000); // Pequeno intervalo antes de mostrar mensagem
    }

    // Spawnar um número específico de monstros
    spawnMonsters(count) {
        if (!this.game) {
            console.error("Referência ao Game não disponível para spawnar monstros.");
            return;
        }

        // Calcular os atributos dos monstros para esta horda
        const monsterHealth = this.model.calculateMonsterHealth();
        const monsterSpeed = this.model.calculateMonsterSpeed();
        
        console.log(`Horda #${this.model.currentHorde}: Monstros com ${monsterHealth} de vida e velocidade ${monsterSpeed.toFixed(2)}`);

        for (let i = 0; i < count; i++) {
            // Selecionar posição de spawn aleatória
            const randomIndex = Math.floor(Math.random() * this.spawnPositions.length);
            const spawnPosition = this.spawnPositions[randomIndex];
            
            // Adicionar pequena variação aleatória à posição para evitar sobreposição
            const variance = 2; // Variação máxima em unidades
            const randomOffset = new BABYLON.Vector3(
                (Math.random() * 2 - 1) * variance,
                0, // Não variar a altura
                (Math.random() * 2 - 1) * variance
            );
            
            const finalPosition = spawnPosition.add(randomOffset);
            
            // Spawnar o monstro com pequeno atraso entre cada um
            setTimeout(() => {
                // Adicionar o monstro com os atributos específicos para esta horda
                this.game.addMonster(finalPosition, monsterHealth, monsterSpeed);
                }, i * 100); 
        }
    }
    


    // Getters
    getTimeToNextHorde() {
        return this.model.getTimeToNextHorde();
    }

    getCurrentHorde() {
        return this.model.getCurrentHorde();
    }
}

export default ZombieSController;