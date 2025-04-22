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