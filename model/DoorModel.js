class DoorModel {
    constructor(position) {
        this.position = position;
        this.isOpen = false;
        this.width = 7;
        this.height = 6;
        this.depth = 1;
        this.triggeredWin = false; // Controla se o jogador já ganhou passando pela porta
    }

    getPosition() {
        return this.position;
    }

    setOpen(isOpen) {
        this.isOpen = isOpen;
    }

    isOpened() {
        return this.isOpen;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getDepth() {
        return this.depth;
    }
    
    setTriggeredWin(triggered) {
        this.triggeredWin = triggered;
    }
    
    hasTriggeredWin() {
        return this.triggeredWin;
    }
}

export default DoorModel;