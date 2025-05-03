class HotbarModel {
    constructor() {
        this.slots = new Array(9).fill(null); // 9 slots vazios
        this.selectedSlotIndex = 0; // Slot selecionado inicialmente (1º slot)
    }

    // Adiciona uma arma a um slot específico
    addWeapon(weapon, slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.slots.length) {
            this.slots[slotIndex] = weapon;
            return true;
        }
        return false;
    }

    // Adiciona uma arma ao primeiro slot vazio disponível
    addWeaponToFirstEmptySlot(weapon) {
        const emptySlotIndex = this.slots.findIndex(slot => slot === null);
        if (emptySlotIndex !== -1) {
            this.slots[emptySlotIndex] = weapon;
            return emptySlotIndex;
        }
        return -1; // Não há slots vazios
    }

    // Remove uma arma de um slot específico
    removeWeapon(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.slots.length) {
            const weapon = this.slots[slotIndex];
            this.slots[slotIndex] = null;
            return weapon;
        }
        return null;
    }

    // Retorna a arma selecionada atualmente
    getSelectedWeapon() {
        return this.slots[this.selectedSlotIndex];
    }

    // Seleciona um slot específico
    selectSlot(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.slots.length) {
            this.selectedSlotIndex = slotIndex;
            return this.slots[slotIndex];
        }
        return null;
    }

    // Retorna o índice de uma arma específica
    getWeaponSlotIndex(weaponId) {
        return this.slots.findIndex(weapon => weapon && weapon.model.id === weaponId);
    }
}

export default HotbarModel;