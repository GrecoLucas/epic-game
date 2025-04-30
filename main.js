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
    }

    async initialize() {
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
    }
    
    // Inicializar o sistema de hordas de zumbis
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
            this.collisionSystem.addMeshes([monsterMesh]);
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
        return this.player.getCamera();
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
}

window.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    // Luz
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    
    // Game
    const game = new Game(engine, scene);
    
    // IMPORTANTE: NÃO iniciar o render loop até o jogo estar inicializado
    game.initialize().then(() => {
        console.log("Jogo inicializado com sucesso!");
        
        // Iniciar o render loop SOMENTE após a inicialização completa
        engine.runRenderLoop(() => {
            // Verificar se temos câmera antes de renderizar
            if (scene.activeCamera) {
                scene.render();
                // Update ammo display every frame
                if (game.player) {
                    game.player.updateAmmoDisplay();
                }
            } else {
                console.warn("Tentativa de renderização sem câmera ativa");
            }
        });
    }).catch(error => {
        console.error("Erro ao inicializar o jogo:", error);
    });
    
    window.addEventListener('resize', () => engine.resize());
});
