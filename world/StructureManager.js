// StructureManager.js - Responsável por gerar estruturas no mundo aberto

class StructureManager {
    constructor(scene, gameInstance, seed) {
        this.scene = scene;
        this.gameInstance = gameInstance;
        this.seed = seed || Math.floor(Math.random() * 1000000);
        
        // Configurações
        this.structureDensity = 0.6; // Densidade global de estruturas
        this.structureMaterials = new Map(); // Cache de materiais
        this.structureMeshes = new Map(); // Cache de meshes para reuso
        this.chunkSize = gameInstance.chunkSize || 16;
        
        // Inicializar gerador de números pseudo-aleatórios
        this._initializePRNG();
    }
    
    // Inicializar gerador de números pseudo-aleatórios baseado na seed
    _initializePRNG() {
        // Função de hash simples
        this.hashFunction = function(x, y) {
            const seedValue = ((x * 73856093) ^ (y * 19349663)) ^ this.seed;
            return this._frac(Math.sin(seedValue) * 43758.5453);
        };
    }
    
    // Função auxiliar: fração de um número
    _frac(n) {
        return n - Math.floor(n);
    }
    
    // Gerar um número pseudo-aleatório entre min e max para uma posição específica
    _randomForPosition(x, z, min, max) {
        const hashValue = this.hashFunction(x, z);
        return min + hashValue * (max - min);
    }
    
    // Gerar estruturas para um chunk específico
    async generateStructuresForChunk(chunkX, chunkZ, biome) {
        // Calcular posição real do chunk no mundo
        const worldX = chunkX * this.chunkSize;
        const worldZ = chunkZ * this.chunkSize;
        
        // Lista para armazenar estruturas criadas
        const structures = [];
        
        // Determinar quantas estruturas criar neste chunk
        const structureCount = this._determineStructureCount(chunkX, chunkZ, biome);
        
        // Criar estruturas
        for (let i = 0; i < structureCount; i++) {
            // Gerar posição aleatória dentro do chunk
            const posX = worldX + this._randomForPosition(chunkX, chunkZ + i, 0, this.chunkSize);
            const posZ = worldZ + this._randomForPosition(chunkX + i, chunkZ, 0, this.chunkSize);
            
            // Determinar tipo de estrutura baseado no bioma e localização
            const structureType = this._determineStructureType(posX, posZ, biome);
            
            // Criar estrutura
            const structure = await this._createStructure(posX, posZ, structureType, biome);
            
            if (structure) {
                // Se for um array de meshes, adicionar cada um
                if (Array.isArray(structure)) {
                    structures.push(...structure);
                } else {
                    structures.push(structure);
                }
            }
        }
        
        return structures;
    }
    
    // Determinar quantas estruturas criar em um chunk
    _determineStructureCount(chunkX, chunkZ, biome) {
        // Base determinística para este chunk
        const baseValue = this.hashFunction(chunkX, chunkZ);
        
        // Ajustar com base no bioma
        let biomeFactor = 1.0;
        
        switch(biome) {
            case 'forest':
                biomeFactor = 3.0; // Muitas árvores
                break;
            case 'plains':
                biomeFactor = 1.5; // Árvores esparsas, algumas estruturas
                break;
            case 'desert':
                biomeFactor = 0.7; // Poucas estruturas
                break;
            case 'mountains':
                biomeFactor = 1.2; // Algumas estruturas (cavernas, pedras)
                break;
            case 'snow':
                biomeFactor = 1.3; // Algumas estruturas
                break;
            case 'swamp':
                biomeFactor = 2.0; // Vegetação densa
                break;
            default:
                biomeFactor = 1.0;
        }
        
        // Calcular quantidade final
        const rawCount = Math.floor(baseValue * 10 * biomeFactor * this.structureDensity);
        
        // Limitar a um número razoável (para evitar sobrecarga)
        return Math.min(Math.max(rawCount, 1), 30);
    }
    
    // Determinar tipo de estrutura com base no bioma e localização
    _determineStructureType(x, z, biome) {
        // Valor aleatório baseado na posição
        const rand = this.hashFunction(Math.floor(x), Math.floor(z));
        
        // Estruturas específicas para cada bioma com probabilidades diferentes
        switch(biome) {
            case 'forest':
                if (rand < 0.8) return 'tree';
                if (rand < 0.9) return 'rock';
                return 'cabin';
                
            case 'plains':
                if (rand < 0.5) return 'tree';
                if (rand < 0.8) return 'grass';
                if (rand < 0.95) return 'rock';
                return 'house';
                
            case 'desert':
                if (rand < 0.7) return 'cactus';
                if (rand < 0.9) return 'rock';
                return 'ruins';
                
            case 'mountains':
                if (rand < 0.7) return 'rock';
                if (rand < 0.9) return 'cave';
                return 'tower';
                
            case 'snow':
                if (rand < 0.6) return 'pine_tree';
                if (rand < 0.8) return 'rock';
                if (rand < 0.95) return 'ice';
                return 'igloo';
                
            case 'swamp':
                if (rand < 0.7) return 'swamp_tree';
                if (rand < 0.9) return 'mud';
                return 'hut';
                
            default:
                return 'rock';
        }
    }
    
    // Criar estrutura no mundo
    async _createStructure(x, z, structureType, biome) {
        // Determinar a altura Y com base na altura do terreno nesse ponto
        const y = await this._getTerrainHeightAt(x, z);
        
        // Criar a estrutura conforme o tipo
        switch(structureType) {
            case 'tree':
                return this._createTree(x, y, z, biome);
                
            case 'pine_tree':
                return this._createPineTree(x, y, z);
                
            case 'swamp_tree':
                return this._createSwampTree(x, y, z);
                
            case 'rock':
                return this._createRock(x, y, z, biome);
                
            case 'house':
                return this._createHouse(x, y, z);
                
            case 'cabin':
                return this._createCabin(x, y, z);
                
            case 'hut':
                return this._createHut(x, y, z);
                
            case 'tower':
                return this._createTower(x, y, z);
                
            case 'ruins':
                return this._createRuins(x, y, z);
                
            case 'igloo':
                return this._createIgloo(x, y, z);
                
            case 'cactus':
                return this._createCactus(x, y, z);
                
            case 'grass':
                return this._createGrass(x, y, z);
                
            case 'mud':
                return this._createMud(x, y, z);
                
            case 'ice':
                return this._createIce(x, y, z);
                
            case 'cave':
                return this._createCaveEntrance(x, y, z);
                
            default:
                console.warn(`Tipo de estrutura desconhecido: ${structureType}`);
                return null;
        }
    }
    
    // Obter altura do terreno em uma posição específica
    async _getTerrainHeightAt(x, z) {
        // Raycast para encontrar a altura do terreno
        const rayStart = new BABYLON.Vector3(x, 100, z); // Começar suficientemente alto
        const rayDirection = new BABYLON.Vector3(0, -1, 0); // Apontar para baixo
        
        // Criar ray
        const ray = new BABYLON.Ray(rayStart, rayDirection, 200); // Comprimento suficiente
        
        // Função para filtrar apenas meshes do terreno
        const predicate = (mesh) => {
            return mesh.metadata && mesh.metadata.isChunkTerrain;
        };
        
        // Fazer o raycast
        const hit = this.scene.pickWithRay(ray, predicate);
        
        if (hit.hit) {
            // Retornar a altura do terreno no ponto de impacto
            return hit.pickedPoint.y;
        }
        
        // Se não acertar nada, retornar um valor padrão
        return 0;
    }
    
    // MÉTODOS DE CRIAÇÃO DE ESTRUTURAS
    
    // 1. Árvore comum (mais genérica)
    _createTree(x, y, z, biome) {
        // Determinar características da árvore baseado no bioma
        let trunkHeight, trunkRadius, leavesSize, trunkColor, leavesColor;
        
        // Variação baseada na posição para diversidade
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        switch(biome) {
            case 'forest':
                trunkHeight = 2.5 + variation * 1.5;
                trunkRadius = 0.2 + variation * 0.1;
                leavesSize = 1.2 + variation * 0.8;
                trunkColor = new BABYLON.Color3(0.4, 0.3, 0.2);
                leavesColor = new BABYLON.Color3(0.1, 0.5, 0.1);
                break;
                
            case 'plains':
                trunkHeight = 2.0 + variation * 1.0;
                trunkRadius = 0.15 + variation * 0.1;
                leavesSize = 1.0 + variation * 0.6;
                trunkColor = new BABYLON.Color3(0.5, 0.35, 0.2);
                leavesColor = new BABYLON.Color3(0.2, 0.6, 0.1);
                break;
                
            default:
                trunkHeight = 2.0 + variation * 1.0;
                trunkRadius = 0.2 + variation * 0.1;
                leavesSize = 1.0 + variation * 0.5;
                trunkColor = new BABYLON.Color3(0.4, 0.3, 0.2);
                leavesColor = new BABYLON.Color3(0.1, 0.5, 0.1);
        }
        
        // Criar tronco
        const trunk = BABYLON.MeshBuilder.CreateCylinder(
            `tree_trunk_${x}_${z}`,
            {
                height: trunkHeight,
                diameter: trunkRadius * 2,
                tessellation: 8
            },
            this.scene
        );
        
        // Posicionar tronco
        trunk.position = new BABYLON.Vector3(x, y + trunkHeight/2, z);
        
        // Material do tronco
        const trunkMaterial = this._getMaterial('tree_trunk', trunkColor);
        trunk.material = trunkMaterial;
        
        // Criar copa da árvore
        const leaves = BABYLON.MeshBuilder.CreateSphere(
            `tree_leaves_${x}_${z}`,
            {
                diameter: leavesSize * 2,
                segments: 8
            },
            this.scene
        );
        
        // Posicionar copa (um pouco acima do tronco)
        leaves.position = new BABYLON.Vector3(x, y + trunkHeight + leavesSize * 0.3, z);
        
        // Material das folhas
        const leavesMaterial = this._getMaterial('tree_leaves', leavesColor);
        leaves.material = leavesMaterial;
        
        // Configurar física
        trunk.checkCollisions = true;
        trunk.isPickable = true;
        
        // Adicionar metadados para identificação
        trunk.metadata = { type: 'tree_trunk', structureId: `tree_${x}_${z}` };
        leaves.metadata = { type: 'tree_leaves', structureId: `tree_${x}_${z}` };
        
        // Agrupar as partes da árvore
        const rootNode = new BABYLON.TransformNode(`tree_root_${x}_${z}`, this.scene);
        trunk.parent = rootNode;
        leaves.parent = rootNode;
        
        return [trunk, leaves];
    }
    
    // 2. Pinheiro (árvore pontiaguda para biomas frios)
    _createPineTree(x, y, z) {
        // Variação baseada na posição para diversidade
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características do pinheiro
        const trunkHeight = 3.5 + variation * 1.5;
        const trunkRadius = 0.2 + variation * 0.1;
        const trunkColor = new BABYLON.Color3(0.3, 0.2, 0.1);
        const leavesColor = new BABYLON.Color3(0.05, 0.3, 0.05);
        
        // Criar tronco
        const trunk = BABYLON.MeshBuilder.CreateCylinder(
            `pine_trunk_${x}_${z}`,
            {
                height: trunkHeight,
                diameter: trunkRadius * 2,
                tessellation: 8
            },
            this.scene
        );
        
        // Posicionar tronco
        trunk.position = new BABYLON.Vector3(x, y + trunkHeight/2, z);
        
        // Material do tronco
        const trunkMaterial = this._getMaterial('pine_trunk', trunkColor);
        trunk.material = trunkMaterial;
        
        // Criar camadas de folhas (cones empilhados)
        const leavesLayers = [];
        const layerCount = 2 + Math.floor(variation * 3);
        
        for (let i = 0; i < layerCount; i++) {
            const layerHeight = 1.5 + variation * 0.5;
            const layerRadius = 0.8 + (layerCount - i) * 0.4 + variation * 0.3;
            const layerY = y + trunkHeight - (i * layerHeight * 0.7);
            
            const leavesLayer = BABYLON.MeshBuilder.CreateCylinder(
                `pine_leaves_${x}_${z}_${i}`,
                {
                    height: layerHeight,
                    diameterTop: 0,
                    diameterBottom: layerRadius * 2,
                    tessellation: 8
                },
                this.scene
            );
            
            leavesLayer.position = new BABYLON.Vector3(x, layerY, z);
            
            // Material das folhas
            const leavesMaterial = this._getMaterial('pine_leaves', leavesColor);
            leavesLayer.material = leavesMaterial;
            
            // Adicionar metadados
            leavesLayer.metadata = { type: 'pine_leaves', structureId: `pine_${x}_${z}` };
            
            leavesLayers.push(leavesLayer);
        }
        
        // Configurar física
        trunk.checkCollisions = true;
        trunk.isPickable = true;
        
        // Adicionar metadados para identificação
        trunk.metadata = { type: 'pine_trunk', structureId: `pine_${x}_${z}` };
        
        // Agrupar as partes da árvore
        const rootNode = new BABYLON.TransformNode(`pine_root_${x}_${z}`, this.scene);
        trunk.parent = rootNode;
        leavesLayers.forEach(layer => layer.parent = rootNode);
        
        return [trunk, ...leavesLayers];
    }
    
    // 3. Árvore de pântano (retorcida e sombria)
    _createSwampTree(x, y, z) {
        // Variação baseada na posição para diversidade
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características da árvore de pântano
        const trunkHeight = 3.0 + variation * 2.0;
        const trunkRadius = 0.3 + variation * 0.2;
        const trunkColor = new BABYLON.Color3(0.2, 0.15, 0.1);
        const leavesColor = new BABYLON.Color3(0.1, 0.2, 0.05);
        
        // Criar tronco principal (retorcido)
        const trunk = BABYLON.MeshBuilder.CreateCylinder(
            `swamp_trunk_${x}_${z}`,
            {
                height: trunkHeight,
                diameter: trunkRadius * 2,
                tessellation: 8
            },
            this.scene
        );
        
        // Torcer o tronco (inclinação aleatória)
        const bendAngle = (variation - 0.5) * 0.2;
        trunk.rotation.x = bendAngle;
        trunk.rotation.z = bendAngle * 1.5;
        
        // Posicionar tronco
        trunk.position = new BABYLON.Vector3(x, y + trunkHeight/2, z);
        
        // Material do tronco
        const trunkMaterial = this._getMaterial('swamp_trunk', trunkColor);
        trunk.material = trunkMaterial;
        
        // Criar copa irregular
        const leaves = BABYLON.MeshBuilder.CreateSphere(
            `swamp_leaves_${x}_${z}`,
            {
                diameter: 1.5 + variation * 1.0,
                segments: 8
            },
            this.scene
        );
        
        // Achatar e distorcer a copa
        leaves.scaling = new BABYLON.Vector3(1.2, 0.7, 1.2);
        
        // Posicionar copa (deslocada do centro)
        const offsetX = (variation - 0.5) * 0.7;
        const offsetZ = (this.hashFunction(Math.floor(x * 20), Math.floor(z * 20)) - 0.5) * 0.7;
        leaves.position = new BABYLON.Vector3(
            x + offsetX,
            y + trunkHeight - 0.3,
            z + offsetZ
        );
        
        // Material das folhas
        const leavesMaterial = this._getMaterial('swamp_leaves', leavesColor);
        leaves.material = leavesMaterial;
        
        // Adicionar alguns galhos
        const branches = [];
        const branchCount = 2 + Math.floor(variation * 3);
        
        for (let i = 0; i < branchCount; i++) {
            const branchHeight = 0.1 + variation * 0.1;
            const branchLength = 0.5 + variation * 0.7;
            const branchAngle = Math.PI * 2 * (i / branchCount);
            
            const branch = BABYLON.MeshBuilder.CreateCylinder(
                `swamp_branch_${x}_${z}_${i}`,
                {
                    height: branchLength,
                    diameter: branchHeight,
                    tessellation: 6
                },
                this.scene
            );
            
            // Rotacionar e posicionar o galho
            branch.rotation.z = Math.PI / 2; // Deixar o galho horizontal
            branch.rotation.y = branchAngle; // Distribuir ao redor do tronco
            
            // Altura no tronco (distribuir verticalmente)
            const heightPercent = 0.4 + (i / branchCount) * 0.6;
            branch.position = new BABYLON.Vector3(
                x + Math.sin(branchAngle) * (trunkRadius + branchLength/2),
                y + trunkHeight * heightPercent,
                z + Math.cos(branchAngle) * (trunkRadius + branchLength/2)
            );
            
            // Material do galho
            branch.material = trunkMaterial;
            
            branches.push(branch);
        }
        
        // Configurar física
        trunk.checkCollisions = true;
        trunk.isPickable = true;
        
        // Adicionar metadados para identificação
        trunk.metadata = { type: 'swamp_trunk', structureId: `swamp_tree_${x}_${z}` };
        leaves.metadata = { type: 'swamp_leaves', structureId: `swamp_tree_${x}_${z}` };
        
        // Agrupar as partes da árvore
        const rootNode = new BABYLON.TransformNode(`swamp_tree_root_${x}_${z}`, this.scene);
        trunk.parent = rootNode;
        leaves.parent = rootNode;
        branches.forEach(branch => {
            branch.parent = rootNode;
            branch.metadata = { type: 'swamp_branch', structureId: `swamp_tree_${x}_${z}` };
        });
        
        return [trunk, leaves, ...branches];
    }
    
    // 4. Rocha (pedra com várias aparências baseadas no bioma)
    _createRock(x, y, z, biome) {
        // Variação baseada na posição para diversidade
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características da rocha baseadas no bioma
        let rockSize, rockColor, rockType;
        
        switch(biome) {
            case 'mountains':
                rockSize = 0.5 + variation * 1.5;
                rockColor = new BABYLON.Color3(0.4, 0.4, 0.4);
                rockType = 'angular';
                break;
                
            case 'desert':
                rockSize = 0.3 + variation * 0.7;
                rockColor = new BABYLON.Color3(0.6, 0.5, 0.4);
                rockType = 'smooth';
                break;
                
            case 'snow':
                rockSize = 0.4 + variation * 0.8;
                rockColor = new BABYLON.Color3(0.7, 0.7, 0.75);
                rockType = 'angular';
                break;
                
            default:
                rockSize = 0.3 + variation * 0.7;
                rockColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                rockType = variation > 0.5 ? 'angular' : 'smooth';
        }
        
        let rock;
        
        // Criar forma da rocha baseado no tipo
        if (rockType === 'angular') {
            // Rocha com arestas (usando poliedro)
            const polyhedronOptions = {
                size: rockSize,
                type: variation > 0.3 ? 2 : 1
            };
            
            rock = BABYLON.MeshBuilder.CreatePolyhedron(
                `rock_${x}_${z}`,
                polyhedronOptions, 
                this.scene
            );
        } else {
            // Rocha arredondada (usando esfera distorcida)
            rock = BABYLON.MeshBuilder.CreateSphere(
                `rock_${x}_${z}`,
                {
                    diameter: rockSize * 2,
                    segments: 8
                },
                this.scene
            );
            
            // Distorcer forma (achatar e alongar)
            const scaleX = 0.7 + variation * 0.6;
            const scaleY = 0.4 + variation * 0.3;
            const scaleZ = 0.7 + this.hashFunction(Math.floor(z * 10), Math.floor(x * 10)) * 0.6;
            
            rock.scaling = new BABYLON.Vector3(scaleX, scaleY, scaleZ);
        }
        
        // Posicionar a rocha (parcialmente enterrada)
        const embedDepth = rockSize * 0.2;
        rock.position = new BABYLON.Vector3(x, y + rockSize * scaleY - embedDepth, z);
        
        // Rotação aleatória para mais diversidade
        rock.rotation.y = variation * Math.PI * 2;
        
        // Material da rocha
        const rockMaterial = this._getMaterial(`rock_${biome}`, rockColor);
        
        // Adicionar textura de rugosidade
        if (!rockMaterial.bumpTexture) {
            rockMaterial.bumpTexture = new BABYLON.Texture("textures/rock_normal.png", this.scene);
            rockMaterial.bumpTexture.uScale = 3;
            rockMaterial.bumpTexture.vScale = 3;
        }
        
        rock.material = rockMaterial;
        
        // Configurar física
        rock.checkCollisions = true;
        rock.isPickable = true;
        
        // Adicionar metadados para identificação
        rock.metadata = { type: 'rock', biome: biome, structureId: `rock_${x}_${z}` };
        
        return rock;
    }
    
    // 5. Casa (estrutura mais complexa para vilas)
    _createHouse(x, y, z) {
        // Variação baseada na posição para diversidade
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características da casa
        const houseWidth = 4 + variation * 2;
        const houseDepth = 4 + this.hashFunction(Math.floor(z * 10), Math.floor(x * 10)) * 2;
        const houseHeight = 3 + variation * 1;
        const roofHeight = 2 + variation * 1;
        
        // Cores
        const wallColor = new BABYLON.Color3(0.8, 0.8, 0.7);
        const roofColor = new BABYLON.Color3(0.7, 0.3, 0.2);
        const doorColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        const windowColor = new BABYLON.Color3(0.7, 0.8, 0.9);
        
        // Container para armazenar todos os meshes da casa
        const houseParts = [];
        
        // 1. Criar base da casa
        const base = BABYLON.MeshBuilder.CreateBox(
            `house_base_${x}_${z}`,
            {
                width: houseWidth,
                height: houseHeight,
                depth: houseDepth
            },
            this.scene
        );
        
        // Posicionar base
        base.position = new BABYLON.Vector3(x, y + houseHeight/2, z);
        
        // Material das paredes
        const wallMaterial = this._getMaterial('house_wall', wallColor);
        base.material = wallMaterial;
        
        houseParts.push(base);
        
        // 2. Telhado (prisma triangular)
        const roof = BABYLON.MeshBuilder.CreatePolyhedron(
            `house_roof_${x}_${z}`,
            {
                type: 3, // Wedge
                size: 1.0
            },
            this.scene
        );
        
        // Escalar telhado para se ajustar à casa
        roof.scaling = new BABYLON.Vector3(houseWidth * 1.2, roofHeight, houseDepth * 1.2);
        
        // Posicionar telhado
        roof.position = new BABYLON.Vector3(x, y + houseHeight + roofHeight/2, z);
        
        // Material do telhado
        const roofMaterial = this._getMaterial('house_roof', roofColor);
        roof.material = roofMaterial;
        
        houseParts.push(roof);
        
        // 3. Porta
        const doorWidth = 1 + variation * 0.3;
        const doorHeight = 2 + variation * 0.3;
        
        const door = BABYLON.MeshBuilder.CreatePlane(
            `house_door_${x}_${z}`,
            {
                width: doorWidth,
                height: doorHeight
            },
            this.scene
        );
        
        // Posicionar porta (na frente da casa)
        door.position = new BABYLON.Vector3(
            x,
            y + doorHeight/2,
            z + houseDepth/2 + 0.01 // Ligeiramente à frente para evitar z-fighting
        );
        
        // Material da porta
        const doorMaterial = this._getMaterial('house_door', doorColor);
        door.material = doorMaterial;
        
        houseParts.push(door);
        
        // 4. Janelas
        const windowSize = 0.7 + variation * 0.3;
        
        // Janela da frente
        const frontWindow = BABYLON.MeshBuilder.CreatePlane(
            `house_window_front_${x}_${z}`,
            {
                width: windowSize,
                height: windowSize
            },
            this.scene
        );
        
        // Posicionar janela frontal
        frontWindow.position = new BABYLON.Vector3(
            x + houseWidth/4,
            y + houseHeight/2 + windowSize/3,
            z + houseDepth/2 + 0.01 // Ligeiramente à frente
        );
        
        // Material da janela
        const windowMaterial = this._getMaterial('house_window', windowColor);
        frontWindow.material = windowMaterial;
        
        houseParts.push(frontWindow);
        
        // Janela lateral
        const sideWindow = BABYLON.MeshBuilder.CreatePlane(
            `house_window_side_${x}_${z}`,
            {
                width: windowSize,
                height: windowSize
            },
            this.scene
        );
        
        // Rotacionar para a lateral
        sideWindow.rotation.y = Math.PI/2;
        
        // Posicionar janela lateral
        sideWindow.position = new BABYLON.Vector3(
            x + houseWidth/2 + 0.01, // Ligeiramente ao lado
            y + houseHeight/2 + windowSize/3,
            z
        );
        
        sideWindow.material = windowMaterial;
        
        houseParts.push(sideWindow);
        
        // Configurar física
        base.checkCollisions = true;
        base.isPickable = true;
        
        // Adicionar metadados para identificação
        base.metadata = { type: 'house', structureId: `house_${x}_${z}` };
        
        // Agrupar todas as partes
        const rootNode = new BABYLON.TransformNode(`house_root_${x}_${z}`, this.scene);
        houseParts.forEach(part => {
            part.parent = rootNode;
        });
        
        return houseParts;
    }
    
    // 6. Cabana (estrutura simples para floresta)
    _createCabin(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características da cabana
        const cabinWidth = 3 + variation * 1;
        const cabinDepth = 3 + this.hashFunction(Math.floor(z * 10), Math.floor(x * 10)) * 1;
        const cabinHeight = 2.5 + variation * 0.5;
        
        // Cores
        const wallColor = new BABYLON.Color3(0.4, 0.3, 0.2);
        const roofColor = new BABYLON.Color3(0.3, 0.2, 0.1);
        
        // Container para partes da cabana
        const cabinParts = [];
        
        // 1. Criar base (troncos empilhados)
        const base = BABYLON.MeshBuilder.CreateBox(
            `cabin_base_${x}_${z}`,
            {
                width: cabinWidth,
                height: cabinHeight,
                depth: cabinDepth
            },
            this.scene
        );
        
        // Posicionar base
        base.position = new BABYLON.Vector3(x, y + cabinHeight/2, z);
        
        // Material das paredes (troncos)
        const wallMaterial = this._getMaterial('cabin_wall', wallColor);
        
        // Adicionar textura de madeira
        if (!wallMaterial.diffuseTexture) {
            wallMaterial.diffuseTexture = new BABYLON.Texture("textures/wood.png", this.scene);
            wallMaterial.diffuseTexture.uScale = 2;
            wallMaterial.diffuseTexture.vScale = 2;
        }
        
        base.material = wallMaterial;
        
        cabinParts.push(base);
        
        // 2. Telhado (mais simples que a casa)
        const roof = BABYLON.MeshBuilder.CreateBox(
            `cabin_roof_${x}_${z}`,
            {
                width: cabinWidth * 1.2,
                height: 0.5,
                depth: cabinDepth * 1.2
            },
            this.scene
        );
        
        // Posicionar telhado
        roof.position = new BABYLON.Vector3(x, y + cabinHeight + 0.25, z);
        
        // Material do telhado
        const roofMaterial = this._getMaterial('cabin_roof', roofColor);
        
        // Adicionar textura de palha
        if (!roofMaterial.diffuseTexture) {
            roofMaterial.diffuseTexture = new BABYLON.Texture("textures/straw.png", this.scene);
            roofMaterial.diffuseTexture.uScale = 3;
            roofMaterial.diffuseTexture.vScale = 3;
        }
        
        roof.material = roofMaterial;
        
        cabinParts.push(roof);
        
        // 3. Porta (simples, apenas abertura)
        const doorWidth = 0.8 + variation * 0.2;
        const doorHeight = 1.8 + variation * 0.2;
        
        const door = BABYLON.MeshBuilder.CreatePlane(
            `cabin_door_${x}_${z}`,
            {
                width: doorWidth,
                height: doorHeight
            },
            this.scene
        );
        
        // Posicionar porta
        door.position = new BABYLON.Vector3(
            x,
            y + doorHeight/2,
            z + cabinDepth/2 + 0.01 // Ligeiramente à frente
        );
        
        // Material da porta (escuro)
        const doorMaterial = this._getMaterial('cabin_door', new BABYLON.Color3(0.2, 0.15, 0.1));
        door.material = doorMaterial;
        
        cabinParts.push(door);
        
        // Configurar física
        base.checkCollisions = true;
        base.isPickable = true;
        
        // Adicionar metadados para identificação
        base.metadata = { type: 'cabin', structureId: `cabin_${x}_${z}` };
        
        // Agrupar todas as partes
        const rootNode = new BABYLON.TransformNode(`cabin_root_${x}_${z}`, this.scene);
        cabinParts.forEach(part => {
            part.parent = rootNode;
        });
        
        return cabinParts;
    }
    
    // 7. Cabana de pântano (estrutura elevada em palafitas)
    _createHut(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características da cabana
        const hutWidth = 2.5 + variation * 1;
        const hutDepth = 2.5 + this.hashFunction(Math.floor(z * 10), Math.floor(x * 10)) * 1;
        const hutHeight = 2 + variation * 0.5;
        const stiltsHeight = 1.5 + variation * 0.5; // Altura das palafitas
        
        // Cores
        const wallColor = new BABYLON.Color3(0.3, 0.25, 0.2);
        const roofColor = new BABYLON.Color3(0.2, 0.15, 0.1);
        const stiltsColor = new BABYLON.Color3(0.25, 0.2, 0.15);
        
        // Container para partes da cabana
        const hutParts = [];
        
        // 1. Criar palafitas (pilares)
        const pillarPositions = [
            { x: -hutWidth/2, z: -hutDepth/2 },
            { x: hutWidth/2, z: -hutDepth/2 },
            { x: hutWidth/2, z: hutDepth/2 },
            { x: -hutWidth/2, z: hutDepth/2 }
        ];
        
        for (let i = 0; i < pillarPositions.length; i++) {
            const pillar = BABYLON.MeshBuilder.CreateCylinder(
                `hut_pillar_${x}_${z}_${i}`,
                {
                    height: stiltsHeight,
                    diameter: 0.2 + variation * 0.1,
                    tessellation: 8
                },
                this.scene
            );
            
            // Posicionar pilar
            pillar.position = new BABYLON.Vector3(
                x + pillarPositions[i].x,
                y + stiltsHeight/2,
                z + pillarPositions[i].z
            );
            
            // Material do pilar
            const pillarMaterial = this._getMaterial('hut_pillar', stiltsColor);
            pillar.material = pillarMaterial;
            
            hutParts.push(pillar);
        }
        
        // 2. Criar base elevada
        const base = BABYLON.MeshBuilder.CreateBox(
            `hut_base_${x}_${z}`,
            {
                width: hutWidth,
                height: hutHeight,
                depth: hutDepth
            },
            this.scene
        );
        
        // Posicionar base acima das palafitas
        base.position = new BABYLON.Vector3(x, y + stiltsHeight + hutHeight/2, z);
        
        // Material das paredes
        const wallMaterial = this._getMaterial('hut_wall', wallColor);
        
        // Adicionar textura de madeira velha
        if (!wallMaterial.diffuseTexture) {
            wallMaterial.diffuseTexture = new BABYLON.Texture("textures/old_wood.png", this.scene);
            wallMaterial.diffuseTexture.uScale = 3;
            wallMaterial.diffuseTexture.vScale = 3;
        }
        
        base.material = wallMaterial;
        
        hutParts.push(base);
        
        // 3. Telhado inclinado (cone achatado)
        const roof = BABYLON.MeshBuilder.CreateCylinder(
            `hut_roof_${x}_${z}`,
            {
                height: 1.5,
                diameterTop: 0.2,
                diameterBottom: Math.max(hutWidth, hutDepth) * 1.3,
                tessellation: 8
            },
            this.scene
        );
        
        // Posicionar telhado
        roof.position = new BABYLON.Vector3(x, y + stiltsHeight + hutHeight + 0.75, z);
        
        // Material do telhado
        const roofMaterial = this._getMaterial('hut_roof', roofColor);
        
        // Adicionar textura de palha
        if (!roofMaterial.diffuseTexture) {
            roofMaterial.diffuseTexture = new BABYLON.Texture("textures/straw.png", this.scene);
            roofMaterial.diffuseTexture.uScale = 4;
            roofMaterial.diffuseTexture.vScale = 2;
        }
        
        roof.material = roofMaterial;
        
        hutParts.push(roof);
        
        // 4. Escada simples
        const ladder = BABYLON.MeshBuilder.CreateBox(
            `hut_ladder_${x}_${z}`,
            {
                width: 0.5,
                height: stiltsHeight,
                depth: 0.1
            },
            this.scene
        );
        
        // Inclinar a escada
        ladder.rotation.x = Math.PI / 10; // Leve inclinação
        
        // Posicionar escada na entrada
        ladder.position = new BABYLON.Vector3(
            x,
            y + stiltsHeight/2 - 0.2,
            z + hutDepth/2 + 0.3
        );
        
        // Material da escada
        const ladderMaterial = this._getMaterial('hut_ladder', stiltsColor);
        ladder.material = ladderMaterial;
        
        hutParts.push(ladder);
        
        // Configurar física
        base.checkCollisions = true;
        
        // Também adicionar colisão aos pilares para que o jogador não passe através
        for (let i = 0; i < 4; i++) {
            hutParts[i].checkCollisions = true;
        }
        
        // Adicionar metadados para identificação
        base.metadata = { type: 'hut', structureId: `hut_${x}_${z}` };
        
        // Agrupar todas as partes
        const rootNode = new BABYLON.TransformNode(`hut_root_${x}_${z}`, this.scene);
        hutParts.forEach(part => {
            part.parent = rootNode;
        });
        
        return hutParts;
    }
    
    // 8. Torre (estrutura alta para montanhas)
    _createTower(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características da torre
        const towerDiameter = 3 + variation * 1;
        const towerHeight = 8 + variation * 4; // Torre alta
        const storyHeight = 3;
        const storiesCount = Math.floor(towerHeight / storyHeight);
        
        // Cores
        const wallColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        const roofColor = new BABYLON.Color3(0.3, 0.2, 0.1);
        
        // Container para partes da torre
        const towerParts = [];
        
        // 1. Criar base da torre (cilindro)
        const base = BABYLON.MeshBuilder.CreateCylinder(
            `tower_base_${x}_${z}`,
            {
                height: towerHeight,
                diameter: towerDiameter,
                tessellation: 16
            },
            this.scene
        );
        
        // Posicionar base
        base.position = new BABYLON.Vector3(x, y + towerHeight/2, z);
        
        // Material das paredes
        const wallMaterial = this._getMaterial('tower_wall', wallColor);
        
        // Adicionar textura de pedra
        if (!wallMaterial.diffuseTexture) {
            wallMaterial.diffuseTexture = new BABYLON.Texture("textures/stone.png", this.scene);
            wallMaterial.diffuseTexture.uScale = 5;
            wallMaterial.diffuseTexture.vScale = Math.ceil(towerHeight);
            
            // Adicionar mapa de normais para mais detalhe
            wallMaterial.bumpTexture = new BABYLON.Texture("textures/stone_normal.png", this.scene);
            wallMaterial.bumpTexture.uScale = 5;
            wallMaterial.bumpTexture.vScale = Math.ceil(towerHeight);
        }
        
        base.material = wallMaterial;
        
        towerParts.push(base);
        
        // 2. Criar telhado cônico
        const roof = BABYLON.MeshBuilder.CreateCylinder(
            `tower_roof_${x}_${z}`,
            {
                height: 2 + variation,
                diameterTop: 0,
                diameterBottom: towerDiameter * 1.2,
                tessellation: 16
            },
            this.scene
        );
        
        // Posicionar telhado
        roof.position = new BABYLON.Vector3(x, y + towerHeight + (1 + variation/2), z);
        
        // Material do telhado
        const roofMaterial = this._getMaterial('tower_roof', roofColor);
        
        // Adicionar textura de madeira
        if (!roofMaterial.diffuseTexture) {
            roofMaterial.diffuseTexture = new BABYLON.Texture("textures/wood.png", this.scene);
            roofMaterial.diffuseTexture.uScale = 6;
            roofMaterial.diffuseTexture.vScale = 2;
        }
        
        roof.material = roofMaterial;
        
        towerParts.push(roof);
        
        // 3. Adicionar janelas em cada andar
        for (let i = 0; i < storiesCount; i++) {
            // Altura deste andar
            const floorY = y + i * storyHeight + storyHeight/2;
            
            // Número de janelas neste andar
            const windowCount = 2 + Math.floor(variation * 2);
            
            for (let j = 0; j < windowCount; j++) {
                // Ângulo ao redor da torre
                const angle = (j / windowCount) * Math.PI * 2;
                
                // Criar janela (buraco na torre)
                const window = BABYLON.MeshBuilder.CreatePlane(
                    `tower_window_${x}_${z}_${i}_${j}`,
                    {
                        width: 0.7,
                        height: 1
                    },
                    this.scene
                );
                
                // Orientar para fora da torre
                window.rotation.y = angle;
                
                // Posicionar na parede da torre
                window.position = new BABYLON.Vector3(
                    x + Math.sin(angle) * (towerDiameter/2 + 0.01), // Ligeiramente para fora
                    floorY,
                    z + Math.cos(angle) * (towerDiameter/2 + 0.01)
                );
                
                // Material da janela (escuro)
                const windowMaterial = this._getMaterial('tower_window', new BABYLON.Color3(0.1, 0.1, 0.2));
                window.material = windowMaterial;
                
                towerParts.push(window);
            }
        }
        
        // 4. Adicionar porta
        const door = BABYLON.MeshBuilder.CreatePlane(
            `tower_door_${x}_${z}`,
            {
                width: 1.2,
                height: 2
            },
            this.scene
        );
        
        // Escolher ângulo aleatório para a porta
        const doorAngle = variation * Math.PI * 2;
        door.rotation.y = doorAngle;
        
        // Posicionar na base da torre
        door.position = new BABYLON.Vector3(
            x + Math.sin(doorAngle) * (towerDiameter/2 + 0.01),
            y + 1, // Altura da porta
            z + Math.cos(doorAngle) * (towerDiameter/2 + 0.01)
        );
        
        // Material da porta
        const doorMaterial = this._getMaterial('tower_door', new BABYLON.Color3(0.3, 0.2, 0.1));
        door.material = doorMaterial;
        
        towerParts.push(door);
        
        // Configurar física
        base.checkCollisions = true;
        base.isPickable = true;
        
        // Adicionar metadados para identificação
        base.metadata = { type: 'tower', structureId: `tower_${x}_${z}` };
        
        // Agrupar todas as partes
        const rootNode = new BABYLON.TransformNode(`tower_root_${x}_${z}`, this.scene);
        towerParts.forEach(part => {
            part.parent = rootNode;
        });
        
        return towerParts;
    }
    
    // Restante dos métodos (ruínas, iglus, etc.) seguem o mesmo padrão...
    
    // Método auxiliar para obter materiais ou criar se não existirem
    _getMaterial(materialName, color) {
        // Verificar se o material já existe no cache
        if (this.structureMaterials.has(materialName)) {
            return this.structureMaterials.get(materialName);
        }
        
        // Criar novo material
        const material = new BABYLON.StandardMaterial(materialName, this.scene);
        
        // Configurar propriedades básicas
        material.diffuseColor = color || new BABYLON.Color3(1, 1, 1);
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        // Armazenar no cache
        this.structureMaterials.set(materialName, material);
        
        return material;
    }
    
    // Método para ruínas (esqueletos de estruturas antigas)
    _createRuins(x, y, z) {
        // Variação baseada na posição para diversidade
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características das ruínas (parede parcialmente quebrada)
        const wallHeight = 2 + variation * 2;
        const wallWidth = 3 + variation * 2;
        const wallDepth = 0.5;
        
        // Container para as partes
        const ruinParts = [];
        
        // Cor da pedra antiga
        const stoneColor = new BABYLON.Color3(0.6, 0.5, 0.4);
        
        // 1. Criar parede principal (irregular)
        const mainWall = BABYLON.MeshBuilder.CreateBox(
            `ruin_wall_${x}_${z}`,
            {
                width: wallWidth,
                height: wallHeight,
                depth: wallDepth
            },
            this.scene
        );
        
        // Posicionar a parede
        mainWall.position = new BABYLON.Vector3(x, y + wallHeight/2, z);
        
        // Rotacionar levemente para parecer instável
        mainWall.rotation.x = (variation - 0.5) * 0.1;
        mainWall.rotation.z = (variation - 0.5) * 0.2;
        
        // Material para ruínas
        const ruinMaterial = this._getMaterial('ruin_stone', stoneColor);
        
        // Adicionar textura de pedra antiga
        if (!ruinMaterial.diffuseTexture) {
            ruinMaterial.diffuseTexture = new BABYLON.Texture("textures/old_stone.png", this.scene);
            ruinMaterial.diffuseTexture.uScale = 3;
            ruinMaterial.diffuseTexture.vScale = 2;
            
            // Adicionar normal map para textura
            ruinMaterial.bumpTexture = new BABYLON.Texture("textures/old_stone_normal.png", this.scene);
            ruinMaterial.bumpTexture.uScale = 3;
            ruinMaterial.bumpTexture.vScale = 2;
        }
        
        mainWall.material = ruinMaterial;
        
        ruinParts.push(mainWall);
        
        // 2. Adicionar alguns escombros no chão
        const debrisCount = 3 + Math.floor(variation * 3);
        
        for (let i = 0; i < debrisCount; i++) {
            // Posição relativa dos escombros
            const debrisX = x + (variation * i - debrisCount/2) * 0.7;
            const debrisZ = z + (this.hashFunction(x * i, z) - 0.5) * 1.5;
            
            // Tamanho dos escombros
            const debrisSize = 0.2 + variation * 0.3;
            
            // Criar uma pedra de escombro
            const debris = BABYLON.MeshBuilder.CreateBox(
                `ruin_debris_${x}_${z}_${i}`,
                {
                    width: debrisSize,
                    height: debrisSize * 0.5,
                    depth: debrisSize
                },
                this.scene
            );
            
            // Posicionar no chão
            debris.position = new BABYLON.Vector3(debrisX, y + debrisSize * 0.25, debrisZ);
            
            // Rotação aleatória para variedade
            debris.rotation.y = this.hashFunction(x + i, z + i) * Math.PI * 2;
            
            // Usar o mesmo material das ruínas
            debris.material = ruinMaterial;
            
            ruinParts.push(debris);
        }
        
        // 3. Adicionar uma coluna pequena (opcional, baseado na variação)
        if (variation > 0.4) {
            const columnHeight = 1.5 + variation;
            
            const column = BABYLON.MeshBuilder.CreateCylinder(
                `ruin_column_${x}_${z}`,
                {
                    height: columnHeight,
                    diameter: 0.4 + variation * 0.2,
                    tessellation: 8
                },
                this.scene
            );
            
            // Posicionar ao lado da parede
            column.position = new BABYLON.Vector3(
                x + wallWidth * 0.4,
                y + columnHeight/2,
                z + wallDepth * 2
            );
            
            // Inclinar levemente para parecer que está caindo
            column.rotation.x = variation * 0.2;
            
            // Usar o mesmo material
            column.material = ruinMaterial;
            
            ruinParts.push(column);
        }
        
        // Configurar física
        mainWall.checkCollisions = true;
        mainWall.isPickable = true;
        
        // Adicionar metadados para identificação
        mainWall.metadata = { type: 'ruins', structureId: `ruins_${x}_${z}` };
        
        // Agrupar todas as partes
        const rootNode = new BABYLON.TransformNode(`ruins_root_${x}_${z}`, this.scene);
        ruinParts.forEach(part => {
            part.parent = rootNode;
        });
        
        return ruinParts;
    }
    
    // Método para criar um iglu
    _createIgloo(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características do iglu
        const iglooRadius = 2 + variation;
        const iglooHeight = 2 + variation * 0.5;
        
        // Container para as partes
        const iglooParts = [];
        
        // 1. Criar domo principal do iglu
        const igloo = BABYLON.MeshBuilder.CreateHemisphere(
            `igloo_dome_${x}_${z}`,
            {
                diameter: iglooRadius * 2,
                segments: 12
            },
            this.scene
        );
        
        // Posicionar o iglu
        igloo.position = new BABYLON.Vector3(x, y + iglooHeight/2, z);
        
        // Material para o iglu (branco)
        const iglooMaterial = this._getMaterial('igloo_snow', new BABYLON.Color3(0.9, 0.9, 0.95));
        
        // Adicionar textura de neve
        if (!iglooMaterial.diffuseTexture) {
            iglooMaterial.diffuseTexture = new BABYLON.Texture("textures/snow.png", this.scene);
            iglooMaterial.diffuseTexture.uScale = 3;
            iglooMaterial.diffuseTexture.vScale = 3;
            
            // Adicionar brilho para o efeito de neve
            iglooMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.3);
            iglooMaterial.specularPower = 64;
        }
        
        igloo.material = iglooMaterial;
        
        iglooParts.push(igloo);
        
        // 2. Criar a entrada (túnel curto)
        const entranceLength = 1 + variation * 0.5;
        const entranceHeight = 1;
        const entranceWidth = 1.2;
        
        const entrance = BABYLON.MeshBuilder.CreateBox(
            `igloo_entrance_${x}_${z}`,
            {
                width: entranceWidth,
                height: entranceHeight,
                depth: entranceLength
            },
            this.scene
        );
        
        // Escolher ângulo aleatório para a entrada
        const entranceAngle = variation * Math.PI * 2;
        
        // Posicionar a entrada
        entrance.position = new BABYLON.Vector3(
            x + Math.sin(entranceAngle) * (iglooRadius - entranceLength/2),
            y + entranceHeight/2,
            z + Math.cos(entranceAngle) * (iglooRadius - entranceLength/2)
        );
        
        // Orientar para fora do iglu
        entrance.rotation.y = entranceAngle;
        
        // Material da entrada (mesmo do iglu)
        entrance.material = iglooMaterial;
        
        iglooParts.push(entrance);
        
        // 3. Criar o buraco da porta
        const door = BABYLON.MeshBuilder.CreatePlane(
            `igloo_door_${x}_${z}`,
            {
                width: 0.8,
                height: 1
            },
            this.scene
        );
        
        // Posicionar na ponta da entrada
        door.position = new BABYLON.Vector3(
            x + Math.sin(entranceAngle) * (iglooRadius + entranceLength/2),
            y + 0.5, // Metade da altura da porta
            z + Math.cos(entranceAngle) * (iglooRadius + entranceLength/2)
        );
        
        // Orientar para fora do iglu
        door.rotation.y = entranceAngle;
        
        // Material escuro para a porta (buraco)
        const doorMaterial = this._getMaterial('igloo_door', new BABYLON.Color3(0.1, 0.1, 0.2));
        doorMaterial.alpha = 0.7; // Semi-transparente
        door.material = doorMaterial;
        
        iglooParts.push(door);
        
        // Configurar física
        igloo.checkCollisions = true;
        entrance.checkCollisions = true;
        igloo.isPickable = true;
        
        // Adicionar metadados para identificação
        igloo.metadata = { type: 'igloo', structureId: `igloo_${x}_${z}` };
        
        // Agrupar todas as partes
        const rootNode = new BABYLON.TransformNode(`igloo_root_${x}_${z}`, this.scene);
        iglooParts.forEach(part => {
            part.parent = rootNode;
        });
        
        return iglooParts;
    }
    
    // Método para criar um cacto
    _createCactus(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Características do cacto
        const cactusHeight = 1.5 + variation * 2;
        const cactusDiameter = 0.3 + variation * 0.2;
        
        // Container para as partes
        const cactusParts = [];
        
        // 1. Criar o tronco principal
        const trunk = BABYLON.MeshBuilder.CreateCylinder(
            `cactus_trunk_${x}_${z}`,
            {
                height: cactusHeight,
                diameter: cactusDiameter,
                tessellation: 8
            },
            this.scene
        );
        
        // Posicionar o cacto
        trunk.position = new BABYLON.Vector3(x, y + cactusHeight/2, z);
        
        // Material para o cacto (verde)
        const cactusMaterial = this._getMaterial('cactus_green', new BABYLON.Color3(0.2, 0.5, 0.2));
        
        // Adicionar textura de cacto
        if (!cactusMaterial.diffuseTexture) {
            cactusMaterial.diffuseTexture = new BABYLON.Texture("textures/cactus.png", this.scene);
            cactusMaterial.diffuseTexture.uScale = 1;
            cactusMaterial.diffuseTexture.vScale = Math.ceil(cactusHeight);
        }
        
        trunk.material = cactusMaterial;
        
        cactusParts.push(trunk);
        
        // 2. Adicionar braços ao cacto (se a variação permitir)
        if (variation > 0.4) {
            const armCount = 1 + Math.floor(variation * 2);
            
            for (let i = 0; i < armCount; i++) {
                // Altura deste braço no tronco
                const armHeight = (0.4 + variation * 0.3) * cactusHeight;
                
                // Ângulo ao redor do tronco
                const armAngle = (i / armCount) * Math.PI * 2;
                
                // Tamanho do braço
                const armLength = 0.6 + variation * 0.6;
                
                // Criar o braço
                const arm = BABYLON.MeshBuilder.CreateCylinder(
                    `cactus_arm_${x}_${z}_${i}`,
                    {
                        height: armLength,
                        diameter: cactusDiameter * 0.8,
                        tessellation: 8
                    },
                    this.scene
                );
                
                // Rotacionar o braço para ser horizontal
                arm.rotation.z = Math.PI / 2;
                
                // Rotacionar ao redor do tronco
                arm.rotation.y = armAngle;
                
                // Posicionar o braço
                arm.position = new BABYLON.Vector3(
                    x + Math.sin(armAngle) * (cactusDiameter/2 + armLength/2),
                    y + armHeight,
                    z + Math.cos(armAngle) * (cactusDiameter/2 + armLength/2)
                );
                
                // Usar o mesmo material
                arm.material = cactusMaterial;
                
                cactusParts.push(arm);
                
                // Adicionar ponta vertical no final do braço (opcional)
                if (variation > 0.7) {
                    const tipHeight = 0.5 + variation * 0.5;
                    
                    const tip = BABYLON.MeshBuilder.CreateCylinder(
                        `cactus_tip_${x}_${z}_${i}`,
                        {
                            height: tipHeight,
                            diameter: cactusDiameter * 0.7,
                            tessellation: 8
                        },
                        this.scene
                    );
                    
                    // Posicionar na ponta do braço
                    tip.position = new BABYLON.Vector3(
                        x + Math.sin(armAngle) * (cactusDiameter/2 + armLength - cactusDiameter * 0.1),
                        y + armHeight + tipHeight/2,
                        z + Math.cos(armAngle) * (cactusDiameter/2 + armLength - cactusDiameter * 0.1)
                    );
                    
                    // Usar o mesmo material
                    tip.material = cactusMaterial;
                    
                    cactusParts.push(tip);
                }
            }
        }
        
        // Configurar física
        trunk.checkCollisions = true;
        trunk.isPickable = true;
        
        // Adicionar metadados para identificação
        trunk.metadata = { type: 'cactus', structureId: `cactus_${x}_${z}` };
        
        // Agrupar todas as partes
        const rootNode = new BABYLON.TransformNode(`cactus_root_${x}_${z}`, this.scene);
        cactusParts.forEach(part => {
            part.parent = rootNode;
        });
        
        return cactusParts;
    }
    
    // Métodos simplificados para elementos menores
    
    // StructureManager.js - Melhorando _createGrass
    _createGrass(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Criar várias "lâminas" de grama
        const bladeCount = 5 + Math.floor(variation * 7); // Aumentado para mais densidade
        const grassParts = [];
        
        for (let i = 0; i < bladeCount; i++) {
            // Distribuição mais natural ao redor do ponto central
            const angle = Math.PI * 2 * (i / bladeCount) + variation;
            const radius = 0.2 * variation;
            const bladeX = x + Math.cos(angle) * radius;
            const bladeZ = z + Math.sin(angle) * radius;
            
            // Altura da lâmina
            const bladeHeight = 0.3 + variation * 0.4;
            
            // Criar lâmina (plano fino)
            const blade = BABYLON.MeshBuilder.CreatePlane(
                `grass_blade_${x}_${z}_${i}`,
                {
                    width: 0.1 + variation * 0.1,
                    height: bladeHeight
                },
                this.scene
            );
            
            // Rotação aleatória
            blade.rotation.y = this.hashFunction(x + i, z + i) * Math.PI * 2;
            
            // Posição
            blade.position = new BABYLON.Vector3(bladeX, y + bladeHeight/2, bladeZ);
            
            // Material da grama (verde)
            const grassMaterial = this._getMaterial('grass_blade', new BABYLON.Color3(0.2, 0.6, 0.1));
            grassMaterial.backFaceCulling = false; // Para ser visível de ambos os lados
            grassMaterial.diffuseTexture = new BABYLON.Texture("textures/grass.png", this.scene);
            grassMaterial.diffuseTexture.hasAlpha = true;
            
            blade.material = grassMaterial;
            
            grassParts.push(blade);
        }
        
        // Não precisa de colisão para grama
        
        // Agrupar todas as lâminas
        const rootNode = new BABYLON.TransformNode(`grass_root_${x}_${z}`, this.scene);
        grassParts.forEach(part => {
            part.parent = rootNode;
            part.metadata = { type: 'grass', structureId: `grass_${x}_${z}` };
        });
        
        return grassParts;
    }
    
    // Criar poça de lama (para pântano)
    _createMud(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Tamanho da poça
        const mudRadius = 0.5 + variation * 1.0;
        
        // Criar disco para a poça
        const mud = BABYLON.MeshBuilder.CreateDisc(
            `mud_${x}_${z}`,
            {
                radius: mudRadius,
                tessellation: 16
            },
            this.scene
        );
        
        // Rotacionar para ficar plano no chão
        mud.rotation.x = Math.PI / 2;
        
        // Posicionar ligeiramente acima do solo
        mud.position = new BABYLON.Vector3(x, y + 0.01, z);
        
        // Material da lama (marrom escuro)
        const mudMaterial = this._getMaterial('mud_material', new BABYLON.Color3(0.3, 0.2, 0.1));
        
        // Adicionar textura de lama
        if (!mudMaterial.diffuseTexture) {
            mudMaterial.diffuseTexture = new BABYLON.Texture("textures/mud.png", this.scene);
            mudMaterial.diffuseTexture.uScale = 1;
            mudMaterial.diffuseTexture.vScale = 1;
        }
        
        mud.material = mudMaterial;
        
        // Não precisa de colisão
        
        mud.metadata = { type: 'mud', structureId: `mud_${x}_${z}` };
        
        return mud;
    }
    
    // Criar formação de gelo
    _createIce(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Tamanho do gelo
        const iceSize = 0.5 + variation * 1.0;
        
        // Criar formação de gelo (poliedro para aparência cristalina)
        const ice = BABYLON.MeshBuilder.CreatePolyhedron(
            `ice_${x}_${z}`,
            {
                type: 3, // Tipo de poliedro (3 = octaedro)
                size: iceSize
            },
            this.scene
        );
        
        // Distorcer para parecer mais natural
        ice.scaling.y = 1 + variation;
        
        // Posicionar
        ice.position = new BABYLON.Vector3(x, y + iceSize, z);
        
        // Material do gelo (azulado e semi-transparente)
        const iceMaterial = this._getMaterial('ice_material', new BABYLON.Color3(0.7, 0.8, 0.9));
        iceMaterial.alpha = 0.7; // Semi-transparente
        iceMaterial.specularColor = new BABYLON.Color3(0.6, 0.6, 0.8);
        iceMaterial.specularPower = 128; // Muito brilhante
        
        ice.material = iceMaterial;
        
        // Configurar física
        ice.checkCollisions = true;
        ice.isPickable = true;
        
        // Adicionar metadados
        ice.metadata = { type: 'ice', structureId: `ice_${x}_${z}` };
        
        return ice;
    }
    
    // Criar entrada de caverna
    _createCaveEntrance(x, y, z) {
        // Variação baseada na posição
        const variation = this.hashFunction(Math.floor(x * 10), Math.floor(z * 10));
        
        // Tamanho da entrada
        const entranceWidth = 3 + variation * 2;
        const entranceHeight = 2 + variation * 1;
        const entranceDepth = 3 + variation * 2;
        
        // Container para as partes
        const caveParts = [];
        
        // 1. Criar o arco da entrada (forma de U invertido)
        const sides = [
            { x: -entranceWidth/2, z: 0 },
            { x: entranceWidth/2, z: 0 }
        ];
        
        // Material da rocha (cinza escuro)
        const rockMaterial = this._getMaterial('cave_rock', new BABYLON.Color3(0.3, 0.3, 0.3));
        
        // Adicionar textura de rocha
        if (!rockMaterial.diffuseTexture) {
            rockMaterial.diffuseTexture = new BABYLON.Texture("textures/rock.png", this.scene);
            rockMaterial.diffuseTexture.uScale = 3;
            rockMaterial.diffuseTexture.vScale = 3;
            
            // Adicionar mapa de normais
            rockMaterial.bumpTexture = new BABYLON.Texture("textures/rock_normal.png", this.scene);
            rockMaterial.bumpTexture.uScale = 3;
            rockMaterial.bumpTexture.vScale = 3;
        }
        
        // Criar os lados da entrada
        for (let i = 0; i < sides.length; i++) {
            const side = BABYLON.MeshBuilder.CreateBox(
                `cave_side_${x}_${z}_${i}`,
                {
                    width: 1,
                    height: entranceHeight,
                    depth: entranceDepth
                },
                this.scene
            );
            
            // Posicionar no lado correspondente
            side.position = new BABYLON.Vector3(
                x + sides[i].x,
                y + entranceHeight/2,
                z - entranceDepth/2 // Entrada voltada para o sul (negativo Z)
            );
            
            // Material da rocha
            side.material = rockMaterial;
            
            caveParts.push(side);
        }
        
        // 2. Criar o topo da entrada (arco)
        const top = BABYLON.MeshBuilder.CreateCylinder(
            `cave_top_${x}_${z}`,
            {
                height: entranceWidth,
                diameter: entranceHeight,
                tessellation: 16,
                arc: 0.5 // Meio cilindro
            },
            this.scene
        );
        
        // Rotacionar para formar o arco
        top.rotation.z = Math.PI / 2;
        top.rotation.y = Math.PI / 2;
        
        // Posicionar no topo da entrada
        top.position = new BABYLON.Vector3(
            x,
            y + entranceHeight,
            z - entranceDepth/2
        );
        
        // Material da rocha
        top.material = rockMaterial;
        
        caveParts.push(top);
        
        // 3. Criar o "buraco" escuro da entrada
        const entrance = BABYLON.MeshBuilder.CreatePlane(
            `cave_entrance_${x}_${z}`,
            {
                width: entranceWidth - 0.5,
                height: entranceHeight - 0.5
            },
            this.scene
        );
        
        // Rotacionar para ficar na frente da caverna
        entrance.rotation.y = Math.PI;
        
        // Posicionar na entrada
        entrance.position = new BABYLON.Vector3(
            x,
            y + entranceHeight/2,
            z - entranceDepth/2 - 0.1 // Ligeiramente à frente
        );
        
        // Material escuro para o buraco
        const entranceMaterial = this._getMaterial('cave_entrance', new BABYLON.Color3(0.05, 0.05, 0.05));
        entrance.material = entranceMaterial;
        
        caveParts.push(entrance);
        
        // 4. Adicionar algumas rochas ao redor para decoração
        const rockCount = 3 + Math.floor(variation * 3);
        
        for (let i = 0; i < rockCount; i++) {
            // Posição relativa da rocha
            const angle = (i / rockCount) * Math.PI + Math.PI/2 - Math.PI/4; // Semicírculo na frente
            const distance = entranceWidth * 0.7 + variation * 0.5;
            
            const rockX = x + Math.cos(angle) * distance;
            const rockZ = z + Math.sin(angle) * distance;
            
            // Tamanho da rocha
            const rockSize = 0.2 + variation * 0.3;
            
            // Criar rocha
            const rock = BABYLON.MeshBuilder.CreateBox(
                `cave_rock_${x}_${z}_${i}`,
                {
                    width: rockSize,
                    height: rockSize,
                    depth: rockSize
                },
                this.scene
            );
            
            // Posicionar no chão
            rock.position = new BABYLON.Vector3(rockX, y + rockSize/2, rockZ);
            
            // Rotação aleatória
            rock.rotation.y = this.hashFunction(rockX, rockZ) * Math.PI * 2;
            
            // Material da rocha
            rock.material = rockMaterial;
            
            caveParts.push(rock);
        }
        
        // Configurar física
        caveParts[0].checkCollisions = true; // Primeiro lado
        caveParts[1].checkCollisions = true; // Segundo lado
        caveParts[2].checkCollisions = true; // Topo
        
        // Adicionar metadados para identificação
        caveParts[0].metadata = { type: 'cave', structureId: `cave_${x}_${z}` };
        
        // Agrupar todas as partes
        const rootNode = new BABYLON.TransformNode(`cave_root_${x}_${z}`, this.scene);
        caveParts.forEach(part => {
            part.parent = rootNode;
        });
        
        return caveParts;
    }
}

export default StructureManager;