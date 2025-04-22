import DoorModel from '../model/DoorModel.js';
import DoorView from '../view/DoorView.js';

class DoorController {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.view = null;
        this.playerWinCallback = null;
        this.meshes = [];
        this.isInitialized = false;
        this.victoryDetectionActive = false;
        this.victoryVolume = null;
        this.victoryDetectionObserver = null;
        this.doorOpenTime = 0; // Novo: momento em que a porta foi aberta
    }

    initialize(position) {
        // Criar modelo
        this.model = new DoorModel(position);
        
        // Criar visualização
        this.view = new DoorView();
        
        // Criar meshes associadas à porta
        this.meshes = this.view.createMeshes(this.scene, this.model);
        
        this.isInitialized = true;
    }
    
    getPlayer() {
        // Obter referência ao jogador a partir da cena
        if (this.scene.gameInstance) {
            return this.scene.gameInstance.getPlayer();
        }
        return null;
    }

    openDoor() {
        if (this.model) {
            // Marcar a porta como aberta no modelo
            this.model.setOpen(true);
            
            // Registrar o momento em que a porta foi aberta
            this.doorOpenTime = Date.now();
            
            // Atualizar visualmente (remover meshes da porta e laterais)
            this.view.updateView(this.model);
            
            console.log("Porta aberta! Passe por ela para ganhar o jogo!");
            
            // Configurar detecção de vitória após abrir a porta
            // Pequeno atraso para evitar falsa detecção no momento de abertura
            setTimeout(() => {
                this.setupVictoryDetection();
            }, 500);
        }
    }
    
    setupVictoryDetection() {
        if (this.victoryDetectionActive) return;
        this.victoryDetectionActive = true;

        const doorPosition = this.model.getPosition();
        const player = this.getPlayer();
        if (!player) {
            console.error("Erro: Não foi possível obter referência ao jogador para configurar detecção de vitória.");
            return;
        }

        const playerPosition = player.getPosition();
        let direction = doorPosition.subtract(playerPosition);
        direction.y = 0;
        if (direction.length() < 0.1) direction.z = 1;
        direction = direction.normalize();

        const doorWidth = this.model.getWidth();
        this.victoryVolume = BABYLON.MeshBuilder.CreateBox("victoryDetection", {
            width: doorWidth + 2,
            height: 4,
            depth: 3
        }, this.scene);

        this.victoryVolume.position = doorPosition.add(direction.scale(3));
        this.victoryVolume.position.y += 2;
        this.victoryVolume.isVisible = false;
        this.victoryVolume.checkCollisions = false;

        const observer = this.scene.onBeforeRenderObservable.add(() => {
            if (
                this.model.isOpened() &&
                !this.model.hasTriggeredWin() &&
                Date.now() - this.doorOpenTime > 1000
            ) {
                const player = this.getPlayer();
                if (player && this.isPointInBox(player.getPosition(), this.victoryVolume)) {
                    this.model.setTriggeredWin(true);
                    if (this.playerWinCallback) this.playerWinCallback();
                    this.scene.onBeforeRenderObservable.remove(observer);
                    this.victoryDetectionObserver = null;
                    setTimeout(() => {
                        if (this.victoryVolume) {
                            this.victoryVolume.dispose();
                            this.victoryVolume = null;
                        }
                    }, 1000);
                }
            }
        });
        this.victoryDetectionObserver = observer;
    }
    
    // Verifica se um ponto está dentro de um box mesh
    isPointInBox(point, boxMesh) {
        const boundingInfo = boxMesh.getBoundingInfo();
        const min = boundingInfo.boundingBox.minimumWorld;
        const max = boundingInfo.boundingBox.maximumWorld;
        
        return (point.x >= min.x && point.x <= max.x && point.y >= min.y && point.y <= max.y && point.z >= min.z && point.z <= max.z );
    }

    closeDoor() {
        if (this.model) {
            this.model.setOpen(false);
            this.view.updateView(this.model);
            
            // Se fechar a porta, desativar detecção de vitória se estiver ativa
            if (this.victoryDetectionActive) {
                this.deactivateVictoryDetection();
            }
        }
    }
    
    // Desativar detecção de vitória
    deactivateVictoryDetection() {
        if (this.victoryDetectionObserver) {
            this.scene.onBeforeRenderObservable.remove(this.victoryDetectionObserver);
            this.victoryDetectionObserver = null;
        }
        
        if (this.victoryVolume) {
            this.victoryVolume.dispose();
            this.victoryVolume = null;
        }
        
        this.victoryDetectionActive = false;
    }
    
    setPlayerWinCallback(callback) {
        this.playerWinCallback = callback;
    }
    
    getMeshes() {
        return this.view.getMeshes();
    }
    
    isReady() {
        return this.isInitialized;
    }
}

export default DoorController;