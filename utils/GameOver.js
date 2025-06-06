class GameOver {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.gameOverUI = null;
        this.isVisible = false;
        this.survivalTime = 0;
        this.startTime = Date.now();
    }    
    
    createGameOverUI() {
        // Criar GUI em tela cheia
        this.gameOverUI = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("GameOverUI");

        // Container principal
        const mainContainer = new BABYLON.GUI.Rectangle();
        mainContainer.widthInPixels = 500;
        mainContainer.heightInPixels = 400;
        mainContainer.cornerRadius = 20;
        mainContainer.color = "#ffffff";
        mainContainer.thickness = 3;
        mainContainer.background = "rgba(0, 0, 0, 0.9)";
        this.gameOverUI.addControl(mainContainer);

        // Título "Game Over"
        const title = new BABYLON.GUI.TextBlock();
        title.text = "GAME OVER";
        title.color = "#ff4444";
        title.fontSize = 48;
        title.fontFamily = "Arial Black";
        title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        title.topInPixels = -120;
        mainContainer.addControl(title);

        // Container para informações básicas
        const infoContainer = new BABYLON.GUI.StackPanel();
        infoContainer.widthInPixels = 400;
        infoContainer.topInPixels = -20;
        mainContainer.addControl(infoContainer);

        // Calcular tempo de sobrevivência
        this.calculateSurvivalTime();

        // Informações básicas
        const infoTexts = [
            `Money Collected: $${this.player.money}`,
            `Survival Time: ${this.survivalTime}s`,
            `Health Remaining: ${this.player.health}/${this.player.maxHealth}`,
        ];

        infoTexts.forEach(infoText => {
            const textBlock = new BABYLON.GUI.TextBlock();
            textBlock.text = infoText;
            textBlock.color = "#ffffff";
            textBlock.fontSize = 20;
            textBlock.heightInPixels = 35;
            textBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
            infoContainer.addControl(textBlock);
        });

        // Botão "Return to Menu"
        const returnButton = BABYLON.GUI.Button.CreateSimpleButton("returnButton", "Return to Menu");
        returnButton.widthInPixels = 150;
        returnButton.heightInPixels = 50;
        returnButton.color = "#ffffff";
        returnButton.cornerRadius = 10;
        returnButton.background = "#4CAF50";
        returnButton.fontSize = 16;
        returnButton.topInPixels = 80;
        returnButton.onPointerUpObservable.add(() => {
            this.returnToMenu();
        });
        mainContainer.addControl(returnButton);

        // Efeito hover no botão Return
        returnButton.onPointerEnterObservable.add(() => {
            returnButton.background = "#45a049";
        });
        returnButton.onPointerOutObservable.add(() => {
            returnButton.background = "#4CAF50";
        });
    }

    calculateSurvivalTime() {
        // Calcular apenas o tempo de sobrevivência
        this.survivalTime = Math.floor((Date.now() - this.startTime) / 1000);
    }    
    
    show() {
        if (!this.gameOverUI) {
            this.createGameOverUI();
        }
        
        this.isVisible = true;
        this.gameOverUI.layer.isVisible = true;
        
        // Pausar o jogo
        if (this.scene.registerBeforeRender) {
            this.scene.unregisterBeforeRender();
        }
        
        console.log("Game Over screen displayed");
    }

    hide() {
        if (this.gameOverUI) {
            this.gameOverUI.layer.isVisible = false;
            this.isVisible = false;
        }
    }    

    returnToMenu() {
        console.log("Returning to menu...");
        
        // Limpar a UI do Game Over
        if (this.gameOverUI) {
            this.gameOverUI.dispose();
            this.gameOverUI = null;
        }
        
        // Limpar a cena atual
        if (this.scene) {
            this.scene.dispose();
        }

        setTimeout(() => {
            location.reload();
        }, 100);
    }

    setStartTime(time) {
        this.startTime = time;
    }

    dispose() {
        if (this.gameOverUI) {
            this.gameOverUI.dispose();
            this.gameOverUI = null;
        }
    }
}

export default GameOver;