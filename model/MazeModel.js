class MazeModel {
    constructor() {
        this.mazeLayout = [];
        this.buttonPositions = [];
        this.playerStartPosition = null;
        this.monsterPositions = []; // Lista de posições de monstros
        this.gunPositions = []; // Lista de posições de armas
        this.rampPositions = [];
        this.cellSize = 8; // Tamanho padrão de cada célula
        this.wallHeight = 4; // Altura das paredes do labirinto
        this.mazeWidth = 0;
        this.mazeHeight = 0;
        this.playerPosition = { row: -1, col: -1 }; // Nova propriedade para armazenar a posição do P
        this.wallHealth = {}; // Novo: Rastrear vida das paredes { 'wall_row_col': health }
        this.initialWallHealth = 100; // Novo: Vida inicial das paredes
        this.rampHealth = {}; // Novo: Rastrear vida das rampas { 'ramp_row_col_direction': health }
        this.initialRampHealth = 150; // Novo: Vida inicial das rampas (mais resistentes?)
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
                    } else if (row[j] === 'M') {
                        // Armazenar a posição do monstro
                        this.monsterPositions.push({ row: i, col: j });
                        // Considerar essa posição como chão (0)
                        processedRow.push(0);
                    } else if (row[j] === 'G') {
                        // Armazenar a posição da arma
                        this.gunPositions.push({ row: i, col: j });
                        // Considerar essa posição como chão (0)
                        processedRow.push(0);
                    } else if (row[j] === 'RS') {
                        // Rampa para Sul
                        this.rampPositions.push({ row: i, col: j, direction: 'south' });
                        processedRow.push(0);
                    } else if (row[j] === 'RE') {
                        // Rampa para Leste
                        this.rampPositions.push({ row: i, col: j, direction: 'east' });
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
            
            
            // Calcular as posições dos monstros
            this.processMonsterPositions();
            
            // Calcular as posições das armas
            this.processGunPositions();
            
            console.log("Layout do labirinto carregado com sucesso:", this.mazeLayout);
            console.log("Posição inicial do jogador:", this.playerStartPosition);
            console.log("Posições dos monstros:", this.monsterPositions);
            console.log("Posições das armas:", this.gunPositions);

            this.processRampPositions();
            
            console.log("Posições das rampas:", this.rampPositions);
            return true;
        } catch (error) {
            console.error("Erro ao carregar o arquivo do labirinto:", error);
            return false;
        }
    }

    processRampPositions() {
        const processedPositions = [];
        
        for (const pos of this.rampPositions) {
            const worldPos = this.calculateWorldPosition(pos.row, pos.col);
            worldPos.y = 0;
            // Incluir a direção, row e col junto com a posição para identificação única
            processedPositions.push({
                x: worldPos.x,
                y: worldPos.y,
                z: worldPos.z,
                direction: pos.direction || 'south', // Usar 'south' como padrão se não houver
                row: pos.row, // Manter row original
                col: pos.col  // Manter col original
            });
        }
        
        this.rampPositions = processedPositions;
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
    
    // Método para processar todas as posições de armas encontradas
    processGunPositions() {
        const processedPositions = [];
        
        for (const pos of this.gunPositions) {
            const worldPos = this.calculateWorldPosition(pos.row, pos.col);
            processedPositions.push(worldPos);
        }
        
        // Substituir as posições de grade por posições de mundo
        this.gunPositions = processedPositions;
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
    
    convertWorldToGridPosition(worldX, worldZ) {
        // Obter dimensões do labirinto
        const rows = this.mazeLayout.length;
        const cols = this.mazeLayout[0].length;
        
        // Calcular offset para ajustar a posição relativa à origem
        const offsetX = (cols * this.cellSize) / 2;
        const offsetZ = (rows * this.cellSize) / 2;
        
        // Converter coordenadas do mundo para índices na matriz
        const col = Math.round((worldX + offsetX - (this.cellSize / 2)) / this.cellSize);
        const row = Math.round((worldZ + offsetZ - (this.cellSize / 2)) / this.cellSize);
        
        // Verificar se está dentro dos limites do labirinto
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
            return { row, col };
        }
        
        return null;
    }
    
    // Método para verificar se uma posição no mundo contém uma parede (não destruída)
    hasWallAt(worldPosition) {
        const gridPos = this.convertWorldToGridPosition(worldPosition.x, worldPosition.z);
        if (!gridPos) return false;

        // Verifica se o layout *ainda* marca como parede (valor 1)
        // E se a linha/coluna existe
        if (this.mazeLayout && this.mazeLayout[gridPos.row] && this.mazeLayout[gridPos.row][gridPos.col] !== undefined) {
             return this.mazeLayout[gridPos.row][gridPos.col] === 1;
        }
        return false;
    }

    // Novo método para aplicar dano a uma parede
    damageWallAt(worldPosition, damageAmount) {
        const gridPos = this.convertWorldToGridPosition(worldPosition.x, worldPosition.z);
        if (!gridPos) return { destroyed: false, remainingHealth: -1 };

        const wallId = `wall_${gridPos.row}_${gridPos.col}`;

        // Inicializar vida se não existir (deveria existir se for uma parede válida)
        if (this.mazeLayout[gridPos.row][gridPos.col] !== 1) {
            return { destroyed: false, remainingHealth: -1 };
        }

        if (this.wallHealth[wallId] === undefined) {
            // Se a parede existe no layout mas não tem vida registrada, inicializa
            this.wallHealth[wallId] = this.initialWallHealth;
        }

        // Aplicar dano
        this.wallHealth[wallId] -= damageAmount;
        const remainingHealth = this.wallHealth[wallId];


        // Verificar se a parede foi destruída
        if (remainingHealth <= 0) {
            // Atualizar o layout para indicar que não há mais parede
            this.mazeLayout[gridPos.row][gridPos.col] = 0;
            delete this.wallHealth[wallId]; // Limpar vida
            return { destroyed: true, remainingHealth: 0 };
        }

        return { destroyed: false, remainingHealth: remainingHealth };
    }

    // Novo método para aplicar dano a uma rampa (baseado no ID/nome da malha)
    damageRampAt(rampId, damageAmount) {
        // O rampId deve ser no formato 'ramp_row_col_direction'
        
        // Inicializar vida se não existir
        if (this.rampHealth[rampId] === undefined) {
            // Assume que se o ID existe, a rampa foi criada e é válida
            this.rampHealth[rampId] = this.initialRampHealth;
        }

        // Aplicar dano
        this.rampHealth[rampId] -= damageAmount;
        const remainingHealth = this.rampHealth[rampId];


        // Verificar se a rampa foi destruída
        if (remainingHealth <= 0) {
            // Aqui, diferente das paredes, não alteramos o layout, apenas removemos a vida.
            // A remoção visual será feita pela View/Controller.
            delete this.rampHealth[rampId]; 
            return { destroyed: true, remainingHealth: 0 };
        }

        return { destroyed: false, remainingHealth: remainingHealth };
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
    
      
    // Getter para obter todas as posições de monstros
    getMonsterPositions() {
        return this.monsterPositions;
    }
    
    // Manter compatibilidade com o código anterior, retorna a primeira posição
    getMonsterPosition() {
        return this.monsterPositions.length > 0 ? this.monsterPositions[0] : null;
    }
    
    // Getter para obter todas as posições de armas
    getGunPositions() {
        return this.gunPositions;
    }

    getRampPositions() {
        return this.rampPositions;
    }

    // Novo getter para vida inicial da parede
    getInitialWallHealth() {
        return this.initialWallHealth;
    }

    // Novo getter para vida inicial da rampa
    getInitialRampHealth() {
        return this.initialRampHealth;
    }
}

export default MazeModel;