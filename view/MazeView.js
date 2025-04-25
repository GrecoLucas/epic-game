class MazeView {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        this.wallMaterial = null;
        this.floorMaterial = null;
        this.rampMaterial = null;

        // Inicializar materiais
        this.initializeMaterials();
    }
    
    // Inicializar materiais para paredes, chão e teto
    initializeMaterials() {
        // Material para paredes
        this.wallMaterial = new BABYLON.StandardMaterial("mazeMaterial", this.scene);
        const wallTexture = new BABYLON.Texture("textures/wall.png", this.scene);
        this.wallMaterial.diffuseTexture = wallTexture;
        
        // Material para chão e teto
        this.floorMaterial = new BABYLON.StandardMaterial("floorMaterial", this.scene);

        // Adicionar textura a rampa
        this.rampMaterial = new BABYLON.StandardMaterial("rampMaterial", this.scene);
        const rampTexture = new BABYLON.Texture("textures/wall.png", this.scene);
        this.rampMaterial.diffuseTexture = rampTexture;
        this.rampMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.6); 
    }
    
    // Renderizar o labirinto com base no modelo
    renderMaze(mazeModel) {
        // Limpar meshes existentes
        this.clearMeshes();
        
        // Obter dimensões do labirinto
        const dimensions = mazeModel.getMazeDimensions();
        
        // Criar chão
        this.createFloor(dimensions);
        
        // Criar paredes com base no layout
        const layout = mazeModel.getLayout();
        if (layout && layout.length > 0) {
            this.createWalls(layout, dimensions);
        } else {
            console.error("Layout do labirinto não está disponível");
        }

        const rampPositions = mazeModel.getRampPositions();
        if (rampPositions && rampPositions.length > 0) {
            this.createRamps(rampPositions, dimensions);
        }
    }
    
    // Limpar meshes existentes
    clearMeshes() {
        this.meshes.forEach(mesh => {
            if (mesh) {
                mesh.dispose();
            }
        });
        this.meshes = [];
    }
    
    // Criar chão 
    createFloor(dimensions) {
        // Criar chão exatamente do tamanho do layout do labirinto
        const floor = BABYLON.MeshBuilder.CreateGround(
            "floor", 
            { width: dimensions.width * 2, height: dimensions.height * 2 }, 
            this.scene
        );
    
        // Adicionar textura ao material do chão
        const floorTexture = new BABYLON.Texture("textures/floor.png", this.scene);
        this.floorMaterial.diffuseTexture = floorTexture;
        
        // Ajustar a repetição da textura para evitar distorção
        // Quanto maior o número, mais vezes a textura se repetirá
        this.floorMaterial.diffuseTexture.uScale = dimensions.width / 2;
        this.floorMaterial.diffuseTexture.vScale = dimensions.height / 2;
    
        // Centralizar o chão na origem
        floor.position = new BABYLON.Vector3(0, 0, 0);
        floor.material = this.floorMaterial;
        floor.checkCollisions = true;
        this.meshes.push(floor);
    }
    
    // Criar paredes do labirinto
    createWalls(layout, dimensions) {
        const rows = layout.length;
        const cols = layout[0].length;
        const offsetX = (cols * dimensions.cellSize) / 2;
        const offsetZ = (rows * dimensions.cellSize) / 2;
        const wallMeshes = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (layout[row][col] !== 1) continue;
                const x = (col * dimensions.cellSize) - offsetX + (dimensions.cellSize / 2);
                const z = (row * dimensions.cellSize) - offsetZ + (dimensions.cellSize / 2);
                const wall = BABYLON.MeshBuilder.CreateBox(
                    `wall_${row}_${col}`,
                    {
                        width: dimensions.cellSize,
                        height: dimensions.wallHeight,
                        depth: dimensions.cellSize
                    },
                    this.scene
                );
                wall.position = new BABYLON.Vector3(x, dimensions.wallHeight / 2, z);
                wallMeshes.push(wall);
            }
        }

        if (wallMeshes.length) {
            const mergedWalls = BABYLON.Mesh.MergeMeshes(wallMeshes, true, true, undefined, false, true);
            if (mergedWalls) {
                mergedWalls.name = "mazeMergedWalls";
                mergedWalls.material = this.wallMaterial;
                mergedWalls.checkCollisions = true;
                this.meshes.push(mergedWalls);
            }
        }
    }
    
        createRamps(rampPositions, dimensions) {
        for (const position of rampPositions) {
            // Determinar a altura final (topo da parede)
            const wallTopHeight = dimensions.wallHeight;
            
            // Calcular o comprimento da rampa necessário para atingir a altura da parede
            // Com ângulo de 30 graus (Math.PI/6), usamos trigonometria
            const rampLength = wallTopHeight / Math.sin(Math.PI / 6);
            
            // Criar a base da rampa com comprimento adequado
            const ramp = BABYLON.MeshBuilder.CreateBox(
                "ramp", 
                {
                    width: dimensions.cellSize,
                    height: 0.5, // Espessura da rampa
                    depth: rampLength // Comprimento calculado para atingir o topo da parede
                }, 
                this.scene
            );
            
            // Posicionar a rampa
            let posX = position.x;
            let posZ = position.z;
            let offsetX = 0;
            let offsetZ = 0;
            
            // Calcular deslocamento baseado na direção para conectar a rampa à parede
            switch (position.direction) {
                case 'north':
                    // Rampa indo para norte (frente/+Z)
                    offsetZ = rampLength / 2 - dimensions.cellSize / 2;
                    ramp.rotation.x = -Math.PI / 6; // -30 graus
                    break;
                case 'south':
                    // Rampa indo para sul (trás/-Z)
                    offsetZ = -rampLength / 2 + dimensions.cellSize / 2;
                    ramp.rotation.x = Math.PI / 6; // 30 graus
                    break;
                case 'east':
                    // Rampa indo para leste (direita/+X)
                    offsetX = rampLength / 2 - dimensions.cellSize / 2;
                    ramp.rotation.z = -Math.PI / 6; // -30 graus
                    break;
                case 'west':
                    // Rampa indo para oeste (esquerda/-X)
                    offsetX = -rampLength / 2 + dimensions.cellSize / 2;
                    ramp.rotation.z = Math.PI / 6; // 30 graus
                    break;
                default:
                    // Direção padrão (norte)
                    offsetZ = rampLength / 2 - dimensions.cellSize / 2;
                    ramp.rotation.x = -Math.PI / 6;
            }
            
            // Posicionar a rampa com deslocamento adequado
            ramp.position = new BABYLON.Vector3(
                posX + offsetX,
                wallTopHeight / 2 - 0.25, // Ajustar a altura para compensar a espessura
                posZ + offsetZ
            );
            
            // Aplicar material
            ramp.material = this.rampMaterial;
            
            // Propriedades físicas importantes para subir a rampa
            ramp.checkCollisions = true;
            ramp.ellipsoid = new BABYLON.Vector3(0.5, 0.5, 0.5); // Ajustar colisão
            ramp.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
            
            // Física especial para facilitar a subida
            ramp.physicsImpostor = new BABYLON.PhysicsImpostor(
                ramp, 
                BABYLON.PhysicsImpostor.BoxImpostor, 
                { 
                    mass: 0, 
                    friction: 0.5, // Fricção moderada para não escorregar
                    restitution: 0.1 // Baixa restitution para não quicar
                }, 
                this.scene
            );
            
            // Adicionar à lista de meshes
            this.meshes.push(ramp);
        }
    }
    // Retornar todos os meshes criados pelo MazeView
    getMeshes() {
        return this.meshes;
    }
}

export default MazeView;