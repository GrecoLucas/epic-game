// WorldGenerator.js - Gerador de terreno procedural para o mundo aberto

class WorldGenerator {
    constructor(scene, gameInstance, seed) {
        this.scene = scene;
        this.gameInstance = gameInstance;
        this.seed = seed || Math.floor(Math.random() * 1000000);
        
        // Configurações do terreno
        this.chunkSize = gameInstance.chunkSize || 16;
        this.groundSize = this.chunkSize * 1.01; // Leve sobreposição para evitar lacunas
        this.terrainSubdivisions = 32; // Maior para terreno mais detalhado
        this.terrainHeight = 15; // Altura máxima do terreno
        this.octaves = 4; // Quantidade de camadas de ruído (detalhes)
        this.persistence = 0.5; // Como as camadas influenciam umas às outras
        this.lacunarity = 2.0; // Frequência de cada camada
        this.baseRoughness = 1.0; // Detalhamento do terreno de base
        this.roughness = 2.7; // Multiplicador de rugosidade por oitava
        this.terrainMaterials = new Map(); // Cache de materiais por bioma
        
        // Inicializar sistema de geração de ruído
        this._initializeNoiseGenerator();
    }
    
    // Inicializar o gerador de ruído
    _initializeNoiseGenerator() {
        // Simples função de hash para ruído baseado em semente
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
    
    // Adicionar água a um chunk se for apropriado para o bioma
    async _addWaterToChunk(chunkX, chunkZ, groundMesh, biome) {
        // Verificar se bioma precisa de água
        if (!['swamp', 'forest'].includes(biome)) {
            return null;
        }
        
        // Calcular posição real do chunk no mundo
        const worldX = chunkX * this.chunkSize;
        const worldZ = chunkZ * this.chunkSize;
        
        // Determinar nível da água baseado no bioma
        let waterLevel = 0.5; // Nível padrão
        
        if (biome === 'swamp') {
            waterLevel = 0.7; // Pântanos têm mais água
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
        
        // Criar material da água
        const waterMaterial = new BABYLON.WaterMaterial(`water_${chunkX}_${chunkZ}`, this.scene);
        waterMaterial.backFaceCulling = true;
        waterMaterial.bumpTexture = new BABYLON.Texture("textures/waterbump.png", this.scene);
        
        // Configurar aparência da água baseado no bioma
        if (biome === 'swamp') {
            waterMaterial.waterColor = new BABYLON.Color3(0.1, 0.2, 0.1);
            waterMaterial.colorBlendFactor = 0.5;
            waterMaterial.waveHeight = 0.1;
            waterMaterial.waveLength = 0.5;
        } else {
            waterMaterial.waterColor = new BABYLON.Color3(0.1, 0.3, 0.5);
            waterMaterial.colorBlendFactor = 0.3;
            waterMaterial.waveHeight = 0.3;
            waterMaterial.waveLength = 0.8;
        }
        
        // Configurar reflexões
        waterMaterial.windForce = 1.5;
        waterMaterial.windDirection = new BABYLON.Vector2(0, 1);
        waterMaterial.specularPower = 60;
        
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
        
        // Adicionar terreno à lista de refletores
        waterMaterial.addToRenderList(groundMesh);
        
        // Adicionar skybox à lista de refletores
        const skybox = this.scene.getMeshByName("skyBox");
        if (skybox) {
            waterMaterial.addToRenderList(skybox);
        }
        
        // Adicionar outros chunks próximos para reflexão mais realista
        const nearbyChunks = this._getNearbyChunks(chunkX, chunkZ, 1);
        for (const nearbyChunk of nearbyChunks) {
            const terrainMesh = this.scene.getMeshByName(`terrain_${nearbyChunk.x}_${nearbyChunk.z}`);
            if (terrainMesh) {
                waterMaterial.addToRenderList(terrainMesh);
            }
        }
        
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

    // Adicione este método para criar heightmap procedural
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
                    
                    // Usar função de ruído existente para gerar um valor de altura
                    // Normalizar coordenadas para o espaço de ruído
                    const nx = x / width;
                    const ny = y / height;
                    
                    // Use a função de ruído com múltiplas oitavas
                    const noiseValue = this._getNoise(nx * 10, ny * 10);
                    
                    // Converter para valor de pixel (0-255)
                    const pixelValue = Math.floor(noiseValue * 255);
                    
                    // Definir o valor em escala de cinza
                    imageData.data[idx] = pixelValue;     // R
                    imageData.data[idx + 1] = pixelValue; // G
                    imageData.data[idx + 2] = pixelValue; // B
                    imageData.data[idx + 3] = 255;        // A (opacidade total)
                }
            }
            
            // Atualizar o canvas com os dados gerados
            ctx.putImageData(imageData, 0, 0);
            
            // Converter para uma URL de dados
            const dataURL = canvas.toDataURL();
            
            // Criar uma imagem para carregar no Babylon
            const img = new Image();
            img.onload = () => {
                resolve(img);
            };
            img.src = dataURL;
        });
    }

    async generateChunkTerrain(chunkX, chunkZ, biome) {
        try {
            // Calcular posição real do chunk no mundo
            const worldX = chunkX * this.chunkSize;
            const worldZ = chunkZ * this.chunkSize;
            
            // Obter material apropriado para o bioma
            const biomeMaterial = this._getTerrainMaterial(biome);
            
            // Criar o terreno com CreateGround em vez de CreateGroundFromHeightMap
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
            
            // Calcular valores de altura para cada vértice
            const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            
            for (let i = 0; i < positions.length; i += 3) {
                // Posição local do vértice (x, y, z)
                const xPos = positions[i] + worldX;
                const zPos = positions[i + 2] + worldZ;
                
                // Gerar altura baseada no ruído
                let height = this._calculateTerrainHeight(xPos, zPos, biome);
                
                // Terreno mais baixo nos limites dos chunks para suavizar bordas
                const localX = positions[i];
                const localZ = positions[i + 2];
                
                const distFromEdgeX = Math.min(Math.abs(localX - this.groundSize/2), Math.abs(localX + this.groundSize/2));
                const distFromEdgeZ = Math.min(Math.abs(localZ - this.groundSize/2), Math.abs(localZ + this.groundSize/2));
                const distFromEdge = Math.min(distFromEdgeX, distFromEdgeZ);
                
                const edgeBlendDist = 1.0;
                
                if (distFromEdge < edgeBlendDist) {
                    const blendFactor = distFromEdge / edgeBlendDist;
                    height *= blendFactor;
                }
                
                // Aplicar a altura ao vértice
                positions[i + 1] = height;
            }
            
            // Atualizar o terreno com as novas alturas
            ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            
            // Calcular normais
            ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, []);
            BABYLON.VertexData.ComputeNormals(
                positions, 
                ground.getIndices(), 
                ground.getVerticesData(BABYLON.VertexBuffer.NormalKind)
            );
            
            // Adicionar interação física
            ground.checkCollisions = true;
            
            if (this.scene.getPhysicsEngine()) {
                try {
                    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
                        ground, 
                        BABYLON.PhysicsImpostor.HeightmapImpostor, 
                        { mass: 0, friction: 0.5, restitution: 0.2 }, 
                        this.scene
                    );
                } catch (e) {
                    console.warn("Não foi possível criar físicas para o terreno:", e);
                }
            }
            
            // Adicionar metadados para identificação
            ground.metadata = {
                isChunkTerrain: true,
                chunkX: chunkX,
                chunkZ: chunkZ,
                biome: biome
            };
            
            // Adicionar água se o bioma justificar
            if (['swamp', 'forest'].includes(biome)) {
                const waterMesh = await this._addWaterToChunk(chunkX, chunkZ, ground, biome);
                if (waterMesh) {
                    return [ground, waterMesh];
                }
            }
            
            return [ground];
        } catch (error) {
            console.error("Erro ao gerar chunk de terreno:", error);
            
            // Criar um terreno plano como fallback
            const fallbackGround = BABYLON.MeshBuilder.CreateGround(
                `terrain_fallback_${chunkX}_${chunkZ}`,
                { width: this.groundSize, height: this.groundSize, subdivisions: 2 },
                this.scene
            );
            
            fallbackGround.position.x = chunkX * this.chunkSize;
            fallbackGround.position.z = chunkZ * this.chunkSize;
            fallbackGround.checkCollisions = true;
            
            const fallbackMaterial = new BABYLON.StandardMaterial(`fallback_material_${chunkX}_${chunkZ}`, this.scene);
            fallbackMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            fallbackGround.material = fallbackMaterial;
            
            fallbackGround.metadata = {
                isChunkTerrain: true,
                chunkX: chunkX,
                chunkZ: chunkZ,
                biome: 'fallback'
            };
            
            return [fallbackGround];
        }
    }
}

export default WorldGenerator;