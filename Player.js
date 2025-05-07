import PlayerModel from './model/PlayerModel.js';
import PlayerView from './view/PlayerView.js';
import PlayerController from './controller/PlayerController.js';

class Player {
    constructor(scene) {
        this.scene = scene;
        this.model = new PlayerModel(scene);
        this.view = new PlayerView(scene);
        this.controller = new PlayerController(scene, this.model, this.view);
        
        // Adicionar atributos de saúde
        this.health = 100;
        this.maxHealth = 100;
        this.healthBar = null;
        this.ammoText = null; // Add property for ammo text
        
        // Sistema monetário
        this.money = 1000;
        this.moneyText = null;
        
        // Inicializar barra de vida e munição
        this.initializePlayerUI(); // Rename method
    }
    
    initialize(canvas) {
        this.view.attachCameraControl(canvas);
    }
    
    setPosition(position) {
        this.model.setPosition(position);
    }
    
    getCamera() {
        return this.view.getCamera();
    }
    
    getMesh() {
        return this.model.getMesh();
    }
    
    getPosition() {
        return this.model.getPosition();
    }
    
    // Método para o jogador receber dano
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Atualizar barra de vida
        this.updateHealthBar();
        
        // Verificar se o jogador morreu
        if (this.health <= 0) {
            this.die();
        }
        
        return this.health;
    }
    // Adicionar à classe Player
    updateUI() {
        // Atualizar a exibição de munição se disponível
        if (typeof this.updateAmmoDisplay === 'function') {
            this.updateAmmoDisplay();
        }
        
        // Atualizar a barra de vida se disponível
        if (typeof this.updateHealthBar === 'function') {
            this.updateHealthBar();
        }
        
        // Atualizar a exibição de dinheiro se disponível
        if (typeof this.updateMoneyDisplay === 'function') {
            this.updateMoneyDisplay();
        }
}
    // Método para curar o jogador
    heal() {
        this.health = this.maxHealth;
        
        // Atualizar barra de vida
        this.updateHealthBar();
        
        return this.health;
    }
    
    // Método para lidar com a morte do jogador
    die() {
        // Mostrar mensagem de morte
        setTimeout(() => {
            alert("Você foi derrotado pelo monstro! O jogo será reiniciado.");
            location.reload(); // Recarregar a página para reiniciar o jogo
        }, 500);
    }
    
    // Inicializar a interface de saúde e munição
    initializePlayerUI() { // Rename method
        // Criar GUI para a interface do jogador
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("playerUI");
        
        // Criar painel para a barra de vida e munição no canto superior esquerdo
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = "200px";
        panel.height = "120px"; // Aumentado para acomodar a linha de dinheiro
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        panel.paddingLeft = "10px";
        panel.paddingTop = "10px";
        advancedTexture.addControl(panel);

        // Linha para Vida
        const healthRow = new BABYLON.GUI.StackPanel();
        healthRow.isVertical = false;
        healthRow.height = "30px";
        healthRow.paddingBottom = "5px";
        panel.addControl(healthRow);

        // Texto "Vida:"
        const healthText = new BABYLON.GUI.TextBlock();
        healthText.text = "Health:";
        healthText.width = "50px";
        healthText.height = "20px";
        healthText.color = "white";
        healthText.fontSize = 16;
        healthText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthRow.addControl(healthText);

        // Container da barra de vida (moldura)
        this.healthBarContainer = new BABYLON.GUI.Rectangle();
        this.healthBarContainer.width = "120px";
        this.healthBarContainer.height = "20px";
        this.healthBarContainer.cornerRadius = 5;
        this.healthBarContainer.color = "white";
        this.healthBarContainer.thickness = 1;
        this.healthBarContainer.background = "black";
        this.healthBarContainer.paddingLeft = "10px";
        healthRow.addControl(this.healthBarContainer);
        
        // Barra de vida interna (preenchimento)
        this.healthBar = new BABYLON.GUI.Rectangle();
        this.healthBar.width = "100%";
        this.healthBar.height = "100%";
        this.healthBar.cornerRadius = 4;
        this.healthBar.color = "transparent";
        this.healthBar.background = "green";
        this.healthBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.healthBar.left = 0;
        this.healthBarContainer.addControl(this.healthBar);

        // Linha para Munição
        const ammoRow = new BABYLON.GUI.StackPanel();
        ammoRow.isVertical = false;
        ammoRow.height = "30px";
        ammoRow.paddingBottom = "5px";
        panel.addControl(ammoRow);

        // Texto "Munição:"
        this.ammoText = new BABYLON.GUI.TextBlock();
        this.ammoText.text = "Munição: - / -";
        this.ammoText.width = "180px";
        this.ammoText.height = "20px";
        this.ammoText.color = "white";
        this.ammoText.fontSize = 16;
        this.ammoText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        ammoRow.addControl(this.ammoText);
        
        // Linha para Dinheiro
        const moneyRow = new BABYLON.GUI.StackPanel();
        moneyRow.isVertical = false;
        moneyRow.height = "30px";
        panel.addControl(moneyRow);
        
        // Ícone de dinheiro (símbolo $)
        const moneyIcon = new BABYLON.GUI.TextBlock();
        moneyIcon.text = "$";
        moneyIcon.width = "20px";
        moneyIcon.height = "20px";
        moneyIcon.color = "gold";
        moneyIcon.fontSize = 18;
        moneyIcon.fontWeight = "bold";
        moneyIcon.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        moneyRow.addControl(moneyIcon);
        
        // Texto de dinheiro
        this.moneyText = new BABYLON.GUI.TextBlock();
        this.moneyText.text = "0";
        this.moneyText.width = "150px";
        this.moneyText.height = "20px";
        this.moneyText.color = "gold";
        this.moneyText.fontSize = 16;
        this.moneyText.paddingLeft = "5px";
        this.moneyText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        moneyRow.addControl(this.moneyText);
        
        // Inicializar a exibição de dinheiro
        this.updateMoneyDisplay();
        
        // Atualizar a barra de vida com o valor inicial
        this.updateHealthBar();
    }
    
    // Atualizar a barra de vida
    updateHealthBar() {
        if (!this.healthBar || !this.healthBarContainer) return;
        
        // Calcular a porcentagem de vida
        const healthPercent = this.health / this.maxHealth;
        
        // Definir a width para uma porcentagem baseada na quantidade de vida
        this.healthBar.width = (healthPercent * 100) + "%";
        
        // Mudar cor baseado na quantidade de vida
        if (healthPercent > 0.7) {
            this.healthBar.background = "green";
        } else if (healthPercent > 0.3) {
            this.healthBar.background = "yellow";
        } else {
            this.healthBar.background = "red";
        }
    }
    
    // Atualizar a exibição de munição
    updateAmmoDisplay() {
        if (!this.ammoText) return;
        
        // Get the equipped gun using the correct method from the scene's gunLoader
        let equippedGun = null;
        if (this.scene.gameInstance && this.scene.gameInstance.gunLoader) {
            equippedGun = this.scene.gameInstance.gunLoader.getPlayerGun();
        }
        
        if (equippedGun) {
            const currentAmmo = equippedGun.model.ammo;
            const maxAmmo = equippedGun.model.maxAmmo;
            const totalAmmo = equippedGun.model.getTotalAmmo();
            this.ammoText.text = `Munição: ${currentAmmo}/${maxAmmo} ${totalAmmo}`;
            this.ammoText.isVisible = true;
        } else {
            this.ammoText.text = "Munição: - / - -";
            this.ammoText.isVisible = false; 
        }
    }
    
    // Atualizar exibição de dinheiro
    updateMoneyDisplay() {
        if (!this.moneyText) return;
        this.moneyText.text = String(this.money);
    }
    
    // Adicionar dinheiro ao jogador
    addMoney(amount) {
        this.money += amount;
        this.updateMoneyDisplay();
        
        // Efeito visual de moeda adicionada
        this.showMoneyEffect();
        
        return this.money;
    }
    
    // Efeito visual quando ganha dinheiro
    showMoneyEffect() {
        if (!this.moneyText) return;
        
        // Salvar estado original
        const originalColor = this.moneyText.color;
        const originalSize = this.moneyText.fontSize;
        
        // Efeito de destaque
        this.moneyText.color = "white";
        this.moneyText.fontSize = originalSize * 1.3;
        
        // Retornar ao normal após um tempo
        setTimeout(() => {
            this.moneyText.color = originalColor;
            this.moneyText.fontSize = originalSize;
        }, 300);
    }
}

export default Player;