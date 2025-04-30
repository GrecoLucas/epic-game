// main.js - Módulo principal do jogo, modificado para suportar o sistema de menu e múltiplos modos
import Player from './Player.js';
import Collision from './utils/Collision.js';
import Buttons from './objects/Buttons.js';
import Maze from './objects/Maze.js'; 
import Monster from './Monster.js'; 
import GunLoader from './GunLoader.js'; 
import ZombieS from './objects/ZombieS.js'; 
import SkySphere from "./objects/SkySphere.js";
import SkySphereController from "./controller/SkySphereController.js";

class Game {
    constructor(engine, scene) {
        this.engine = engine;
        this.scene = scene;
        
        this.collisionSystem = null;
        this.player = null;
        this.buttonsManager = null;
        this.maze = null; 
        this.monsters = []; // Lista de monstros em vez de referência única
        this.gunLoader = null; // Referência ao carregador de armas
        this.zombieSpawner = null; // Referência ao sistema de hordas
        this.skySphereController = null; // Controlador da SkySphere
        
        // Armazenar referência ao Game na cena
        this.scene.gameInstance = this;
        
        // Flag para rastrear se o jogo foi inicializado
        this.isInitialized = false;
        
        // Para compatibilidade com o novo sistema
        this.gameMode = 'maze'; // Identifica este como o modo labirinto
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        console.log("Inicializando modo Labirinto...");
        
        // Configurar física
        this.scene.collisionsEnabled = true;
        this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
        
        this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());

        // Criar sistema de colisão
        this.collisionSystem = new Collision(this.scene);
        
        // Criar labirinto - agora responsável por todo o ambiente
        this.maze = new Maze(this.scene);
        
        // Esperar o labirinto carregar para obter a posição inicial do jogador
        await this.waitForMazeLoaded();
        
        // Registrar meshes do labirinto para colisão
        const mazeMeshes = this.maze.getMeshes();
        if (mazeMeshes && mazeMeshes.length > 0) {
            this.collisionSystem.addMeshes(mazeMeshes);
        }
        
        // Obter a posição inicial do jogador do labirinto
        const playerStartPosition = this.maze.getPlayerStartPosition();
        
        // Criar jogador usando a classe Player
        this.player = new Player(this.scene);
        this.player.initialize(this.engine.getRenderingCanvas());
        // Add player mesh to collision system
        this.collisionSystem.addMesh(this.player.getMesh()); 

        // Configurar câmera para colisões
        this.collisionSystem.setupCameraCollisions(this.player.getCamera());
        
        // Definir a posição inicial do jogador com base na posição 'P' do labirinto
        if (playerStartPosition) {
            console.log("Definindo posição inicial do jogador:", playerStartPosition);
            this.player.setPosition(playerStartPosition);
        } else {
            // Usar posição padrão se não houver posição definida no labirinto
            console.log("Usando posição padrão para o jogador");
            this.player.setPosition(new BABYLON.Vector3(0, 1, 0));
        }
        
        // Inicializar SkySphere APÓS a câmera ter sido criada
        this._initializeSkySphere();
        
        // Criar botões usando a estrutura MVC
        this.buttonsManager = new Buttons(this.scene);
        
        // Aguardar posições dos botões serem detectadas e configurar
        await this.setupButtonsFromMaze();
        
        // Registrar meshes dos botões para colisão
        this.collisionSystem.addMeshes(this.buttonsManager.getMeshes());

        // Inicializar o carregador de armas
        this.gunLoader = new GunLoader(this.scene);
        
        // Criar armas baseadas no labirinto
        await this.createGunsFromMaze();
        
        // Configurar o raycasting para melhorar a detecção de clique nos botões
        const camera = this.player.getCamera();
        camera.minZ = 0.1; // Distância mínima de renderização pequena para facilitar interação
                        
        // Criar e inicializar os monstros
        this.createMonstersFromMaze();
        
        // Inicializar o sistema de hordas de zumbis
        this.initializeZombieSpawner();
        
        // Marcar o jogo como inicializado
        this.isInitialized = true;
        
        // Configurar inputs de teclado para possível retorno ao menu principal
        this.setupKeyboardInputs();
        
        console.log("Modo Labirinto inicializado com sucesso!");
        
        return true;
    }
    
    // Método para inicializar o sistema de hordas de zumbis
    initializeZombieSpawner() {
        // Criar o gerenciador de hordas
        this.zombieSpawner = new ZombieS(this.scene, this);
        this.zombieSpawner.initialize();
        
        // Iniciar o sistema de hordas após um pequeno atraso para garantir que tudo carregou
        setTimeout(() => {
            this.zombieSpawner.startHordeSystem();
            console.log("Sistema de hordas de zumbis iniciado!");
        }, 5000); // 5 segundos de atraso inicial
    }
    
    // Método para criar monstros baseados no labirinto
    createMonstersFromMaze() {
        // Obter todas as posições de monstros do labirinto
        const monsterPositions = this.maze.getMonsterPositions();
        
        if (monsterPositions && monsterPositions.length > 0) {
            // Criar um monstro para cada posição M encontrada no labirinto
            console.log(`Criando ${monsterPositions.length} monstros nas posições marcadas...`);
            
            monsterPositions.forEach((position, index) => {
                this.addMonster(position);
                console.log(`Monstro #${index + 1} criado na posição [${position.x}, ${position.y}, ${position.z}]`);
            });
        } else {
            // Se não tiver posição definida no labirinto, criar em posição padrão
            console.log("Nenhuma posição de monstro encontrada no labirinto. Criando em posição padrão.");
            const defaultPosition = new BABYLON.Vector3(10, 1, 10);
            this.addMonster(defaultPosition);
        }
    }
    
    // Método para adicionar um novo monstro
    addMonster(position) {
        // Criar o monstro passando a cena, o player e a posição inicial
        const monster = new Monster(this.scene, this.player, position);
        
        // Inicializar o monstro
        const monsterMesh = monster.initialize();
        
        // Registrar mesh do monstro para colisão
        if (monsterMesh) {
            this.collisionSystem.addMesh(monsterMesh);
        }
        
        // Adicionar à lista de monstros
        this.monsters.push(monster);
        
        return monster;
    }
    
    // Método para remover um monstro específico
    removeMonster(monster) {
        const index = this.monsters.indexOf(monster);
        if (index !== -1) {
            // Remover o mesh da cena
            const mesh = monster.getMesh();
            if (mesh) {
                mesh.dispose();
            }
            
            // Remover da lista
            this.monsters.splice(index, 1);
        }
    }
    
    // Método para obter todos os monstros
    getMonsters() {
        return this.monsters;
    }
    
    // Método para criar armas baseadas no labirinto
    async createGunsFromMaze() {
        if (this.maze && this.gunLoader) {
            // Tentar várias vezes (max 10 tentativas) com intervalo de 100ms
            for (let i = 0; i < 10; i++) {
                const gunPositions = this.maze.getGunPositions();
                if (gunPositions && gunPositions.length > 0) {
                    console.log(`Criando ${gunPositions.length} armas nas posições marcadas...`);
                    
                    // Criar arma em cada posição G encontrada no labirinto
                    gunPositions.forEach((position, index) => {
                        // Ajustar a altura para ficar um pouco acima do chão
                        position.y = 0.5;
                        
                        // Determinar o tipo de arma com base no marcador do mapa
                        let gunType = 'pistol'; // Tipo padrão
                        if (position.type === 'G2') {
                            gunType = 'assault_rifle';
                        }
                        
                        // Criar arma nesta posição com o tipo correto
                        const gun = this.gunLoader.createGunAtPosition(position.x, position.y, position.z, gunType);
                        console.log(`Arma #${index + 1} (${gunType}) criada na posição [${position.x}, ${position.y}, ${position.z}]`);
                    });
                    
                    return;
                }
                // Esperar 100ms antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.warn("Não foi possível obter posições das armas do labirinto após várias tentativas");
        }
    }
    
    // Método para aguardar o labirinto carregar completamente
    async waitForMazeLoaded() {
        // Tentar várias vezes (max 10 tentativas) com intervalo de 100ms
        for (let i = 0; i < 10; i++) {
            if (this.maze && this.maze.isLoaded()) {
                return true;
            }
            // Esperar 100ms antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.warn("Não foi possível aguardar o carregamento completo do labirinto");
        return false;
    }
    
    // Método para configurar os botões a partir do labirinto
    async setupButtonsFromMaze() {
        if (this.maze) {
            // Tentar várias vezes (max 10 tentativas) com intervalo de 100ms
            for (let i = 0; i < 10; i++) {
                const buttonPositions = this.maze.getButtonPositions();
                if (buttonPositions && buttonPositions.length > 0) {
                    console.log("Configurando botões com as posições:", buttonPositions);
                    this.buttonsManager.setupButtons(buttonPositions);
                    return;
                }
                // Esperar 100ms antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.warn("Não foi possível obter posições dos botões do labirinto após várias tentativas");
        }
    }
    
    // Métodos auxiliares para acesso às propriedades do player
    getPlayerCamera() {
        return this.player?.getCamera();
    }
    
    // Método para obter o player 
    getPlayer() {
        return this.player;
    }
    
    // Inicializar a SkySphere após a câmera estar disponível
    _initializeSkySphere() {
        // Criar a SkySphere
        const skySphere = new SkySphere(this.scene);
        
        // Criar e configurar o controlador
        this.skySphereController = new SkySphereController(this.scene);
        this.skySphereController.initialize(skySphere);
        
        // Tentar criar a SkySphere
        if (this.skySphereController.createSkySphere()) {
            console.log("SkySphere criada com sucesso após inicialização do player");
        } else {
            // Se falhar, tentar novamente depois de um pequeno delay
            setTimeout(() => {
                if (this.skySphereController.createSkySphere()) {
                    console.log("SkySphere criada com sucesso após delay");
                } else {
                    console.error("Falha ao criar SkySphere mesmo após delay");
                }
            }, 1000);
        }
    }
    
    // Configurar inputs de teclado para voltar ao menu
    setupKeyboardInputs() {
        // Verificar se o ActionManager está disponível
        if (!this.scene.actionManager) {
            this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        }
        
        // Adicionar ação para a tecla ESC para voltar ao menu
        this.scene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnKeyUpTrigger,
                (evt) => {
                    if (evt.sourceEvent.key === "Escape") {
                        this.showPauseMenu();
                    }
                }
            )
        );
    }
    
    // Método para exibir o menu de pausa
    showPauseMenu() {
        // Verificar se já existe um menu de pausa
        if (this.pauseMenuUI) {
            return;
        }
        
        // Pausar o jogo
        this.scene.paused = true;
        
        // Criar um menu de pausa
        this.pauseMenuUI = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("pauseMenu");
        
        // Painel de fundo semi-transparente
        const background = new BABYLON.GUI.Rectangle();
        background.width = "100%";
        background.height = "100%";
        background.color = "transparent";
        background.thickness = 0;
        background.background = "rgba(0, 0, 0, 0.7)";
        this.pauseMenuUI.addControl(background);
        
        // Título do menu
        const title = new BABYLON.GUI.TextBlock();
        title.text = "JOGO PAUSADO";
        title.color = "white";
        title.fontSize = 48;
        title.height = "80px";
        title.top = "-200px";
        background.addControl(title);
        
        // Botão para continuar
        const continueButton = BABYLON.GUI.Button.CreateSimpleButton("continueBtn", "CONTINUAR");
        continueButton.width = "300px";
        continueButton.height = "60px";
        continueButton.color = "white";
        continueButton.cornerRadius = 10;
        continueButton.background = "rgba(0, 100, 200, 0.8)";
        continueButton.top = "-50px";
        continueButton.onPointerUpObservable.add(() => {
            this.closePauseMenu();
        });
        background.addControl(continueButton);
        
        // Botão para retornar ao menu principal
        const menuButton = BABYLON.GUI.Button.CreateSimpleButton("menuBtn", "VOLTAR AO MENU");
        menuButton.width = "300px";
        menuButton.height = "60px";
        menuButton.color = "white";
        menuButton.cornerRadius = 10;
        menuButton.background = "rgba(200, 50, 50, 0.8)";
        menuButton.top = "50px";
        menuButton.onPointerUpObservable.add(() => {
            this.returnToMainMenu();
        });
        background.addControl(menuButton);
        
        // Desabilitar controles do player durante a pausa
        if (this.player && this.player.controller) {
            this.player.controller.enabled = false;
        }
        
        // Exibir cursor do mouse
        document.body.style.cursor = "default";
    }
    
    // Método para fechar o menu de pausa
    closePauseMenu() {
        if (this.pauseMenuUI) {
            this.pauseMenuUI.dispose();
            this.pauseMenuUI = null;
            
            // Retomar o jogo
            this.scene.paused = false;
            
            // Reabilitar controles do player
            if (this.player && this.player.controller) {
                this.player.controller.enabled = true;
            }
            
            // Ocultar cursor do mouse
            document.body.style.cursor = "none";
        }
    }
    
    // Método para retornar ao menu principal
    returnToMainMenu() {
        // Limpar recursos e dispose da cena atual
        this.dispose();
        
        // Recarregar a página para voltar ao menu principal
        // Isso é uma solução simples, em uma implementação mais robusta
        // você iria para o menu sem recarregar a página
        window.location.reload();
    }
    
    // Método para limpar recursos e memória
    dispose() {
        // Parar o sistema de hordas
        if (this.zombieSpawner) {
            this.zombieSpawner.stopHordeSystem();
        }
        
        // Dispose de todos os monstros
        this.monsters.forEach(monster => {
            const monsterMesh = monster.getMesh();
            if (monsterMesh) {
                monsterMesh.dispose();
            }
        });
        this.monsters = [];
        
        // Dispose do labirinto
        if (this.maze) {
            const mazeMeshes = this.maze.getMeshes();
            if (mazeMeshes) {
                mazeMeshes.forEach(mesh => {
                    if (mesh) mesh.dispose();
                });
            }
        }
        
        // Dispose do jogador
        if (this.player) {
            const playerMesh = this.player.getMesh();
            if (playerMesh) {
                playerMesh.dispose();
            }
        }
        
        // Limpar referências
        this.collisionSystem = null;
        this.player = null;
        this.buttonsManager = null;
        this.maze = null;
        this.monsters = [];
        this.gunLoader = null;
        this.zombieSpawner = null;
        this.skySphereController = null;
        
        // Marcar como não inicializado
        this.isInitialized = false;
    }
}

// Exportar a classe Game para uso no GameLoader
export default Game;