// Controller - Responsável pelo controle e lógica da construção
import BlockController from './BlocksController/BlockController.js';
import RampController from './BlocksController/RampController.js';
import BarricadeController from './BlocksController/BarricadeController.js';
import TurretController from './BlocksController/TurretController.js';
import Wired_FenceController from './BlocksController/Wired_FenceController.js';

class BuildingController {
    constructor(scene, camera, collisionSystem, mazeView, mazeModel) {
        this.scene = scene;
        this.camera = camera;
        this.collisionSystem = collisionSystem;
        this.mazeView = mazeView;
        this.mazeModel = mazeModel;

        this.isEnabled = false;
        this.selectedItem = 'wall';
        this.placementDistance = 5;
        
        // Access cellSize from the model
        this.cellSize = this.mazeModel?.cellSize || 4;
        // Access wallHeight via mazeView
        this.wallHeight = this.mazeView?.wallMaterial?.wallHeight || 4;        // Initialize specialized controllers
        this.blockController = new BlockController(scene, camera, collisionSystem, mazeView, mazeModel);
        this.rampController = new RampController(scene, camera, collisionSystem, mazeView, mazeModel);
        this.barricadeController = new BarricadeController(scene, camera, collisionSystem, mazeView, mazeModel);
        this.turretController = new TurretController(scene, camera, collisionSystem, mazeView, mazeModel);
        this.wiredFenceController = new Wired_FenceController(scene, camera, collisionSystem, mazeView, mazeModel);        // Sistema de materiais disponíveis
        this.availableMaterials = {
            wall: 0,
            ramp: 0,
            barricade: 0,
            turret: 0,
            wiredFence: 0
        };

        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        
        // Mover a lógica de rotação para o rampController
        this.rampDirection = 'east';

        // Interface do modo de construção
        this.buildModeUI = null;
        this._createBuildModeUI();

        console.log("BuildingController initialized successfully.");
    }

    // Criar a interface do modo de construção
    _createBuildModeUI() {
        // Criar uma UI fullscreen para mostrar informações do modo de construção
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("buildModeUI");
        
        // Criar um painel para o lado esquerdo da tela
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = "580px";
        panel.height = "300px";
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        panel.paddingLeft = "20px";
        panel.paddingTop = "100px";
        panel.isVisible = false; // Inicialmente invisível
        advancedTexture.addControl(panel);
        
        // Fundo do painel (retângulo semi-transparente)
        const background = new BABYLON.GUI.Rectangle();
        background.width = "100%";
        background.height = "190px";
        background.cornerRadius = 10;
        background.color = "white";
        background.thickness = 2;
        background.background = "black";
        background.alpha = 0.7;
        panel.addControl(background);
        
        // Criando um container para organizar os elementos verticalmente
        const contentContainer = new BABYLON.GUI.StackPanel();
        contentContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        contentContainer.paddingTop = "10px";
        background.addControl(contentContainer);
          // Construction Mode Title
        const titleText = new BABYLON.GUI.TextBlock();
        titleText.text = "BUILD MODE (press B)";
        titleText.color = "white";
        titleText.fontSize = 20;
        titleText.height = "30px";
        contentContainer.addControl(titleText);
        
        // Painel de informações de materiais
        const materialsPanel = new BABYLON.GUI.StackPanel();
        materialsPanel.isVertical = false;
        materialsPanel.height = "40px";
        materialsPanel.paddingTop = "10px";
        contentContainer.addControl(materialsPanel);
          // Text for blocks
        const wallText = new BABYLON.GUI.TextBlock();
        wallText.text = "Blocks: 0";
        wallText.color = "white";
        wallText.fontSize = 16;
        wallText.width = "150px";
        wallText.paddingLeft = "30px";
        wallText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        materialsPanel.addControl(wallText);
          // Text for ramps
        const rampText = new BABYLON.GUI.TextBlock();
        rampText.text = "Ramps: 0";
        rampText.color = "white";
        rampText.fontSize = 16;
        rampText.width = "150px";
        rampText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        materialsPanel.addControl(rampText);        // Text for barricades
        const barricadeText = new BABYLON.GUI.TextBlock();
        barricadeText.text = "Barricades: 0";
        barricadeText.color = "white";
        barricadeText.fontSize = 16;
        barricadeText.width = "150px";
        barricadeText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        materialsPanel.addControl(barricadeText);        // Text for turrets
        const turretText = new BABYLON.GUI.TextBlock();
        turretText.text = "Turrets: 0";
        turretText.color = "white";
        turretText.fontSize = 16;
        turretText.width = "150px";
        turretText.paddingLeft = "30px";
        turretText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        materialsPanel.addControl(turretText);

        // Second row for materials
        const materialsPanel2 = new BABYLON.GUI.StackPanel();
        materialsPanel2.isVertical = false;
        materialsPanel2.height = "40px";
        materialsPanel2.paddingTop = "5px";
        contentContainer.addControl(materialsPanel2);

        // Text for wired fences
        const wiredFenceText = new BABYLON.GUI.TextBlock();
        wiredFenceText.text = "W.Fences: 0";
        wiredFenceText.color = "white";
        wiredFenceText.fontSize = 16;
        wiredFenceText.width = "150px";
        wiredFenceText.paddingLeft = "30px";
        wiredFenceText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        materialsPanel2.addControl(wiredFenceText);

        // Control tips (at the bottom)
        const controlsText = new BABYLON.GUI.TextBlock();
        controlsText.text = "1: Block | 2: Ramp | 3: Barricade | 4: Turret | 5: W.Fence";
        controlsText.color = "yellow";
        controlsText.fontSize = 14;
        controlsText.height = "30px";
        controlsText.paddingTop = "15px";
        contentContainer.addControl(controlsText);// Bottom line
        const constolsText2 = new BABYLON.GUI.TextBlock();
        constolsText2.text = "R: Rotate | B: Build Mode | F: Collect";
        constolsText2.color = "yellow";
        constolsText2.fontSize = 14;
        constolsText2.height = "30px";
        constolsText2.paddingTop = "15px";
        contentContainer.addControl(constolsText2);
          // Hammer
        const constolsText3 = new BABYLON.GUI.TextBlock();
        constolsText3.text = "Use hammer to repair";
        constolsText3.color = "yellow";
        constolsText3.fontSize = 14;
        constolsText3.height = "30px";
        constolsText3.paddingTop = "15px";
        contentContainer.addControl(constolsText3);
          // Armazenar referências para atualização
        this.buildModeUI = {
            panel: panel,
            wallText: wallText,
            rampText: rampText,
            barricadeText: barricadeText,
            turretText: turretText,
            wiredFenceText: wiredFenceText
        };
    }
      // Adicionar materiais ao inventário do jogador
    addMaterials(wallCount, rampCount, barricadeCount, turretCount = 0, wiredFenceCount = 0) {
        this.availableMaterials.wall += wallCount;
        this.availableMaterials.ramp += rampCount;
        this.availableMaterials.barricade += barricadeCount;
        this.availableMaterials.turret += turretCount;
        this.availableMaterials.wiredFence += wiredFenceCount;
        this._updateBuildModeUI();
    }      
    
    // Update the building mode UI
    _updateBuildModeUI() {
        if (!this.buildModeUI) return;
        
        // Update texts with current counts
        this.buildModeUI.wallText.text = `Blocks: ${this.availableMaterials.wall}`;
        this.buildModeUI.rampText.text = `Ramps: ${this.availableMaterials.ramp}`;
        this.buildModeUI.barricadeText.text = `Barricades: ${this.availableMaterials.barricade}`;
        this.buildModeUI.turretText.text = `Turrets: ${this.availableMaterials.turret}`;
        this.buildModeUI.wiredFenceText.text = `W.Fences: ${this.availableMaterials.wiredFence}`;
        
        // Atualizar visibilidade da UI
        this.buildModeUI.panel.isVisible = this.isEnabled;
    }

    enable() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        console.log("Build Mode Enabled. Selected:", this.selectedItem);
        this._updateBuildModeUI();
    }

    disable() {
        if (!this.isEnabled) return;
        this.isEnabled = false;
          // Limpar recursos de visualização do preview
        if (this.selectedItem === 'wall') {
            this.blockController.dispose();
        } else if (this.selectedItem === 'ramp') {
            this.rampController.dispose();
        } else if (this.selectedItem === 'barricade') {
            this.barricadeController.dispose();
        } else if (this.selectedItem === 'turret') {
            this.turretController.dispose();
        } else if (this.selectedItem === 'wiredFence') {
            this.wiredFenceController.dispose();
        }
        
        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        console.log("Build Mode Disabled.");
        this._updateBuildModeUI();
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }    setSelectedItem(itemType) {
        if (!this.isEnabled || !['wall', 'ramp', 'barricade', 'turret', 'wiredFence'].includes(itemType)) return;
        if (this.selectedItem !== itemType) {
            // Limpar preview anterior
            if (this.selectedItem === 'wall') {
                this.blockController.dispose();
            } else if (this.selectedItem === 'ramp') {
                this.rampController.dispose();
            } else if (this.selectedItem === 'barricade') {
                this.barricadeController.dispose();
            } else if (this.selectedItem === 'turret') {
                this.turretController.dispose();
            } else if (this.selectedItem === 'wiredFence') {
                this.wiredFenceController.dispose();
            }
            
            this.selectedItem = itemType;
            console.log("Selected build item:", this.selectedItem);
        }
    }

    // Chamado a cada frame quando o modo de construção está ativo
    update() {
        if (!this.isEnabled || !this.camera) return;

        // Criar um ray a partir do centro da tela (crosshair)
        const ray = this.scene.createPickingRay(
            this.scene.getEngine().getRenderWidth() / 2,
            this.scene.getEngine().getRenderHeight() / 2,
            BABYLON.Matrix.Identity(),
            this.camera
        );
        
        // Delegar a lógica para o controlador específico
        if (this.selectedItem === 'wall') {
            this.currentPlacementPosition = this.blockController.getPlacementPosition(ray);
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.blockController.isValidPlacement(this.currentPlacementPosition);
                this.blockController.updatePreviewMesh(this.currentPlacementPosition, this.currentPlacementValid);
            }
        } else if (this.selectedItem === 'ramp') {
            this.currentPlacementPosition = this.rampController.getPlacementPosition(ray);
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.rampController.isValidPlacement(this.currentPlacementPosition);
                this.rampController.updatePreviewMesh(this.currentPlacementPosition, this.currentPlacementValid);
            }
        } else if (this.selectedItem === 'barricade') {
            this.currentPlacementPosition = this.barricadeController.getPlacementPosition(ray);
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.barricadeController.isValidPlacement(this.currentPlacementPosition);
                this.barricadeController.updatePreviewMesh(this.currentPlacementPosition, this.currentPlacementValid);
            }        } else if (this.selectedItem === 'turret') {
            this.currentPlacementPosition = this.turretController.getPlacementPosition(ray);
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.turretController.isValidPlacement(this.currentPlacementPosition);
                this.turretController.updatePreviewMesh(this.currentPlacementPosition, this.currentPlacementValid);
            }
        } else if (this.selectedItem === 'wiredFence') {
            this.currentPlacementPosition = this.wiredFenceController.getPlacementPosition(ray);
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.wiredFenceController.isValidPlacement(this.currentPlacementPosition);
                this.wiredFenceController.updatePreviewMesh(this.currentPlacementPosition, this.currentPlacementValid);
            }
        }
    }

    // Tenta colocar o item selecionado na posição atual do preview
    placeItem() {
        if (!this.isEnabled || !this.currentPlacementValid || !this.currentPlacementPosition) {
            console.log("Cannot place item: Invalid position or not in build mode.");
            return false;
        }
        
        // Verificar se o jogador tem materiais suficientes
        if (this.selectedItem === 'wall' && this.availableMaterials.wall <= 0) {
            console.log("No blocks available!");
            this._showNotification("No blocks available!", "red");
            return false;
        }
        
        if (this.selectedItem === 'ramp' && this.availableMaterials.ramp <= 0) {
            console.log("No ramps available!");
            this._showNotification("No ramps available!", "red");
            return false;
        }

        if (this.selectedItem === 'barricade' && this.availableMaterials.barricade <= 0) {
            console.log("No barricades available!");
            this._showNotification("No barricades available!", "red");
            return false;
        }        if (this.selectedItem === 'turret' && this.availableMaterials.turret <= 0) {
            console.log("No turrets available!");
            this._showNotification("No turrets available!", "red");
            return false;
        }

        if (this.selectedItem === 'wiredFence' && this.availableMaterials.wiredFence <= 0) {
            console.log("No wired fences available!");
            this._showNotification("No wired fences available!", "red");
            return false;
        }
        
        let success = false;
        
        // Delegar a criação do item para o controlador específico
        if (this.selectedItem === 'wall') {
            success = this.blockController.placeBlock(this.currentPlacementPosition, 100);
        } else if (this.selectedItem === 'ramp') {
            success = this.rampController.placeRamp(this.currentPlacementPosition, 150);
        } else if (this.selectedItem === 'barricade') {
            success = this.barricadeController.placeBarricade(this.currentPlacementPosition, 50);        } else if (this.selectedItem === 'turret') {
            success = this.turretController.placeTurret(this.currentPlacementPosition, 150);
        } else if (this.selectedItem === 'wiredFence') {
            success = this.wiredFenceController.placeWiredFence(this.currentPlacementPosition, 75);
        }
        
        if (success) {
            // Consumir o material do inventário
            if (this.selectedItem === 'wall') {
                this.availableMaterials.wall--;
            } else if (this.selectedItem === 'ramp') {
                this.availableMaterials.ramp--;
            } else if (this.selectedItem === 'barricade') {
                this.availableMaterials.barricade--;            } else if (this.selectedItem === 'turret') {
                this.availableMaterials.turret--;
            } else if (this.selectedItem === 'wiredFence') {
                this.availableMaterials.wiredFence--;
            }
            
            // Atualizar a UI
            this._updateBuildModeUI();
              // Mostrar notificação de sucesso
            const itemName = this.selectedItem === 'wall' ? 'Bloco' : 
                            this.selectedItem === 'ramp' ? 'Rampa' : 
                            this.selectedItem === 'barricade' ? 'Barricada' : 
                            this.selectedItem === 'turret' ? 'Torreta' : 'Cerca de Arame';
            this._showNotification(`${itemName} built!`, "green");

            if (this.scene.gameInstance?.soundManager) {
                this.scene.gameInstance.soundManager.playPlayerSound('place_block');
            }
            return true;
        } else {
            console.error("Failed to create build item mesh.");
            return false;
        }
    }
    
    // Mostrar notificação temporária
    _showNotification(message, color = "white") {
        // Criar uma notificação na tela
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("buildNotificationUI", true);
        
        // Criar um retângulo para o fundo
        const rect = new BABYLON.GUI.Rectangle();
        rect.width = "300px";
        rect.height = "50px";
        rect.cornerRadius = 10;
        rect.color = "white";
        rect.thickness = 1;
        rect.background = color === "red" ? "darkred" : (color === "green" ? "darkgreen" : "black");
        rect.alpha = 0.8;
        rect.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        rect.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        rect.top = "100px";
        advancedTexture.addControl(rect);
        
        // Criar o texto da notificação
        const text = new BABYLON.GUI.TextBlock();
        text.text = message;
        text.color = "white";
        text.fontSize = 18;
        rect.addControl(text);
        
        // Animar a notificação (fade in/out)
        rect.alpha = 0;
        let alpha = 0;
        
        // Animação de fade in
        const fadeInInterval = setInterval(() => {
            alpha += 0.1;
            rect.alpha = alpha;
            
            if (alpha >= 0.8) {
                clearInterval(fadeInInterval);
                
                // Manter visível por um tempo
                setTimeout(() => {
                    // Animação de fade out
                    const fadeOutInterval = setInterval(() => {
                        alpha -= 0.1;
                        rect.alpha = alpha;
                        
                        if (alpha <= 0) {
                            clearInterval(fadeOutInterval);
                            advancedTexture.dispose();
                        }
                    }, 50);
                }, 2000);
            }
        }, 50);
    }

    // Método para rotacionar a rampa
    rotatePreview(clockwise = true) {
        if (!this.isEnabled) return;
        
        if (this.selectedItem === 'ramp') {
            this.rampController.rotatePreview(clockwise);
            
            // Re-validar posicionamento após a rotação
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.rampController.isValidPlacement(this.currentPlacementPosition);
            }
        } else if (this.selectedItem === 'barricade') {
            this.barricadeController.rotatePreview(clockwise);
            
            // Re-validar posicionamento após a rotação
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.barricadeController.isValidPlacement(this.currentPlacementPosition);
            }        } else if (this.selectedItem === 'turret') {
            this.turretController.rotatePreview(clockwise);
            
            // Re-validar posicionamento após a rotação
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.turretController.isValidPlacement(this.currentPlacementPosition);
            }
        } else if (this.selectedItem === 'wiredFence') {
            this.wiredFenceController.rotatePreview(clockwise);
            
            // Re-validar posicionamento após a rotação
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this.wiredFenceController.isValidPlacement(this.currentPlacementPosition);
            }
        }
    }
}

export default BuildingController;