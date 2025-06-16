// Objeto Pause - Responsável por criar e conectar os componentes do menu de pausa
import PauseModel from '../model/PauseModel.js';
import PauseView from '../view/PauseView.js';
import PauseController from '../controller/PauseController.js';

class Pause {
    constructor(scene, playerView, soundManager) {
        this.scene = scene;
        
        // Criar model
        this.model = new PauseModel(playerView, soundManager);
        
        // Criar view
        this.view = new PauseView(scene);
        
        // Criar controller
        this.controller = new PauseController(scene, this.model, this.view);
    }
    
    // Alternar o estado de pausa
    togglePause() {
        return this.controller.togglePause();
    }
    
    // Verificar se está pausado
    isPaused() {
        return this.model.isPaused;
    }
    
    // Obter o controlador
    getController() {
        return this.controller;
    }
}

export default Pause;