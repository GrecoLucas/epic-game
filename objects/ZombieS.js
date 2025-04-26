import ZombieSController from '../controller/ZombieSController.js';

class ZombieS {
    constructor(scene, game) {
        this.controller = new ZombieSController(scene, game, this);
    }

    initialize() {
        return this.controller.initialize();
    }

    startHordeSystem() {
        this.controller.startHordeSystem();
    }

    stopHordeSystem() {
        this.controller.stopHordeSystem();
    }

    getTimeToNextHorde() {
        return this.controller.getTimeToNextHorde();
    }

    getCurrentHorde() {
        return this.controller.getCurrentHorde();
    }
}

export default ZombieS;