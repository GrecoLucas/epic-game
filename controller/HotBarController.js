import HotbarModel from '../model/HotbarModel.js';
import HotBarView from '../view/HotBarView.js';

class HotBarController {
    constructor(scene) {
        this.scene = scene;
        this.model = new HotbarModel();
        this.view = new HotBarView(scene);
        
        // Inicializar a view
        this.view.initialize();
        
        // Configurar evento para detectar teclas numéricas
        this.setupKeyboardEvents();
    }

    // Configurar detecção de teclas numéricas
    setupKeyboardEvents() {
        if (!this.scene.actionManager) {
            this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        }
        
        // Detectar teclas numéricas pressionadas (1-9)
        this.scene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnKeyDownTrigger,
                (evt) => {
                    const key = evt.sourceEvent.key;
                    
                    // Verificar se a tecla é um número de 1 a 9
                    if (key >= '1' && key <= '9') {
                        const slotIndex = parseInt(key) - 1;
                        this.selectSlot(slotIndex);
                    }
                }
            )
        );
    }

    // Selecionar um slot específico
    selectSlot(slotIndex) {
        const weapon = this.model.selectSlot(slotIndex);
        
        // Destacar o slot na UI
        this.view.highlightSelectedSlot(slotIndex);
        
        // Se o slot tiver uma arma, equipá-la
        if (weapon) {
            this.equipWeapon(weapon);
            console.log(`Selecionado: ${weapon.model.name} no slot ${slotIndex + 1}`);
        } else {
            this.unequipCurrentWeapon();
            console.log(`Selecionado: slot vazio ${slotIndex + 1}`);
        }
        
        return weapon;
    }

    // Equipar uma arma
    equipWeapon(weapon) {
        // Primeiro guardar todas as armas atuais
        const allGuns = this.getAllWeapons();

        // Desativar todas as armas (apenas desequipar, não remover do inventário)
        allGuns.forEach(gun => {
            if (gun && gun.model) {
                gun.model.isPickedUp = false;
                gun.view.updateVisibility();
            }
        });

        // Ativar apenas a arma selecionada
        if (weapon && weapon.model) {
            weapon.model.isPickedUp = true;
            weapon.view.updateVisibility();
        }

        // Atualizar a exibição de munição
        if (this.scene.gameInstance && this.scene.gameInstance.player) {
            this.scene.gameInstance.player.updateAmmoDisplay();
        }
    }

    // Desequipar a arma atual
    unequipCurrentWeapon() {
        const currentWeapon = this.model.getSelectedWeapon();
        if (currentWeapon) {
            currentWeapon.model.isPickedUp = false;
            currentWeapon.view.updateVisibility();
        }
        
        // Atualizar a exibição de munição
        if (this.scene.gameInstance && this.scene.gameInstance.player) {
            this.scene.gameInstance.player.updateAmmoDisplay();
        }
    }

    // Adicionar uma arma à hotbar
    addWeapon(weapon) {
        // Encontrar o primeiro slot vazio
        const slotIndex = this.model.addWeaponToFirstEmptySlot(weapon);
        
        if (slotIndex !== -1) {
            // Marcar a arma como estando no inventário
            if (weapon && weapon.model) {
                weapon.model.addToInventory();
                weapon.view.updateVisibility();
            }
            
            // Atualizar o slot na UI
            this.view.updateSlot(slotIndex, weapon);
            
            // Retornar o índice do slot onde a arma foi adicionada
            return slotIndex;
        }
        
        return -1; // Não há slots vazios
    }

    // Remover uma arma da hotbar
    removeWeapon(weapon) {
        // Encontrar o slot que contém esta arma
        const weapons = this.model.slots;
        const slotIndex = weapons.findIndex(w => w === weapon);

        if (slotIndex !== -1) {
            // Remover a arma do modelo
            const removedWeapon = this.model.removeWeapon(slotIndex);

            // Marcar que a arma não está mais no inventário
            if (removedWeapon && removedWeapon.model) {
                removedWeapon.model.removeFromInventory();
                removedWeapon.view.updateVisibility();
            }

            // Atualizar o slot na UI
            this.view.updateSlot(slotIndex, null);

            // Se a arma removida era a selecionada, encontrar outra para equipar
            if (slotIndex === this.model.selectedSlotIndex) {
                // Encontrar a primeira arma disponível
                const nextWeaponIndex = weapons.findIndex(w => w !== null);
                if (nextWeaponIndex !== -1) {
                    this.selectSlot(nextWeaponIndex);
                } else {
                    // Não há mais armas, apenas mantenha o slot selecionado vazio
                    this.view.highlightSelectedSlot(this.model.selectedSlotIndex);
                    this.unequipCurrentWeapon();
                }
            }

            return true;
        }

        return false; // Arma não encontrada
    }

    // Atualizar toda a hotbar com as armas disponíveis
    updateHotbar() {
        this.view.updateAllSlots(this.model.slots);
        this.view.highlightSelectedSlot(this.model.selectedSlotIndex);
    }

    // Obter todas as armas do jogo
    getAllWeapons() {
        if (this.scene.gameInstance && this.scene.gameInstance.gunLoader) {
            return this.scene.gameInstance.gunLoader.getGuns();
        }
        return [];
    }

    // Função para inicializar a hotbar com as armas existentes
    initializeWithExistingWeapons() {
        const weapons = this.getAllWeapons();
        weapons.forEach(weapon => {
            // Verificar se já existe na hotbar
            const existingSlotIndex = this.model.getWeaponSlotIndex(weapon.model.id);
            if (existingSlotIndex === -1) {
                this.addWeapon(weapon);
            }
        });
        
        // Atualizar a visualização
        this.updateHotbar();
    }
}

export default HotBarController;