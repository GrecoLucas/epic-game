class HotBarView {
    constructor(scene) {
        this.scene = scene;
        this.hotbarUI = null;
        this.slotElements = [];
        this.slotSize = 60; // Tamanho de cada slot em pixels
        this.hotbarGap = 4;  // Espaçamento entre slots
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        // Criar uma textura de UI fullscreen
        this.hotbarUI = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("hotbarUI");

        // Container principal para a hotbar
        this.hotbarContainer = new BABYLON.GUI.Rectangle();
        this.hotbarContainer.width = "550px";
        this.hotbarContainer.height = `${this.slotSize + 20}px`;
        this.hotbarContainer.cornerRadius = 5;
        this.hotbarContainer.color = "rgba(255, 255, 255, 0.3)";
        this.hotbarContainer.thickness = 1;
        this.hotbarContainer.background = "rgba(0, 0, 0, 0.5)";
        this.hotbarContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.hotbarContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.hotbarContainer.top = "-20px";
        this.hotbarUI.addControl(this.hotbarContainer);

        // Grid para organizar os slots horizontalmente
        this.slotsGrid = new BABYLON.GUI.Grid();
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.addColumnDefinition(1/9);
        this.slotsGrid.width = "100%";
        this.slotsGrid.height = "100%";
        this.hotbarContainer.addControl(this.slotsGrid);

        // Criar os 9 slots
        for (let i = 0; i < 9; i++) {
            // Container para cada slot
            const slotContainer = new BABYLON.GUI.Rectangle();
            slotContainer.width = `${this.slotSize}px`;
            slotContainer.height = `${this.slotSize}px`;
            slotContainer.cornerRadius = 3;
            slotContainer.color = "white";
            slotContainer.thickness = 1;
            slotContainer.background = "rgba(30, 30, 30, 0.6)";
            
            // Número do slot acima (tecla para selecionar)
            const slotNumber = new BABYLON.GUI.TextBlock();
            slotNumber.text = `${i + 1}`;
            slotNumber.color = "rgba(255, 255, 255, 0.7)";
            slotNumber.fontSize = 12;
            slotNumber.height = "15px";
            slotNumber.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
            slotNumber.top = "2px";
            slotContainer.addControl(slotNumber);
            
            // Nome da arma
            const weaponName = new BABYLON.GUI.TextBlock();
            weaponName.text = "";
            weaponName.color = "white";
            weaponName.fontSize = 14;
            weaponName.textWrapping = true;
            weaponName.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
            weaponName.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            slotContainer.addControl(weaponName);
            
            // Adicionar o slot ao grid
            this.slotsGrid.addControl(slotContainer, 0, i);
            
            // Guardar referência para usar mais tarde
            this.slotElements.push({
                container: slotContainer,
                number: slotNumber,
                weaponName: weaponName
            });
        }
        
        this.initialized = true;
    }    // Update a specific slot with weapon information
    updateSlot(slotIndex, weapon) {
        if (!this.initialized || slotIndex < 0 || slotIndex >= this.slotElements.length) return;
        
        const slot = this.slotElements[slotIndex];
        
        if (weapon) {
            // Display the truncated/abbreviated weapon name to fit in the slot
            const displayName = this.abbreviateWeaponName(weapon.model.name || "Weapon");
            slot.weaponName.text = displayName;
            slot.container.alpha = 1;
        } else {
            slot.weaponName.text = "";
            slot.container.alpha = 0.5; // Slot vazio fica mais transparente
        }
    }

    // Destaca o slot selecionado
    highlightSelectedSlot(slotIndex) {
        if (!this.initialized) return;
        
        // Resetar todos os slots para o visual padrão
        this.slotElements.forEach((slot, index) => {
            slot.container.background = "rgba(30, 30, 30, 0.6)";
            slot.container.thickness = 1;
            
            // Se tiver uma arma, ajustar a opacidade
            const hasWeapon = slot.weaponName.text !== "";
            slot.container.alpha = hasWeapon ? 1 : 0.5;
        });
        
        // Destacar o slot selecionado
        if (slotIndex >= 0 && slotIndex < this.slotElements.length) {
            const selectedSlot = this.slotElements[slotIndex];
            selectedSlot.container.background = "rgba(60, 60, 100, 0.8)";
            selectedSlot.container.thickness = 2;
            selectedSlot.container.color = "#66aaff";
        }
    }

    // Abreviar nomes longos de armas para caber no slot
    abbreviateWeaponName(name) {
        if (name.length <= 10) return name;
        
        // Abreviar nomes longos
        const words = name.split(' ');
        if (words.length > 1) {
            return words.map(word => word.charAt(0)).join('');
        }
        
        return name.substring(0, 8) + "...";
    }

    // Atualizar toda a hotbar
    updateAllSlots(weaponSlots) {
        if (!this.initialized) return;
        
        weaponSlots.forEach((weapon, index) => {
            this.updateSlot(index, weapon);
        });
    }
}

export default HotBarView;