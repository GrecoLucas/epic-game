class ZombieSView {
    constructor(scene) {
        this.scene = scene;
        this.hordeInfoDisplay = null;
        this.createHordeDisplay();
    }

    createHordeDisplay() {
        // Criar um elemento de texto para exibir informações das hordas
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("zombieUI");
        
        this.hordeInfoDisplay = new BABYLON.GUI.TextBlock();
        this.hordeInfoDisplay.text = "Press H to start the horde";
        this.hordeInfoDisplay.color = "white";
        this.hordeInfoDisplay.fontSize = 20;
        this.hordeInfoDisplay.fontFamily = "Arial";
        this.hordeInfoDisplay.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.hordeInfoDisplay.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.hordeInfoDisplay.top = "10px";
        this.hordeInfoDisplay.outlineWidth = 1;
        this.hordeInfoDisplay.outlineColor = "black";
        
        advancedTexture.addControl(this.hordeInfoDisplay);
    }

    // Mostrar mensagem para iniciar horda
    showReadyToStart(hordeNumber) {
        if (this.hordeInfoDisplay) {
            this.hordeInfoDisplay.text = `Press H(2x) to start Horde-${hordeNumber} or P to pause`;
            this.hordeInfoDisplay.color = "lime";
            this.hordeInfoDisplay.fontSize = 22;
        }
    }

    // Notificar quando uma horda começa
    showHordeStarting(hordeNumber, monsterCount, health = null, speed = null) {
        if (this.hordeInfoDisplay) {
            let healthText = health ? `\nHealth: ${health}` : '';
            let speedText = speed ? `\nSpeed: ${speed.toFixed(2)}` : '';

            this.hordeInfoDisplay.text = `Horde ${hordeNumber} started!\nMonsters: ${monsterCount}${healthText}${speedText}`;
            this.hordeInfoDisplay.color = "red";
            
            // Efeito de animação (pulsar)
            const startSize = this.hordeInfoDisplay.fontSize;
            
            const animateText = () => {
                this.hordeInfoDisplay.fontSize = 26;
                setTimeout(() => {
                    this.hordeInfoDisplay.fontSize = startSize;
                }, 500);
            };
            
            animateText();
            // Reiniciar após 2 segundos
            setTimeout(animateText, 1000);
        }
    }
}

export default ZombieSView;