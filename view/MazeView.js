class MazeView {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        this.wallMaterial = null;
        this.floorMaterial = null;
        
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
    
    // Criar chão e teto
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
    
    // Retornar todos os meshes criados pelo MazeView
    getMeshes() {
        return this.meshes;
    }
}

export default MazeView;