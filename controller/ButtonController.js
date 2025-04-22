// Controller - Responsável pelo controle e lógica dos botões
class ButtonController {
    constructor(scene) {
        this.scene = scene;
        this.buttons = [];
        this.onAllButtonsPressed = null;
        this.pressedCount = 0;
    }
    
    // Adiciona um botão ao controlador
    addButton(model, view) {
        this.buttons.push({ model, view });
        
        // Inicializa o modelo e configura a interação na view
        model.initialize(this.scene);
        view.updateAppearance(model, this.scene);
        view.setupInteraction(model, this.scene, (buttonId) => this.handleButtonPress(buttonId));
    }
    
    // Limpa todos os botões existentes
    clearButtons() {
        // Remover todos os meshes dos botões da cena
        for (const button of this.buttons) {
            if (button.model.getMesh()) {
                button.model.getMesh().dispose();
            }
        }
        this.buttons = [];
        this.pressedCount = 0;
    }
    
    // Trata o evento de pressionar um botão
    handleButtonPress(buttonId) {
        const button = this.buttons.find(btn => btn.model.getId() === buttonId);
        if (!button || button.model.isPressed()) return;
        
        // Atualiza o estado do botão
        if (button.model.press()) {
            // Atualiza a aparência
            button.view.updateAppearance(button.model, this.scene);
            
            // Incrementa o contador de botões pressionados
            this.pressedCount++;
            
            // Verifica se todos os botões foram pressionados
            if (this.pressedCount === this.buttons.length && this.onAllButtonsPressed) {
                this.onAllButtonsPressed();
            }
        }
    }
    
    // Define o callback para quando todos os botões forem pressionados
    setOnAllButtonsPressed(callback) {
        this.onAllButtonsPressed = callback;
    }
    
    // Retorna todos os meshes dos botões
    getMeshes() {
        return this.buttons.map(button => button.model.getMesh());
    }
    
    // Reseta todos os botões
    resetAllButtons() {
        this.pressedCount = 0;
        this.buttons.forEach(button => {
            button.model.reset();
            button.view.updateAppearance(button.model, this.scene);
        });
    }
}

export default ButtonController;