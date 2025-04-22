// View - Responsável pela representação visual dos botões
class ButtonView {
    constructor() {
        // Cores para diferentes estados
        this.pressedColor = BABYLON.Color3.Gray();
    }
    
    // Atualiza a aparência do botão baseado no modelo
    updateAppearance(model, scene) {
        const mesh = model.getMesh();
        if (!mesh) return;
        
        // Aplicar cor baseada no estado
        if (model.isPressed()) {
            mesh.material.diffuseColor = this.pressedColor;
        } else {
            mesh.material.diffuseColor = model.color;
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