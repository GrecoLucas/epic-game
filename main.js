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
import InvisibleWall from "./objects/InvisibleWall.js"; // Adicionar importação para InvisibleWall
import TurretController from './controller/BlocksController/TurretController.js'; // Importar o TurretController
import SoundManager from './utils/Sounds.js';

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
        this.invisibleWall = null; // Referência às paredes invisíveis
        this.turretController = null; // Controlador de torretas
        this.soundManager = null;

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
        
        this.soundManager = new SoundManager(this.scene);
        // Configurar física
        this.scene.collisionsEnabled = true;
        this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
        
        this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());

        // Melhorar a iluminação para visualizar melhor os itens
        const hemisphericLight = new BABYLON.HemisphericLight('hemisphericLight', new BABYLON.Vector3(0, 1, 0), this.scene);
        hemisphericLight.intensity = 0.8; // Aumentar intensidade da luz ambiente
        hemisphericLight.diffuse = new BABYLON.Color3(0.9, 0.9, 0.9); // Luz mais clara
        hemisphericLight.specular = new BABYLON.Color3(0.5, 0.5, 0.5); // Destacar superfícies
        hemisphericLight.groundColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Iluminação de baixo para cima
        
        // Adicionar luz direcional para dar mais dimensão ao ambiente
        const directionalLight = new BABYLON.DirectionalLight('directionalLight', new BABYLON.Vector3(0.5, -0.5, 0.5), this.scene);
        directionalLight.intensity = 0.6;
        directionalLight.diffuse = new BABYLON.Color3(1, 1, 0.9); // Tom levemente amarelado

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

        // Inicializar paredes invisíveis ao redor do mapa do labirinto
        this._initializeInvisibleWalls();
        
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
        
        // Inicializar o controlador de torretas
        this.initializeTurretController();
        
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
    
    }
    
    // Método para inicializar o controlador de torretas
    initializeTurretController() {
        this.turretController = new TurretController(this.scene, this.player);
        this.turretController.initialize();
        console.log("Controlador de torretas inicializado com sucesso!");
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
    addMonster(position, health = 100, speed = 0.08) {
        const monster = new Monster(this.scene, this.player, position, health, speed);
        
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
                        } else if (position.type === 'H') {
                            gunType = 'hammer';
                        }
                        
                        // Criar arma nesta posição com o tipo correto
                        const gun = this.gunLoader.createGunAtPosition(position.x, position.y, position.z, gunType);
                        this.connectGunSounds(gun);
                    });
                    
                    return;
                }
                // Esperar 100ms antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.warn("Não foi possível obter posições das armas do labirinto após várias tentativas");
        }
    }

    // Método para conectar os sons às armas
    connectGunSounds(gun) {
        if (!gun) {
            return;
        }
        if (!gun.controller) {
            return;
        }
        
        if (!this.soundManager) {
            return;
        }
        
        gun.controller.setAudioCallback((action) => {
            const gunType = gun.model.type;
            this.soundManager.playGunSound(gunType, action);
        });
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

    // Inicializar paredes invisíveis ao redor do mapa
    _initializeInvisibleWalls() {
        try {
            
            // Obter dimensões do labirinto para criar paredes invisíveis do tamanho correto
            let mazeSize = 0;
            
            if (this.maze && this.maze.model) {
                const mazeDimensions = this.maze.model.getMazeDimensions();
                if (mazeDimensions) {
                    // Calcular o tamanho do labirinto com base em suas dimensões
                    mazeSize = Math.max(mazeDimensions.width, mazeDimensions.height) * 1.6; // 20% maior que o labirinto
                }
            }
            // Criar o objeto de paredes invisíveis
            this.invisibleWall = new InvisibleWall(this.scene);
            
            // Inicializar com o sistema de colisão e tamanho do mapa
            const success = this.invisibleWall.initialize(this.collisionSystem, mazeSize);
            
            if (success) {
                console.log("Paredes invisíveis criadas com sucesso!");
            } else {
                console.error("Erro ao criar paredes invisíveis");
            }
            
            return success;
        } catch (error) {
            console.error("Erro ao inicializar paredes invisíveis:", error);
            return false;
        }
    }
    
    // Configurar inputs de teclado para voltar ao menu
    setupKeyboardInputs() {
        // Verificar se o ActionManager está disponível
        if (!this.scene.actionManager) {
            this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        }
        
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
        
        // Dispose das paredes invisíveis
        if (this.invisibleWall) {
            this.invisibleWall.dispose();
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
        this.invisibleWall = null;
        this.turretController = null;
        
        // Marcar como não inicializado
        this.isInitialized = false;
    }
}

// Exportar a classe Game para uso no GameLoader
export default Game;