class PlayerModel {
    constructor(scene, startPosition = null) {
        this.scene = scene;
        // Se uma posição inicial for fornecida, use-a; caso contrário, use a posição padrão
        this.position = startPosition || new BABYLON.Vector3(0, 1, 0);
        this.moveSpeed = 0.4;
        this.rotationSpeed = 0.01;
        this.mesh = null;
        
        this.initialize();
    }

    initialize() {
        // Criar mesh do jogador (invisível na primeira pessoa)
        this.mesh = BABYLON.MeshBuilder.CreateCapsule(
            "player",
            { radius: 0.5, height: 1.8 },
            this.scene
        );
        this.mesh.position = this.position;
        this.mesh.isVisible = false; // invisível na primeira pessoa
        this.mesh.checkCollisions = true; // Habilitar colisões para o mesh do jogador
    }
    
    setPosition(position) {
        this.position = position;
        this.mesh.position = position;
    }
    
    getPosition() {
        return this.mesh.position;
    }
    
    getMesh() {
        return this.mesh;
    }
    
    moveWithDirection(direction) {
        this.mesh.moveWithCollisions(direction);
    }
}

export default PlayerModel;