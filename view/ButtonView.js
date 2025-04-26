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
                    
                    // Mostrar texto informativo
                    this.showInfoText(model, scene);
                }
            )
        );
        
        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    // Remover destaque quando o mouse sair
                    mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                    
                    // Esconder texto informativo
                    this.hideInfoText();
                }
            )
        );
    }
    
    // Novo método para mostrar o texto informativo
    showInfoText(model, scene) {
        // Remover texto anterior se existir
        this.hideInfoText();
        
        // Criar um painel GUI para o texto
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("buttonInfoUI");
        
        // Criar um retângulo com fundo para melhor legibilidade
        const rect = new BABYLON.GUI.Rectangle();
        rect.width = "300px";
        rect.height = "40px";
        rect.cornerRadius = 10;
        rect.color = "white";
        rect.thickness = 1;
        rect.background = "black";
        rect.alpha = 0.7;
        rect.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        rect.top = "100px";
        advancedTexture.addControl(rect);
        
        // Criar o texto informativo
        const text = new BABYLON.GUI.TextBlock();
        text.text = model.getInfoText();
        text.color = "white";
        text.fontSize = 18;
        rect.addControl(text);
        
        // Guardar referência para poder remover depois
        this.infoText = {
            advancedTexture: advancedTexture,
            rect: rect,
            text: text
        };
    }
    
    // Novo método para esconder o texto informativo
    hideInfoText() {
        if (this.infoText) {
            this.infoText.advancedTexture.dispose();
            this.infoText = null;
        }
    }
}

export default ButtonView;