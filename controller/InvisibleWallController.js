import InvisibleWallModel from '../model/InvisibleWallModel.js';
import InvisibleWallView from '../view/InvisibleWallView.js';

class InvisibleWallController {
    constructor(scene, collisionSystem) {
        this.scene = scene;
        this.collisionSystem = collisionSystem;
        this.model = new InvisibleWallModel();
        this.view = new InvisibleWallView(scene);
    }
    
    // Inicializar as paredes invisíveis ao redor de um mapa com limites definidos
    initialize(worldSize) {
        
        // Obter dimensões do modelo
        const wallHeight = this.model.getWallHeight();
        const wallThickness = this.model.getWallThickness();
        
        // Determinar metade do tamanho do mundo para centralizar
        const halfWorldSize = worldSize / 2;
        
        // Criar as quatro paredes ao redor do mapa
        // Parede Norte
        this.createWall(
            new BABYLON.Vector3(0, wallHeight / 2, -halfWorldSize - wallThickness/2),
            worldSize + wallThickness * 2, // Comprimento um pouco maior
            wallHeight,
            wallThickness
        );
        
        // Parede Sul
        this.createWall(
            new BABYLON.Vector3(0, wallHeight / 2, halfWorldSize + wallThickness/2),
            worldSize + wallThickness * 2,
            wallHeight,
            wallThickness
        );
        
        // Parede Leste
        this.createWall(
            new BABYLON.Vector3(halfWorldSize + wallThickness/2, wallHeight / 2, 0),
            wallThickness,
            wallHeight,
            worldSize + wallThickness * 2
        );
        
        // Parede Oeste
        this.createWall(
            new BABYLON.Vector3(-halfWorldSize - wallThickness/2, wallHeight / 2, 0),
            wallThickness,
            wallHeight,
            worldSize + wallThickness * 2
        );
        
        return true;
    }
    
    // Método para criar uma parede única e registrá-la
    createWall(position, width, height, depth) {
        // Registrar a posição da parede no modelo
        this.model.addWallPosition(position);
        
        // Criar a mesh da parede através da view
        const wall = this.view.createWall(position, width, height, depth);
        
        // Registrar a mesh no modelo
        this.model.addWall(wall);
        
        // Adicionar ao sistema de colisão se disponível
        if (this.collisionSystem) {
            this.collisionSystem.addMesh(wall);
        }
        
        return wall;
    }
    
    // Destruir todas as paredes
    dispose() {
        this.view.dispose();
        this.model.clear();
    }
}

export default InvisibleWallController;