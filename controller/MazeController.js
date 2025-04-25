import Door from '../objects/Door.js';

class MazeController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.door = null; // Referência para a porta
    }
    
    // Inicializar o labirinto - carregar layout e renderizar
    async initialize() {
        try {
            // Carregar o layout do labirinto
            await this.model.loadMazeLayout();
            
            // Detectar posições dos botões
            this.model.detectButtonPositions();
            
            // Renderizar o labirinto com base no modelo
            this.view.renderMaze(this.model);
            
            // Inicializar a porta se uma posição foi encontrada
            await this.initializeDoor();
            
            return true;
        } catch (error) {
            console.error("Erro ao inicializar o labirinto:", error);
            return false;
        }
    }
    
    // Método para inicializar a porta
    async initializeDoor() {
        const doorPosition = this.model.getDoorPosition();
        if (doorPosition) {
            console.log("Inicializando porta na posição:", doorPosition);
            
            // Criar a porta na cena
            this.door = new Door(this.view.scene);
            this.door.initialize(doorPosition);
            
            return true;
        } else {
            console.log("Nenhuma posição de porta encontrada no labirinto");
            return false;
        }
    }
    
    // Obter todos os meshes do labirinto para colisão
    getMeshes() {
        const viewMeshes = this.view.getMeshes();
        const doorMeshes = this.door ? this.door.getMeshes() : [];
        
        // Combinar todos os meshes
        return [...viewMeshes, ...doorMeshes];
    }
    
    // Obter posições dos botões
    getButtonPositions() {
        return this.model.getButtonPositions();
    }
    
    // Método para obter as posições das armas
    getGunPositions() {
        return this.model.getGunPositions();
    }
    
    // Obter a posição inicial do jogador
    getPlayerStartPosition() {
        return this.model.getPlayerStartPosition();
    }
    
    // Novo método para lidar com dano à parede
    damageWallAt(position, damageAmount) {

        // 1. Aplicar dano ao modelo e obter resultado
        const damageResult = this.model.damageWallAt(position, damageAmount);
        const { destroyed, remainingHealth } = damageResult;

        if (remainingHealth === -1) {
             return damageResult; // Retorna o resultado { destroyed: false, remainingHealth: -1 }
        }

        // 2. Atualizar a visualização
        const gridPos = this.model.convertWorldToGridPosition(position.x, position.z);
        if (!gridPos) return damageResult; // Segurança extra

        const wallName = `wall_${gridPos.row}_${gridPos.col}`;
        const initialHealth = this.model.getInitialWallHealth();

        if (destroyed) {
            // Se destruída, remover visualmente
            // Passar a posição correta para o efeito visual
            this.view.destroyWallVisual(wallName, position); 
        } else {
            // Se apenas danificada, aplicar efeito visual de dano
            this.view.applyWallDamageVisual(wallName, remainingHealth, initialHealth);
        }

        return damageResult; // Retorna { destroyed: boolean, remainingHealth: number }
    }

    destroyWallAt(position) {
        // Força dano suficiente para destruir
        const initialHealth = this.model.getInitialWallHealth();
        // Certifica-se de que o dano é pelo menos 1 se a vida inicial for 0 ou negativa
        const damageToApply = Math.max(1, initialHealth);
        return this.damageWallAt(position, damageToApply);
    }
    // Abrir a porta
    openDoor() {
        if (this.door) {
            this.door.openDoor();
            return true;
        }
        return false;
    }
    
    // Configurar callback para quando o jogador passar pela porta
    setDoorWinCallback(callback) {
        if (this.door) {
            this.door.onPlayerWin(callback);
            return true;
        }
        return false;
    }
    
    // Obter a referência da porta
    getDoor() {
        return this.door;
    }
    getRampPositions() {
        return this.model.getRampPositions();
    }

    // Novo método para lidar com dano em rampas
    handleRampDamage(rampName, damageAmount, worldPosition) {
        
        // Aplicar dano ao modelo
        const damageResult = this.model.damageRampAt(rampName, damageAmount);

        if (damageResult.remainingHealth < 0) {
            // Algo deu errado ou não era uma rampa válida
            return;
        }

        // Verificar se a rampa foi destruída
        if (damageResult.destroyed) {
            // Chamar a view para remover visualmente a rampa
            this.view.destroyRampVisual(rampName, worldPosition);
        } else {
            // Chamar a view para aplicar efeito visual de dano
            const initialHealth = this.model.getInitialRampHealth();
            this.view.applyRampDamageVisual(rampName, damageResult.remainingHealth, initialHealth);
        }
    }

    // Getters para acesso ao modelo e view
    getModel() {
        return this.model;
    }

    getView() {
        return this.view;
    }
}

export default MazeController;