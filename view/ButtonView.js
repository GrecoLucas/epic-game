// View - Responsável pela representação visual dos botões
class ButtonView {
    constructor() {
        // Cores para diferentes estados
        this.pressedColor = BABYLON.Color3.Gray();
        this.highlightColor = BABYLON.Color3.White();
        this.infoText = null;
        this.glowIntensity = 0.8; // Intensidade do brilho ao pressionar
    }
    
    // Atualiza a aparência do botão baseado no modelo
    updateAppearance(model, scene) {
        const mesh = model.getMesh();
        if (!mesh) return;
        
        // Garantir que o material existe
        if (!mesh.material) {
            mesh.material = new BABYLON.StandardMaterial(`buttonMat${model.getId()}`, scene);
        }
        
        // Aplicar cor baseada no estado
        if (model.isPressed()) {
            // Efeito de piscagem com cor mais clara e brilho emissivo
            mesh.material.diffuseColor = this.highlightColor;
            mesh.material.emissiveColor = model.color.scale(this.glowIntensity);
            mesh.material.specularColor = new BABYLON.Color3(1, 1, 1);
            mesh.material.specularPower = 16; // Mais brilhante quando pressionado
        } else {
            // Estado normal
            mesh.material.diffuseColor = model.color;
            mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
            mesh.material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            mesh.material.specularPower = 32;
        }
    }
    
    // Configurar a interação de clique no botão
    setupInteraction(model, scene, callback) {
        const mesh = model.getMesh();
        if (!mesh) return;
        
        // Configurar a ação de clique
        mesh.actionManager = new BABYLON.ActionManager(scene);
        
        // Usar OnPickTrigger (clique comum)
        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger, 
                () => callback(model.getId())
            )
        );
        
        // Aumentar a área de colisão para facilitar a interação
        mesh.isPickable = true;
        
        // Adicionar efeito visual de hover
        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                    // Destacar botão quando o mouse estiver sobre ele
                    if (!model.isPressed()) {
                        mesh.material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                    }
                    
                }
            )
        );
        
        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    // Remover destaque quando o mouse sair
                    mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);

                }
            )
        );
    }
    
    

}

export default ButtonView;