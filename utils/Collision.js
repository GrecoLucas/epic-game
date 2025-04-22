// Classe Collision para gerenciar colisões
class Collision {
    constructor(scene) {
        this.scene = scene;
        this.collisionMeshes = [];
    }
    
    /**
     * Adiciona um mesh para verificação de colisão
     * @param {BABYLON.Mesh} mesh - Mesh a ser adicionado
     */
    addMesh(mesh) {
        if (mesh) {
            mesh.checkCollisions = true;
            this.collisionMeshes.push(mesh);
        }
    }
        
    /**
     * Adiciona vários meshes para verificação de colisão
     * @param {Array<BABYLON.Mesh>} meshes - Array de meshes a serem adicionados
     */
    addMeshes(meshes) {
        if (Array.isArray(meshes)) {
            meshes.forEach(mesh => this.addMesh(mesh));
        }
    }
    
    /**
     * Habilita colisões em todos os meshes registrados
     */
    enableCollisions() {
        this.collisionMeshes.forEach(mesh => {
            mesh.checkCollisions = true;
        });
    }
    
    /**
     * Configura a câmera para detecção de colisões
     * @param {BABYLON.Camera} camera - A câmera do jogador
     */
    setupCameraCollisions(camera) {
        camera.checkCollisions = true;
        camera.applyGravity = true;
        camera.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5);
        camera.ellipsoidOffset = new BABYLON.Vector3(0, 0.9, 0);
        camera.minZ = 0.1; // Para evitar clipping
    }
}

export default Collision;