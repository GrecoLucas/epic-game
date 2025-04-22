// Classe FloorAndWalls para gerenciar a construção do ambiente físico
class FloorAndWalls {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        this.roomSize = 30; // Tamanho aumentado da sala
        this.wallHeight = 4; // Altura aumentada das paredes
        this.createEnvironment();
    }

    createEnvironment() {
        // Criar materiais
        const floorMaterial = new BABYLON.StandardMaterial("floorMaterial", this.scene);
        floorMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        floorMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        const wallMaterial = new BABYLON.StandardMaterial("wallMaterial", this.scene);
        wallMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.6);
        
        // Criar chão - aumentado para o novo tamanho
        const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: this.roomSize, height: this.roomSize }, this.scene);
        floor.material = floorMaterial;
        floor.checkCollisions = true;
        this.meshes.push(floor);
        
        // Criar paredes
        this.createWalls(wallMaterial);
        
        // Teto - aumentado para o novo tamanho
        const ceiling = BABYLON.MeshBuilder.CreateGround("ceiling", { width: this.roomSize, height: this.roomSize }, this.scene);
        ceiling.position.y = this.wallHeight; // Teto mais alto
        ceiling.rotation.x = Math.PI;
        ceiling.material = wallMaterial;
        ceiling.checkCollisions = true;
        this.meshes.push(ceiling);

        // Garantir que todos os elementos tenham colisão ativada
        this.enableCollisions();
    }
    
    createWalls(wallMaterial) {
        // Parede Norte (z positivo)
        const wallNorth = BABYLON.MeshBuilder.CreateBox("wallNorth", { width: this.roomSize, height: this.wallHeight, depth: 0.2 }, this.scene);
        wallNorth.position.z = this.roomSize / 2;
        wallNorth.position.y = this.wallHeight / 2;
        wallNorth.material = wallMaterial;
        wallNorth.checkCollisions = true;
        this.meshes.push(wallNorth);
        
        // Parede Sul (z negativo)
        const wallSouth = BABYLON.MeshBuilder.CreateBox("wallSouth", { width: this.roomSize, height: this.wallHeight, depth: 0.2 }, this.scene);
        wallSouth.position.z = -this.roomSize / 2;
        wallSouth.position.y = this.wallHeight / 2;
        wallSouth.material = wallMaterial;
        wallSouth.checkCollisions = true;
        this.meshes.push(wallSouth);
        
        // Parede Leste (x positivo)
        const wallEast = BABYLON.MeshBuilder.CreateBox("wallEast", { width: 0.2, height: this.wallHeight, depth: this.roomSize }, this.scene);
        wallEast.position.x = this.roomSize / 2;
        wallEast.position.y = this.wallHeight / 2;
        wallEast.material = wallMaterial;
        wallEast.checkCollisions = true;
        this.meshes.push(wallEast);
        
        // Parede Oeste (x negativo)
        const wallWest = BABYLON.MeshBuilder.CreateBox("wallWest", { width: 0.2, height: this.wallHeight, depth: this.roomSize }, this.scene);
        wallWest.position.x = -this.roomSize / 2;
        wallWest.position.y = this.wallHeight / 2;
        wallWest.material = wallMaterial;
        wallWest.checkCollisions = true;
        this.meshes.push(wallWest);
    }
    
    enableCollisions() {
        // Habilitar colisões em todos os meshes
        this.meshes.forEach(mesh => {
            mesh.checkCollisions = true;
        });
    }

    getMeshes() {
        return this.meshes;
    }
}

export default FloorAndWalls;