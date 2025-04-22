import DoorModel from '../model/DoorModel.js';
import DoorView from '../view/DoorView.js';
import DoorController from '../controller/DoorController.js';

class Door {
    constructor(scene) {
        this.scene = scene;
        this.controller = new DoorController(scene);
        this.player = null; // Referência ao player
        // Não sobrescrever gameInstance, apenas armazenar a referência ao Door
        this.scene._doorInstance = this;
    }

    initialize(position) {
        // Inicializar a porta na posição especificada
        this.controller.initialize(position);
    }

    // Método chamado quando todos os botões forem pressionados
    openDoor() {
        this.controller.openDoor();
    }

    // Método para definir callback de vitória quando o jogador passar pela porta
    onPlayerWin(callback) {
        this.controller.setPlayerWinCallback(callback);
    }

    // Retorna todos os meshes da porta para colisão
    getMeshes() {
        return this.controller.getMeshes();
    }

    // Define o player para a detecção
    setPlayer(player) {
        this.player = player;
        // Garantir que a referência de gameInstance existe para que o controller possa acessar o player
        if (!this.scene.gameInstance) {
            console.warn("Aviso: gameInstance não está configurado na cena. A detecção de vitória pode não funcionar corretamente.");
        }
    }

    // Para o DoorController acessar o player
    getPlayer() {
        return this.player;
    }
}

export default Door;