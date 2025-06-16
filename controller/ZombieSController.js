import ZombieSModel from '../model/ZombieSModel.js';
import ZombieSView from '../view/ZombieSView.js';

class ZombieSController {    constructor(scene, game, zombieSpawner) {
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
        
        // Controle de verificação de conclusão de horda
        this.hordeCompletionInterval = null;
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
            } else {
                // Se não houver posições definidas, criar algumas padrão
                this.createDefaultSpawnPositions();
            }
        } else {
            // Se o labirinto não estiver disponível, criar posições padrão
            this.createDefaultSpawnPositions();
        }
    }

    createDefaultSpawnPositions() {
        const centerX = 10; // Posição X do centro baseada no maze.txt
        const centerZ = 10;  // Posição Z do centro baseada no maze.txt
        const spawnRadius = 80; // Raio ao redor do centro para spawns
        const spawnHeight = 1; // Altura dos spawns
        
        // Gerar múltiplas posições aleatórias dentro da esfera
        this.spawnPositions = [];
        const numberOfSpawnPoints = 200; // Número de pontos de spawn a gerar
        
        for (let i = 0; i < numberOfSpawnPoints; i++) {
            const angle = Math.random() * 2 * Math.PI;
            
            const distance = spawnRadius;
            
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;
            
            // Adicionar posição à lista
            this.spawnPositions.push(new BABYLON.Vector3(x, spawnHeight, z));
        }
    }


    // Iniciar o sistema de hordas
    startHordeSystem() {
        if (!this.model.isHordeActive()) {
            this.model.hordeActive = true;
            this.model.resetCounters();
            
            // Aguardar o jogador pressionar H para iniciar a primeira horda
            this.waitingForKeyPress = true;
            this.view.showReadyToStart(1);
            
        }
    }    // Parar o sistema de hordas
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
        
        // Limpar verificação de conclusão de horda
        if (this.hordeCompletionInterval) {
            clearInterval(this.hordeCompletionInterval);
            this.hordeCompletionInterval = null;
        }
        
        // Parar música da horda
        if (this.game?.soundManager) {
            this.game.soundManager.stopHordeMusic();
        }
    }// Iniciar uma horda de monstros
    startHorde() {
        // Incrementar o contador de hordas
        this.model.currentHorde++;
        const hordeNumber = this.model.currentHorde;
        
        // Calcular número de monstros para esta horda
        const monsterCount = this.model.calculateMonstersForNextHorde();
        
        // Calcular atributos dos monstros da horda atual
        const monsterHealth = this.model.calculateMonsterHealth();
        const monsterSpeed = this.model.calculateMonsterSpeed();
        
        // Iniciar música da horda
        if (this.game?.soundManager) {
            this.game.soundManager.startHordeMusic();
        }
        
        // Notificar o início da horda - agora passando saúde e velocidade
        this.view.showHordeStarting(hordeNumber, monsterCount, monsterHealth, monsterSpeed);
        
        // Spawnar os monstros
        this.spawnMonsters(monsterCount);
        
        // Agendar para mostrar mensagem para a próxima horda após um intervalo
        this.model.hordeTimer = setTimeout(() => {
            // Ao terminar a horda, ficar aguardando o jogador apertar H novamente
            this.waitingForKeyPress = true;
            this.view.showReadyToStart(this.model.currentHorde + 1);
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
        
        // Iniciar verificação periódica se todos os zumbis morreram
        this.startHordeCompletionCheck();
    }
    
    // Verificar periodicamente se todos os zumbis da horda morreram
    startHordeCompletionCheck() {
        // Limpar verificação anterior se existir
        if (this.hordeCompletionInterval) {
            clearInterval(this.hordeCompletionInterval);
        }
        
        // Verificar a cada 2 segundos se todos os zumbis morreram
        this.hordeCompletionInterval = setInterval(() => {
            this.checkHordeCompletion();
        }, 2000);
    }
    
    // Verificar se a horda foi completada (todos os zumbis mortos)
    checkHordeCompletion() {
        if (!this.game || !this.model.hordeActive) {
            return;
        }
        
        // Obter lista atual de monstros
        const currentMonsters = this.game.getMonsters ? this.game.getMonsters() : [];
        
        // Filtrar apenas monstros que estão realmente vivos (não disposed)
        const aliveMonsters = currentMonsters.filter(monster => {
            const controller = monster.getController ? monster.getController() : null;
            return controller && !controller.isDisposed;
        });
        
        // Se não há monstros vivos, a horda foi completada
        if (aliveMonsters.length === 0) {
            this.onHordeCompleted();
        }
    }
    
    // Executado quando uma horda é completada
    onHordeCompleted() {
        console.log(`Horda ${this.model.currentHorde} completada! Todos os zumbis foram eliminados.`);
        
        // Parar música da horda
        if (this.game?.soundManager) {
            this.game.soundManager.stopHordeMusic();
        }
        
        // Parar verificação de conclusão da horda
        if (this.hordeCompletionInterval) {
            clearInterval(this.hordeCompletionInterval);
            this.hordeCompletionInterval = null;
        }
        
        // Mostrar mensagem de horda completada (opcional)
        if (this.view && this.view.hordeInfoDisplay) {
            this.view.hordeInfoDisplay.text = `Horde ${this.model.currentHorde} Completed!`;
            this.view.hordeInfoDisplay.color = "green";
            
            // Voltar para a mensagem normal após 3 segundos
            setTimeout(() => {
                if (this.view && this.view.hordeInfoDisplay) {
                    this.view.showReadyToStart(this.model.currentHorde + 1);
                }
            }, 3000);
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