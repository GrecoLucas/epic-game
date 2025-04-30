class SkySphereModel {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
    }

    createSphere() {
        if (this.mesh) return this.mesh;
        
        // Aumentar tamanho para garantir que sempre envolva toda a cena
        this.mesh = BABYLON.MeshBuilder.CreateSphere(
            "skySphere", 
            {
                diameter: 1000, // Tamanho muito maior para garantir visibilidade
                segments: 32, 
                sideOrientation: BABYLON.Mesh.BACKSIDE // Renderiza o interior da esfera
            }, 
            this.scene
        );
        
        // Posicionar no centro para garantir que o jogador esteja sempre dentro
        this.mesh.position = new BABYLON.Vector3(0, 0, 0);
        
        // Configurações adicionais
        this.mesh.isPickable = false;
        this.mesh.checkCollisions = false;
        this.mesh.receiveShadows = false;
        
        // Garantir que a esfera sempre acompanhe a câmera
        const camera = this.scene.activeCamera;
        if (camera) {
            this.scene.registerBeforeRender(() => {
                if (this.mesh && camera) {
                    this.mesh.position.x = camera.position.x;
                    this.mesh.position.z = camera.position.z;
                    // Manter y fixo para que o céu pareça estar sempre no alto
                    this.mesh.position.y = camera.position.y;
                }
            });
        }
        
        return this.mesh;
    }

    getMesh() {
        return this.mesh;
    }
}

export default SkySphereModel;