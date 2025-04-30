import MonsterModel from './model/MonsterModel.js';
import MonsterView from './view/MonsterView.js';
import MonsterController from './controller/MonsterController.js';

// Classe principal que integra o modelo, a visualização e o controlador do monstro
class Monster {
    constructor(scene, player, startPosition = null) {
        this.scene = scene;
        this.player = player;
        this.startPosition = startPosition;
        this.model = null;
        this.view = null;
        this.controller = null;
    }
    
    initialize() {
        // Definir posição inicial do monstro
        // Se não foi especificada, posicionar aleatoriamente no labirinto
        if (!this.startPosition) {
            this.startPosition = this.getRandomPosition();
        }
        
        // Criar os componentes MVC
        this.model = new MonsterModel(this.scene, this.startPosition);
        this.view = new MonsterView(this.scene); // Passar a cena para o MonsterView
        
        // Inicializar o modelo
        this.model.initialize();
        
        // Criar o controlador
        this.controller = new MonsterController(this.scene, this.model, this.view, this.player);
        
        return this.controller.getMesh();
    }
    // Adicionar método setType à classe Monster
    setType(type) {
        if (!this.model) {
            console.warn("Não é possível definir o tipo do monstro antes da inicialização do modelo");
            return;
        }
        
        // Armazenar o tipo no modelo
        this.model.monsterType = type;
        
        // Configurações baseadas no tipo
        switch(type) {
            case 'wolf':
                this.model.speed = 0.3;
                this.model.damage = 15;
                this.model.health = 80;
                break;
            case 'bear':
                this.model.speed = 0.2;
                this.model.damage = 20;
                this.model.health = 150;
                break;
            case 'scorpion':
                this.model.speed = 0.25;
                this.model.damage = 18;
                this.model.health = 120;
                break;
            case 'snake':
                this.model.speed = 0.3;
                this.model.damage = 12;
                this.model.health = 60;
                break;
            case 'troll':
                this.model.speed = 0.15;
                this.model.damage = 25;
                this.model.health = 200;
                break;
            case 'golem':
                this.model.speed = 0.1;
                this.model.damage = 30;
                this.model.health = 250;
                break;
            case 'zombie':
            default:
                this.model.speed = 0.2;
                this.model.damage = 10;
                this.model.health = 100;
                break;
        }
        
        // Atualizar a visualização se disponível
        if (this.controller) {
            this.controller.updateHealthText();
        }
    }
    // Obter uma posição aleatória no labirinto
    getRandomPosition() {
        // Tentar encontrar um objeto Maze na cena para obter limites do labirinto
        const maze = this.scene.gameInstance?.maze;
        
        // Posição padrão se não puder determinar os limites do labirinto
        let position = new BABYLON.Vector3(10, 1, 10);
        
        if (maze) {
            // Obter dimensões do labirinto
            const bounds = maze.getBounds ? maze.getBounds() : null;
            
            if (bounds) {
                // Gerar posição aleatória dentro dos limites do labirinto
                const x = bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x);
                const z = bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z);
                position = new BABYLON.Vector3(x, 1, z);
            } else {
                // Posição aleatória baseada na dimensão padrão do labirinto
                // Evitar posicionar o monstro muito perto do jogador no início
                const mazeSize = 30;  // Tamanho aproximado do labirinto
                const x = (Math.random() - 0.5) * mazeSize;
                const z = (Math.random() - 0.5) * mazeSize;
                position = new BABYLON.Vector3(x, 1, z);
            }
        }
        
        return position;
    }
    
    // Método para obter o controlador
    getController() {
        return this.controller;
    }
    
    // Método para obter o mesh do monstro
    getMesh() {
        return this.model ? this.model.getMesh() : null;
    }
}

export default Monster;