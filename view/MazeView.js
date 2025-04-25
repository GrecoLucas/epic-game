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

        console.log(`VIEW: Criadas ${this.meshes.filter(m => m.name.startsWith('wall_')).length} paredes individuais.`);
    }
    
    // Criar rampas com base nas posições
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

    // Método para destruir a *representação visual* da parede
    destroyWallVisual(wallName, position) {
        console.log(`VIEW: Destruindo visualmente a parede ${wallName}`);
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
            console.log(`VIEW: Mesh da parede ${wallName} removido.`);
            return true;
        } else {
            console.log(`VIEW: Mesh ${wallName} não encontrado para destruição visual.`);
            return false;
        }
    }

    // Novo método para aplicar efeito visual de dano
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

        console.log(`VIEW: Aplicado efeito visual de dano a ${wallName} (Dano: ${(damageRatio * 100).toFixed(0)}%)`);
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
        
        console.log(`VIEW: Efeito de destruição criado em [${position.x}, ${position.z}]`);
    }
    // Retornar todos os meshes criados pelo MazeView
    getMeshes() {
        return this.meshes;
    }
}

export default MazeView;