import MazeModel from '../model/MazeModel.js';
import MazeView from '../view/MazeView.js';
import MazeController from '../controller/MazeController.js';

class Maze {
    constructor(scene) {
        // Inicializar os componentes MVC
        this.model = new MazeModel();
        this.view = new MazeView(scene);
        this.controller = new MazeController(this.model, this.view);
        
        // Flag para indicar se o labirinto foi carregado
        this.loaded = false;
        
        // Inicializar o labirinto
        this.initialize();
    }
    
    // Inicializar o labirinto
    async initialize() {
        try {
            await this.controller.initialize();
            this.loaded = true;
        } catch (error) {
            console.error("Erro ao inicializar o labirinto:", error);
        }
    }
    
    // Verificar se o labirinto foi carregado completamente
    isLoaded() {
        return this.loaded;
    }

    // Método para destruir parede (agora delega para dano total)
    destroyWallAt(position) {
        return this.controller.destroyWallAt(position);
    }

    // Novo método para aplicar dano à parede
    damageWallAt(position, damageAmount) {        
        return this.controller.damageWallAt(position, damageAmount);
    }
    
    // Obter a posição inicial do jogador definida no labirinto
    getPlayerStartPosition() {
        return this.model.getPlayerStartPosition();
    }
    
    // Obter meshes do labirinto para colisão
    getMeshes() {
        return this.controller.getMeshes();
    }
    
    // Obter posições dos botões
    getButtonPositions() {
        return this.controller.getButtonPositions();
    }
    
    // Método para obter a posição do monstro (compatibilidade com código anterior)
    getMonsterPosition() {
        return this.model.getMonsterPosition();
    }
    
    // Novo método para obter todas as posições de monstros
    getMonsterPositions() {
        return this.model.getMonsterPositions();
    }
    
    // Método para obter as posições das armas
    getGunPositions() {
        return this.controller.getGunPositions();
    }

    getRampPositions() {
        return this.controller.getRampPositions();
    }
}

export default Maze;