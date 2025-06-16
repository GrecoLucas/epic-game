// Model - Responsável pelos dados do menu de pausa
class PauseModel {
    constructor(playerView, soundManager) {
        this.isPaused = false;
        this.playerView = playerView;
        this.soundManager = soundManager;
        
        // Valores iniciais obtidos do PlayerView
        this.sensitivity = playerView ? playerView.sensitivity : 5000;
        this.fieldOfView = playerView ? playerView.fieldOfView : 1.2;
        
        // Volume inicial obtido do SoundManager
        this.volume = soundManager ? soundManager.getMasterVolume() : 0.5;
        
        // Valores mínimos e máximos para os controles deslizantes
        this.minSensitivity = 1000;  // Mais sensível
        this.maxSensitivity = 10000; // Menos sensível
        
        this.minFOV = 0.8;  // FOV mais estreito (~40 graus)
        this.maxFOV = 1.8;  // FOV mais amplo (~90 graus)
        
        this.minVolume = 0.0;  // Sem som
        this.maxVolume = 1.0;  // Volume máximo
    }
    
    // Retorna se o jogo está pausado
    isPaused() {
        return this.isPaused;
    }
    
    // Alternar o estado de pausa
    togglePause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }
    
    // Pausar o jogo
    pause() {
        this.isPaused = true;
    }
    
    // Retomar o jogo
    resume() {
        this.isPaused = false;
    }
    
    // Atualizar sensibilidade da câmera
    setSensitivity(value) {
        // Limitar aos valores mínimo e máximo
        this.sensitivity = Math.max(this.minSensitivity, 
                            Math.min(this.maxSensitivity, value));
                            
        // Atualizar no PlayerView se disponível
        if (this.playerView) {
            this.playerView.setSensitivity(this.sensitivity);
        }
        
        return this.sensitivity;
    }
    
    // Atualizar o campo de visão (FOV)
    setFieldOfView(value) {
        // Limitar aos valores mínimo e máximo
        this.fieldOfView = Math.max(this.minFOV, 
                           Math.min(this.maxFOV, value));
                           
        // Atualizar no PlayerView se disponível
        if (this.playerView) {
            this.playerView.setFieldOfView(this.fieldOfView);
        }
        
        return this.fieldOfView;
    }
    
    // Obter sensibilidade atual
    getSensitivity() {
        return this.sensitivity;
    }
      // Obter FOV atual
    getFieldOfView() {
        return this.fieldOfView;
    }
    
    // Atualizar volume do jogo
    setVolume(value) {
        // Limitar aos valores mínimo e máximo
        this.volume = Math.max(this.minVolume, 
                      Math.min(this.maxVolume, value));
                      
        // Atualizar no SoundManager se disponível
        if (this.soundManager) {
            this.soundManager.setMasterVolume(this.volume);
        }
        
        return this.volume;
    }
    
    // Obter volume atual
    getVolume() {
        return this.volume;
    }
    
    // Sincronizar valores com o playerView e soundManager
    syncWithPlayerView() {
        if (this.playerView) {
            this.sensitivity = this.playerView.getSensitivity();
            this.fieldOfView = this.playerView.getFieldOfView();
        }
        
        if (this.soundManager) {
            this.volume = this.soundManager.getMasterVolume();
        }
    }
}

export default PauseModel;