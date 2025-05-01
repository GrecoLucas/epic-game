class InvisibleWallModel {
    constructor() {
        this.wallHeight = 50;         // Altura das paredes invisíveis
        this.wallThickness = 5;       // Espessura das paredes
        this.wallPositions = [];      // Array para armazenar posição das paredes
        this.walls = [];              // Array para armazenar as meshes das paredes
    }
    
    // Getter para altura das paredes
    getWallHeight() {
        return this.wallHeight;
    }
    
    // Getter para espessura das paredes
    getWallThickness() {
        return this.wallThickness;
    }
    
    // Adicionar posição de parede ao modelo
    addWallPosition(position) {
        this.wallPositions.push(position);
    }
    
    // Obter todas as posições de paredes
    getWallPositions() {
        return this.wallPositions;
    }
    
    // Adicionar mesh de parede
    addWall(wall) {
        this.walls.push(wall);
    }
    
    // Obter todas as paredes
    getWalls() {
        return this.walls;
    }
    
    // Limpar todos os dados (para reconfiguração ou encerramento)
    clear() {
        this.wallPositions = [];
        this.walls = [];
    }
}

export default InvisibleWallModel;