// View - Responsável pela representação visual do menu de pausa
class PauseView {
    constructor(scene) {
        this.scene = scene;
        this.pauseUI = null;
        this.fullscreenUI = null;
        this.sensitivitySlider = null;
        this.fovSlider = null;
        this.sensitivityText = null;
        this.fovText = null;
        this.resumeButton = null;
    }

    initialize() {
        // Criar a interface fullscreen para o menu de pausa
        this.fullscreenUI = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("pauseUI");
        
        // Criar o painel principal do menu
        const panel = new BABYLON.GUI.Rectangle("pausePanel");
        panel.width = "500px";
        panel.height = "400px";
        panel.cornerRadius = 10;
        panel.color = "white";
        panel.thickness = 2;
        panel.background = "rgba(0, 0, 0, 0.8)";
        this.fullscreenUI.addControl(panel);
        
        // Painel de layout vertical para organizar elementos
        const stackPanel = new BABYLON.GUI.StackPanel();
        stackPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        stackPanel.paddingTop = "20px";
        panel.addControl(stackPanel);
          // Menu title
        const titleText = new BABYLON.GUI.TextBlock();
        titleText.text = "PAUSE MENU";
        titleText.color = "white";
        titleText.fontSize = 24;
        titleText.height = "40px";
        stackPanel.addControl(titleText);
        
        // Espaço entre título e sliders
        const spacer1 = new BABYLON.GUI.Rectangle();
        spacer1.height = "20px";
        spacer1.alpha = 0;
        stackPanel.addControl(spacer1);
        
        // Painel para o controle de sensibilidade
        const sensitivityPanel = new BABYLON.GUI.StackPanel();
        sensitivityPanel.isVertical = false;
        sensitivityPanel.height = "50px";
        stackPanel.addControl(sensitivityPanel);
          // Sensitivity label
        const sensitivityLabel = new BABYLON.GUI.TextBlock();
        sensitivityLabel.text = "Sensitivity: ";
        sensitivityLabel.color = "white";
        sensitivityLabel.width = "150px";
        sensitivityLabel.fontSize = 18;
        sensitivityLabel.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        sensitivityPanel.addControl(sensitivityLabel);
        
        // Slider para ajustar sensibilidade
        this.sensitivitySlider = new BABYLON.GUI.Slider();
        this.sensitivitySlider.minimum = 1000; // Mais sensível
        this.sensitivitySlider.maximum = 10000; // Menos sensível
        this.sensitivitySlider.value = 5000; // Valor padrão
        this.sensitivitySlider.height = "20px";
        this.sensitivitySlider.width = "200px";
        this.sensitivitySlider.color = "#00aaff";
        this.sensitivitySlider.background = "gray";
        sensitivityPanel.addControl(this.sensitivitySlider);
        
        // Texto que mostra o valor atual da sensibilidade
        this.sensitivityText = new BABYLON.GUI.TextBlock();
        this.sensitivityText.text = "5000";
        this.sensitivityText.color = "white";
        this.sensitivityText.width = "80px";
        this.sensitivityText.fontSize = 18;
        this.sensitivityText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        sensitivityPanel.addControl(this.sensitivityText);
        
        // Espaço entre controles
        const spacer2 = new BABYLON.GUI.Rectangle();
        spacer2.height = "20px";
        spacer2.alpha = 0;
        stackPanel.addControl(spacer2);
        
        // Painel para o controle de FOV
        const fovPanel = new BABYLON.GUI.StackPanel();
        fovPanel.isVertical = false;
        fovPanel.height = "50px";
        stackPanel.addControl(fovPanel);
          // FOV label
        const fovLabel = new BABYLON.GUI.TextBlock();
        fovLabel.text = "Field of View: ";
        fovLabel.color = "white";
        fovLabel.width = "150px";
        fovLabel.fontSize = 18;
        fovLabel.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        fovPanel.addControl(fovLabel);
        
        // Slider para ajustar FOV
        this.fovSlider = new BABYLON.GUI.Slider();
        this.fovSlider.minimum = 0.8; // FOV mais estreito (~40 graus)
        this.fovSlider.maximum = 1.8; // FOV mais amplo (~90 graus)
        this.fovSlider.value = 1.2; // Valor padrão
        this.fovSlider.height = "20px";
        this.fovSlider.width = "200px";
        this.fovSlider.color = "#00aaff";
        this.fovSlider.background = "gray";
        fovPanel.addControl(this.fovSlider);
        
        // Texto que mostra o valor atual do FOV
        this.fovText = new BABYLON.GUI.TextBlock();
        this.fovText.text = "1.20";
        this.fovText.color = "white";
        this.fovText.width = "80px";
        this.fovText.fontSize = 18;
        this.fovText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        fovPanel.addControl(this.fovText);
        
        // Espaço maior antes do botão
        const spacer3 = new BABYLON.GUI.Rectangle();
        spacer3.height = "50px";
        spacer3.alpha = 0;
        stackPanel.addControl(spacer3);
          // Button to return to the game
        this.resumeButton = BABYLON.GUI.Button.CreateSimpleButton("resumeButton", "BACK TO GAME");
        this.resumeButton.width = "200px";
        this.resumeButton.height = "50px";
        this.resumeButton.color = "white";
        this.resumeButton.cornerRadius = 10;
        this.resumeButton.background = "#00aaff";
        this.resumeButton.fontSize = 18;
        stackPanel.addControl(this.resumeButton);
          // Exit instruction
        const exitText = new BABYLON.GUI.TextBlock();
        exitText.text = "Press P again to close";
        exitText.color = "white";
        exitText.fontSize = 14;
        exitText.height = "30px";
        exitText.paddingTop = "10px";
        stackPanel.addControl(exitText);
        
        // Inicialmente oculto
        panel.isVisible = false;
        
        // Salvar referência ao painel
        this.pauseUI = panel;
    }
    
    // Exibir o menu de pausa
    show() {
        if (this.pauseUI) {
            this.pauseUI.isVisible = true;
        }
    }
    
    // Ocultar o menu de pausa
    hide() {
        if (this.pauseUI) {
            this.pauseUI.isVisible = false;
        }
    }
    
    // Atualizar a exibição da sensibilidade
    updateSensitivityDisplay(value) {
        if (this.sensitivityText) {
            this.sensitivityText.text = Math.round(value).toString();
        }
        
        if (this.sensitivitySlider) {
            this.sensitivitySlider.value = value;
        }
    }
    
    // Atualizar a exibição do FOV
    updateFOVDisplay(value) {
        if (this.fovText) {
            this.fovText.text = value.toFixed(2);
        }
        
        if (this.fovSlider) {
            this.fovSlider.value = value;
        }
    }
    
    // Configurar evento para o botão de retorno
    setResumeCallback(callback) {
        if (this.resumeButton) {
            this.resumeButton.onPointerClickObservable.add(callback);
        }
    }
    
    // Configurar evento para o slider de sensibilidade
    setSensitivityCallback(callback) {
        if (this.sensitivitySlider) {
            this.sensitivitySlider.onValueChangedObservable.add(callback);
        }
    }
    
    // Configurar evento para o slider de FOV
    setFOVCallback(callback) {
        if (this.fovSlider) {
            this.fovSlider.onValueChangedObservable.add(callback);
        }
    }
}

export default PauseView;