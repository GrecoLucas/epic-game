// Controller - Responsável pelo controle do menu de pausa
class PauseController {
    constructor(scene, pauseModel, pauseView) {
        this.scene = scene;
        this.model = pauseModel;
        this.view = pauseView;
        
        // Inicializar componentes
        this.initialize();
    }
    
    initialize() {
        // Inicializar a visualização
        this.view.initialize();
        
        // Sincronizar os valores iniciais do modelo com o PlayerView
        this.model.syncWithPlayerView();
        
        // Atualizar exibição com valores iniciais do modelo
        this.view.updateSensitivityDisplay(this.model.getSensitivity());
        this.view.updateFOVDisplay(this.model.getFieldOfView());
        
        // Configurar callbacks para os controles de UI
        this.setupCallbacks();
    }
    
    setupCallbacks() {
        // Callback para o botão de voltar ao jogo
        this.view.setResumeCallback(() => {
            this.resumeGame();
        });
        
        // Callback para o slider de sensibilidade
        this.view.setSensitivityCallback((value) => {
            this.model.setSensitivity(value);
            this.view.updateSensitivityDisplay(value);
        });
        
        // Callback para o slider de FOV
        this.view.setFOVCallback((value) => {
            this.model.setFieldOfView(value);
            this.view.updateFOVDisplay(value);
        });
    }
    
    // Alternar o estado de pausa do jogo
    togglePause() {
        const isPaused = this.model.togglePause();
        
        if (isPaused) {
            this.pauseGame();
        } else {
            this.resumeGame();
        }
        
        return isPaused;
    }
    
    // Pausar o jogo
    pauseGame() {
        // Atualizar o modelo
        this.model.pause();
        
        // Mostrar o menu de pausa
        this.view.show();
        
        // Desativar pointer lock para liberar o mouse
        this.unlockPointer();
        
        // Pausar a física e animações
        this.scene.paused = true;
        
        // Atualizar sliders com valores atuais
        this.view.updateSensitivityDisplay(this.model.getSensitivity());
        this.view.updateFOVDisplay(this.model.getFieldOfView());
    }
    
    // Retomar o jogo
    resumeGame() {
        // Atualizar o modelo
        this.model.resume();
        
        // Ocultar o menu de pausa
        this.view.hide();
        
        // Reativar pointer lock
        this.lockPointer();
        
        // Retomar a física e animações
        this.scene.paused = false;
    }
    
    // Auxiliar para bloquear o ponteiro do mouse
    lockPointer() {
        const canvas = document.getElementById("renderCanvas");
        if (canvas && canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }
    
    // Auxiliar para desbloquear o ponteiro do mouse
    unlockPointer() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }
}

export default PauseController;