// GameLoader.js - Responsável por carregar o modo de jogo
import Game from './main.js';

class GameLoader {
    constructor(engine) {
        this.engine = engine;
        this.currentGame = null;
        this.canvas = document.getElementById('renderCanvas');
        this.renderLoopRunning = false;
    }
    
    // Carregar o modo Labirinto
    loadMazeMode() {
        console.log("Carregando Modo Labirinto...");
        
        try {
            // Parar qualquer render loop anterior
            if (this.renderLoopRunning && this.engine) {
                this.engine.stopRenderLoop();
                this.renderLoopRunning = false;
            }
            
            // Criar uma nova instância do engine se necessário
            if (!this.engine || this.engine.isDisposed) {
                this.engine = new BABYLON.Engine(this.canvas, true);
            }
            
            // Criar cena
            const scene = new BABYLON.Scene(this.engine);
            scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            // Luz
            const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
            light.intensity = 0.7;
            
            // Criar instância do jogo
            this.currentGame = new Game(this.engine, scene);
            
            // Inicializar o jogo
            this.currentGame.initialize().then(() => {
                console.log("Modo Labirinto inicializado com sucesso!");
                
                // Verificar se ainda temos um engine válido antes de iniciar o render loop
                if (this.engine && !this.engine.isDisposed) {
                    this.renderLoopRunning = true;
                    
                    // Iniciar o render loop
                    this.engine.runRenderLoop(() => {
                        try {
                            // Verificar se temos câmera antes de renderizar
                            if (scene && !scene.isDisposed && scene.activeCamera) {
                                scene.render();
                                // Atualizar a exibição de munição a cada frame
                                if (this.currentGame && this.currentGame.player) {
                                    this.currentGame.player.updateAmmoDisplay();
                                }
                            }
                        } catch (error) {
                            console.error("Erro no render loop:", error);
                            this.engine.stopRenderLoop();
                            this.renderLoopRunning = false;
                        }
                    });
                }
                
            }).catch(error => {
                console.error("Erro ao inicializar o Modo Labirinto:", error);
            });
            
            // Ajustar ao tamanho da janela
            const resizeHandler = () => {
                if (this.engine && !this.engine.isDisposed) {
                    this.engine.resize();
                }
            };
            
            // Remover event listener anterior se existir
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = resizeHandler;
            window.addEventListener('resize', this.resizeHandler);
            
        } catch (error) {
            console.error("Erro ao carregar o modo labirinto:", error);
        }
    }
    
    // Método para limpar recursos
    dispose() {
        try {
            if (this.renderLoopRunning && this.engine) {
                this.engine.stopRenderLoop();
                this.renderLoopRunning = false;
            }
            
            if (this.currentGame) {
                this.currentGame.dispose();
                this.currentGame = null;
            }
            
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
                this.resizeHandler = null;
            }
            
            if (this.engine && !this.engine.isDisposed) {
                this.engine.dispose();
            }
            
            this.engine = null;
        } catch (error) {
            console.error("Erro ao limpar recursos do GameLoader:", error);
        }
    }
}

export default GameLoader;