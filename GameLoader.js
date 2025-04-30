// GameLoader.js - Responsável por carregar os diferentes modos de jogo
import Game from './main.js';
import OpenWorldGame from './world/OpenWorldGame.js';

class GameLoader {
    constructor(engine) {
        this.engine = engine;
        this.currentGame = null;
        this.canvas = document.getElementById('renderCanvas');
    }
    
    // Carregar o modo Labirinto (modo existente)
    loadMazeMode() {
        console.log("Carregando Modo Labirinto...");
        
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
            
            // Iniciar o render loop
            this.engine.runRenderLoop(() => {
                // Verificar se temos câmera antes de renderizar
                if (scene.activeCamera) {
                    scene.render();
                    // Atualizar a exibição de munição a cada frame
                    if (this.currentGame.player) {
                        this.currentGame.player.updateAmmoDisplay();
                    }
                } else {
                    console.warn("Tentativa de renderização sem câmera ativa");
                }
            });
        }).catch(error => {
            console.error("Erro ao inicializar o Modo Labirinto:", error);
        });
        
        // Ajustar ao tamanho da janela
        window.addEventListener('resize', () => this.engine.resize());
    }
    
    // Carregar o modo Mundo Aberto (novo modo)
    loadOpenWorldMode() {
        console.log("Carregando Modo Mundo Aberto...");
        
        // Criar cena
        const scene = new BABYLON.Scene(this.engine);
        scene.clearColor = new BABYLON.Color3(0.4, 0.6, 0.9); // Céu azul
        
        // Luz
        const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        
        // Luz direcional para simular o sol
        const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-1, -2, -1), scene);
        sunLight.intensity = 0.6;
        
        // Criar instância do jogo de mundo aberto
        this.currentGame = new OpenWorldGame(this.engine, scene);
        
        // Inicializar o jogo
        this.currentGame.initialize().then(() => {
            console.log("Modo Mundo Aberto inicializado com sucesso!");
            
            // Iniciar o render loop
            this.engine.runRenderLoop(() => {
                // Verificar se temos câmera antes de renderizar
                if (scene.activeCamera) {
                    scene.render();
                    // Atualizar interface do jogador
                    if (this.currentGame.player) {
                        this.currentGame.player.updateUI();
                    }
                } else {
                    console.warn("Tentativa de renderização sem câmera ativa");
                }
            });
        }).catch(error => {
            console.error("Erro ao inicializar o Modo Mundo Aberto:", error);
        });
        
        // Ajustar ao tamanho da janela
        window.addEventListener('resize', () => this.engine.resize());
    }
}

export default GameLoader;