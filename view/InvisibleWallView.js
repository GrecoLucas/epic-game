class InvisibleWallView {
    constructor(scene) {
        this.scene = scene;
        this.walls = [];
        
        // Material para as paredes invisíveis - transparente para debugging se necessário
        this.wallMaterial = new BABYLON.StandardMaterial("invisibleWallMaterial", this.scene);
        this.wallMaterial.alpha = 0.0; // Completamente invisível
        this.wallMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1); // Azul para debug (se alpha > 0)
    }
    
    // Criar uma parede invisível
    createWall(position, width, height, depth) {
        // Criar a mesh da parede
        const wall = BABYLON.MeshBuilder.CreateBox(
            "invisibleWall_" + this.walls.length,
            { width: width, height: height, depth: depth },
            this.scene
        );
        
        // Posicionar a parede
        wall.position = position;
        
        // Aplicar material invisível
        wall.material = this.wallMaterial;
        
        // Habilitar colisões
        wall.checkCollisions = true;
        wall.isPickable = false; // Não pode ser selecionado pelo jogador
        
        // Adicionar metadados
        wall.metadata = {
            isInvisibleWall: true
        };
        
        // Tornar invisível para raios de luz (não bloqueia iluminação)
        wall.receiveShadows = false;
        
        // Adicionar a lista de paredes
        this.walls.push(wall);
        
        return wall;
    }
    
    // Remover todas as paredes
    dispose() {
        for (const wall of this.walls) {
            if (wall) {
                wall.dispose();
            }
        }
        this.walls = [];
    }
}

export default InvisibleWallView;