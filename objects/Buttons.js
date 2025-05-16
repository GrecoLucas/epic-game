// Classe principal para os botões de escape usando padrão MVC
import ButtonModel from '../model/ButtonModel.js';
import ButtonView from '../view/ButtonView.js';
import ButtonController from '../controller/ButtonController.js';

class Buttons {
    constructor(scene) {
        this.scene = scene;
        this.controller = new ButtonController(scene);
        // As configurações dos botões serão definidas quando o labirinto estiver pronto
        this.buttonConfigs = [];
        this.colors = [
            BABYLON.Color3.Red(),      // Cor para botão 2
            BABYLON.Color3.Green(),    // Cor para botão 3
            BABYLON.Color3.Blue(),      // Cor para botão 4
            BABYLON.Color3.Yellow()   // Cor para botão 5
        ];
    }

    // Configura os botões com base nas posições detectadas no labirinto
    setupButtons(buttonPositions) {
        if (!buttonPositions || buttonPositions.length === 0) {
            return;
        }
        
        // Limpar configurações existentes
        this.buttonConfigs = [];
        
        // Para cada posição detectada, criar configuração do botão
        buttonPositions.forEach(buttonInfo => {
            // Subtraímos 2 para mapear do ID (2,3,4) para o índice no array de cores (0,1,2)
            const colorIndex = (buttonInfo.id - 2) % this.colors.length;
            
            this.buttonConfigs.push({
                position: buttonInfo.position,
                color: this.colors[colorIndex],
                id: buttonInfo.id
            });
        });
        
        // Inicializar os botões após configurá-los
        this.initialize();
    }

    initialize() {
        // Limpar botões existentes antes de criar novos
        this.controller.clearButtons();
        
        // Criar e configurar cada botão
        this.buttonConfigs.forEach(config => {
            const model = new ButtonModel(config.id, config.position, config.color);
            const view = new ButtonView();
            this.controller.addButton(model, view);
        });
    }

    // Define o callback para quando todos os botões forem pressionados
    onAllButtonsPressed(callback) {
        this.controller.setOnAllButtonsPressed(callback);
    }

    // Retorna todos os meshes dos botões para colisão
    getMeshes() {
        return this.controller.getMeshes();
    }

    // Reset todos os botões para estado inicial
    resetButtons() {
        this.controller.resetAllButtons();
    }
}

export default Buttons;