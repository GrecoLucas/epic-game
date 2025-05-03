import HotBarController from '../controller/HotBarController.js';

class HotBar {
    constructor(scene) {
        this.scene = scene;
        this.controller = new HotBarController(scene);
    }

    // Inicializar hotbar com armas existentes
    initialize() {
        this.controller.initializeWithExistingWeapons();
    }

    // Adicionar uma arma à hotbar
    addWeapon(weapon) {
        return this.controller.addWeapon(weapon);
    }

    // Remover uma arma da hotbar
    removeWeapon(weapon) {
        return this.controller.removeWeapon(weapon);
    }

    // Obter a arma atualmente selecionada
    getSelectedWeapon() {
        return this.controller.model.getSelectedWeapon();
    }
}

export default HotBar;