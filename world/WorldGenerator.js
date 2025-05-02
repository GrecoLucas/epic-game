// WorldGenerator.js - Gerador de terreno procedural para o mundo aberto com transições perfeitas em todas as direções

class WorldGenerator {
    constructor(scene, gameInstance, seed) {
        this.scene = scene;
        this.gameInstance = gameInstance;
        this.seed = seed || Math.floor(Math.random() * 1000000);
        
        // Configuração do terreno
        this.chunkSize = gameInstance.chunkSize || 16;
        this.groundSize = this.chunkSize * 1.05; // 5% de sobreposição para eliminar costuras
        this.terrainSubdivisions = 32; // Maior para terreno mais detalhado
        this.terrainHeight = 15;
        this.octaves = 4;
        this.persistence = 0.5;
        this.lacunarity = 2.0;
        this.baseRoughness = 1.0;
        this.roughness = 2.7;
        this.terrainMaterials = new Map();
        
        // Cache para alturas das bordas entre chunks - sistema totalmente redefinido
        this.borderHeightCache = new Map();
        
        // Flag de debug para visualizar transições e bordas durante desenvolvimento
        this.debugBorders = false;
        
        // Inicializar gerador de ruído
        this._initializeNoiseGenerator();
    }
    
    // Inicializar o gerador de ruído
    _initializeNoiseGenerator() {
        // Função hash simples para ruído baseado na seed
        this.hashFunction = function(x, y) {
            const seedValue = ((x * 73856093) ^ (y * 19349663)) ^ this.seed;
            return this._frac(Math.sin(seedValue) * 43758.5453);
        };
    }
    
    // Função de geração de ruído Simplex simplificada
    _simplexNoise(x, y) {
        // Coordenadas de célula da grade
        const X = Math.floor(x);
        const Y = Math.floor(y);
        
        // Posição relativa dentro da célula
        const xf = x - X;
        const yf = y - Y;
        
        // Obter valores para os cantos
        const v00 = this.hashFunction(X, Y);
        const v01 = this.hashFunction(X, Y + 1);
        const v10 = this.hashFunction(X + 1, Y);
        const v11 = this.hashFunction(X + 1, Y + 1);
        
        // Curva cúbica de Hermite para interpolação suave
        const sx = this._smoothstep(xf);
        const sy = this._smoothstep(yf);
        
        // Interpolação bilinear para valor final
        const vx0 = this._lerp(v00, v10, sx);
        const vx1 = this._lerp(v01, v11, sx);
        const v = this._lerp(vx0, vx1, sy);
        
        // Mapear para intervalo [-1, 1]
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
        // Valor base de ruído
        let noiseValue = this._getNoise(x * 0.015, z * 0.015);
        
        // Modificador baseado no bioma
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
    
    // Método para criar uma heightmap procedural
    async createProceduralHeightmap(width, height) {
        return new Promise((resolve) => {
            // Criar um canvas para desenhar o heightmap
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Criar um ImageData para preencher com dados de altura
            const imageData = ctx.createImageData(width, height);
            
            // Gerar dados de altura usando ruído
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    // Índice para o array de dados (4 bytes por pixel: R,G,B,A)
                    const idx = (y * width + x) * 4;
                    
                    // Usar função de ruído existente para gerar valor de altura
                    // Normalizar coordenadas para espaço de ruído
                    const nx = x / width;
                    const ny = y / height;
                    
                    // Usar função de ruído com múltiplas oitavas
                    const noiseValue = this._getNoise(nx * 10, ny * 10);
                    
                    // Converter para valor de pixel (0-255)
                    const pixelValue = Math.floor(noiseValue * 255);
                    
                    // Definir valor em escala de cinza
                    imageData.data[idx] = pixelValue;     // R
                    imageData.data[idx + 1] = pixelValue; // G
                    imageData.data[idx + 2] = pixelValue; // B
                    imageData.data[idx + 3] = 255;        // A (opacidade total)
                }
            }
            
            // Atualizar canvas com dados gerados
            ctx.putImageData(imageData, 0, 0);
            
            // Converter para URL de dados
            const dataURL = canvas.toDataURL();
            
            // Criar imagem para carregar no Babylon
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
        if (!['swamp', 'forest', 'plains'].includes(biome)) {
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
    
    // Obter biomas vizinhos para um chunk
    _getNeighborBiomes(chunkX, chunkZ) {
        const biomeManager = this.gameInstance?.biomeManager;
        if (!biomeManager) return null;
        
        const neighbors = {
            north: biomeManager.getBiomeAt((chunkX) * this.chunkSize, (chunkZ - 1) * this.chunkSize),
            south: biomeManager.getBiomeAt((chunkX) * this.chunkSize, (chunkZ + 1) * this.chunkSize),
            west: biomeManager.getBiomeAt((chunkX - 1) * this.chunkSize, (chunkZ) * this.chunkSize),
            east: biomeManager.getBiomeAt((chunkX + 1) * this.chunkSize, (chunkZ) * this.chunkSize),
            northeast: biomeManager.getBiomeAt((chunkX + 1) * this.chunkSize, (chunkZ - 1) * this.chunkSize),
            northwest: biomeManager.getBiomeAt((chunkX - 1) * this.chunkSize, (chunkZ - 1) * this.chunkSize),
            southeast: biomeManager.getBiomeAt((chunkX + 1) * this.chunkSize, (chunkZ + 1) * this.chunkSize),
            southwest: biomeManager.getBiomeAt((chunkX - 1) * this.chunkSize, (chunkZ + 1) * this.chunkSize)
        };
        
        return neighbors;
    }

    // Método principal para gerar terreno para um chunk
    async generateChunkTerrain(chunkX, chunkZ, biome) {
        try {
            // Calcular posição real do chunk no mundo
            const worldX = chunkX * this.chunkSize;
            const worldZ = chunkZ * this.chunkSize;
            
            // Obter biomas vizinhos para transições adequadas
            const neighborBiomes = this._getNeighborBiomes(chunkX, chunkZ);
            
            // Obter material de terreno apropriado
            const biomeMaterial = this._getTerrainMaterial(biome);
            
            // Criar terreno base com subdivisões
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
            
            // Posicionar o terreno
            ground.position.x = worldX;
            ground.position.z = worldZ;
            
            // Aplicar material
            ground.material = biomeMaterial;
            
            // *** PONTO CRÍTICO: Obter e sincronizar dados de altura das bordas dos chunks vizinhos ***
            const chunkId = `${chunkX},${chunkZ}`;
            
            // 1. Primeiro, buscamos dados de altura de todas as bordas vizinhas
            const neighborBorders = await this._fetchAllNeighborBorderData(chunkX, chunkZ);
            
            // 2. Em seguida, garantimos que as alturas dos cantos, que são críticas, sejam consistentes
            const cornerHeights = await this._resolveCornerHeights(chunkX, chunkZ, neighborBorders);
            
            // Obter posições dos vértices para manipulação
            const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            
            // Calcular altura procedural para cada vértice
            const verticesPerSide = this.terrainSubdivisions + 1;
            
            // 3. Criar uma matriz temporária de alturas para todo o chunk
            // Isso permite modificações complexas antes de aplicar ao mesh final
            const heightMap = new Array(verticesPerSide);
            for (let i = 0; i < verticesPerSide; i++) {
                heightMap[i] = new Array(verticesPerSide);
            }
            
            // 4. Preencher a matriz de alturas - FASE CRUCIAL
            for (let row = 0; row < verticesPerSide; row++) {
                for (let col = 0; col < verticesPerSide; col++) {
                    // Posição normalizada no chunk (0-1)
                    const normalizedX = col / this.terrainSubdivisions;
                    const normalizedZ = row / this.terrainSubdivisions;
                    
                    // Converter para posição global
                    const worldPosX = worldX - this.groundSize/2 + normalizedX * this.groundSize;
                    const worldPosZ = worldZ - this.groundSize/2 + normalizedZ * this.groundSize;
                    
                    // Verificar se este vértice está em uma borda ou canto
                    const isNorthBorder = row === 0;
                    const isSouthBorder = row === this.terrainSubdivisions;
                    const isWestBorder = col === 0;
                    const isEastBorder = col === this.terrainSubdivisions;
                    
                    let height;
                    
                    // *** TRATAMENTO ESPECIAL PARA CANTOS ***
                    // Os cantos são os pontos mais críticos onde 4 chunks se encontram
                    if (isNorthBorder && isWestBorder) {
                        height = cornerHeights.NW; // Canto noroeste - já resolvido
                    }
                    else if (isNorthBorder && isEastBorder) {
                        height = cornerHeights.NE; // Canto nordeste - já resolvido
                    }
                    else if (isSouthBorder && isWestBorder) {
                        height = cornerHeights.SW; // Canto sudoeste - já resolvido
                    }
                    else if (isSouthBorder && isEastBorder) {
                        height = cornerHeights.SE; // Canto sudeste - já resolvido
                    }
                    // *** TRATAMENTO PARA BORDAS ***
                    else if (isNorthBorder) {
                        // Usar dados da borda norte ou gerá-los
                        if (neighborBorders.north && col < neighborBorders.north.length) {
                            height = neighborBorders.north[col];
                        } else {
                            // Gerar altura preservando a continuidade com os cantos
                            const ratio = col / this.terrainSubdivisions;
                            height = this._lerpWithBias(
                                cornerHeights.NW,
                                cornerHeights.NE,
                                ratio,
                                worldPosX, worldPosZ, biome
                            );
                        }
                    }
                    else if (isSouthBorder) {
                        // Borda sul
                        if (neighborBorders.south && col < neighborBorders.south.length) {
                            height = neighborBorders.south[col];
                        } else {
                            const ratio = col / this.terrainSubdivisions;
                            height = this._lerpWithBias(
                                cornerHeights.SW,
                                cornerHeights.SE,
                                ratio,
                                worldPosX, worldPosZ, biome
                            );
                        }
                    }
                    else if (isWestBorder) {
                        // Borda oeste
                        if (neighborBorders.west && row < neighborBorders.west.length) {
                            height = neighborBorders.west[row];
                        } else {
                            const ratio = row / this.terrainSubdivisions;
                            height = this._lerpWithBias(
                                cornerHeights.NW,
                                cornerHeights.SW,
                                ratio,
                                worldPosX, worldPosZ, biome
                            );
                        }
                    }
                    else if (isEastBorder) {
                        // Borda leste
                        if (neighborBorders.east && row < neighborBorders.east.length) {
                            height = neighborBorders.east[row];
                        } else {
                            const ratio = row / this.terrainSubdivisions;
                            height = this._lerpWithBias(
                                cornerHeights.NE,
                                cornerHeights.SE,
                                ratio,
                                worldPosX, worldPosZ, biome
                            );
                        }
                    }
                    // *** INTERIOR DO CHUNK ***
                    else {
                        // Usando novo método para interior que garante continuidade com todas as bordas
                        height = this._calculateInteriorHeight(
                            worldPosX, worldPosZ, biome,
                            normalizedX, normalizedZ,
                            neighborBorders,
                            cornerHeights,
                            neighborBiomes
                        );
                    }
                    
                    // Armazenar a altura na matriz
                    heightMap[row][col] = height;
                }
            }
            
            // 5. Agora aplicamos um filtro suavizador para garantir que não haja transições bruscas
            // dentro do chunk, mantendo as bordas fixas
            this._smoothHeightMap(heightMap, /* bordersFixed= */ true);
            
            // 6. Aplicar a matriz de alturas final às posições dos vértices
            for (let row = 0; row < verticesPerSide; row++) {
                for (let col = 0; col < verticesPerSide; col++) {
                    const vertexIndex = row * verticesPerSide + col;
                    const positionIndex = vertexIndex * 3; // 3 componentes por vértice (x, y, z)
                    
                    // Atualizar componente Y (altura)
                    positions[positionIndex + 1] = heightMap[row][col];
                }
            }
            
            // Atualizar a malha com as novas posições de vértices
            ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            
            // 7. Calcular normais corretas para iluminação adequada
            BABYLON.VertexData.ComputeNormals(
                positions, 
                ground.getIndices(), 
                ground.getVerticesData(BABYLON.VertexBuffer.NormalKind)
            );
            
            // 8. Extrair e armazenar alturas de borda para uso por chunks futuros
            const borderHeights = this._extractAndStoreBorderHeights(chunkX, chunkZ, heightMap, cornerHeights);
            
            // 9. Adicionar colisão física
            ground.checkCollisions = true;
            
            // 10. Adicionar impostor físico se disponível
            if (this.scene.getPhysicsEngine()) {
                try {
                    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
                        ground, 
                        BABYLON.PhysicsImpostor.HeightmapImpostor, 
                        { 
                            mass: 0, 
                            friction: 0.5, 
                            restitution: 0.1 
                        }, 
                        this.scene
                    );
                } catch (error) {
                    console.warn("Erro ao criar impostor físico para o terreno:", error);
                    // Fallback para MeshImpostor
                    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
                        ground, 
                        BABYLON.PhysicsImpostor.MeshImpostor, 
                        { mass: 0, friction: 0.5, restitution: 0.1 }, 
                        this.scene
                    );
                }
            }
            
            // 11. Adicionar metadados ao mesh para identificação
            ground.metadata = {
                isChunkTerrain: true,
                chunkX: chunkX,
                chunkZ: chunkZ,
                biome: biome,
                borderHeights: borderHeights,
                cornerHeights: cornerHeights
            };
            
            // 12. Adicionar água se apropriado para o bioma
            if (['swamp', 'forest', 'plains'].includes(biome)) {
                const waterMesh = await this._addWaterToChunk(chunkX, chunkZ, ground, biome);
                if (waterMesh) {
                    return [ground, waterMesh];
                }
            }
            
            return [ground];
        } catch (error) {
            console.error(`Erro ao gerar terreno para chunk ${chunkX},${chunkZ}:`, error);
            
            // Criar um terreno plano simples como fallback em caso de erro
            const fallbackGround = BABYLON.MeshBuilder.CreateGround(
                `terrain_fallback_${chunkX}_${chunkZ}`,
                { width: this.groundSize, height: this.groundSize },
                this.scene
            );
            
            fallbackGround.position.x = chunkX * this.chunkSize;
            fallbackGround.position.z = chunkZ * this.chunkSize;
            fallbackGround.checkCollisions = true;
            
            // Material simples
            const fallbackMaterial = new BABYLON.StandardMaterial(`fallback_material_${chunkX}_${chunkZ}`, this.scene);
            fallbackMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3); // Verde padrão
            fallbackGround.material = fallbackMaterial;
            
            // Adicionar metadados básicos
            fallbackGround.metadata = {
                isChunkTerrain: true,
                chunkX: chunkX,
                chunkZ: chunkZ,
                biome: biome
            };
            
            return [fallbackGround];
        }
    }
    
    // Método avançado para calcular altura interior com influência de todas as bordas
    _calculateInteriorHeight(worldX, worldZ, biome, normalizedX, normalizedZ, neighborBorders, cornerHeights, neighborBiomes) {
        // Gerar altura base para este ponto
        const baseHeight = this._calculateTerrainHeight(worldX, worldZ, biome);
        
        // Aplicar blending de biomas se necessário
        let blendedHeight = baseHeight;
        if (neighborBiomes) {
            blendedHeight = this._applyBiomeBlending(baseHeight, worldX, worldZ, biome, neighborBiomes);
        }
        
        // Agora aplicamos um algoritmo de interpolação multi-borda para garantir
        // que o interior se misture suavemente com TODAS as bordas
        
        // 1. Calculamos a distância para cada borda (0 = na borda, 1 = mais distante)
        const distFromNorth = normalizedZ;
        const distFromSouth = 1 - normalizedZ;
        const distFromWest = normalizedX;
        const distFromEast = 1 - normalizedX;
        
        // 2. Calculamos a influência de cada borda baseada em função de suavização modificada
        // que garante que a soma das influências inteiras seja exatamente 1
        const northInfluence = this._borderInfluence(distFromNorth);
        const southInfluence = this._borderInfluence(distFromSouth);
        const westInfluence = this._borderInfluence(distFromWest);
        const eastInfluence = this._borderInfluence(distFromEast);
        
        // 3. Calculamos a influência dos cantos - crucial para suavidade
        const nwInfluence = this._cornerInfluence(distFromNorth, distFromWest);
        const neInfluence = this._cornerInfluence(distFromNorth, distFromEast);
        const swInfluence = this._cornerInfluence(distFromSouth, distFromWest);
        const seInfluence = this._cornerInfluence(distFromSouth, distFromEast);
        
        // 4. Calculamos a soma das influências para normalização
        const totalBorderInfluence = 
            northInfluence + southInfluence + westInfluence + eastInfluence +
            nwInfluence + neInfluence + swInfluence + seInfluence;
        
        // 5. Se a soma for significativa, aplicamos as influências
        if (totalBorderInfluence > 0.01) {  // threshold pequeno para evitar divisão por zero
            // Obter as alturas das bordas nos pontos correspondentes
            const northSample = this._sampleBorder(neighborBorders.north, normalizedX);
            const southSample = this._sampleBorder(neighborBorders.south, normalizedX);
            const westSample = this._sampleBorder(neighborBorders.west, normalizedZ);
            const eastSample = this._sampleBorder(neighborBorders.east, normalizedZ);
            
            // Calcular a altura de influência das bordas
            let borderInfluencedHeight = 0;
            
            // Adicionar influência de cada borda
            if (northSample !== null) {
                borderInfluencedHeight += northSample * (northInfluence / totalBorderInfluence);
            }
            if (southSample !== null) {
                borderInfluencedHeight += southSample * (southInfluence / totalBorderInfluence);
            }
            if (westSample !== null) {
                borderInfluencedHeight += westSample * (westInfluence / totalBorderInfluence);
            }
            if (eastSample !== null) {
                borderInfluencedHeight += eastSample * (eastInfluence / totalBorderInfluence);
            }
            
            // Adicionar influência dos cantos
            if (cornerHeights.NW !== null) {
                borderInfluencedHeight += cornerHeights.NW * (nwInfluence / totalBorderInfluence);
            }
            if (cornerHeights.NE !== null) {
                borderInfluencedHeight += cornerHeights.NE * (neInfluence / totalBorderInfluence);
            }
            if (cornerHeights.SW !== null) {
                borderInfluencedHeight += cornerHeights.SW * (swInfluence / totalBorderInfluence);
            }
            if (cornerHeights.SE !== null) {
                borderInfluencedHeight += cornerHeights.SE * (seInfluence / totalBorderInfluence);
            }
            
            // 6. Interpolar entre a altura do bioma e a altura influenciada pelas bordas
            // baseado na força total da influência das bordas
            const influenceStrength = Math.min(1.0, totalBorderInfluence * 2); // Ajustar para maior impacto
            return blendedHeight * (1 - influenceStrength) + borderInfluencedHeight * influenceStrength;
        }
        
        return blendedHeight;
    }
    
    // Função de influência das bordas - determina quanto uma borda afeta um ponto interior
    _borderInfluence(distance) {
        // Parâmetros ajustáveis para controlar a influência
        const borderInfluenceRange = 0.4; // 40% de distância da borda para dentro
        const falloffPower = 2.5; // Potência para a função de queda - maior = queda mais rápida
        
        if (distance >= borderInfluenceRange) {
            return 0; // Fora do alcance de influência
        }
        
        // Normalizar a distância para o alcance de influência
        const normalizedDist = distance / borderInfluenceRange;
        
        // Aplicar função de queda com suavização
        return Math.pow(1 - normalizedDist, falloffPower);
    }
    
    // Influência especial para os cantos - particularmente importante
    _cornerInfluence(dist1, dist2) {
        // Usamos o menor valor para determinar a distância ao canto
        const cornerDist = Math.min(dist1, dist2);
        
        // Ajustar parâmetros para controle fino
        const cornerInfluenceRange = 0.3; // 30% de alcance para cantos
        const cornerFalloffPower = 3.0; // Queda ainda mais rápida para cantos
        
        if (cornerDist >= cornerInfluenceRange) {
            return 0; // Fora do alcance de influência
        }
        
        // Normalizar distância
        const normalizedDist = cornerDist / cornerInfluenceRange;
        
        // Aplicar função de queda especial para cantos
        // Multiplicamos por um fator adicional para evitar que cantos dominem as bordas
        return Math.pow(1 - normalizedDist, cornerFalloffPower) * 0.7;
    }
    
    // Amostragem suavizada de uma borda - lida com bordas incompletas ou nulas
    _sampleBorder(borderArray, normalizedPos) {
        if (!borderArray || borderArray.length === 0) {
            return null;
        }
        
        // Converter posição normalizada para índice
        const exactIndex = normalizedPos * (borderArray.length - 1);
        const lowerIndex = Math.floor(exactIndex);
        const upperIndex = Math.ceil(exactIndex);
        
        // Se os índices são iguais ou fora dos limites
        if (lowerIndex === upperIndex || lowerIndex < 0) {
            return borderArray[Math.max(0, Math.min(borderArray.length - 1, lowerIndex))];
        }
        
        // Peso para interpolação
        const weight = exactIndex - lowerIndex;
        
        // Fazer interpolação linear entre os dois valores mais próximos
        return borderArray[lowerIndex] * (1 - weight) + borderArray[upperIndex] * weight;
    }
    
    // Interpolação linear com bias de ruído para naturalidade
    _lerpWithBias(a, b, t, worldX, worldZ, biome) {
        // Interpolação básica
        const directLerp = a * (1 - t) + b * t;
        
        // Adicionar um pequeno componente de ruído para evitar linearidade óbvia
        // mas manter a continuidade nas extremidades
        const noiseScale = 0.3; // Escala do ruído (menor = menos efeito)
        const edgeBias = Math.min(t, 1 - t) * 4; // Bias que desaparece nas extremidades
        
        // Gerar valor de ruído
        const noise = this._getNoise(worldX * 0.1, worldZ * 0.1) - 0.5; // Centralizado em 0
        
        // Calcular altura procedural para referência
        const proceduralHeight = this._calculateTerrainHeight(worldX, worldZ, biome);
        
        // Misturar interpolação direta com influência de ruído e altura procedural
        return directLerp + (noise * noiseScale * edgeBias * Math.abs(b - a)) + 
               (edgeBias * 0.1 * (proceduralHeight - directLerp));
    }
    
    // Suavizar a matriz de alturas para evitar transições bruscas
    _smoothHeightMap(heightMap, bordersFixed) {
        const rows = heightMap.length;
        const cols = heightMap[0].length;
        
        // Criar uma cópia da matriz para usar como referência durante o smoothing
        const originalMap = Array(rows);
        for (let i = 0; i < rows; i++) {
            originalMap[i] = [...heightMap[i]];
        }
        
        // Passar um kernel de suavização 3x3
        const smoothingFactor = 0.5; // Ajustar entre 0 (sem suavização) e 1 (suavização máxima)
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Se as bordas estão fixas, pular os vértices das bordas
                if (bordersFixed && (row === 0 || row === rows - 1 || col === 0 || col === cols - 1)) {
                    continue;
                }
                
                // Acumular alturas dos vizinhos
                let sum = 0;
                let count = 0;
                
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = row + dr;
                        const nc = col + dc;
                        
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            sum += originalMap[nr][nc];
                            count++;
                        }
                    }
                }
                
                const average = sum / count;
                
                // Interpolar entre o valor original e a média para controlar a suavização
                heightMap[row][col] = originalMap[row][col] * (1 - smoothingFactor) + average * smoothingFactor;
            }
        }
    }
    
    // Extrair e armazenar alturas das bordas para uso futuro
    _extractAndStoreBorderHeights(chunkX, chunkZ, heightMap, cornerHeights) {
        const borderHeights = {
            north: [...heightMap[0]],
            south: [...heightMap[heightMap.length - 1]],
            west: heightMap.map(row => row[0]),
            east: heightMap.map(row => row[row.length - 1]),
            cornerNW: cornerHeights.NW,
            cornerNE: cornerHeights.NE,
            cornerSW: cornerHeights.SW,
            cornerSE: cornerHeights.SE
        };
        
        // Armazenar no sistema de cache
        this._storeBorderHeightsInCache(chunkX, chunkZ, borderHeights);
        
        return borderHeights;
    }
    
    // Buscar dados de borda de todos os vizinhos
    async _fetchAllNeighborBorderData(chunkX, chunkZ) {
        const borders = {
            north: await this._getBorderData(chunkX, chunkZ - 1, 'south'),
            south: await this._getBorderData(chunkX, chunkZ + 1, 'north'),
            west: await this._getBorderData(chunkX - 1, chunkZ, 'east'),
            east: await this._getBorderData(chunkX + 1, chunkZ, 'west')
        };
        
        return borders;
    }
    
    // Resolver alturas dos cantos de forma consistente
    async _resolveCornerHeights(chunkX, chunkZ, neighborBorders) {
        // Sistema coordenado dos cantos:
        //  NW --- N --- NE
        //  |             |
        //  W      C      E
        //  |             |
        //  SW --- S --- SE
        
        // Inicializar com valores default
        const corners = { 
            NW: null, 
            NE: null, 
            SW: null, 
            SE: null 
        };
        
        // Verificar se os dados dos cantos já existem no cache ou nos chunks
        // Ordem de prioridade: chunks carregados > cache > novo cálculo
        
        // 1. Canto Noroeste (compartilhado por 4 chunks)
        corners.NW = await this._resolveCornerHeight(
            chunkX, chunkZ, 'NW',
            // Candidatos possíveis para este canto
            [
                { ch: { x: chunkX - 1, z: chunkZ - 1 }, corner: 'SE' },
                { ch: { x: chunkX, z: chunkZ - 1 }, corner: 'SW' },
                { ch: { x: chunkX - 1, z: chunkZ }, corner: 'NE' }
            ],
            // Bordas que terminam neste canto
            neighborBorders.north ? neighborBorders.north[0] : null,
            neighborBorders.west ? neighborBorders.west[0] : null
        );
        
        // 2. Canto Nordeste
        corners.NE = await this._resolveCornerHeight(
            chunkX, chunkZ, 'NE',
            [
                { ch: { x: chunkX + 1, z: chunkZ - 1 }, corner: 'SW' },
                { ch: { x: chunkX, z: chunkZ - 1 }, corner: 'SE' },
                { ch: { x: chunkX + 1, z: chunkZ }, corner: 'NW' }
            ],
            neighborBorders.north ? neighborBorders.north[neighborBorders.north.length - 1] : null,
            neighborBorders.east ? neighborBorders.east[0] : null
        );
        
        // 3. Canto Sudoeste
        corners.SW = await this._resolveCornerHeight(
            chunkX, chunkZ, 'SW',
            [
                { ch: { x: chunkX - 1, z: chunkZ + 1 }, corner: 'NE' },
                { ch: { x: chunkX, z: chunkZ + 1 }, corner: 'NW' },
                { ch: { x: chunkX - 1, z: chunkZ }, corner: 'SE' }
            ],
            neighborBorders.south ? neighborBorders.south[0] : null,
            neighborBorders.west ? neighborBorders.west[neighborBorders.west.length - 1] : null
        );
        
        // 4. Canto Sudeste
        corners.SE = await this._resolveCornerHeight(
            chunkX, chunkZ, 'SE',
            [
                { ch: { x: chunkX + 1, z: chunkZ + 1 }, corner: 'NW' },
                { ch: { x: chunkX, z: chunkZ + 1 }, corner: 'NE' },
                { ch: { x: chunkX + 1, z: chunkZ }, corner: 'SW' }
            ],
            neighborBorders.south ? neighborBorders.south[neighborBorders.south.length - 1] : null,
            neighborBorders.east ? neighborBorders.east[neighborBorders.east.length - 1] : null
        );
        
        return corners;
    }
    
    // Resolver altura de um único canto
    async _resolveCornerHeight(chunkX, chunkZ, cornerPosition, neighbors, borderValue1, borderValue2) {
        // 1. Verificar se já existe no cache para este chunk
        let height = await this._getCornerFromCache(chunkX, chunkZ, cornerPosition);
        if (height !== null) return height;
        
        // 2. Verificar em chunks vizinhos (cantos são compartilhados por até 4 chunks)
        for (const neighbor of neighbors) {
            height = await this._getCornerFromCache(neighbor.ch.x, neighbor.ch.z, neighbor.corner);
            if (height !== null) return height;
        }
        
        // 3. Verificar se as bordas têm valores compatíveis
        if (borderValue1 !== null && borderValue2 !== null) {
            // Se as bordas têm valores próximos, usamos a média
            if (Math.abs(borderValue1 - borderValue2) < 0.5) {
                height = (borderValue1 + borderValue2) / 2;
                return height;
            }
        }
        
        // 4. Se um valor de borda está disponível, usamos com pequeno offset aleatório
        if (borderValue1 !== null) {
            const offset = (this._getNoise(chunkX * 100 + 50, chunkZ * 100 + 50) - 0.5) * 0.2;
            height = borderValue1 + offset;
            return height;
        }
        
        if (borderValue2 !== null) {
            const offset = (this._getNoise(chunkX * 100 + 70, chunkZ * 100 + 70) - 0.5) * 0.2;
            height = borderValue2 + offset;
            return height;
        }
        
        // 5. Última opção: calcular novo valor de altura
        // Determinar bioma neste ponto
        const biome = this.gameInstance?.biomeManager?.getBiomeAt(
            chunkX * this.chunkSize, 
            chunkZ * this.chunkSize
        ) || 'plains';
        
        // Posição do mundo para este canto
        let worldX, worldZ;
        
        // Determinar posição do mundo baseada no canto
        switch (cornerPosition) {
            case 'NW':
                worldX = chunkX * this.chunkSize - this.groundSize/2;
                worldZ = chunkZ * this.chunkSize - this.groundSize/2;
                break;
            case 'NE':
                worldX = chunkX * this.chunkSize + this.groundSize/2;
                worldZ = chunkZ * this.chunkSize - this.groundSize/2;
                break;
            case 'SW':
                worldX = chunkX * this.chunkSize - this.groundSize/2;
                worldZ = chunkZ * this.chunkSize + this.groundSize/2;
                break;
            case 'SE':
                worldX = chunkX * this.chunkSize + this.groundSize/2;
                worldZ = chunkZ * this.chunkSize + this.groundSize/2;
                break;
        }
        
        // Calcular altura procedural para este ponto
        height = this._calculateTerrainHeight(worldX, worldZ, biome);
        
        // Armazenar no cache para uso futuro e consistência
        this._storeCornerHeightInCache(chunkX, chunkZ, cornerPosition, height);
        
        // Também propagar para todos os chunks vizinhos que compartilham este canto
        for (const neighbor of neighbors) {
            this._storeCornerHeightInCache(neighbor.ch.x, neighbor.ch.z, neighbor.corner, height);
        }
        
        return height;
    }
    
    // Buscar dados de borda do cache ou chunks carregados
    async _getBorderData(chunkX, chunkZ, borderName) {
        const chunkId = `${chunkX},${chunkZ}`;
        
        // 1. Tentar obter do cache de bordas
        const cachedBorders = this.borderHeightCache.get(chunkId);
        if (cachedBorders && cachedBorders[borderName]) {
            return cachedBorders[borderName];
        }
        
        // 2. Tentar obter de um chunk carregado
        const loadedChunk = this.gameInstance?.loadedChunks?.get(chunkId);
        if (loadedChunk?.terrain && loadedChunk.terrain.length > 0) {
            const chunkMesh = loadedChunk.terrain[0];
            if (chunkMesh.metadata?.borderHeights?.[borderName]) {
                return chunkMesh.metadata.borderHeights[borderName];
            }
        }
        
        // 3. Se não encontrar, retornar null
        return null;
    }
    
    // Obter altura de um canto específico do cache
    async _getCornerFromCache(chunkX, chunkZ, cornerPosition) {
        const chunkId = `${chunkX},${chunkZ}`;
        const cornerProp = `corner${cornerPosition}`;
        
        // 1. Tentar obter do cache
        const cachedBorders = this.borderHeightCache.get(chunkId);
        if (cachedBorders && cachedBorders[cornerProp] !== undefined) {
            return cachedBorders[cornerProp];
        }
        
        // 2. Tentar obter de um chunk carregado
        const loadedChunk = this.gameInstance?.loadedChunks?.get(chunkId);
        if (loadedChunk?.terrain && loadedChunk.terrain.length > 0) {
            const chunkMesh = loadedChunk.terrain[0];
            if (chunkMesh.metadata?.cornerHeights?.[cornerPosition]) {
                return chunkMesh.metadata.cornerHeights[cornerPosition];
            }
        }
        
        // 3. Se não encontrar, retornar null
        return null;
    }
    
    // Armazenar dados de borda no cache
    _storeBorderHeightsInCache(chunkX, chunkZ, borderHeights) {
        const chunkId = `${chunkX},${chunkZ}`;
        
        // Criar ou obter entrada do cache
        let cacheEntry = this.borderHeightCache.get(chunkId);
        if (!cacheEntry) {
            cacheEntry = {};
            this.borderHeightCache.set(chunkId, cacheEntry);
        }
        
        // Armazenar dados
        cacheEntry.north = borderHeights.north;
        cacheEntry.south = borderHeights.south;
        cacheEntry.east = borderHeights.east;
        cacheEntry.west = borderHeights.west;
        cacheEntry.cornerNW = borderHeights.cornerNW;
        cacheEntry.cornerNE = borderHeights.cornerNE;
        cacheEntry.cornerSW = borderHeights.cornerSW;
        cacheEntry.cornerSE = borderHeights.cornerSE;
        
        // Propagar para chunks vizinhos - essencial para consistência
        // Borda norte -> borda sul do chunk ao norte
        this._propagateBorder(chunkX, chunkZ - 1, 'south', borderHeights.north);
        
        // Borda sul -> borda norte do chunk ao sul
        this._propagateBorder(chunkX, chunkZ + 1, 'north', borderHeights.south);
        
        // Borda oeste -> borda leste do chunk a oeste
        this._propagateBorder(chunkX - 1, chunkZ, 'east', borderHeights.west);
        
        // Borda leste -> borda oeste do chunk a leste
        this._propagateBorder(chunkX + 1, chunkZ, 'west', borderHeights.east);
    }
    
    // Propagar borda para um chunk vizinho
    _propagateBorder(chunkX, chunkZ, borderName, heightArray) {
        if (!heightArray) return;
        
        const chunkId = `${chunkX},${chunkZ}`;
        
        // Criar ou obter entrada do cache
        let cacheEntry = this.borderHeightCache.get(chunkId);
        if (!cacheEntry) {
            cacheEntry = {};
            this.borderHeightCache.set(chunkId, cacheEntry);
        }
        
        // Armazenar a borda
        cacheEntry[borderName] = heightArray;
    }
    
    // Armazenar altura de um canto específico no cache
    _storeCornerHeightInCache(chunkX, chunkZ, cornerPosition, height) {
        const chunkId = `${chunkX},${chunkZ}`;
        const cornerProp = `corner${cornerPosition}`;
        
        // Criar ou obter entrada do cache
        let cacheEntry = this.borderHeightCache.get(chunkId);
        if (!cacheEntry) {
            cacheEntry = {};
            this.borderHeightCache.set(chunkId, cacheEntry);
        }
        
        // Armazenar a altura do canto
        cacheEntry[cornerProp] = height;
    }
    
    // Aplicar blending de biomas para transições suaves
    _applyBiomeBlending(height, x, z, centerBiome, neighborBiomes) {
        // Distância do centro do chunk (para blending de biomas)
        const chunkCenterX = Math.floor(x / this.chunkSize) * this.chunkSize + this.chunkSize/2;
        const chunkCenterZ = Math.floor(z / this.chunkSize) * this.chunkSize + this.chunkSize/2;
        
        const distX = Math.abs(x - chunkCenterX) / (this.chunkSize/2);
        const distZ = Math.abs(z - chunkCenterZ) / (this.chunkSize/2);
        
        // Só fazer blending perto das bordas (30% externos do chunk)
        if (distX > 0.7 || distZ > 0.7) {
            let blendedHeight = height;
            let totalWeight = 1.0; // Peso para o bioma central
            
            // Determinar quais vizinhos usar para blending
            const isNorth = z < chunkCenterZ;
            const isSouth = z > chunkCenterZ;
            const isWest = x < chunkCenterX;
            const isEast = x > chunkCenterX;
            
            // Calcular pesos de blending baseados na posição
            // Usando função suavizada para melhor transição
            let northWeight = isNorth ? this._smoothstep(distZ * 0.8) : 0;
            let southWeight = isSouth ? this._smoothstep(distZ * 0.8) : 0;
            let westWeight = isWest ? this._smoothstep(distX * 0.8) : 0;
            let eastWeight = isEast ? this._smoothstep(distX * 0.8) : 0;
            
            // Pesos para os cantos
            let northeastWeight = (isNorth && isEast) ? this._smoothstep(distX * distZ * 0.6) : 0;
            let northwestWeight = (isNorth && isWest) ? this._smoothstep(distX * distZ * 0.6) : 0;
            let southeastWeight = (isSouth && isEast) ? this._smoothstep(distX * distZ * 0.6) : 0;
            let southwestWeight = (isSouth && isWest) ? this._smoothstep(distX * distZ * 0.6) : 0;
            
            // Aplicar blending de alturas dos biomas vizinhos
            
            // Norte
            if (northWeight > 0 && neighborBiomes.north) {
                const northHeight = this._calculateTerrainHeight(x, z, neighborBiomes.north);
                blendedHeight += northHeight * northWeight;
                totalWeight += northWeight;
            }
            
            // Sul
            if (southWeight > 0 && neighborBiomes.south) {
                const southHeight = this._calculateTerrainHeight(x, z, neighborBiomes.south);
                blendedHeight += southHeight * southWeight;
                totalWeight += southWeight;
            }
            
            // Leste
            if (eastWeight > 0 && neighborBiomes.east) {
                const eastHeight = this._calculateTerrainHeight(x, z, neighborBiomes.east);
                blendedHeight += eastHeight * eastWeight;
                totalWeight += eastWeight;
            }
            
            // Oeste
            if (westWeight > 0 && neighborBiomes.west) {
                const westHeight = this._calculateTerrainHeight(x, z, neighborBiomes.west);
                blendedHeight += westHeight * westWeight;
                totalWeight += westWeight;
            }
            
            // Adicionar influências dos cantos
            
            // Nordeste
            if (northeastWeight > 0 && neighborBiomes.northeast) {
                const neHeight = this._calculateTerrainHeight(x, z, neighborBiomes.northeast);
                blendedHeight += neHeight * northeastWeight;
                totalWeight += northeastWeight;
            }
            
            // Noroeste
            if (northwestWeight > 0 && neighborBiomes.northwest) {
                const nwHeight = this._calculateTerrainHeight(x, z, neighborBiomes.northwest);
                blendedHeight += nwHeight * northwestWeight;
                totalWeight += northwestWeight;
            }
            
            // Sudeste
            if (southeastWeight > 0 && neighborBiomes.southeast) {
                const seHeight = this._calculateTerrainHeight(x, z, neighborBiomes.southeast);
                blendedHeight += seHeight * southeastWeight;
                totalWeight += southeastWeight;
            }
            
            // Sudoeste
            if (southwestWeight > 0 && neighborBiomes.southwest) {
                const swHeight = this._calculateTerrainHeight(x, z, neighborBiomes.southwest);
                blendedHeight += swHeight * southwestWeight;
                totalWeight += southwestWeight;
            }
            
            // Normalizar pelo peso total
            return blendedHeight / totalWeight;
        }
        
        return height;
    }
}

export default WorldGenerator;