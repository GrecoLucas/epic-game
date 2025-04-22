class MazeModel {
    constructor() {
        this.mazeLayout = [];
        this.buttonPositions = [];
        this.playerStartPosition = null;
        this.doorPosition = null; // Nova propriedade para armazenar a posição da porta
        this.monsterPositions = []; // Lista de posições de monstros
        this.cellSize = 8; // Tamanho padrão de cada célula
        this.wallHeight = 7; // Altura das paredes do labirinto
        this.mazeWidth = 0;
        this.mazeHeight = 0;
        this.playerPosition = { row: -1, col: -1 }; // Nova propriedade para armazenar a posição do P
        this.doorPosition = { row: -1, col: -1 }; // Nova propriedade para armazenar a posição do D
    }

    // Método para carregar o layout do labirinto do arquivo maze.txt
    async loadMazeLayout() {
        try {
            // Usar fetch para carregar o arquivo
            const response = await fetch('./maze/maze.txt');
            if (!response.ok) {
                throw new Error(`Erro ao carregar o arquivo: ${response.status}`);
            }
            
            const text = await response.text();
            
            // Processar o texto para criar a matriz do labirinto
            this.mazeLayout = [];
            const rows = text.trim().split('\n');
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i].trim().split(' ');
                const processedRow = [];
                
                for (let j = 0; j < row.length; j++) {
                    // Verificar se é a posição inicial do jogador (P)
                    if (row[j] === 'P') {
                        // Armazenar a posição (linha, coluna) do jogador para processar posteriormente
                        this.playerPosition = { row: i, col: j };
                        // Considerar essa posição como chão (0)
                        processedRow.push(0);
                    } else if (row[j] === 'D') {
                        // Armazenar a posição da porta
                        this.doorPosition = { row: i, col: j };
                        // Considerar essa posição como chão (0)
                        processedRow.push(0);
                    } else if (row[j] === 'M') {
                        // Armazenar a posição do monstro
                        this.monsterPositions.push({ row: i, col: j });
                        // Considerar essa posição como chão (0)
                        processedRow.push(0);
                    } else {
                        // Para outros valores, converter para inteiro
                        processedRow.push(parseInt(row[j], 10));
                    }
                }
                
                this.mazeLayout.push(processedRow);
            }
            
            // Calcular dimensões do labirinto
            this.calculateMazeDimensions();
            
            // Agora que o layout está completo, calcular a posição do jogador
            if (this.playerPosition.row >= 0 && this.playerPosition.col >= 0) {
                this.detectPlayerPosition(this.playerPosition.row, this.playerPosition.col);
            }
            
            // Calcular a posição da porta se encontrada
            if (this.doorPosition.row >= 0 && this.doorPosition.col >= 0) {
                this.detectDoorPosition(this.doorPosition.row, this.doorPosition.col);
            }
            
            // Calcular as posições dos monstros
            this.processMonsterPositions();
            
            console.log("Layout do labirinto carregado com sucesso:", this.mazeLayout);
            console.log("Posição inicial do jogador:", this.playerStartPosition);
            console.log("Posição da porta:", this.doorPosition);
            console.log("Posições dos monstros:", this.monsterPositions);
            return true;
        } catch (error) {
            console.error("Erro ao carregar o arquivo do labirinto:", error);
            return false;
        }
    }
    
    // Método para processar todas as posições de monstros encontradas
    processMonsterPositions() {
        const processedPositions = [];
        
        for (const pos of this.monsterPositions) {
            const worldPos = this.calculateWorldPosition(pos.row, pos.col);
            processedPositions.push(worldPos);
        }
        
        // Substituir as posições de grade por posições de mundo
        this.monsterPositions = processedPositions;
    }
    
    // Método auxiliar para calcular posição no mundo a partir da grade
    calculateWorldPosition(row, col) {
        const rows = this.mazeLayout.length;
        const cols = this.mazeLayout[0].length;
        
        // Calcular offset para centralizar o labirinto na origem
        const offsetX = (cols * this.cellSize) / 2;
        const offsetZ = (rows * this.cellSize) / 2;
        
        // Calcular a posição no mundo - centralizar na posição da célula
        const x = (col * this.cellSize) - offsetX + (this.cellSize / 2);
        const z = (row * this.cellSize) - offsetZ + (this.cellSize / 2);
        
        return new BABYLON.Vector3(x, 1, z);
    }
    
    // Detectar a posição inicial do jogador
    detectPlayerPosition(row, col) {
        this.playerStartPosition = this.calculateWorldPosition(row, col);
        console.log(`Posição do jogador calculada: Matriz[${row},${col}] => Mundo[${this.playerStartPosition.x},1,${this.playerStartPosition.z}]`);
    }
    
    // Novo método para detectar a posição da porta
    detectDoorPosition(row, col) {
        const worldPos = this.calculateWorldPosition(row, col);
        worldPos.y = 0; // Porta no nível do chão
        this.doorPosition = worldPos;
        console.log(`Posição da porta calculada: Matriz[${row},${col}] => Mundo[${worldPos.x},0,${worldPos.z}]`);
    }
    
    // Calcular dimensões do labirinto com base no layout
    calculateMazeDimensions() {
        if (this.mazeLayout && this.mazeLayout.length > 0) {
            this.mazeWidth = this.mazeLayout[0].length * this.cellSize;
            this.mazeHeight = this.mazeLayout.length * this.cellSize;
        }
    }
    
    // Detecta posições dos botões no labirinto (valores 2, 3, 4 e 5)
    detectButtonPositions() {
        const rows = this.mazeLayout.length;
        const cols = this.mazeLayout[0].length;
        
        // Calcular offset para centralizar o labirinto na origem (mesmo método usado para o jogador)
        const offsetX = (cols * this.cellSize) / 2;
        const offsetZ = (rows * this.cellSize) / 2;
        
        this.buttonPositions = [];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Verificar se é um botão (valor 2 a 5)
                if (this.mazeLayout[row][col] >= 2 && this.mazeLayout[row][col] <= 5) {
                    // Calcular posição no mundo - centralizar na posição da célula
                    const x = (col * this.cellSize) - offsetX + (this.cellSize / 2);
                    const z = (row * this.cellSize) - offsetZ + (this.cellSize / 2);
                    
                    // Armazenar a posição do botão com seu ID
                    this.buttonPositions.push({
                        position: new BABYLON.Vector3(x, 0.2, z),
                        id: this.mazeLayout[row][col]
                    });
                    
                    console.log(`Botão ${this.mazeLayout[row][col]} calculado: Matriz[${row},${col}] => Mundo[${x},1,${z}]`);
                }
            }
        }
                
        console.log("Posições dos botões detectadas:", this.buttonPositions);
    }
    
    
    // Getters
    getLayout() {
        return this.mazeLayout;
    }
    
    getButtonPositions() {
        return this.buttonPositions;
    }
    
    getMazeDimensions() {
        return {
            width: this.mazeWidth,
            height: this.mazeHeight,
            cellSize: this.cellSize,
            wallHeight: this.wallHeight
        };
    }
    
    getPlayerStartPosition() {
        return this.playerStartPosition;
    }
    
    // Getter para a posição da porta
    getDoorPosition() {
        return this.doorPosition;
    }
    
    // Getter para obter todas as posições de monstros
    getMonsterPositions() {
        return this.monsterPositions;
    }
    
    // Manter compatibilidade com o código anterior, retorna a primeira posição
    getMonsterPosition() {
        return this.monsterPositions.length > 0 ? this.monsterPositions[0] : null;
    }
}

export default MazeModel;