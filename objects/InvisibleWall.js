import InvisibleWallController from '../controller/InvisibleWallController.js';

class InvisibleWall {
    constructor(scene) {
        this.scene = scene;
        this.controller = null;
        this.isInitialized = false;
    }
    
    // Inicializar as paredes invisíveis com um controlador próprio
    initialize(collisionSystem, worldSize) {
        
        // Criar e configurar o controlador
        this.controller = new InvisibleWallController(this.scene, collisionSystem);
        
        // Inicializar as paredes invisíveis ao redor do mapa
        const success = this.controller.initialize(worldSize);
        
        if (success) {
            this.isInitialized = true;
        } else {
            console.error("Falha ao inicializar paredes invisíveis!");
        }
        
        return success;
    }
    
    // Verificar se já foi inicializado
    isLoaded() {
        return this.isInitialized;
    }
    
    // Limpar recursos ao encerrar o objeto
    dispose() {
        if (this.controller) {
            this.controller.dispose();
        }
        this.isInitialized = false;
    }
}

export default InvisibleWall;