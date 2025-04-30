class SkySphereView {
    constructor(scene, model) {
        this.scene = scene;
        this.model = model;
        this.material = null;
    }

    create() {
        const mesh = this.model.createSphere();
        if (!this.material) {
            this.material = new BABYLON.StandardMaterial("skyMat", this.scene);
            
            // Carregar textura com configurações otimizadas
            this.material.diffuseTexture = new BABYLON.Texture("textures/sky.png", this.scene);
            this.material.diffuseTexture.hasAlpha = false;
            this.material.diffuseTexture.coordinatesMode = BABYLON.Texture.SPHERICAL_MODE;
            
            // Dividir a textura em vários quadrados
            this.material.diffuseTexture.uScale = 5.0;  // 5 repetições horizontais
            this.material.diffuseTexture.vScale = 5.0;  // 5 repetições verticais
            
            // Desativar propriedades desnecessárias para um skybox
            this.material.specularColor = new BABYLON.Color3(0, 0, 0);
            this.material.emissiveColor = new BABYLON.Color3(1, 1, 1); // Isso faz a textura parecer mais brilhante
            this.material.backFaceCulling = false;
            this.material.disableLighting = true; // Importante para skybox
            this.material.useAlphaFromDiffuseTexture = false;
        }
        
        // Aplicar material à malha
        mesh.material = this.material;
        
        // Garantir que o céu seja renderizado atrás de tudo
        mesh.renderingGroupId = 0;
        
        console.log("SkySphere com textura aplicada em padrão quadriculado:", this.material.diffuseTexture.url);
    }
}

export default SkySphereView;