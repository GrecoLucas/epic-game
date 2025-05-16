class SkySphereController {
    constructor(scene) {
        this.scene = scene;
        this.skySphere = null;
    }

    initialize(skySphere) {
        this.skySphere = skySphere;
    }

    // Cria a SkySphere somente quando a câmera estiver disponível
    createSkySphere() {
        // Verificar se existe uma câmera antes de criar a skybox
        if (this.scene.activeCamera) {
            if (this.skySphere) {
                this.skySphere.create();
                
                // Importante: verificar se a textura foi carregada corretamente
                const mesh = this.skySphere.model.getMesh();
                if (mesh && mesh.material && mesh.material.diffuseTexture) {
                    
                    // Configurar evento onLoadObservable para garantir que a textura seja carregada
                    mesh.material.diffuseTexture.onLoadObservable.add(() => {
                        console.log("Textura do céu carregada com sucesso!");
                    });
                    
                    return true;
                } else {
                    console.warn("Textura do céu não aplicada corretamente!");
                }
            }
        } else {
            console.warn("Não foi possível criar a SkySphere: nenhuma câmera ativa encontrada");
            return false;
        }
    }
}

export default SkySphereController;