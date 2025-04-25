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
    // Retornar todos os meshes criados pelo MazeView
    getMeshes() {
        return this.meshes;
    }
}

export default MazeView;