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
    }

    initialize() {
        // Coletar posições de spawn possíveis
        this.collectSpawnPositions();
        
        // Inicializar o contador de tempo
        this.updateCountdown();
        
        return this.zombieSpawner;
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
            this.startCountdown();
            console.log("Sistema de hordas iniciado!");
        }
    }

    // Parar o sistema de hordas
    stopHordeSystem() {
        this.model.hordeActive = false;
        
        // Limpar todos os timers
        if (this.model.hordeTimer) {
            clearTimeout(this.model.hordeTimer);
        }
        
        if (this.model.countdownTimer) {
            clearInterval(this.model.countdownTimer);
        }
        
        console.log("Sistema de hordas parado.");
    }

    // Iniciar contagem regressiva para a próxima horda
    startCountdown() {
        // Limpar timer anterior, se existir
        if (this.model.countdownTimer) {
            clearInterval(this.model.countdownTimer);
        }
        
        // Calcular intervalo para a próxima horda
        const interval = this.model.calculateNextInterval();
        this.model.timeToNextHorde = interval;
        
        // Atualizar o display de tempo
        this.updateCountdown();
        
        // Iniciar contador com atualizações a cada segundo
        this.model.countdownTimer = setInterval(() => {
            this.model.timeToNextHorde -= 1;
            
            // Atualizar o display
            this.updateCountdown();
            
            // Verificar se é hora de iniciar a horda
            if (this.model.timeToNextHorde <= 0) {
                clearInterval(this.model.countdownTimer);
                this.startHorde();
            }
        }, 1000);
        
        console.log(`Próxima horda em ${interval} segundos.`);
    }

    // Atualizar o display de contagem regressiva
    updateCountdown() {
        this.view.updateHordeCountdown(
            this.model.timeToNextHorde,
            this.model.currentHorde
        );
    }

    // Iniciar uma horda de monstros
    startHorde() {
        // Incrementar o contador de hordas
        this.model.currentHorde++;
        const hordeNumber = this.model.currentHorde;
        
        // Calcular número de monstros para esta horda
        const monsterCount = this.model.calculateMonstersForNextHorde();
        
        // Notificar o início da horda
        this.view.showHordeStarting(hordeNumber, monsterCount);
        console.log(`Iniciando Horda #${hordeNumber} com ${monsterCount} monstros!`);
        
        // Spawnar os monstros
        this.spawnMonsters(monsterCount);
        
        // Agendar a próxima horda
        this.model.hordeTimer = setTimeout(() => {
            this.startCountdown();
        }, 5000); // Pequeno intervalo antes de iniciar a próxima contagem
    }

    // Spawnar um número específico de monstros
    spawnMonsters(count) {
        if (!this.game) {
            console.error("Referência ao Game não disponível para spawnar monstros.");
            return;
        }

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
                // Usar o método addMonster do Game para criar um novo monstro
                this.game.addMonster(finalPosition);
                console.log(`Monstro spawnou na posição [${finalPosition.x.toFixed(2)}, ${finalPosition.y.toFixed(2)}, ${finalPosition.z.toFixed(2)}]`);
            }, i * 500); // 500ms de atraso entre cada spawn
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