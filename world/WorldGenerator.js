// WorldGenerator.js - Gerador de terreno procedural para o mundo aberto

class WorldGenerator {
    constructor(scene, gameInstance, seed) {
        this.scene = scene;
        this.gameInstance = gameInstance;
        this.seed = seed || Math.floor(Math.random() * 1000000);
        
        // Terrain configuration
        this.chunkSize = gameInstance.chunkSize || 16;
        this.groundSize = this.chunkSize * 1.05; // 5% overlap to eliminate seams
        this.terrainSubdivisions = 32; // Higher for more detailed terrain
        this.terrainHeight = 15;
        this.octaves = 4;
        this.persistence = 0.5;
        this.lacunarity = 2.0;
        this.baseRoughness = 1.0;
        this.roughness = 2.7;
        this.terrainMaterials = new Map();
        
        // Cache for border heights between chunks
        this.borderHeightCache = new Map();
        
        // Initialize noise generator
        this._initializeNoiseGenerator();
    }
    
    // Inicializar o gerador de ruído
    _initializeNoiseGenerator() {
        // Simple hash function for noise based on seed
        this.hashFunction = function(x, y) {
            const seedValue = ((x * 73856093) ^ (y * 19349663)) ^ this.seed;
            return this._frac(Math.sin(seedValue) * 43758.5453);
        };
    }
    
    // Função de geração de ruído Simplex simplificada
    _simplexNoise(x, y) {
        // Grid cell coords
        const X = Math.floor(x);
        const Y = Math.floor(y);
        
        // Relative position within grid cell
        const xf = x - X;
        const yf = y - Y;
        
        // Get values for corners
        const v00 = this.hashFunction(X, Y);
        const v01 = this.hashFunction(X, Y + 1);
        const v10 = this.hashFunction(X + 1, Y);
        const v11 = this.hashFunction(X + 1, Y + 1);
        
        // Cubic Hermine curve for smooth interpolation
        const sx = this._smoothstep(xf);
        const sy = this._smoothstep(yf);
        
        // Bilinear interpolation for final value
        const vx0 = this._lerp(v00, v10, sx);
        const vx1 = this._lerp(v01, v11, sx);
        const v = this._lerp(vx0, vx1, sy);
        
        // Map to [-1, 1] range
        return v * 2 - 1;
    }
    
    // Obter valor de ruído no ponto (x, z) com múltiplas oitavas
    _getNoise(x, z) {
        let noiseSum = 0;
        let amplitude = 1;
        let frequency = this.baseRoughness;
        let normalization = 0;
        
        // Adicionar várias camadas de ruído
        for (let i = 0; i < this.octaves; i++) {
            // Obter valor de ruído neste ponto ajustado pela frequência
            const nx = x * frequency;
            const nz = z * frequency;
            
            const noiseValue = this._simplexNoise(nx, nz);
            
            // Adicionar ao valor total ponderado pela amplitude
            noiseSum += noiseValue * amplitude;
            
            // Ponderação para normalização
            normalization += amplitude;
            
            // Aumentar detalhes (frequência) e diminuir amplitude para próxima camada
            amplitude *= this.persistence;
            frequency *= this.lacunarity;
        }
        
        // Normalizar para intervalo [0, 1]
        noiseSum = noiseSum / normalization;
        return (noiseSum + 1) * 0.5;
    }
    
    // Função auxiliar: fração de um número
    _frac(n) {
        return n - Math.floor(n);
    }
    
    // Função auxiliar: interpolação linear
    _lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    // Função auxiliar: curva de suavização cúbica (smoothstep)
    _smoothstep(t) {
        return t * t * (3 - 2 * t);
    }
    

    
    // Calcular altura do terreno com base no tipo de bioma
    _calculateTerrainHeight(x, z, biome) {
        // Base noise value
        let noiseValue = this._getNoise(x * 0.015, z * 0.015);
        
        // Modifier based on biome
        switch(biome) {
            case 'mountains':
                // Montanhas são mais altas e íngremes
                noiseValue = Math.pow(noiseValue, 0.8) * 1.8;
                return noiseValue * this.terrainHeight;
                
            case 'plains':
                // Planícies são mais planas
                noiseValue = Math.pow(noiseValue, 1.5) * 0.5;
                return noiseValue * (this.terrainHeight * 0.4) + 0.5;
                
            case 'forest':
                // Florestas têm colinas suaves
                noiseValue = Math.pow(noiseValue, 1.2) * 0.8;
                return noiseValue * (this.terrainHeight * 0.6) + 0.2;
                
            case 'desert':
                // Desertos têm dunas
                const smallNoise = this._getNoise(x * 0.05, z * 0.05) * 0.2;
                noiseValue = Math.pow(noiseValue, 1.3) * 0.7 + smallNoise;
                return noiseValue * (this.terrainHeight * 0.5) + 0.5;
                
            case 'snow':
                // Regiões de neve com colinas
                noiseValue = Math.pow(noiseValue, 1.1) * 0.9;
                return noiseValue * (this.terrainHeight * 0.7) + 1.0;
                
            case 'swamp':
                // Pântanos são quase planos com pequenas variações
                const microNoise = this._getNoise(x * 0.1, z * 0.1) * 0.1;
                noiseValue = Math.pow(noiseValue, 2.0) * 0.3 + microNoise;
                return noiseValue * (this.terrainHeight * 0.2) + 0.1;
                
            default:
                // Padrão
                return noiseValue * this.terrainHeight;
        }
    }
    
    // Criar material apropriado para o tipo de bioma
    _getTerrainMaterial(biome) {
        // Verificar se já existe no cache
        if (this.terrainMaterials.has(biome)) {
            return this.terrainMaterials.get(biome);
        }
        
        // Criar novo material baseado no bioma
        const material = new BABYLON.StandardMaterial(`${biome}_terrain`, this.scene);
        
        // Configurar texturas e cores baseado no bioma
        switch(biome) {
            case 'mountains':
                material.diffuseTexture = new BABYLON.Texture("textures/rock.png", this.scene);
                material.diffuseTexture.uScale = 10;
                material.diffuseTexture.vScale = 10;
                material.bumpTexture = new BABYLON.Texture("textures/rock_normal.png", this.scene);
                material.bumpTexture.uScale = 10;
                material.bumpTexture.vScale = 10;
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                break;
                
            case 'plains':
                material.diffuseTexture = new BABYLON.Texture("textures/grass.png", this.scene);
                material.diffuseTexture.uScale = 20;
                material.diffuseTexture.vScale = 20;
                material.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
                break;
                
            case 'forest':
                material.diffuseTexture = new BABYLON.Texture("textures/forest_floor.png", this.scene);
                material.diffuseTexture.uScale = 20;
                material.diffuseTexture.vScale = 20;
                material.diffuseColor = new BABYLON.Color3(0.7, 0.8, 0.5);
                material.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
                break;
                
            case 'desert':
                material.diffuseTexture = new BABYLON.Texture("textures/sand.png", this.scene);
                material.diffuseTexture.uScale = 20;
                material.diffuseTexture.vScale = 20;
                material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.1);
                material.ambientColor = new BABYLON.Color3(1.0, 0.9, 0.7);
                break;
                
            case 'snow':
                material.diffuseTexture = new BABYLON.Texture("textures/snow.png", this.scene);
                material.diffuseTexture.uScale = 20;
                material.diffuseTexture.vScale = 20;
                material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                material.ambientColor = new BABYLON.Color3(0.95, 0.95, 1.0);
                break;
                
            case 'swamp':
                material.diffuseTexture = new BABYLON.Texture("textures/mud.png", this.scene);
                material.diffuseTexture.uScale = 20;
                material.diffuseTexture.vScale = 20;
                material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.3);
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.0);
                break;
                
            default:
                material.diffuseTexture = new BABYLON.Texture("textures/floor.png", this.scene);
                material.diffuseTexture.uScale = 20;
                material.diffuseTexture.vScale = 20;
        }
        
        // Armazenar no cache
        this.terrainMaterials.set(biome, material);
        
        return material;
    }
    
    // In WorldGenerator.js
    // Add this method to create a procedural heightmap

    // 1. Add method to create a procedural heightmap
    async createProceduralHeightmap(width, height) {
        return new Promise((resolve) => {
            // Create a canvas to draw the heightmap
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Create an ImageData to fill with height data
            const imageData = ctx.createImageData(width, height);
            
            // Generate height data using noise
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    // Index for the data array (4 bytes per pixel: R,G,B,A)
                    const idx = (y * width + x) * 4;
                    
                    // Use existing noise function to generate height value
                    // Normalize coordinates to noise space
                    const nx = x / width;
                    const ny = y / height;
                    
                    // Use noise function with multiple octaves
                    const noiseValue = this._getNoise(nx * 10, ny * 10);
                    
                    // Convert to pixel value (0-255)
                    const pixelValue = Math.floor(noiseValue * 255);
                    
                    // Set grayscale value
                    imageData.data[idx] = pixelValue;     // R
                    imageData.data[idx + 1] = pixelValue; // G
                    imageData.data[idx + 2] = pixelValue; // B
                    imageData.data[idx + 3] = 255;        // A (full opacity)
                }
            }
            
            // Update canvas with generated data
            ctx.putImageData(imageData, 0, 0);
            
            // Convert to data URL
            const dataURL = canvas.toDataURL();
            
            // Create image to load into Babylon
            const img = new Image();
            img.onload = () => {
                resolve(img);
            };
            img.src = dataURL;
        });
    }


    // Adicionar água a um chunk se for apropriado para o bioma
    async _addWaterToChunk(chunkX, chunkZ, groundMesh, biome) {
        // Verificar se o bioma precisa de água
        if (!['swamp', 'forest', 'plains'].includes(biome)) { // Adicionado 'plains' para ter água em planícies
            return null;
        }
        
        // Calcular posição real do chunk no mundo
        const worldX = chunkX * this.chunkSize;
        const worldZ = chunkZ * this.chunkSize;
        
        // Determinar nível da água baseado no bioma
        let waterLevel = 0.5; // Nível padrão
        let waterColor = new BABYLON.Color3(0.1, 0.3, 0.5); // Cor padrão azul
        let transparency = 0.6; // Transparência padrão
        
        if (biome === 'swamp') {
            waterLevel = 0.5; // Reduzido para melhor visual
            waterColor = new BABYLON.Color3(0.1, 0.2, 0.1); // Verde escuro
            transparency = 0.7; // Mais opaco
        } else if (biome === 'plains') {
            waterLevel = 0.3; // Água mais baixa nas planícies
            waterColor = new BABYLON.Color3(0.1, 0.4, 0.6); // Azul mais claro
            transparency = 0.5; // Mais transparente
        }
        
        // Verificar se o terreno está baixo o suficiente para ter água
        const positions = groundMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        let hasLowArea = false;
        let minHeight = Infinity;
        
        for (let i = 0; i < positions.length; i += 3) {
            const height = positions[i + 1];
            minHeight = Math.min(minHeight, height);
            
            if (height < this.terrainHeight * 0.2) {
                hasLowArea = true;
                break;
            }
        }
        
        // Se não tiver área baixa, não adicionar água
        if (!hasLowArea) {
            return null;
        }
        
        // Calcular nível da água baseado na altura mínima do terreno
        const waterHeight = Math.max(minHeight + 0.1, this.terrainHeight * 0.15);
        
        // Usar StandardMaterial em vez de WaterMaterial para melhor compatibilidade
        const waterMaterial = new BABYLON.StandardMaterial(`water_${chunkX}_${chunkZ}`, this.scene);
        waterMaterial.diffuseColor = waterColor;
        waterMaterial.alpha = transparency;
        waterMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        waterMaterial.reflectionFresnelParameters = new BABYLON.FresnelParameters();
        waterMaterial.reflectionFresnelParameters.bias = 0.02;
        waterMaterial.reflectionFresnelParameters.power = 2.5;
        
        // Criar mesh da água
        const waterMesh = BABYLON.MeshBuilder.CreateGround(
            `water_${chunkX}_${chunkZ}`,
            { width: this.groundSize, height: this.groundSize, subdivisions: 1 },
            this.scene
        );
        
        // Posicionar água
        waterMesh.position.x = worldX;
        waterMesh.position.y = waterHeight;
        waterMesh.position.z = worldZ;
        
        // Aplicar material
        waterMesh.material = waterMaterial;
        
        // Garantir que a água não seja sólida para colisões
        waterMesh.checkCollisions = false;
        
        return waterMesh;
    }
    
    // Obter chunks próximos para reflexão da água
    _getNearbyChunks(chunkX, chunkZ, radius) {
        const chunks = [];
        
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                // Pular o próprio chunk
                if (x === 0 && z === 0) continue;
                
                chunks.push({
                    x: chunkX + x,
                    z: chunkZ + z
                });
            }
        }
        
        return chunks;
    }
    // Em vez de criar o arquivo heightmap.png, vamos modificar o WorldGenerator.js para gerar um heightmap proceduralmente



    _getNeighborBiomes(chunkX, chunkZ) {
        const neighbors = {
            north: this.biomeManager?.getBiomeAt((chunkX) * this.chunkSize, (chunkZ - 1) * this.chunkSize),
            south: this.biomeManager?.getBiomeAt((chunkX) * this.chunkSize, (chunkZ + 1) * this.chunkSize),
            west: this.biomeManager?.getBiomeAt((chunkX - 1) * this.chunkSize, (chunkZ) * this.chunkSize),
            east: this.biomeManager?.getBiomeAt((chunkX + 1) * this.chunkSize, (chunkZ) * this.chunkSize),
            northeast: this.biomeManager?.getBiomeAt((chunkX + 1) * this.chunkSize, (chunkZ - 1) * this.chunkSize),
            northwest: this.biomeManager?.getBiomeAt((chunkX - 1) * this.chunkSize, (chunkZ - 1) * this.chunkSize),
            southeast: this.biomeManager?.getBiomeAt((chunkX + 1) * this.chunkSize, (chunkZ + 1) * this.chunkSize),
            southwest: this.biomeManager?.getBiomeAt((chunkX - 1) * this.chunkSize, (chunkZ + 1) * this.chunkSize)
        };
        
        return neighbors;
    }



    async generateChunkTerrain(chunkX, chunkZ, biome) {
        // Calculate real world position
        const worldX = chunkX * this.chunkSize;
        const worldZ = chunkZ * this.chunkSize;
        
        // Get neighboring biomes for proper transitions
        const neighborBiomes = this._getNeighborBiomes(chunkX, chunkZ);
        
        // Get appropriate terrain material with biome blending
        const biomeMaterial = this._getTerrainMaterial(biome);
        
        try {
            // Create a standard ground with subdivisions
            const ground = BABYLON.MeshBuilder.CreateGround(
                `terrain_${chunkX}_${chunkZ}`,
                {
                    width: this.groundSize,
                    height: this.groundSize,
                    subdivisions: this.terrainSubdivisions,
                    updatable: true
                },
                this.scene
            );
            
            // Position the terrain
            ground.position.x = worldX;
            ground.position.z = worldZ;
            
            // Apply material
            ground.material = biomeMaterial;
            
            // Get boundary height data from neighboring chunks
            const boundaryData = await this._getBoundaryHeightData(chunkX, chunkZ);
            
            // Get vertex positions for manipulation
            const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            
            // Calculate procedural height for each vertex
            const verticesPerSide = this.terrainSubdivisions + 1;
            
            // Generate heights for every vertex using noise function
            for (let i = 0; i < positions.length; i += 3) {
                // Current index in the vertex grid
                const vertexIndex = i / 3;
                const col = vertexIndex % verticesPerSide;
                const row = Math.floor(vertexIndex / verticesPerSide);
                
                // Convert local coordinates to world space
                const normalizedX = col / this.terrainSubdivisions; // 0-1 range
                const normalizedZ = row / this.terrainSubdivisions; // 0-1 range
                
                // Convert to world position (add small offset to prevent exact border alignment issues)
                const worldPosX = worldX - this.groundSize/2 + normalizedX * this.groundSize + 0.01;
                const worldPosZ = worldZ - this.groundSize/2 + normalizedZ * this.groundSize + 0.01;
                
                // Generate height using noise
                let height = this._calculateTerrainHeight(worldPosX, worldPosZ, biome);
                
                // Apply biome blending if needed
                if (neighborBiomes) {
                    height = this._applyBiomeBlending(height, worldPosX, worldPosZ, biome, neighborBiomes);
                }
                
                // Determine if this vertex is near a chunk border for smooth transitions
                const distFromEdgeX = Math.min(normalizedX, 1 - normalizedX) * this.groundSize;
                const distFromEdgeZ = Math.min(normalizedZ, 1 - normalizedZ) * this.groundSize;
                const distFromEdge = Math.min(distFromEdgeX, distFromEdgeZ);
                
                // The blend distance for edge smoothing (10% of chunk size)
                const edgeBlendDist = this.groundSize * 0.1;
                
                // If near an edge, blend with neighboring chunk data
                if (distFromEdge < edgeBlendDist && boundaryData) {
                    // Determine which edge we're closest to
                    const isNorth = row === 0;
                    const isSouth = row === this.terrainSubdivisions;
                    const isWest = col === 0;
                    const isEast = col === this.terrainSubdivisions;
                    
                    // Get boundary height from the right neighbor if available
                    let boundaryHeight = height; // Default if no boundary data
                    
                    if (isNorth && boundaryData.north) {
                        if (col >= 0 && col < boundaryData.north.length) {
                            boundaryHeight = boundaryData.north[col];
                        }
                    }
                    else if (isSouth && boundaryData.south) {
                        if (col >= 0 && col < boundaryData.south.length) {
                            boundaryHeight = boundaryData.south[col];
                        }
                    }
                    else if (isWest && boundaryData.west) {
                        if (row >= 0 && row < boundaryData.west.length) {
                            boundaryHeight = boundaryData.west[row];
                        }
                    }
                    else if (isEast && boundaryData.east) {
                        if (row >= 0 && row < boundaryData.east.length) {
                            boundaryHeight = boundaryData.east[row];
                        }
                    }
                    
                    // Blend factor (0 at edge, 1 at blendDist from edge)
                    const blendFactor = distFromEdge / edgeBlendDist;
                    
                    // Interpolate between boundary and generated height
                    height = this._lerp(boundaryHeight, height, blendFactor);
                }
                
                // Apply the final height to vertex Y position
                positions[i + 1] = height;
            }
            
            // Update the mesh with new vertex positions
            ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            
            // Compute normals for proper lighting
            BABYLON.VertexData.ComputeNormals(
                positions, 
                ground.getIndices(), 
                ground.getVerticesData(BABYLON.VertexBuffer.NormalKind)
            );
            
            // Store border height data for neighboring chunks
            const borderHeights = this._extractBorderHeights(positions, this.terrainSubdivisions);
            
            // Add physics collision
            ground.checkCollisions = true;
            
            // Add physics impostor if physics engine is available
            if (this.scene.getPhysicsEngine()) {
                ground.physicsImpostor = new BABYLON.PhysicsImpostor(
                    ground, 
                    BABYLON.PhysicsImpostor.MeshImpostor, // Use MeshImpostor instead of HeightmapImpostor for stability
                    { mass: 0, friction: 0.5, restitution: 0.2 }, 
                    this.scene
                );
            }
            
            // Add metadata for identification
            ground.metadata = {
                isChunkTerrain: true,
                chunkX: chunkX,
                chunkZ: chunkZ,
                biome: biome,
                borderHeights: borderHeights
            };
            
            // Cache border data for neighboring chunks
            this._cacheBorderHeights(chunkX, chunkZ, borderHeights);
            
            // Add water if appropriate for biome
            if (['swamp', 'forest'].includes(biome)) {
                const waterMesh = await this._addWaterToChunk(chunkX, chunkZ, ground, biome);
                if (waterMesh) {
                    return [ground, waterMesh];
                }
            }
            
            return [ground];
        } catch (error) {
            console.error(`Error generating terrain for chunk ${chunkX},${chunkZ}:`, error);
            
            // Create a simple flat ground as fallback
            const fallbackGround = BABYLON.MeshBuilder.CreateGround(
                `terrain_fallback_${chunkX}_${chunkZ}`,
                { width: this.groundSize, height: this.groundSize },
                this.scene
            );
            
            fallbackGround.position.x = worldX;
            fallbackGround.position.z = worldZ;
            fallbackGround.checkCollisions = true;
            
            // Simple material
            const fallbackMaterial = new BABYLON.StandardMaterial(`fallback_material_${chunkX}_${chunkZ}`, this.scene);
            fallbackMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3); // Default green
            fallbackGround.material = fallbackMaterial;
            
            // Add basic metadata
            fallbackGround.metadata = {
                isChunkTerrain: true,
                chunkX: chunkX,
                chunkZ: chunkZ,
                biome: biome
            };
            
            return [fallbackGround];
        }
    }
    

    _getBoundaryIndex(localCoord, size) {
        // Convert local coordinate to 0-1 range
        const normalizedCoord = (localCoord + size/2) / size;
        // Map to index in boundary array
        return Math.min(
            Math.max(0, Math.floor(normalizedCoord * this.terrainSubdivisions)),
            this.terrainSubdivisions
        );
    }

    _extractBorderHeights(positions, subdivisions) {
        // Esta função extrai as alturas das bordas para compartilhar com chunks adjacentes
        const borders = {
            north: new Array(subdivisions + 1),
            south: new Array(subdivisions + 1),
            east: new Array(subdivisions + 1),
            west: new Array(subdivisions + 1)
        };
        
        // Vértices por lado
        const verticesPerSide = subdivisions + 1;
        
        // Extrair alturas a partir dos dados de posição
        for (let i = 0; i < positions.length; i += 3) {
            const vertexIndex = i / 3;
            const row = Math.floor(vertexIndex / verticesPerSide);
            const col = vertexIndex % verticesPerSide;
            
            const height = positions[i + 1]; // Componente Y
            
            // Armazenar alturas para cada borda
            if (row === 0) borders.north[col] = height;
            if (row === subdivisions) borders.south[col] = height;
            if (col === 0) borders.west[row] = height;
            if (col === subdivisions) borders.east[row] = height;
        }
        
        return borders;
    }
    _cacheBorderHeights(chunkX, chunkZ, borderHeights) {
        // Armazenar no cache local
        this.borderHeightCache.set(`${chunkX},${chunkZ}`, borderHeights);
        
        // Importante: também armazenar essas alturas em todos os chunks adjacentes
        // para garantir que as transições sejam perfeitamente suaves
        
        // Compartilhar borda norte com chunk ao sul
        if (borderHeights.north && borderHeights.north.length > 0) {
            let southChunkData = this.borderHeightCache.get(`${chunkX},${chunkZ-1}`);
            if (!southChunkData) {
                southChunkData = {
                    north: null,
                    south: null,
                    east: null,
                    west: null
                };
            }
            southChunkData.south = [...borderHeights.north]; // Clone para evitar problemas de referência
            this.borderHeightCache.set(`${chunkX},${chunkZ-1}`, southChunkData);
        }
        
        // Compartilhar borda sul com chunk ao norte
        if (borderHeights.south && borderHeights.south.length > 0) {
            let northChunkData = this.borderHeightCache.get(`${chunkX},${chunkZ+1}`);
            if (!northChunkData) {
                northChunkData = {
                    north: null,
                    south: null,
                    east: null,
                    west: null
                };
            }
            northChunkData.north = [...borderHeights.south]; // Clone para evitar problemas de referência
            this.borderHeightCache.set(`${chunkX},${chunkZ+1}`, northChunkData);
        }
        
        // Compartilhar borda oeste com chunk a leste
        if (borderHeights.west && borderHeights.west.length > 0) {
            let eastChunkData = this.borderHeightCache.get(`${chunkX-1},${chunkZ}`);
            if (!eastChunkData) {
                eastChunkData = {
                    north: null,
                    south: null,
                    east: null,
                    west: null
                };
            }
            eastChunkData.east = [...borderHeights.west]; // Clone para evitar problemas de referência
            this.borderHeightCache.set(`${chunkX-1},${chunkZ}`, eastChunkData);
        }
        
        // Compartilhar borda leste com chunk a oeste
        if (borderHeights.east && borderHeights.east.length > 0) {
            let westChunkData = this.borderHeightCache.get(`${chunkX+1},${chunkZ}`);
            if (!westChunkData) {
                westChunkData = {
                    north: null,
                    south: null,
                    east: null,
                    west: null
                };
            }
            westChunkData.west = [...borderHeights.east]; // Clone para evitar problemas de referência
            this.borderHeightCache.set(`${chunkX+1},${chunkZ}`, westChunkData);
        }
    }

    async _getBoundaryHeightData(chunkX, chunkZ) {
        const boundaryData = {
            north: null,
            south: null,
            east: null,
            west: null
        };
        
        // Verificar cache primeiro (muito mais rápido)
        const cacheKeys = [
            `${chunkX},${chunkZ-1}`, // Norte
            `${chunkX},${chunkZ+1}`, // Sul
            `${chunkX+1},${chunkZ}`, // Leste
            `${chunkX-1},${chunkZ}`  // Oeste
        ];
        
        // Chunk norte
        const northChunk = this.borderHeightCache.get(cacheKeys[0]);
        if (northChunk && northChunk.south) {
            boundaryData.north = [...northChunk.south]; // Clone para evitar problemas de referência
        }
        
        // Chunk sul
        const southChunk = this.borderHeightCache.get(cacheKeys[1]);
        if (southChunk && southChunk.north) {
            boundaryData.south = [...southChunk.north]; // Clone para evitar problemas de referência
        }
        
        // Chunk leste
        const eastChunk = this.borderHeightCache.get(cacheKeys[2]);
        if (eastChunk && eastChunk.west) {
            boundaryData.east = [...eastChunk.west]; // Clone para evitar problemas de referência
        }
        
        // Chunk oeste
        const westChunk = this.borderHeightCache.get(cacheKeys[3]);
        if (westChunk && westChunk.east) {
            boundaryData.west = [...westChunk.east]; // Clone para evitar problemas de referência
        }
        
        // Verificar se precisamos buscar dados de chunks já carregados no jogo
        if (!boundaryData.north || !boundaryData.south || !boundaryData.east || !boundaryData.west) {
            // Tentar obter dados de chunks carregados (se o cache falhou)
            try {
                // Chunk norte
                if (!boundaryData.north && this.gameInstance.loadedChunks?.has(cacheKeys[0])) {
                    const chunk = this.gameInstance.loadedChunks.get(cacheKeys[0]);
                    if (chunk?.terrain[0]?.metadata?.borderHeights?.south) {
                        boundaryData.north = [...chunk.terrain[0].metadata.borderHeights.south];
                    }
                }
                
                // Chunk sul
                if (!boundaryData.south && this.gameInstance.loadedChunks?.has(cacheKeys[1])) {
                    const chunk = this.gameInstance.loadedChunks.get(cacheKeys[1]);
                    if (chunk?.terrain[0]?.metadata?.borderHeights?.north) {
                        boundaryData.south = [...chunk.terrain[0].metadata.borderHeights.north];
                    }
                }
                
                // Chunk leste
                if (!boundaryData.east && this.gameInstance.loadedChunks?.has(cacheKeys[2])) {
                    const chunk = this.gameInstance.loadedChunks.get(cacheKeys[2]);
                    if (chunk?.terrain[0]?.metadata?.borderHeights?.west) {
                        boundaryData.east = [...chunk.terrain[0].metadata.borderHeights.west];
                    }
                }
                
                // Chunk oeste
                if (!boundaryData.west && this.gameInstance.loadedChunks?.has(cacheKeys[3])) {
                    const chunk = this.gameInstance.loadedChunks.get(cacheKeys[3]);
                    if (chunk?.terrain[0]?.metadata?.borderHeights?.east) {
                        boundaryData.west = [...chunk.terrain[0].metadata.borderHeights.east];
                    }
                }
            } catch (error) {
                console.warn("Erro ao ler dados de chunks carregados:", error);
            }
        }
        
        return boundaryData;
    }

    _applyBiomeBlending(height, x, z, centerBiome, neighborBiomes) {
        // Distance from chunk center (for biome blending)
        const chunkCenterX = Math.floor(x / this.chunkSize) * this.chunkSize + this.chunkSize/2;
        const chunkCenterZ = Math.floor(z / this.chunkSize) * this.chunkSize + this.chunkSize/2;
        
        const distX = Math.abs(x - chunkCenterX) / (this.chunkSize/2);
        const distZ = Math.abs(z - chunkCenterZ) / (this.chunkSize/2);
        
        // Only blend near edges (outer 30% of chunk)
        if (distX > 0.7 || distZ > 0.7) {
            let blendedHeight = height;
            let totalWeight = 1.0; // Weight for center biome
            
            // Determine which neighbors to blend with
            const isNorth = z < chunkCenterZ;
            const isSouth = z > chunkCenterZ;
            const isWest = x < chunkCenterX;
            const isEast = x > chunkCenterX;
            
            // Calculate blend weights based on position
            let northWeight = isNorth ? (distZ * 0.8) : 0;
            let southWeight = isSouth ? (distZ * 0.8) : 0;
            let westWeight = isWest ? (distX * 0.8) : 0;
            let eastWeight = isEast ? (distX * 0.8) : 0;
            
            // Corner weights
            let northeastWeight = (isNorth && isEast) ? (distX * distZ * 0.6) : 0;
            let northwestWeight = (isNorth && isWest) ? (distX * distZ * 0.6) : 0;
            let southeastWeight = (isSouth && isEast) ? (distX * distZ * 0.6) : 0;
            let southwestWeight = (isSouth && isWest) ? (distX * distZ * 0.6) : 0;
            
            // Blend heights from neighboring biomes
            if (northWeight > 0 && neighborBiomes.north) {
                const northHeight = this._calculateTerrainHeight(x, z, neighborBiomes.north);
                blendedHeight += northHeight * northWeight;
                totalWeight += northWeight;
            }
            
            if (southWeight > 0 && neighborBiomes.south) {
                const southHeight = this._calculateTerrainHeight(x, z, neighborBiomes.south);
                blendedHeight += southHeight * southWeight;
                totalWeight += southWeight;
            }
            
            if (eastWeight > 0 && neighborBiomes.east) {
                const eastHeight = this._calculateTerrainHeight(x, z, neighborBiomes.east);
                blendedHeight += eastHeight * eastWeight;
                totalWeight += eastWeight;
            }
            
            if (westWeight > 0 && neighborBiomes.west) {
                const westHeight = this._calculateTerrainHeight(x, z, neighborBiomes.west);
                blendedHeight += westHeight * westWeight;
                totalWeight += westWeight;
            }
            
            // Add corner influences
            if (northeastWeight > 0 && neighborBiomes.northeast) {
                const neHeight = this._calculateTerrainHeight(x, z, neighborBiomes.northeast);
                blendedHeight += neHeight * northeastWeight;
                totalWeight += northeastWeight;
            }
            
            if (northwestWeight > 0 && neighborBiomes.northwest) {
                const nwHeight = this._calculateTerrainHeight(x, z, neighborBiomes.northwest);
                blendedHeight += nwHeight * northwestWeight;
                totalWeight += northwestWeight;
            }
            
            if (southeastWeight > 0 && neighborBiomes.southeast) {
                const seHeight = this._calculateTerrainHeight(x, z, neighborBiomes.southeast);
                blendedHeight += seHeight * southeastWeight;
                totalWeight += southeastWeight;
            }
            
            if (southwestWeight > 0 && neighborBiomes.southwest) {
                const swHeight = this._calculateTerrainHeight(x, z, neighborBiomes.southwest);
                blendedHeight += swHeight * southwestWeight;
                totalWeight += southwestWeight;
            }
            
            // Normalize by total weight
            return blendedHeight / totalWeight;
        }
        
        return height;
    }
    
}

export default WorldGenerator;