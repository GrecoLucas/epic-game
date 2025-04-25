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
        this.health = Math.max(0, this.health - amount * 4);
        
        // Atualizar barra de vida
        this.updateHealthBar();
        
        // Verificar se o jogador morreu
        if (this.health <= 0) {
            this.die();
        }
        
        return this.health;
    }
    
    // Método para curar o jogador
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        
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
        panel.height = "80px";
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
        healthText.text = "Vida:";
        healthText.width = "50px";
        healthText.height = "20px";
        healthText.color = "white";
        healthText.fontSize = 16;
        healthText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthRow.addControl(healthText);

        // Barra de vida
        this.healthBar = new BABYLON.GUI.Rectangle();
        this.healthBar.width = "120px";
        this.healthBar.height = "20px";
        this.healthBar.cornerRadius = 5;
        this.healthBar.color = "white";
        this.healthBar.thickness = 1;
        this.healthBar.background = "green";
        this.healthBar.paddingLeft = "10px";
        healthRow.addControl(this.healthBar);

        // Linha para Munição
        const ammoRow = new BABYLON.GUI.StackPanel();
        ammoRow.isVertical = false;
        ammoRow.height = "30px";
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
    }
    
    // Atualizar a barra de vida
    updateHealthBar() {
        if (!this.healthBar) return;
        
        // Atualizar o tamanho da barra de acordo com a porcentagem de vida
        const healthPercent = this.health / this.maxHealth;
        this.healthBar.width = (180 * healthPercent) + "px";
        
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
        
        const equippedGun = this.controller.getPlayerEquippedGun();
        
        if (equippedGun) {
            const currentAmmo = equippedGun.model.ammo;
            const maxAmmo = equippedGun.model.maxAmmo;
            this.ammoText.text = `Munição: ${currentAmmo} / ${maxAmmo}`;
            this.ammoText.isVisible = true;
        } else {
            this.ammoText.text = "Munição: - / -";
            // Optionally hide if no gun is equipped
            // this.ammoText.isVisible = false; 
        }
    }
}

export default Player;