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
        this.meshes.push(floor);
    }
    
    // Criar paredes do labirinto
    createWalls(layout, dimensions) {
        const rows = layout.length;
        const cols = layout[0].length;
        const offsetX = (cols * dimensions.cellSize) / 2;
        const offsetZ = (rows * dimensions.cellSize) / 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Se não for uma parede (valor 1), pular
                if (layout[row][col] !== 1) continue;

                // Calcular posição no mundo
                const x = (col * dimensions.cellSize) - offsetX + (dimensions.cellSize / 2);
                const z = (row * dimensions.cellSize) - offsetZ + (dimensions.cellSize / 2);
                const wallName = `wall_${row}_${col}`; // Nome único

                // Criar a parede como um mesh individual
                const wall = BABYLON.MeshBuilder.CreateBox(
                    wallName, 
                    {
                        width: dimensions.cellSize,
                        height: dimensions.wallHeight,
                        depth: dimensions.cellSize
                    },
                    this.scene
                );
                wall.position = new BABYLON.Vector3(x, dimensions.wallHeight / 2, z);

                // Aplicar material e colisões diretamente à parede individual
                // Clonar material para permitir modificações individuais (dano visual)
                wall.material = this.wallMaterial.clone(`${wallName}_material`); 

                // Adicionar metadados para identificar a posição da grade (opcional, mas útil)
                wall.metadata = { type: "wall", gridRow: row, gridCol: col };

                // Adicionar a parede individual à lista de meshes da view
                this.meshes.push(wall);
            }
        }

    }
    
    // Criar rampas com base nas posições
        createRamps(rampPositions, dimensions) {
            for (const position of rampPositions) {
                // Determinar a altura final (topo da parede)
                const wallTopHeight = dimensions.wallHeight;
                
                // Calcular o comprimento da rampa necessário para atingir a altura da parede
                const rampLength = wallTopHeight / Math.sin(Math.PI / 6);            
                // Dimensões da rampa
                const width = dimensions.cellSize;
                const height = wallTopHeight;
                const depth = rampLength;
                
                // Criar um triângulo retângulo sólido usando vértices personalizados
                // Usar row, col e direction para um nome único
                const rampName = `ramp_${position.row}_${position.col}_${position.direction}`;
                
                // Definir os vértices do triângulo retângulo sólido
                const positions = [];
                const indices = [];
                const normals = [];
                const uvs = [];
                
                // Dependendo da direção, definimos os vértices para formar um triângulo retângulo sólido
                switch (position.direction) {
                    case 'south': {
                        // Inclinação de sul para norte
                        positions.push(
                            // Face inferior (retângulo)
                            -width/2, 0, -depth/2,  // 0: esquerda frontal inferior
                            width/2, 0, -depth/2,   // 1: direita frontal inferior
                            width/2, 0, depth/2,    // 2: direita traseira inferior
                            -width/2, 0, depth/2,   // 3: esquerda traseira inferior
                            
                            // Face superior (triângulo inclinado)
                            -width/2, height, -depth/2,  // 4: esquerda frontal superior
                            width/2, height, -depth/2,   // 5: direita frontal superior
                            width/2, 0, depth/2,    // 6: direita traseira inferior (mesmo que 2)
                            -width/2, 0, depth/2    // 7: esquerda traseira inferior (mesmo que 3)
                        );
                        
                        // Corrigindo orientação das faces para sentido anti-horário consistente
                        indices.push(
                            // Base (face inferior) - normal para baixo
                            0, 2, 1,
                            0, 3, 2,
                            
                            // Face frontal (retângulo vertical) - normal para frente
                            0, 1, 5,
                            0, 5, 4,
                            
                            // Face traseira (retângulo horizontal) - normal para trás
                            3, 6, 2,
                            3, 7, 6,
                            
                            // Face lateral esquerda (triângulo) - normal para esquerda
                            0, 4, 7,
                            0, 7, 3,
                            
                            // Face lateral direita (triângulo) - normal para direita
                            1, 2, 6,
                            1, 6, 5,
                            
                            // Face superior (rampa) - normal para cima/diagonal
                            4, 5, 6,
                            4, 6, 7
                        );
                        break;
                    }
                    case 'east': {
                        // Inclinação de leste para oeste
                        positions.push(
                            // Face inferior (retângulo)
                            -depth/2, 0, -width/2,  // 0: frontal esquerda inferior
                            depth/2, 0, -width/2,   // 1: frontal direita inferior
                            depth/2, 0, width/2,    // 2: traseira direita inferior
                            -depth/2, 0, width/2,   // 3: traseira esquerda inferior
                            
                            // Face superior (triângulo inclinado)
                            -depth/2, 0, -width/2,      // 4: frontal esquerda inferior (mesmo que 0)
                            depth/2, height, -width/2,  // 5: frontal direita superior
                            depth/2, height, width/2,   // 6: traseira direita superior
                            -depth/2, 0, width/2        // 7: traseira esquerda inferior (mesmo que 3)
                        );
                        
                        // Corrigindo orientação das faces para sentido anti-horário consistente
                        indices.push(
                            // Base (face inferior) - normal para baixo
                            0, 2, 1,
                            0, 3, 2,
                            
                            // Face frontal (retângulo inclinado) - normal para frente
                            0, 1, 5,
                            0, 5, 4,
                            
                            // Face traseira (retângulo inclinado) - normal para trás
                            3, 6, 2,
                            3, 7, 6,
                            
                            // Face lateral esquerda (retângulo plano) - normal para esquerda
                            0, 4, 7,
                            0, 7, 3,
                            
                            // Face lateral direita (inclinada) - normal para direita
                            1, 2, 6,
                            1, 6, 5,
                            
                            // Face superior (inclinada) - normal para cima
                            4, 5, 6,
                            4, 6, 7
                        );
                        break;
                    }
                    default: {
                        // Se por algum motivo uma direção inválida for passada, não faz nada
                        console.warn(`Direção de rampa desconhecida ou removida: ${position.direction}`);
                        continue; // Pula para a próxima posição de rampa
                    }
                }
                
                // Criar a malha do triângulo da rampa
                const ramp = new BABYLON.Mesh(rampName, this.scene);
                
                // Definir os dados de vértices
                const vertexData = new BABYLON.VertexData();
                vertexData.positions = positions;
                vertexData.indices = indices;
                
                // Usar o método BABYLON para calcular normais (mais preciso que nosso cálculo manual)
                BABYLON.VertexData.ComputeNormals(positions, indices, normals);
                vertexData.normals = normals;
                
                // Criar coordenadas UV aprimoradas
                for (let i = 0; i < positions.length / 3; i++) {
                    // Mapear UVs com base na altura para melhor mapeamento de textura
                    const vertexIndex = i * 3;
                    const y = positions[vertexIndex + 1]; // Componente Y
                    
                    // Normalizamos a altura para o mapeamento UV
                    const v = y / height;
                    
                    // Para o componente U, usamos uma combinação de X e Z para evitar distorções
                    const x = positions[vertexIndex];
                    const z = positions[vertexIndex + 2];
                    
                    // Normalizar para coordenadas UV (0-1)
                    const u = (x / width + 0.5 + z / depth + 0.5) / 2;
                    
                    uvs.push(u, v);
                }
                vertexData.uvs = uvs;
                
                // Aplicar dados à malha
                vertexData.applyToMesh(ramp);
                
                // Adicionar metadados para identificar a rampa
                ramp.metadata = { type: "ramp", row: position.row, col: position.col, direction: position.direction };

                // Garantir que as normais estejam otimizadas para iluminação
                ramp.forceSharedVertices();
                
                // Posicionar a rampa
                let posX = position.x;
                let posZ = position.z;
                let offsetX = 0;
                let offsetZ = 0;
                
                // Calcular deslocamento baseado na direção
                switch (position.direction) {
                    case 'north':
                        offsetZ = depth / 2 - dimensions.cellSize / 2;
                        break;
                    case 'south':
                        offsetZ = -depth / 2 + dimensions.cellSize / 2;
                        break;
                    case 'east':
                        offsetX = depth / 2 - dimensions.cellSize / 2;
                        break;
                    case 'west':
                        offsetX = -depth / 2 + dimensions.cellSize / 2;
                        break;
                    default:
                        offsetZ = depth / 2 - dimensions.cellSize / 2;
                }
                
                // Posicionar a rampa
                ramp.position = new BABYLON.Vector3(
                    posX + offsetX,
                    0,
                    posZ + offsetZ
                );
                
                // Habilitar back-face culling para evitar problemas de rendering
                const rampMaterial = this.rampMaterial.clone(rampName + "_material");
                rampMaterial.backFaceCulling = false;  // Desabilite o backface culling 
                rampMaterial.twoSidedLighting = true;  // Habilite iluminação de dois lados
                ramp.material = rampMaterial;
                
                // Verificar se a física está habilitada antes de criar o impostor
                if (this.scene.getPhysicsEngine()) {
                    ramp.physicsImpostor = new BABYLON.PhysicsImpostor(
                        ramp, 
                        BABYLON.PhysicsImpostor.MeshImpostor,
                        { 
                            mass: 0, 
                            friction: 0.5, 
                            restitution: 0.1 
                        }, 
                        this.scene
                    );
                } else {
                    console.warn("Física não habilitada. Impostor físico não criado para a rampa:", rampName);
                }
                
                this.meshes.push(ramp);
            }
        }

    // Método para destruir a *representação visual* da parede
    destroyWallVisual(wallName, position) {
        const wallMesh = this.scene.getMeshByName(wallName);

        if (wallMesh) {
            if (wallMesh.metadata && wallMesh.metadata.isBeingDestroyed) {
                return true; // Já está sendo destruído, evitar loop recursivo
            }
            if (wallMesh.metadata) {
                wallMesh.metadata.isBeingDestroyed = true;
            }
            // Verificar se há blocos dependentes que precisam ser destruídos primeiro
            if (wallMesh.metadata && wallMesh.metadata.dependentBlocks && wallMesh.metadata.dependentBlocks.length > 0) {
                console.log(`${wallName} tem ${wallMesh.metadata.dependentBlocks.length} blocos dependentes que serão destruídos em cascata`);
                
                // Criar uma cópia da lista de dependentes para evitar problemas durante a iteração
                const dependentBlocks = [...wallMesh.metadata.dependentBlocks];
                
                // Destruir cada bloco dependente
                for (const dependentBlockName of dependentBlocks) {
                    const dependentMesh = this.scene.getMeshByName(dependentBlockName);
                    if (dependentMesh) {
                        // Determinar o tipo de estrutura para chamar o método correto
                        if (dependentBlockName.startsWith("playerWall_")) {
                            this.destroyWallVisual(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerRamp_")) {
                            this.destroyRampVisual(dependentBlockName, dependentMesh.position);
                        }
                    }
                }
            }
            
            // Remover a referência deste bloco do seu suporte, se houver
            if (wallMesh.metadata && wallMesh.metadata.supportingBlock) {
                const supportingMesh = this.scene.getMeshByName(wallMesh.metadata.supportingBlock);
                if (supportingMesh && supportingMesh.metadata && supportingMesh.metadata.dependentBlocks) {
                    // Remover este bloco da lista de dependentes do suporte
                    const index = supportingMesh.metadata.dependentBlocks.indexOf(wallName);
                    if (index !== -1) {
                        supportingMesh.metadata.dependentBlocks.splice(index, 1);
                        console.log(`Removida referência de ${wallName} da lista de dependentes de ${wallMesh.metadata.supportingBlock}`);
                    }
                }
            }

            // Efeito visual de destruição final
            this.createWallDestructionEffect(position); // Usar a posição do evento

            // Remover o mesh da cena
            wallMesh.dispose();

            // Remover da lista de meshes da view
            const index = this.meshes.indexOf(wallMesh);
            if (index > -1) {
                this.meshes.splice(index, 1);
            }
            return true;
        } else {
            return false;
        }
    }

    // Novo método para destruir a *representação visual* da rampa
    destroyRampVisual(rampName, position) {
        const rampMesh = this.scene.getMeshByName(rampName);

        if (rampMesh) {
            if (rampMesh.metadata && rampMesh.metadata.isBeingDestroyed) {
                return true; // Já está sendo destruído, evitar loop recursivo
            }
            
            // Marcar este mesh como "em processo de destruição"
            if (rampMesh.metadata) {
                rampMesh.metadata.isBeingDestroyed = true;
            }
            // Verificar se há blocos dependentes que precisam ser destruídos primeiro
            if (rampMesh.metadata && rampMesh.metadata.dependentBlocks && rampMesh.metadata.dependentBlocks.length > 0) {
                console.log(`${rampName} tem ${rampMesh.metadata.dependentBlocks.length} blocos dependentes que serão destruídos em cascata`);
                
                // Criar uma cópia da lista de dependentes para evitar problemas durante a iteração
                const dependentBlocks = [...rampMesh.metadata.dependentBlocks];
                
                // Destruir cada bloco dependente
                for (const dependentBlockName of dependentBlocks) {
                    const dependentMesh = this.scene.getMeshByName(dependentBlockName);
                    if (dependentMesh) {
                        // Determinar o tipo de estrutura para chamar o método correto
                        if (dependentBlockName.startsWith("playerWall_")) {
                            this.destroyWallVisual(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerRamp_")) {
                            this.destroyRampVisual(dependentBlockName, dependentMesh.position);
                        }
                    }
                }
            }
            
            // Remover a referência desta rampa do seu suporte, se houver
            if (rampMesh.metadata && rampMesh.metadata.supportingBlock) {
                const supportingMesh = this.scene.getMeshByName(rampMesh.metadata.supportingBlock);
                if (supportingMesh && supportingMesh.metadata && supportingMesh.metadata.dependentBlocks) {
                    // Remover esta rampa da lista de dependentes do suporte
                    const index = supportingMesh.metadata.dependentBlocks.indexOf(rampName);
                    if (index !== -1) {
                        supportingMesh.metadata.dependentBlocks.splice(index, 1);
                        console.log(`Removida referência de ${rampName} da lista de dependentes de ${rampMesh.metadata.supportingBlock}`);
                    }
                }
            }

            // Efeito visual de destruição (pode ser similar ao da parede)
            this.createWallDestructionEffect(position); // Reutilizar efeito

            // Remover o mesh da cena
            rampMesh.dispose();

            // Remover da lista de meshes da view
            const index = this.meshes.indexOf(rampMesh);
            if (index > -1) {
                this.meshes.splice(index, 1);
            }
            return true;
        } else {
            return false;
        }
    }

    // Novo método para aplicar efeito visual de dano à parede
    applyWallDamageVisual(wallName, remainingHealth, initialHealth) {
        const wallMesh = this.scene.getMeshByName(wallName);
        if (!wallMesh || !wallMesh.material) return;

        const damageRatio = 1 - (remainingHealth / initialHealth); // 0 = sem dano, 1 = destruído

        // Mudar cor para indicar dano (mais escuro/avermelhado)
        const baseColor = this.wallMaterial.diffuseColor || new BABYLON.Color3(1, 1, 1); // Cor base do material original
        // Certifique-se de que wallMesh.material existe antes de acessar suas propriedades
        if (wallMesh.material instanceof BABYLON.StandardMaterial) {
            wallMesh.material.diffuseColor = BABYLON.Color3.Lerp(baseColor, new BABYLON.Color3(0.5, 0.2, 0.2), damageRatio);
            // Adicionar um leve brilho vermelho
            wallMesh.material.emissiveColor = new BABYLON.Color3(damageRatio * 0.3, 0, 0);
        }

        // Criar um pequeno efeito de partículas no local (opcional)
        this.createWallDamageImpactEffect(wallMesh.position);

    }

    // Novo método para aplicar efeito visual de dano à rampa
    applyRampDamageVisual(rampName, remainingHealth, initialHealth) {
        const rampMesh = this.scene.getMeshByName(rampName);
        if (!rampMesh || !rampMesh.material) return;

        const damageRatio = 1 - (remainingHealth / initialHealth);

        // Mudar cor para indicar dano (similar à parede)
        const baseColor = this.rampMaterial.diffuseColor || new BABYLON.Color3(0.8, 0.7, 0.6);
        if (rampMesh.material instanceof BABYLON.StandardMaterial) {
            rampMesh.material.diffuseColor = BABYLON.Color3.Lerp(baseColor, new BABYLON.Color3(0.5, 0.2, 0.2), damageRatio);
            rampMesh.material.emissiveColor = new BABYLON.Color3(damageRatio * 0.3, 0, 0);
        }

        // Criar efeito de impacto (reutilizar o da parede)
        this.createWallDamageImpactEffect(rampMesh.position);

    }

    // Efeito de partículas para impacto de dano (menor que destruição)
    createWallDamageImpactEffect(position) {
        const impactSystem = new BABYLON.ParticleSystem("wallImpact", 50, this.scene);
        impactSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        impactSystem.emitter = position.clone();
        impactSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
        impactSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);

        impactSystem.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.8);
        impactSystem.color2 = new BABYLON.Color4(0.6, 0.6, 0.6, 0.5);
        impactSystem.colorDead = new BABYLON.Color4(0.4, 0.4, 0.4, 0.0);

        impactSystem.minSize = 0.05;
        impactSystem.maxSize = 0.15;
        impactSystem.minLifeTime = 0.2;
        impactSystem.maxLifeTime = 0.5;
        impactSystem.emitRate = 100;
        impactSystem.minEmitPower = 0.5;
        impactSystem.maxEmitPower = 1.5;
        impactSystem.gravity = new BABYLON.Vector3(0, -5, 0);
        impactSystem.disposeOnStop = true;

        impactSystem.start();
        setTimeout(() => impactSystem.stop(), 100); // Duração curta
    }

    // Método para criar efeito visual de detritos
    createWallDestructionEffect(position) {
        console.log(`VIEW: Criando efeito de destruição em [${position.x}, ${position.z}]`);
        
        // 1. Sistema de partículas para detritos
        const debrisSystem = new BABYLON.ParticleSystem("wallDebris", 200, this.scene);
        debrisSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        debrisSystem.emitter = new BABYLON.Vector3(position.x, 2, position.z);
        
        // Configurações aprimoradas para partículas
        debrisSystem.color1 = new BABYLON.Color4(0.7, 0.7, 0.7, 1.0);
        debrisSystem.color2 = new BABYLON.Color4(0.5, 0.5, 0.5, 1.0);
        debrisSystem.colorDead = new BABYLON.Color4(0.3, 0.3, 0.3, 0.0);
        
        debrisSystem.minSize = 0.2;
        debrisSystem.maxSize = 0.7;
        
        debrisSystem.minLifeTime = 1;
        debrisSystem.maxLifeTime = 3;
        
        debrisSystem.emitRate = 300;
        debrisSystem.minEmitPower = 3;
        debrisSystem.maxEmitPower = 7;
        
        debrisSystem.updateSpeed = 0.01;
        debrisSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
        
        // 2. Efeito de poeira (partículas menores e mais lentas)
        const dustSystem = new BABYLON.ParticleSystem("wallDust", 100, this.scene);
        dustSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        dustSystem.emitter = new BABYLON.Vector3(position.x, 2, position.z);
        
        dustSystem.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.4);
        dustSystem.color2 = new BABYLON.Color4(0.7, 0.7, 0.7, 0.2);
        dustSystem.colorDead = new BABYLON.Color4(0.5, 0.5, 0.5, 0.0);
        
        dustSystem.minSize = 0.1;
        dustSystem.maxSize = 0.3;
        
        dustSystem.minLifeTime = 2;
        dustSystem.maxLifeTime = 5;
        
        dustSystem.emitRate = 50;
        dustSystem.minEmitPower = 0.5;
        dustSystem.maxEmitPower = 1.5;
        
        dustSystem.updateSpeed = 0.005;
        
        // 3. Efeito de choque (flash de luz)
        const explosionLight = new BABYLON.PointLight("wallExplosionLight", new BABYLON.Vector3(position.x, 2, position.z), this.scene);
        explosionLight.diffuse = new BABYLON.Color3(1, 0.7, 0.3);
        explosionLight.specular = new BABYLON.Color3(1, 0.8, 0.3);
        explosionLight.intensity = 20;
        explosionLight.range = 15;
        
        // Iniciar os sistemas de partículas
        debrisSystem.start();
        dustSystem.start();
        
        // Programar a limpeza dos recursos
        setTimeout(() => {
            debrisSystem.stop();
            
            setTimeout(() => {
                if (debrisSystem) debrisSystem.dispose();
                if (explosionLight) explosionLight.dispose();
            }, 3000);
        }, 300);
        
        setTimeout(() => {
            dustSystem.stop();
            
            setTimeout(() => {
                if (dustSystem) dustSystem.dispose();
            }, 5000);
        }, 1000);
        
    }

    /**
     * Cria uma instância única de parede construída pelo jogador.
     * @param {BABYLON.Vector3} position Posição central da parede.
     * @param {number} cellSize O tamanho da célula da grade.
     * @returns {BABYLON.Mesh} O mesh da parede criada.
     */
    createPlayerWall(position, cellSize, initialHealth = 100) {
        // Use cellSize if provided, otherwise use default from the constructor
        const wallWidth = cellSize || this.cellSize || 4;
        
        const wall = BABYLON.MeshBuilder.CreateBox(`playerWall_${Date.now()}`, {
            width: wallWidth,
            height: this.wallMaterial?.wallHeight || 4, // Use optional chaining and default
            depth: wallWidth
        }, this.scene);
    
        wall.position = position;
        // Clone material safely
        wall.material = this.wallMaterial ? this.wallMaterial.clone(`playerWallMat_${wall.uniqueId}`) : 
                         new BABYLON.StandardMaterial(`playerWallMat_${wall.uniqueId}`, this.scene);
        wall.checkCollisions = true;
        wall.isPickable = true;
    
        // Adicionar tag para identificação e grid snapping
        BABYLON.Tags.AddTagsTo(wall, `cell_${position.x}_${position.z}`);
        
        // Inicializar a metadata como um objeto vazio se ainda não existir
        wall.metadata = wall.metadata || {};
        
        // Adicionar metadata para indicar que é uma superfície construível
        wall.metadata.isBuildableSurface = true;
        wall.metadata.isPlayerBuilt = true;
        wall.metadata.initialHealth = initialHealth || 100; // Garantir um valor padrão
        wall.metadata.health = initialHealth || 100; // Garantir um valor padrão
        
        // Novo: Adicionar metadados para rastreamento de dependências
        wall.metadata.supportingBlock = null; // Bloco que está abaixo (suporte)
        wall.metadata.dependentBlocks = []; // Blocos que estão acima (dependentes)
        
        // Novo: Verificar se há um bloco abaixo para registrar as dependências
        const supportCheckPosition = position.clone();
        supportCheckPosition.y -= (this.wallMaterial?.wallHeight || 4) / 2; // Metade da altura para baixo
        
        // Verificar se há algo abaixo para registrar como suporte
        const ray = new BABYLON.Ray(
            supportCheckPosition,
            new BABYLON.Vector3(0, -1, 0), // Direção para baixo
            0.1 // Pequena distância
        );
        
        const hit = this.scene.pickWithRay(ray, mesh => 
            mesh.isPickable && 
            (mesh.name.startsWith("playerWall_") || mesh.name.startsWith("playerRamp_"))
        );
        
        if (hit && hit.pickedMesh) {
            // Registrar o bloco abaixo como suporte
            wall.metadata.supportingBlock = hit.pickedMesh.name;
            
            // Registrar este bloco como dependente no bloco abaixo
            if (hit.pickedMesh.metadata && Array.isArray(hit.pickedMesh.metadata.dependentBlocks)) {
                hit.pickedMesh.metadata.dependentBlocks.push(wall.name);
                console.log(`${wall.name} está apoiado em ${hit.pickedMesh.name}`);
            }
        }
        
        console.log(`Created player wall with metadata:`, wall.metadata);
    
        // Adicionar física se necessário (exemplo básico)
        if (this.scene.getPhysicsEngine()?.getPhysicsPlugin()) {
            wall.physicsImpostor = new BABYLON.PhysicsImpostor(wall, BABYLON.PhysicsImpostor.BoxImpostor, 
                                  { mass: 0, restitution: 0.1 }, this.scene);
        } else {
             console.warn("Physics not enabled, skipping impostor for player wall.");
        }
    
        console.log(`Created player wall at ${position} with health ${initialHealth}`);
        this.meshes.push(wall);
        return wall;
    }

    /**
     * Cria uma instância única de rampa construída pelo jogador.
     * @param {BABYLON.Vector3} position Posição da base da rampa.
     * @param {number} rotationY Rotação em radianos no eixo Y.
     * @param {number} cellSize O tamanho da célula da grade.
     * @param {string} direction A direção da rampa ('east' ou 'south').
     * @param {number} initialHealth A vida inicial da rampa.
     * @returns {BABYLON.Mesh} O mesh da rampa criada.
     */
    createPlayerRamp(position, rotationY, cellSize, direction = 'east', initialHealth = 150) {
        // Use cellSize if provided, otherwise fallback
        const rampWidth = cellSize || this.cellSize || 4;
        const rampHeight = this.wallMaterial?.wallHeight || 4;
        const rampDepth = rampWidth; // Usar a mesma largura para profundidade

        // Criar a forma da rampa - versão mais elaborada
        // A direção determina como a rampa está orientada
        const rampName = `playerRamp_${direction}_${Date.now()}`;

        // Definir os vértices do triângulo retângulo sólido (similar à lógica existente em createRamps)
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];
        
        // Configurar geometria baseada na direção
        if (direction === 'south') { // Inclinação de sul para norte
            positions.push(
                // Face inferior (retângulo)
                -rampWidth/2, 0, -rampDepth/2,  // 0: esquerda frontal inferior
                rampWidth/2, 0, -rampDepth/2,   // 1: direita frontal inferior
                rampWidth/2, 0, rampDepth/2,    // 2: direita traseira inferior
                -rampWidth/2, 0, rampDepth/2,   // 3: esquerda traseira inferior
                
                // Face superior (triângulo inclinado)
                -rampWidth/2, rampHeight, -rampDepth/2,  // 4: esquerda frontal superior
                rampWidth/2, rampHeight, -rampDepth/2,   // 5: direita frontal superior
                rampWidth/2, 0, rampDepth/2,    // 6: direita traseira inferior (mesmo que 2)
                -rampWidth/2, 0, rampDepth/2    // 7: esquerda traseira inferior (mesmo que 3)
            );
            
            // Indices para definir as faces (triângulos) da malha
            indices.push(
                // Base (face inferior) - normal para baixo
                0, 2, 1,
                0, 3, 2,
                
                // Face frontal (retângulo vertical) - normal para frente
                0, 1, 5,
                0, 5, 4,
                
                // Face traseira (retângulo horizontal) - normal para trás
                3, 6, 2,
                3, 7, 6,
                
                // Face lateral esquerda (triângulo) - normal para esquerda
                0, 4, 7,
                0, 7, 3,
                
                // Face lateral direita (triângulo) - normal para direita
                1, 2, 6,
                1, 6, 5,
                
                // Face superior (rampa) - normal para cima/diagonal
                4, 5, 6,
                4, 6, 7
            );
        } else { // Padrão: 'east' - Inclinação de leste para oeste
            positions.push(
                // Face inferior (retângulo)
                -rampDepth/2, 0, -rampWidth/2,  // 0: frontal esquerda inferior
                rampDepth/2, 0, -rampWidth/2,   // 1: frontal direita inferior
                rampDepth/2, 0, rampWidth/2,    // 2: traseira direita inferior
                -rampDepth/2, 0, rampWidth/2,   // 3: traseira esquerda inferior
                
                // Face superior (triângulo inclinado)
                -rampDepth/2, 0, -rampWidth/2,      // 4: frontal esquerda inferior (mesmo que 0)
                rampDepth/2, rampHeight, -rampWidth/2,  // 5: frontal direita superior
                rampDepth/2, rampHeight, rampWidth/2,   // 6: traseira direita superior
                -rampDepth/2, 0, rampWidth/2        // 7: traseira esquerda inferior (mesmo que 3)
            );
            
            // Indices para definir as faces (triângulos) da malha
            indices.push(
                // Base (face inferior) - normal para baixo
                0, 2, 1,
                0, 3, 2,
                
                // Face frontal (retângulo inclinado) - normal para frente
                0, 1, 5,
                0, 5, 4,
                
                // Face traseira (retângulo inclinado) - normal para trás
                3, 6, 2,
                3, 7, 6,
                
                // Face lateral esquerda (retângulo plano) - normal para esquerda
                0, 4, 7,
                0, 7, 3,
                
                // Face lateral direita (inclinada) - normal para direita
                1, 2, 6,
                1, 6, 5,
                
                // Face superior (inclinada) - normal para cima
                4, 5, 6,
                4, 6, 7
            );
        }

        // Calcular as normais para iluminação correta
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        
        // Gerar UVs simples
        for (let i = 0; i < positions.length / 3; i++) {
            // Mapear UVs com base na posição para melhor mapeamento de textura
            const vertexIndex = i * 3;
            const y = positions[vertexIndex + 1]; // Componente Y
            
            // Normalizar a altura para o mapeamento UV
            const v = y / rampHeight;
            
            // Para o componente U, usamos uma combinação de X e Z para evitar distorções
            const x = positions[vertexIndex];
            const z = positions[vertexIndex + 2];
            
            // Normalizar para coordenadas UV (0-1)
            const u = (x / rampWidth + 0.5 + z / rampDepth + 0.5) / 2;
            
            uvs.push(u, v);
        }

        // Criar a vertexData e aplicar à malha
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.uvs = uvs;

        // Criar a malha da rampa
        const ramp = new BABYLON.Mesh(rampName, this.scene);
        
        // Aplicar vertexData à malha
        vertexData.applyToMesh(ramp);
        
        // Inicializar a metadata como um objeto vazio
        ramp.metadata = {};

        // Adicionar propriedades à metadata
        ramp.metadata.isBuildableSurface = true;
        ramp.metadata.isPlayerBuilt = true;
        ramp.metadata.isRamp = true;
        ramp.metadata.rampDirection = direction;
        ramp.metadata.initialHealth = initialHealth || 150; // Garantir um valor padrão
        ramp.metadata.health = initialHealth || 150; // Garantir um valor padrão
        
        // Novo: Adicionar metadados para rastreamento de dependências
        ramp.metadata.supportingBlock = null; // Bloco que está abaixo (suporte)
        ramp.metadata.dependentBlocks = []; // Blocos que estão acima (dependentes)
        
        // Novo: Verificar se há um bloco abaixo para registrar as dependências
        const supportCheckPosition = position.clone();
        supportCheckPosition.y -= 0.1; // Pequena distância para baixo a partir da base da rampa
        
        // Verificar se há algo abaixo para registrar como suporte
        const ray = new BABYLON.Ray(
            supportCheckPosition,
            new BABYLON.Vector3(0, -1, 0), // Direção para baixo
            0.5 // Aumentar a distância de detecção para pegar blocos abaixo
        );
        
        const hit = this.scene.pickWithRay(ray, mesh => 
            mesh.isPickable && 
            (mesh.name.startsWith("playerWall_") || mesh.name.startsWith("playerRamp_") || mesh.name === "floor")
        );
        
        if (hit && hit.pickedMesh) {
            // Registrar o bloco abaixo como suporte (exceto se for o chão)
            if (hit.pickedMesh.name !== "floor") {
                ramp.metadata.supportingBlock = hit.pickedMesh.name;
                
                // Registrar esta rampa como dependente no bloco abaixo
                if (hit.pickedMesh.metadata && Array.isArray(hit.pickedMesh.metadata.dependentBlocks)) {
                    hit.pickedMesh.metadata.dependentBlocks.push(ramp.name);
                    console.log(`${ramp.name} está apoiado em ${hit.pickedMesh.name}`);
                }
            }
        }
        
        console.log(`Created player ramp with metadata:`, ramp.metadata);
        
        // Posicionar a rampa na posição exata passada
        ramp.position = position.clone();
        
        // Aplicar rotação (permite ajuste fino além da geometria da direção)
        ramp.rotation.y = rotationY;

        // Aplicar material
        const rampMaterial = this.rampMaterial ? 
                            this.rampMaterial.clone(`playerRampMat_${ramp.uniqueId}`) : 
                            new BABYLON.StandardMaterial(`playerRampMat_${ramp.uniqueId}`, this.scene);
        
        // Para melhor renderização das faces da rampa
        rampMaterial.backFaceCulling = false;
        rampMaterial.twoSidedLighting = true;
        
        ramp.material = rampMaterial;
        
        // Habilitar colisões
        ramp.checkCollisions = true;
        ramp.isPickable = true;

        // Adicionar tag para identificação e grid snapping
        BABYLON.Tags.AddTagsTo(ramp, `cell_${position.x}_${position.z}`);
        
        // Adicionar física se disponível
        if (this.scene.getPhysicsEngine()?.getPhysicsPlugin()) {
            ramp.physicsImpostor = new BABYLON.PhysicsImpostor(
                ramp, 
                BABYLON.PhysicsImpostor.MeshImpostor, // Usando MeshImpostor para forma personalizada
                { mass: 0, restitution: 0.1 }, 
                this.scene
            );
        } else {
            console.warn("Physics not enabled, skipping impostor for player ramp.");
        }

        console.log(`Created player ramp (${direction}) at ${position} with health ${initialHealth}`);
        this.meshes.push(ramp);
        return ramp;
    }
    // Retornar todos os meshes criados pelo MazeView
    getMeshes() {
        return this.meshes;
    }
}

export default MazeView;