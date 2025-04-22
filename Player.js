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
        
        // Inicializar barra de vida
        this.initializeHealthUI();
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
    
    // Inicializar a interface de saúde
    initializeHealthUI() {
        // Criar GUI para a interface do jogador
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("playerUI");
        
        // Criar painel para a barra de vida no canto superior esquerdo
        const healthPanel = new BABYLON.GUI.StackPanel();
        healthPanel.width = "200px";
        healthPanel.height = "60px";
        healthPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        healthPanel.paddingLeft = "10px";
        healthPanel.paddingTop = "10px";
        advancedTexture.addControl(healthPanel);
        
        // Texto para mostrar "Vida:"
        const healthText = new BABYLON.GUI.TextBlock();
        healthText.text = "Vida:";
        healthText.height = "20px";
        healthText.color = "white";
        healthText.fontSize = 16;
        healthPanel.addControl(healthText);
        
        // Barra de vida
        this.healthBar = new BABYLON.GUI.Rectangle();
        this.healthBar.width = "180px";
        this.healthBar.height = "20px";
        this.healthBar.cornerRadius = 5;
        this.healthBar.color = "white";
        this.healthBar.thickness = 1;
        this.healthBar.background = "green";
        healthPanel.addControl(this.healthBar);
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
}

export default Player;