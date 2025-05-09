import MonsterModel from './model/MonsterModel.js';
import MonsterView from './view/MonsterView.js';
import MonsterController from './controller/MonsterController.js';

// Classe principal que integra o modelo, a visualização e o controlador do monstro
class Monster {
    constructor(scene, player, startPosition = null) {
        this.scene = scene;
        this.player = player;
        this.startPosition = startPosition || new BABYLON.Vector3((Math.random() - 0.5) * 30, 1, (Math.random() - 0.5) * 30);
        this.model = null;
        this.view = null;
        this.controller = null;
    }
    
    async initialize() {
        // Criar e inicializar o modelo
        this.model = new MonsterModel(this.scene, this.startPosition);
        
        // Criar a visualização
        this.view = new MonsterView(this.scene);
        
        // Inicializar o modelo e obter o mesh
        await this.model.initialize();
        
        // Criar o controlador após o modelo estar inicializado
        this.controller = new MonsterController(this.scene, this.model, this.view, this.player);
        
        return this.controller.getMesh();
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