import Door from '../objects/Door.js';

class MazeController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.door = null; // Referência para a porta
    }
    
    // Inicializar o labirinto - carregar layout e renderizar
    async initialize() {
        try {
            // Carregar o layout do labirinto
            await this.model.loadMazeLayout();
            
            // Detectar posições dos botões
            this.model.detectButtonPositions();
            
            // Renderizar o labirinto com base no modelo
            this.view.renderMaze(this.model);
            
            // Inicializar a porta se uma posição foi encontrada
            await this.initializeDoor();
            
            return true;
        } catch (error) {
            console.error("Erro ao inicializar o labirinto:", error);
            return false;
        }
    }
    
    // Método para inicializar a porta
    async initializeDoor() {
        const doorPosition = this.model.getDoorPosition();
        if (doorPosition) {
            console.log("Inicializando porta na posição:", doorPosition);
            
            // Criar a porta na cena
            this.door = new Door(this.view.scene);
            this.door.initialize(doorPosition);
            
            return true;
        } else {
            console.log("Nenhuma posição de porta encontrada no labirinto");
            return false;
        }
    }
    
    // Obter todos os meshes do labirinto para colisão
    getMeshes() {
        const viewMeshes = this.view.getMeshes();
        const doorMeshes = this.door ? this.door.getMeshes() : [];
        
        // Combinar todos os meshes
        return [...viewMeshes, ...doorMeshes];
    }
    
    // Obter posições dos botões
    getButtonPositions() {
        return this.model.getButtonPositions();
    }
    
    // Obter a posição inicial do jogador
    getPlayerStartPosition() {
        return this.model.getPlayerStartPosition();
    }
    
    // Abrir a porta
    openDoor() {
        if (this.door) {
            this.door.openDoor();
            return true;
        }
        return false;
    }
    
    // Configurar callback para quando o jogador passar pela porta
    setDoorWinCallback(callback) {
        if (this.door) {
            this.door.onPlayerWin(callback);
            return true;
        }
        return false;
    }
    
    // Obter a referência da porta
    getDoor() {
        return this.door;
    }
}

export default MazeController;