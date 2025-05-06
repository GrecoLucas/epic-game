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
    
    // Configurar tipo e atributos do monstro
    setType(type) {
        if (!this.model) return;
        
        // Tipos padrão - menos variações para otimização
        switch(type) {
            case 'fast':
                this.model.speed = 0.3;
                this.model.damage = 10;
                this.model.health = 80;
                break;
            case 'strong':
                this.model.speed = 0.15;
                this.model.damage = 25;
                this.model.health = 200;
                break;
            case 'zombie':
            default:
                this.model.speed = 0.2;
                this.model.damage = 10;
                this.model.health = 100;
                break;
        }
        
        // Atualizar a visualização
        if (this.controller) {
            this.controller.updateHealthText();
        }
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