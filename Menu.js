// Menu.js - Menu principal para seleção de modos de jogo
import GameLoader from './GameLoader.js';

class Menu {
    constructor() {
        this.scene = null;
        this.engine = null;
        this.canvas = null;
        this.menuUI = null;
        this.gameLoader = null;
        this.backgroundMusic = null;
    }

    initialize() {
        // Obter o canvas
        this.canvas = document.getElementById('renderCanvas');
        
        if (!this.canvas) {
            console.error("Elemento 'renderCanvas' não encontrado!");
            return;
        }
        
        try {
            // Criar engine e cena
            this.engine = new BABYLON.Engine(this.canvas, true);
            this.scene = this.createScene();
            
            // Inicializar o carregador de jogos
            this.gameLoader = new GameLoader(this.engine);
            
            // Criar a interface do menu
            this.createMenuUI();
            
            // Configurar o loop de renderização com verificação de cena nula
            this.engine.runRenderLoop(() => {
                // Verificar se a cena existe antes de tentar renderizá-la
                if (this.scene && !this.scene.isDisposed) {
                    this.scene.render();
                } else {
                    // Se a cena foi descartada, parar o loop de renderização
                    this.engine.stopRenderLoop();
                    console.log("Loop de renderização parado devido à cena ausente ou descartada");
                }
            });
            
            // Ajustar ao tamanho da janela
            window.addEventListener('resize', () => {
                if (this.engine) {
                    this.engine.resize();
                }
            });
            
            console.log("Menu inicializado com sucesso!");
        } catch (error) {
            console.error("Erro ao inicializar o menu:", error);
        }
    }
    
    createScene() {
        // Criar uma nova cena
        const scene = new BABYLON.Scene(this.engine);
        
        // Configurar cor de fundo - Mais escura e azulada para dar profundidade
        scene.clearColor = new BABYLON.Color3(0.02, 0.03, 0.08);
        
        // Criar câmera com posicionamento mais dramático
        const camera = new BABYLON.ArcRotateCamera(
            "camera", 
            -Math.PI / 2.2, // Ângulo alpha ligeiramente ajustado
            Math.PI / 2.7,  // Ângulo beta ligeiramente mais baixo para vista superior
            17,            // Distância aumentada
            new BABYLON.Vector3(0, 1.5, 0), // Elevado um pouco para melhor visibilidade
            scene
        );
        camera.attachControl(this.canvas, true);
        camera.upperBetaLimit = Math.PI / 2.2;
        camera.lowerRadiusLimit = 12;
        camera.upperRadiusLimit = 25;
        camera.fov = 0.8; // Campo de visão ligeiramente mais estreito para um look mais cinematográfico
        
        // Configurar movimento de câmera mais suave
        camera.inertia = 0.7;
        camera.angularSensibilityX = 500;
        camera.angularSensibilityY = 500;
        
        // Animação automática lenta da câmera para criar movimento sutil no menu
        scene.registerBeforeRender(() => {
            camera.alpha += 0.0003;
        });
        
        // Iluminação mais dinâmica
        // Luz principal hemisférica
        const hemiLight = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.6;
        hemiLight.diffuse = new BABYLON.Color3(0.7, 0.8, 1.0);
        hemiLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);
        hemiLight.specular = new BABYLON.Color3(0.8, 0.8, 0.8);
        
        // Adicionar luz direcional para destacar elementos principais
        const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, -0.5), scene);
        dirLight.intensity = 0.7;
        dirLight.diffuse = new BABYLON.Color3(1, 0.9, 0.7); // Luz mais quente
        
        // Luz de spot para destacar os modelos de cada modo
        const spotLightMaze = new BABYLON.SpotLight(
            "spotLightMaze", 
            new BABYLON.Vector3(-5, 8, 0), // Posição acima do modelo Maze
            new BABYLON.Vector3(0, -1, 0), // Direção para baixo
            Math.PI/3,                     // Ângulo
            10,                            // Expoente
            scene
        );
        spotLightMaze.diffuse = new BABYLON.Color3(0.8, 0.5, 0.5); // Tom avermelhado para o labirinto
        spotLightMaze.intensity = 0.7;
        
        const spotLightOpenWorld = new BABYLON.SpotLight(
            "spotLightOpenWorld", 
            new BABYLON.Vector3(5, 8, 0),  // Posição acima do modelo Open World
            new BABYLON.Vector3(0, -1, 0), // Direção para baixo
            Math.PI/3,                     // Ângulo
            10,                            // Expoente
            scene
        );
        spotLightOpenWorld.diffuse = new BABYLON.Color3(0.5, 0.8, 0.5); // Tom esverdeado para o mundo aberto
        spotLightOpenWorld.intensity = 0.7;
        
        // Criar elementos visuais para o menu
        this.createVisualElements(scene);
        
        // Adicionar efeitos
        this.addEffects(scene);
        
        // Adicionar música de fundo
        this.addBackgroundMusic(scene);
        
        return scene;
    }
    
    createVisualElements(scene) {
        // Criar um skybox com textura HD
        const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 1000}, scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skybox.material = skyboxMaterial;
        
        // Criar plataforma central giratória
        const platform = BABYLON.MeshBuilder.CreateDisc("platform", {radius: 12, tessellation: 64}, scene);
        const platformMaterial = new BABYLON.StandardMaterial("platformMaterial", scene);
        platformMaterial.diffuseTexture = new BABYLON.Texture("textures/floor.png", scene);
        platformMaterial.bumpTexture = new BABYLON.Texture("textures/floor.png", scene);
        platformMaterial.diffuseTexture.uScale = 6;
        platformMaterial.diffuseTexture.vScale = 6;
        platformMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        platform.material = platformMaterial;
        platform.rotation.x = Math.PI / 2;
        platform.position.y = -1;
        
        // Adicionar borda metálica à plataforma
        const platformBorder = BABYLON.MeshBuilder.CreateTorus("platformBorder", {diameter: 24, thickness: 0.8, tessellation: 64}, scene);
        const borderMaterial = new BABYLON.StandardMaterial("borderMaterial", scene);
        borderMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.7);
        borderMaterial.specularColor = new BABYLON.Color3(0.9, 0.9, 1);
        borderMaterial.specularPower = 128;
        platformBorder.material = borderMaterial;
        platformBorder.position.y = -0.9;
        
        // Adicionar luzes circulares ao redor da plataforma
        this.createPlatformLights(scene, platformBorder);
        
        // Animação da plataforma - rotação suave
        scene.registerBeforeRender(() => {
            platform.rotation.z += 0.0005;
            platformBorder.rotation.y += 0.0008;
        });
        
        // 1. Muro do labirinto (Modo Maze)
        this.createMazePreview(scene, -8, 0, 0);
        
        // 2. Paisagem aberta (Modo Open World)
        this.createOpenWorldPreview(scene, 8, 0, 0);
    }
    
    // Novo método para criar luzes ao redor da plataforma
    createPlatformLights(scene, parentMesh) {
        const colors = [
            new BABYLON.Color3(1, 0.3, 0.3),   // Vermelho
            new BABYLON.Color3(0.3, 1, 0.3),   // Verde
            new BABYLON.Color3(0.3, 0.3, 1),   // Azul
            new BABYLON.Color3(1, 1, 0.3),     // Amarelo
            new BABYLON.Color3(1, 0.3, 1),     // Magenta
            new BABYLON.Color3(0.3, 1, 1)      // Ciano
        ];
        
        // Criar 12 pontos de luz ao redor do círculo
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x = Math.sin(angle) * 12;
            const z = Math.cos(angle) * 12;
            
            // Esfera para representar visualmente a luz
            const sphere = BABYLON.MeshBuilder.CreateSphere(`lightSphere${i}`, {diameter: 0.5}, scene);
            sphere.position = new BABYLON.Vector3(x, -0.7, z);
            
            const sphereMaterial = new BABYLON.StandardMaterial(`lightMat${i}`, scene);
            const colorIndex = i % colors.length;
            sphereMaterial.diffuseColor = colors[colorIndex];
            sphereMaterial.emissiveColor = colors[colorIndex];
            sphereMaterial.specularPower = 128;
            sphere.material = sphereMaterial;
            
            // Adicionar luz pontual em cada esfera
            const pointLight = new BABYLON.PointLight(`pointLight${i}`, new BABYLON.Vector3(x, 0, z), scene);
            pointLight.diffuse = colors[colorIndex];
            pointLight.specular = colors[colorIndex];
            pointLight.intensity = 0.5;
            pointLight.range = 8;
            
            // Animação de pulsação para as luzes
            const pulseAnimation = new BABYLON.Animation(
                `pulseAnimation${i}`,
                "intensity",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const keyFrames = [];
            keyFrames.push({ frame: 0, value: 0.3 });
            keyFrames.push({ frame: 15, value: 0.8 });
            keyFrames.push({ frame: 30, value: 0.3 });
            pulseAnimation.setKeys(keyFrames);
            
            pointLight.animations = [pulseAnimation];
            scene.beginAnimation(pointLight, 0, 30, true, 0.7 + (Math.random() * 0.5));
        }
    }
    
    createMazePreview(scene, x, y, z) {
        // Criar um pequeno labirinto para representar o modo Maze
        const mazeMaterial = new BABYLON.StandardMaterial("mazeMaterial", scene);
        mazeMaterial.diffuseTexture = new BABYLON.Texture("textures/wall.png", scene);
        
        // Paredes do labirinto
        const wallHeight = 2;
        const createWall = (posX, posZ, width, depth) => {
            const wall = BABYLON.MeshBuilder.CreateBox("wall", {width, height: wallHeight, depth}, scene);
            wall.position = new BABYLON.Vector3(x + posX, y + wallHeight/2, z + posZ);
            wall.material = mazeMaterial;
            return wall;
        };
        
        // Criar um pequeno labirinto para preview
        const walls = [
            // Paredes externas
            createWall(0, -2, 4, 0.5),  // Norte
            createWall(0, 2, 4, 0.5),   // Sul
            createWall(-2, 0, 0.5, 4),  // Oeste
            createWall(2, 0, 0.5, 4),   // Leste
            
            // Paredes internas
            createWall(-1, 0, 0.5, 2),
            createWall(0, -0.5, 2, 0.5),
        ];
        
        // Agrupar os muros
        const mazePreview = new BABYLON.TransformNode("mazePreview", scene);
        walls.forEach(wall => wall.parent = mazePreview);
        
        // Adicionar um monstro pequeno
        const monsterSphere = BABYLON.MeshBuilder.CreateSphere("monster", {diameter: 0.7}, scene);
        const monsterMaterial = new BABYLON.StandardMaterial("monsterMaterial", scene);
        monsterMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.1, 0.1);
        monsterMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
        monsterSphere.material = monsterMaterial;
        monsterSphere.position = new BABYLON.Vector3(x + 1, y + 0.5, z + 1);
        monsterSphere.parent = mazePreview;
        
        // Animação
        scene.registerBeforeRender(() => {
            monsterSphere.position.x = x + 1 + Math.sin(performance.now() * 0.001) * 0.5;
            monsterSphere.position.z = z + 1 + Math.cos(performance.now() * 0.001) * 0.5;
        });
        
        // Adicionar texto "Maze Mode"
        const mazeModeText = this.createFloatingText("MAZE MODE", x, y + 3, z, scene);
        mazeModeText.parent = mazePreview;
        
        return mazePreview;
    }
    
    createOpenWorldPreview(scene, x, y, z) {
        // Criar uma miniatura de mundo aberto
        const ground = BABYLON.MeshBuilder.CreateGround("openWorldGround", {width: 4, height: 4, subdivisions: 20}, scene);
        ground.position = new BABYLON.Vector3(x, y, z);
        
        // Material para terreno variado
        const groundMaterial = new BABYLON.StandardMaterial("openWorldMaterial", scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture("textures/floor.png", scene);
        groundMaterial.bumpTexture = new BABYLON.Texture("textures/floor.png", scene);
        groundMaterial.diffuseTexture.uScale = 4;
        groundMaterial.diffuseTexture.vScale = 4;
        ground.material = groundMaterial;
        
        // Adicionar verticies deslocados para simular terreno
        const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        for (let i = 0; i < positions.length; i += 3) {
            // Pular pontos na borda para manter a forma
            const idx = i / 3;
            const row = Math.floor(idx / 21);
            const col = idx % 21;
            
            if (row > 0 && row < 20 && col > 0 && col < 20) {
                // Aplicar função de ruído para elevação
                const nx = col / 20;
                const nz = row / 20;
                const elevation = this.noise(nx * 5, nz * 5) * 0.5;
                positions[i + 1] = elevation; // Y component
            }
        }
        ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, []);
        BABYLON.VertexData.ComputeNormals(positions, ground.getIndices(), ground.getVerticesData(BABYLON.VertexBuffer.NormalKind));
        
        // Criar grupo para mundo aberto
        const openWorldPreview = new BABYLON.TransformNode("openWorldPreview", scene);
        ground.parent = openWorldPreview;
        
        // Adicionar árvores
        for (let i = 0; i < 6; i++) {
            const treeX = (Math.random() - 0.5) * 3;
            const treeZ = (Math.random() - 0.5) * 3;
            
            // Encontrar altura do terreno neste ponto
            let heightAtPoint = 0;
            const nx = (treeX / 4) + 0.5;
            const nz = (treeZ / 4) + 0.5;
            if (nx >= 0 && nx <= 1 && nz >= 1) {
                heightAtPoint = this.noise(nx * 5, nz * 5) * 0.5;
            }
            
            this.createTree(scene, x + treeX, y + heightAtPoint, z + treeZ, 0.3 + Math.random() * 0.3).parent = openWorldPreview;
        }
        
        // Adicionar uma pequena casa
        this.createHouse(scene, x - 1, y + 0.1, z - 1, 0.7).parent = openWorldPreview;
        
        // Adicionar texto "Open World Mode"
        const openWorldText = this.createFloatingText("WORLD MODE", x, y + 3, z, scene);
        openWorldText.parent = openWorldPreview;
        
        return openWorldPreview;
    }
    
    // Função simples de ruído para simular elevação de terreno
    noise(x, z) {
        return Math.sin(x * 1.5) * Math.cos(z * 1.5) * 0.5 + 
               Math.sin(x * 3) * Math.cos(z * 3) * 0.25 +
               Math.sin(x * 6) * Math.cos(z * 6) * 0.125;
    }
    
    createTree(scene, x, y, z, scale = 1) {
        const tree = new BABYLON.TransformNode("tree", scene);
        
        // Tronco
        const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {height: 1, diameter: 0.2}, scene);
        trunk.position.y = 0.5;
        const trunkMaterial = new BABYLON.StandardMaterial("trunkMat", scene);
        trunkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
        trunk.material = trunkMaterial;
        trunk.parent = tree;
        
        // Copa - CORRIGIDO: Usando CreateCylinder no lugar de CreateCone
        const leaves = BABYLON.MeshBuilder.CreateCylinder("leaves", {
            height: 1.5, 
            diameterTop: 0, 
            diameterBottom: 1,
            tessellation: 8
        }, scene);
        leaves.position.y = 1.5;
        const leavesMaterial = new BABYLON.StandardMaterial("leavesMat", scene);
        leavesMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.1);
        leaves.material = leavesMaterial;
        leaves.parent = tree;
        
        // Posicionar e escalar a árvore
        tree.position = new BABYLON.Vector3(x, y, z);
        tree.scaling = new BABYLON.Vector3(scale, scale, scale);
        
        return tree;
    }
    
    createHouse(scene, x, y, z, scale = 1) {
        const house = new BABYLON.TransformNode("house", scene);
        
        // Base
        const base = BABYLON.MeshBuilder.CreateBox("base", {width: 2, height: 1, depth: 2}, scene);
        base.position.y = 0.5;
        const baseMaterial = new BABYLON.StandardMaterial("baseMat", scene);
        baseMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.6);
        base.material = baseMaterial;
        base.parent = house;
        
        // Telhado
        const roof = BABYLON.MeshBuilder.CreateCylinder("roof", {height: 1, diameter: 0, diameterBottom: 2.3, diameterTop: 0, tessellation: 4}, scene);
        roof.position.y = 1.5;
        roof.rotation.y = Math.PI / 4;
        const roofMaterial = new BABYLON.StandardMaterial("roofMat", scene);
        roofMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.1);
        roof.material = roofMaterial;
        roof.parent = house;
        
        // Porta
        const door = BABYLON.MeshBuilder.CreatePlane("door", {width: 0.5, height: 0.8}, scene);
        door.position = new BABYLON.Vector3(0, 0.4, 1.01);
        const doorMaterial = new BABYLON.StandardMaterial("doorMat", scene);
        doorMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        door.material = doorMaterial;
        door.parent = house;
        
        // Janelas
        const windowMaterial = new BABYLON.StandardMaterial("windowMat", scene);
        windowMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.9, 1);
        windowMaterial.alpha = 0.7;
        
        const window1 = BABYLON.MeshBuilder.CreatePlane("window1", {width: 0.4, height: 0.4}, scene);
        window1.position = new BABYLON.Vector3(-0.5, 0.6, 1.01);
        window1.material = windowMaterial;
        window1.parent = house;
        
        const window2 = BABYLON.MeshBuilder.CreatePlane("window2", {width: 0.4, height: 0.4}, scene);
        window2.position = new BABYLON.Vector3(0.5, 0.6, 1.01);
        window2.material = windowMaterial;
        window2.parent = house;
        
        // Posicionar e escalar a casa
        house.position = new BABYLON.Vector3(x, y, z);
        house.scaling = new BABYLON.Vector3(scale, scale, scale);
        
        return house;
    }
    
    createFloatingText(text, x, y, z, scene) {
        const plane = BABYLON.MeshBuilder.CreatePlane("textPlane", {width: 4, height: 1}, scene);
        plane.position = new BABYLON.Vector3(x, y, z);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);
        
        const textBlock = new BABYLON.GUI.TextBlock();
        textBlock.text = text;
        textBlock.color = "white";
        textBlock.fontSize = 120;
        textBlock.outlineWidth = 8;
        textBlock.outlineColor = "black";
        advancedTexture.addControl(textBlock);
        
        // Adicionar animação de flutuação
        scene.registerBeforeRender(() => {
            plane.position.y = y + Math.sin(performance.now() * 0.001) * 0.1;
        });
        
        return plane;
    }
    
    addEffects(scene) {
        // Adicionar partículas para um ambiente mais dinâmico
        const particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", scene);
        particleSystem.emitter = new BABYLON.Vector3(0, 5, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(-20, -10, -20);
        particleSystem.maxEmitBox = new BABYLON.Vector3(20, 10, 20);
        
        // Propriedades das partículas
        particleSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 0.1);
        particleSystem.color2 = new BABYLON.Color4(0.2, 0.5, 1.0, 0.1);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
        
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        
        particleSystem.minLifeTime = 2;
        particleSystem.maxLifeTime = 8;
        
        particleSystem.emitRate = 200;
        
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.gravity = new BABYLON.Vector3(0, -0.05, 0);
        
        particleSystem.direction1 = new BABYLON.Vector3(-1, -1, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
        
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;
        
        particleSystem.start();
        
        // Adicionar pós-processamento
        const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, scene);
        if (pipeline) {
            // Bloom para dar um aspecto mais vibrante
            pipeline.bloomEnabled = true;
            pipeline.bloomThreshold = 0.1;
            pipeline.bloomWeight = 0.3;
            pipeline.bloomKernel = 64;
            pipeline.bloomScale = 0.5;
            
            // Contraste e exposição
            pipeline.imageProcessing.contrast = 1.1;
            pipeline.imageProcessing.exposure = 1.2;
            
            // Vinheta para um look mais cinematográfico
            pipeline.imageProcessing.vignetteEnabled = true;
            pipeline.imageProcessing.vignetteWeight = 0.5;
            pipeline.imageProcessing.vignetteCentreX = 0;
            pipeline.imageProcessing.vignetteCentreY = 0;
            pipeline.imageProcessing.vignetteRadius = 1;
        }
    }
    
    addBackgroundMusic(scene) {
        // Verifica se o Sound está disponível no Babylon
        if (BABYLON.Sound) {
            this.backgroundMusic = new BABYLON.Sound(
                "menuMusic", 
                "sounds/menu_music.mp3", 
                scene, 
                () => {
                    console.log("Menu music loaded");
                    this.backgroundMusic.play();
                },
                {
                    loop: true,
                    autoplay: true,
                    volume: 0.5
                }
            );
        }
    }
    
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
    }
    
    createMenuUI() {
        // Criar uma textura avançada para a UI
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        
        // Criar um painel para o conteúdo
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = "100%";
        panel.height = "100%";
        advancedTexture.addControl(panel);
        
        // Título do jogo com efeito de glow
        const titleContainer = new BABYLON.GUI.Rectangle();
        titleContainer.width = "100%";
        titleContainer.height = "180px";
        titleContainer.thickness = 0;
        titleContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        titleContainer.paddingTop = "40px";
        panel.addControl(titleContainer);
        
        // Sombra do título (para efeito de profundidade)
        const titleShadow = new BABYLON.GUI.TextBlock();
        titleShadow.text = "ESCAPE ROOM 3D";
        titleShadow.color = "rgba(0,0,0,0.7)";
        titleShadow.fontSize = 76;
        titleShadow.fontFamily = "Impact, Anton, sans-serif";
        titleShadow.top = "5px";
        titleShadow.left = "5px";
        titleContainer.addControl(titleShadow);
        
        // Título principal
        const title = new BABYLON.GUI.TextBlock();
        title.text = "ESCAPE ROOM 3D";
        title.color = "linear-gradient(180deg, #ffffff, #b3e0ff)";
        title.fontSize = 76;
        title.fontFamily = "Impact, Anton, sans-serif";
        title.shadowColor = "rgba(0, 100, 255, 0.6)";
        title.shadowOffsetX = 0;
        title.shadowOffsetY = 0;
        title.shadowBlur = 15;
        titleContainer.addControl(title);
        
        // Linha decorativa sob o título
        const titleLine = new BABYLON.GUI.Rectangle();
        titleLine.width = "400px";
        titleLine.height = "4px";
        titleLine.cornerRadius = 2;
        titleLine.color = "#3399ff";
        titleLine.background = "linear-gradient(90deg, rgba(51,153,255,0) 0%, rgba(51,153,255,1) 50%, rgba(51,153,255,0) 100%)";
        titleLine.top = "15px";
        titleContainer.addControl(titleLine);
        
        // Sub-título com estilo moderno
        const subtitleContainer = new BABYLON.GUI.Rectangle();
        subtitleContainer.width = "100%";
        subtitleContainer.height = "50px";
        subtitleContainer.thickness = 0;
        subtitleContainer.paddingTop = "20px";
        panel.addControl(subtitleContainer);
        
        const subtitle = new BABYLON.GUI.TextBlock();
        subtitle.text = "ESCOLHA SEU MODO DE JOGO";
        subtitle.color = "#b3e0ff";
        subtitle.fontSize = 24;
        subtitle.fontFamily = "Arial, Helvetica, sans-serif";
        subtitle.letterSpacing = "3px";
        subtitleContainer.addControl(subtitle);
        
        // Container para os botões
        const buttonsContainer = new BABYLON.GUI.Rectangle();
        buttonsContainer.width = "900px";
        buttonsContainer.height = "450px";
        buttonsContainer.thickness = 0;
        buttonsContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        panel.addControl(buttonsContainer);
        
        // Painéis para cada modo
        const modesContainer = new BABYLON.GUI.Grid();
        modesContainer.addColumnDefinition(0.5);
        modesContainer.addColumnDefinition(0.5);
        modesContainer.width = "100%";
        modesContainer.height = "100%";
        modesContainer.paddingLeft = "15px";
        modesContainer.paddingRight = "15px";
        buttonsContainer.addControl(modesContainer);
        
        // Botão do Modo Maze - Design moderno
        const mazeModeContainer = new BABYLON.GUI.Rectangle();
        mazeModeContainer.width = "380px";
        mazeModeContainer.height = "400px";
        mazeModeContainer.thickness = 0;
        mazeModeContainer.cornerRadius = 15;
        mazeModeContainer.color = "#3399ff";
        mazeModeContainer.background = "linear-gradient(180deg, rgba(30, 30, 50, 0.8) 0%, rgba(60, 60, 100, 0.8) 100%)";
        mazeModeContainer.hoverCursor = "pointer";
        mazeModeContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        mazeModeContainer.paddingRight = "10px";
        mazeModeContainer.shadowColor = "rgba(0, 0, 0, 0.5)";
        mazeModeContainer.shadowBlur = 15;
        mazeModeContainer.shadowOffsetX = 5;
        mazeModeContainer.shadowOffsetY = 5;
        modesContainer.addControl(mazeModeContainer, 0, 0);
        
        // Borda com efeito de brilho
        const mazeBorder = new BABYLON.GUI.Rectangle();
        mazeBorder.width = "100%";
        mazeBorder.height = "100%";
        mazeBorder.thickness = 2;
        mazeBorder.cornerRadius = 15;
        mazeBorder.color = "rgba(102, 179, 255, 0.7)";
        mazeBorder.background = "transparent";
        mazeModeContainer.addControl(mazeBorder);
        
        // Adicionar evento de clique para iniciar o modo Maze
        mazeModeContainer.onPointerClickObservable.add(() => {
            this.startMazeMode();
        });
        
        // Adicionar eventos de hover para efeitos visuais
        mazeModeContainer.onPointerEnterObservable.add(() => {
            mazeModeContainer.background = "linear-gradient(180deg, rgba(40, 40, 70, 0.9) 0%, rgba(80, 80, 130, 0.9) 100%)";
            mazeBorder.color = "rgba(153, 204, 255, 1)";
            mazeBorder.thickness = 3;
            this.playHoverSound();
            
            // Animar escala
            const animation = new BABYLON.Animation("scaleAnimation", "scaleX", 30, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            
            const keys = [
                { frame: 0, value: 1 },
                { frame: 10, value: 1.03 },
                { frame: 20, value: 1.03 }
            ];
            animation.setKeys(keys);
            
            const animation2 = new BABYLON.Animation("scaleAnimation2", "scaleY", 30, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animation2.setKeys(keys);
            
            mazeModeContainer.animations = [animation, animation2];
            this.scene.beginAnimation(mazeModeContainer, 0, 20, false);
        });
        
        mazeModeContainer.onPointerOutObservable.add(() => {
            mazeModeContainer.background = "linear-gradient(180deg, rgba(30, 30, 50, 0.8) 0%, rgba(60, 60, 100, 0.8) 100%)";
            mazeBorder.color = "rgba(102, 179, 255, 0.7)";
            mazeBorder.thickness = 2;
            
            // Reverter escala
            const animation = new BABYLON.Animation("scaleAnimation", "scaleX", 30, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            
            const keys = [
                { frame: 0, value: 1.03 },
                { frame: 10, value: 1 }
            ];
            animation.setKeys(keys);
            
            const animation2 = new BABYLON.Animation("scaleAnimation2", "scaleY", 30, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animation2.setKeys(keys);
            
            mazeModeContainer.animations = [animation, animation2];
            this.scene.beginAnimation(mazeModeContainer, 0, 10, false);
        });
        
        // Barra superior colorida
        const mazeTopBar = new BABYLON.GUI.Rectangle();
        mazeTopBar.width = "100%";
        mazeTopBar.height = "8px";
        mazeTopBar.cornerRadius = 4;
        mazeTopBar.color = "transparent";
        mazeTopBar.background = "linear-gradient(90deg, #ff3366 0%, #ff9933 100%)";
        mazeTopBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        mazeTopBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        mazeModeContainer.addControl(mazeTopBar);
        
        // Imagem para o modo Maze
        const mazeModeImage = new BABYLON.GUI.Image("mazeModeImage", "textures/maze_mode.png");
        mazeModeImage.width = "360px";
        mazeModeImage.height = "200px";
        mazeModeImage.cornerRadius = 10;
        mazeModeImage.paddingTop = "25px";
        mazeModeContainer.addControl(mazeModeImage);
        
        // Título do modo Maze
        const mazeModeTitle = new BABYLON.GUI.TextBlock();
        mazeModeTitle.text = "MODO LABIRINTO";
        mazeModeTitle.color = "#ffffff";
        mazeModeTitle.fontSize = 28;
        mazeModeTitle.fontFamily = "Tahoma, Arial, sans-serif";
        mazeModeTitle.fontWeight = "bold";
        mazeModeTitle.height = "40px";
        mazeModeTitle.paddingTop = "15px";
        mazeModeTitle.shadowColor = "rgba(0, 0, 0, 0.7)";
        mazeModeTitle.shadowOffsetX = 2;
        mazeModeTitle.shadowOffsetY = 2;
        mazeModeTitle.shadowBlur = 3;
        mazeModeContainer.addControl(mazeModeTitle);
        
        // Descrição do modo Maze
        const mazeModeDesc = new BABYLON.GUI.TextBlock();
        mazeModeDesc.text = "Escape do labirinto, enfrente hordas de monstros e resolva quebra-cabeças para sobreviver!";
        mazeModeDesc.color = "#cccccc";
        mazeModeDesc.fontSize = 16;
        mazeModeDesc.fontFamily = "Segoe UI, Arial, sans-serif";
        mazeModeDesc.height = "80px";
        mazeModeDesc.textWrapping = true;
        mazeModeDesc.paddingLeft = "20px";
        mazeModeDesc.paddingRight = "20px";
        mazeModeDesc.lineSpacing = "5px";
        mazeModeContainer.addControl(mazeModeDesc);
        
        // Botão de início para o modo Maze
        const mazeStartBtn = new BABYLON.GUI.Button();
        mazeStartBtn.name = "mazeStartBtn";
        mazeStartBtn.width = "150px";
        mazeStartBtn.height = "40px";
        mazeStartBtn.cornerRadius = 20;
        mazeStartBtn.color = "#ffffff";
        mazeStartBtn.background = "linear-gradient(90deg, #ff3366 0%, #ff9933 100%)";
        mazeStartBtn.thickness = 0;
        mazeStartBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        mazeStartBtn.paddingBottom = "25px";
        mazeStartBtn.hoverCursor = "pointer";
        mazeModeContainer.addControl(mazeStartBtn);

        // Adicionar texto ao botão
        const mazeStartBtnText = new BABYLON.GUI.TextBlock();
        mazeStartBtnText.text = "INICIAR";
        mazeStartBtnText.color = "#ffffff";
        mazeStartBtnText.fontSize = 18;
        mazeStartBtnText.fontFamily = "Arial, sans-serif";
        mazeStartBtnText.fontWeight = "bold";
        mazeStartBtn.addControl(mazeStartBtnText);

        // Adicionar evento de clique ao botão
        mazeStartBtn.onPointerClickObservable.add(() => {
            this.startMazeMode();
        });

        // Eventos de hover para o botão
        mazeStartBtn.onPointerEnterObservable.add(() => {
            mazeStartBtn.background = "linear-gradient(90deg, #ff5c85 0%, #ffad5c 100%)";
            this.playHoverSound();
        });

        mazeStartBtn.onPointerOutObservable.add(() => {
            mazeStartBtn.background = "linear-gradient(90deg, #ff3366 0%, #ff9933 100%)";
        });
        
        // BOTÃO DO MUNDO ABERTO - Design moderno
        const openWorldContainer = new BABYLON.GUI.Rectangle();
        openWorldContainer.width = "380px";
        openWorldContainer.height = "400px";
        openWorldContainer.thickness = 0;
        openWorldContainer.cornerRadius = 15;
        openWorldContainer.color = "#33cc33";
        openWorldContainer.background = "linear-gradient(180deg, rgba(30, 50, 30, 0.8) 0%, rgba(60, 100, 60, 0.8) 100%)";
        openWorldContainer.hoverCursor = "pointer";
        openWorldContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        openWorldContainer.paddingLeft = "10px";
        openWorldContainer.shadowColor = "rgba(0, 0, 0, 0.5)";
        openWorldContainer.shadowBlur = 15;
        openWorldContainer.shadowOffsetX = 5;
        openWorldContainer.shadowOffsetY = 5;
        modesContainer.addControl(openWorldContainer, 0, 1);
        
        // Borda com efeito de brilho
        const openWorldBorder = new BABYLON.GUI.Rectangle();
        openWorldBorder.width = "100%";
        openWorldBorder.height = "100%";
        openWorldBorder.thickness = 2;
        openWorldBorder.cornerRadius = 15;
        openWorldBorder.color = "rgba(102, 255, 102, 0.7)";
        openWorldBorder.background = "transparent";
        openWorldContainer.addControl(openWorldBorder);
        
        // Adicionar evento de clique para iniciar o modo Open World
        openWorldContainer.onPointerClickObservable.add(() => {
            this.startOpenWorldMode();
        });
        
        // Adicionar eventos de hover para efeitos visuais
        openWorldContainer.onPointerEnterObservable.add(() => {
            openWorldContainer.background = "linear-gradient(180deg, rgba(40, 70, 40, 0.9) 0%, rgba(80, 130, 80, 0.9) 100%)";
            openWorldBorder.color = "rgba(153, 255, 153, 1)";
            openWorldBorder.thickness = 3;
            this.playHoverSound();
            
            // Animar escala
            const animation = new BABYLON.Animation("scaleAnimation", "scaleX", 30, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            
            const keys = [
                { frame: 0, value: 1 },
                { frame: 10, value: 1.03 },
                { frame: 20, value: 1.03 }
            ];
            animation.setKeys(keys);
            
            const animation2 = new BABYLON.Animation("scaleAnimation2", "scaleY", 30, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animation2.setKeys(keys);
            
            openWorldContainer.animations = [animation, animation2];
            this.scene.beginAnimation(openWorldContainer, 0, 20, false);
        });
        
        openWorldContainer.onPointerOutObservable.add(() => {
            openWorldContainer.background = "linear-gradient(180deg, rgba(30, 50, 30, 0.8) 0%, rgba(60, 100, 60, 0.8) 100%)";
            openWorldBorder.color = "rgba(102, 255, 102, 0.7)";
            openWorldBorder.thickness = 2;
            
            // Reverter escala
            const animation = new BABYLON.Animation("scaleAnimation", "scaleX", 30, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            
            const keys = [
                { frame: 0, value: 1.03 },
                { frame: 10, value: 1 }
            ];
            animation.setKeys(keys);
            
            const animation2 = new BABYLON.Animation("scaleAnimation2", "scaleY", 30, 
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            animation2.setKeys(keys);
            
            openWorldContainer.animations = [animation, animation2];
            this.scene.beginAnimation(openWorldContainer, 0, 10, false);
        });
        
        // Barra superior colorida
        const openWorldTopBar = new BABYLON.GUI.Rectangle();
        openWorldTopBar.width = "100%";
        openWorldTopBar.height = "8px";
        openWorldTopBar.cornerRadius = 4;
        openWorldTopBar.color = "transparent";
        openWorldTopBar.background = "linear-gradient(90deg, #33cc33 0%, #33ccff 100%)";
        openWorldTopBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        openWorldTopBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        openWorldContainer.addControl(openWorldTopBar);
        
        // Imagem para o modo Open World
        const openWorldImage = new BABYLON.GUI.Image("openWorldImage", "textures/open_world_mode.png");
        openWorldImage.width = "360px";
        openWorldImage.height = "200px";
        openWorldImage.cornerRadius = 10;
        openWorldImage.paddingTop = "25px";
        openWorldContainer.addControl(openWorldImage);
        
        // Título do modo Open World
        const openWorldTitle = new BABYLON.GUI.TextBlock();
        openWorldTitle.text = "MODO MUNDO ABERTO";
        openWorldTitle.color = "#ffffff";
        openWorldTitle.fontSize = 28;
        openWorldTitle.fontFamily = "Tahoma, Arial, sans-serif";
        openWorldTitle.fontWeight = "bold";
        openWorldTitle.height = "40px";
        openWorldTitle.paddingTop = "15px";
        openWorldTitle.shadowColor = "rgba(0, 0, 0, 0.7)";
        openWorldTitle.shadowOffsetX = 2;
        openWorldTitle.shadowOffsetY = 2;
        openWorldTitle.shadowBlur = 3;
        openWorldContainer.addControl(openWorldTitle);
        
        // Descrição do modo Open World
        const openWorldDesc = new BABYLON.GUI.TextBlock();
        openWorldDesc.text = "Explore um mundo gerado proceduralmente com diferentes biomas, vilas, construções e recursos!";
        openWorldDesc.color = "#cccccc";
        openWorldDesc.fontSize = 16;
        openWorldDesc.fontFamily = "Segoe UI, Arial, sans-serif";
        openWorldDesc.height = "80px";
        openWorldDesc.textWrapping = true;
        openWorldDesc.paddingLeft = "20px";
        openWorldDesc.paddingRight = "20px";
        openWorldDesc.lineSpacing = "5px";
        openWorldContainer.addControl(openWorldDesc);
        
        // Botão de início para o modo Open World
        const openWorldStartBtn = new BABYLON.GUI.Button();
        openWorldStartBtn.name = "openWorldStartBtn";
        openWorldStartBtn.width = "150px";
        openWorldStartBtn.height = "40px";
        openWorldStartBtn.cornerRadius = 20;
        openWorldStartBtn.color = "#ffffff";
        openWorldStartBtn.background = "linear-gradient(90deg, #33cc33 0%, #33ccff 100%)";
        openWorldStartBtn.thickness = 0;
        openWorldStartBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        openWorldStartBtn.paddingBottom = "25px";
        openWorldStartBtn.hoverCursor = "pointer";
        openWorldContainer.addControl(openWorldStartBtn);

        // Adicionar texto ao botão
        const openWorldStartBtnText = new BABYLON.GUI.TextBlock();
        openWorldStartBtnText.text = "INICIAR";
        openWorldStartBtnText.color = "#ffffff";
        openWorldStartBtnText.fontSize = 18;
        openWorldStartBtnText.fontFamily = "Arial, sans-serif";
        openWorldStartBtnText.fontWeight = "bold";
        openWorldStartBtn.addControl(openWorldStartBtnText);

        // Adicionar evento de clique ao botão
        openWorldStartBtn.onPointerClickObservable.add(() => {
            this.startOpenWorldMode();
        });

        // Eventos de hover para o botão
        openWorldStartBtn.onPointerEnterObservable.add(() => {
            openWorldStartBtn.background = "linear-gradient(90deg, #5cd65c 0%, #5cd9ff 100%)";
            this.playHoverSound();
        });

        openWorldStartBtn.onPointerOutObservable.add(() => {
            openWorldStartBtn.background = "linear-gradient(90deg, #33cc33 0%, #33ccff 100%)";
        });
        
        // Rodapé com créditos e versão
        const footerContainer = new BABYLON.GUI.Rectangle();
        footerContainer.width = "100%";
        footerContainer.height = "40px";
        footerContainer.thickness = 0;
        footerContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        footerContainer.paddingBottom = "15px";
        panel.addControl(footerContainer);
        
        const footerText = new BABYLON.GUI.TextBlock();
        footerText.text = "© 2025 Escape Room 3D | v1.2.0 | Desenvolvido com Babylon.js";
        footerText.color = "rgba(255, 255, 255, 0.7)";
        footerText.fontSize = 14;
        footerText.fontFamily = "Segoe UI, Arial, sans-serif";
        footerContainer.addControl(footerText);
        
        // Guardar referência à UI
        this.menuUI = advancedTexture;
    }
    
    playHoverSound() {
        if (BABYLON.Sound) {
            const hoverSound = new BABYLON.Sound("hoverSound", "sounds/hover.mp3", this.scene, null, {
                volume: 0.3
            });
            hoverSound.play();
        }
    }
    
    playClickSound() {
        if (BABYLON.Sound) {
            const clickSound = new BABYLON.Sound("clickSound", "sounds/click.mp3", this.scene, null, {
                volume: 0.5
            });
            clickSound.play();
        }
    }
    

    // Corrigir os métodos para iniciar os modos de jogo
    startMazeMode() {
        try {
            this.playClickSound();
            
            // Mostrar tela de carregamento
            this.showLoadingScreen("Carregando Modo Labirinto...");
            
            // Parar a música do menu
            this.stopBackgroundMusic();
            
            // Carregar o modo Maze (modo existente)
            setTimeout(() => {
                try {
                    if (this.gameLoader) {
                        this.gameLoader.loadMazeMode();
                        
                        // Limpar recursos do menu
                        this.cleanupMenu();
                    } else {
                        console.error("gameLoader não está disponível");
                    }
                } catch (error) {
                    console.error("Erro ao iniciar modo labirinto:", error);
                }
            }, 1500);
        } catch (error) {
            console.error("Erro ao iniciar modo labirinto:", error);
        }
    }
    
    // Iniciar o modo Open World

    startOpenWorldMode() {
        try {
            this.playClickSound();
            
            // Mostrar tela de carregamento
            this.showLoadingScreen("Gerando Mundo Aberto...");
            
            // Parar a música do menu
            this.stopBackgroundMusic();
            
            // Carregar o modo Open World (novo modo)
            setTimeout(() => {
                try {
                    if (this.gameLoader) {
                        this.gameLoader.loadOpenWorldMode();
                        
                        // Limpar recursos do menu
                        this.cleanupMenu();
                    } else {
                        console.error("gameLoader não está disponível");
                    }
                } catch (error) {
                    console.error("Erro ao iniciar modo mundo aberto:", error);
                }
            }, 1500);
        } catch (error) {
            console.error("Erro ao iniciar modo mundo aberto:", error);
        }
    }
    

    // Corrigir a função showLoadingScreen para transição mais suave
    showLoadingScreen(text) {
        console.log(`Mostrando tela de carregamento: ${text}`);
        
        try {
            // Remover UI existente
            if (this.menuUI) {
                this.menuUI.dispose();
            }
            
            // Criar nova textura para tela de carregamento
            const loadingTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("loadingUI");
            
            // Fundo com gradiente
            const background = new BABYLON.GUI.Rectangle();
            background.width = "100%";
            background.height = "100%";
            background.color = "transparent";
            background.thickness = 0;
            background.background = "linear-gradient(180deg, rgba(10, 12, 25, 1) 0%, rgba(35, 40, 70, 1) 100%)";
            loadingTexture.addControl(background);
            
            // Container principal para centralizar elementos
            const centerContainer = new BABYLON.GUI.Rectangle();
            centerContainer.width = "600px";
            centerContainer.height = "300px";
            centerContainer.cornerRadius = 20;
            centerContainer.color = "rgba(50, 120, 200, 0.3)";
            centerContainer.thickness = 2;
            centerContainer.background = "rgba(20, 30, 50, 0.7)";
            centerContainer.shadowColor = "rgba(0, 100, 255, 0.4)";
            centerContainer.shadowBlur = 20;
            centerContainer.shadowOffsetX = 0;
            centerContainer.shadowOffsetY = 0;
            background.addControl(centerContainer);
            
            // Adicionar logo ou ícone do jogo na parte superior
            const logoContainer = new BABYLON.GUI.Rectangle();
            logoContainer.width = "150px";
            logoContainer.height = "150px";
            logoContainer.cornerRadius = 75;
            logoContainer.thickness = 0;
            logoContainer.top = "-60px";
            centerContainer.addControl(logoContainer);
            
            // Círculo externo animado
            const logoCircle = new BABYLON.GUI.Ellipse();
            logoCircle.width = "150px";
            logoCircle.height = "150px";
            logoCircle.thickness = 4;
            logoCircle.color = "rgba(51, 153, 255, 0.8)";
            logoCircle.background = "rgba(30, 40, 60, 0.9)";
            logoContainer.addControl(logoCircle);
            
            // Texto do Logo
            const logoText = new BABYLON.GUI.TextBlock();
            logoText.text = "ER3D";
            logoText.color = "white";
            logoText.fontSize = 48;
            logoText.fontFamily = "Impact, Arial, sans-serif";
            logoText.shadowBlur = 5;
            logoText.shadowColor = "rgba(0, 100, 255, 0.5)";
            logoCircle.addControl(logoText);
            
            // Animar o círculo do logo (rotação)
            const animateLogo = () => {
                let rotation = 0;
                const rotateLogo = setInterval(() => {
                    if (!logoCircle || logoCircle.isDisposed) {
                        clearInterval(rotateLogo);
                        return;
                    }
                    rotation += 0.02;
                    logoCircle.rotation = rotation;
                }, 30);
                
                // Limpar o intervalo após 5 segundos para economizar recursos
                setTimeout(() => {
                    clearInterval(rotateLogo);
                }, 5000);
            };
            animateLogo();
            
            // Título da tela de carregamento
            const loadingTitle = new BABYLON.GUI.TextBlock();
            loadingTitle.text = text;
            loadingTitle.color = "white";
            loadingTitle.fontSize = 28;
            loadingTitle.fontFamily = "Segoe UI, Arial, sans-serif";
            loadingTitle.top = "30px";
            centerContainer.addControl(loadingTitle);
            
            // Container da barra de progresso
            const progressBarContainer = new BABYLON.GUI.Rectangle();
            progressBarContainer.width = "80%";
            progressBarContainer.height = "30px";
            progressBarContainer.cornerRadius = 15;
            progressBarContainer.color = "rgba(255, 255, 255, 0.3)";
            progressBarContainer.thickness = 2;
            progressBarContainer.background = "rgba(30, 30, 50, 0.5)";
            progressBarContainer.top = "80px";
            centerContainer.addControl(progressBarContainer);
            
            // Barra de progresso com gradiente
            const progressBar = new BABYLON.GUI.Rectangle();
            progressBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            progressBar.width = "0%";
            progressBar.height = "100%";
            progressBar.cornerRadius = 15;
            progressBar.thickness = 0;
            progressBar.background = "linear-gradient(90deg, #3399ff 0%, #66ffcc 100%)";
            progressBarContainer.addControl(progressBar);
            
            // Texto de porcentagem
            const progressText = new BABYLON.GUI.TextBlock();
            progressText.text = "0%";
            progressText.color = "white";
            progressText.fontSize = 16;
            progressText.fontFamily = "Arial, sans-serif";
            progressBarContainer.addControl(progressText);
            
            // Dica aleatória
            const tips = [
                "Dica: Procure por itens escondidos no labirinto para obter vantagens.",
                "Dica: Zombies são mais lentos, mas atacam em grupos.",
                "Dica: No modo mundo aberto, construa abrigos antes do anoitecer.",
                "Dica: Barricadas podem ser destruídas por monstros após vários ataques.",
                "Dica: A pistola tem munição infinita, mas causa menos dano.",
                "Dica: Pressione 'H' para iniciar uma horda de monstros.",
                "Dica: Monstros causam mais dano em ataques surpresa."
            ];
            
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            
            const tipText = new BABYLON.GUI.TextBlock();
            tipText.text = randomTip;
            tipText.color = "rgba(255, 255, 255, 0.7)";
            tipText.fontSize = 16;
            tipText.fontFamily = "Segoe UI, Arial, sans-serif";
            tipText.textWrapping = true;
            tipText.resizeToFit = true;
            tipText.top = "130px";
            tipText.paddingLeft = "20px";
            tipText.paddingRight = "20px";
            centerContainer.addControl(tipText);
            
            // Texto de rodapé
            const footerText = new BABYLON.GUI.TextBlock();
            footerText.text = "Por favor, aguarde enquanto seu jogo está sendo preparado...";
            footerText.color = "rgba(255, 255, 255, 0.5)";
            footerText.fontSize = 14;
            footerText.fontFamily = "Segoe UI, Arial, sans-serif";
            footerText.textWrapping = true;
            footerText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
            footerText.paddingBottom = "20px";
            background.addControl(footerText);
            
            // Animar a barra de progresso com suavização
            let progress = 0;
            const progressSpeed = 0.5; // Velocidade de progresso
            const interval = setInterval(() => {
                // Aumentar o progresso de forma não linear para simular carregamento real
                if (progress < 70) {
                    progress += progressSpeed * (1.0 - progress/100);
                } else if (progress < 90) {
                    progress += progressSpeed * 0.3;
                } else if (progress < 98) {
                    progress += progressSpeed * 0.1;
                } else {
                    progress = 100;
                }
                
                const progressWidth = Math.min(100, Math.floor(progress));
                
                if (progressBar && !progressBar.isDisposed) {
                    progressBar.width = progressWidth + "%";
                    progressText.text = progressWidth + "%";
                }
                
                if (progressWidth >= 100 || !progressBar || progressBar.isDisposed) {
                    clearInterval(interval);
                }
            }, 30);
            
            // Efeito de pulsar no container principal
            const pulsateContainer = () => {
                const pulsateAnimation = new BABYLON.Animation(
                    "pulsateAnimation",
                    "scaleX",
                    30,
                    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                );
                
                const keyFrames = [];
                keyFrames.push({ frame: 0, value: 1.0 });
                keyFrames.push({ frame: 15, value: 1.02 });
                keyFrames.push({ frame: 30, value: 1.0 });
                pulsateAnimation.setKeys(keyFrames);
                
                const pulsateAnimation2 = new BABYLON.Animation(
                    "pulsateAnimation2",
                    "scaleY",
                    30,
                    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                );
                pulsateAnimation2.setKeys(keyFrames);
                
                centerContainer.animations = [pulsateAnimation, pulsateAnimation2];
                this.scene.beginAnimation(centerContainer, 0, 30, true);
            };
            pulsateContainer();
            
            // Guardar referência à UI de carregamento
            this.menuUI = loadingTexture;
        } catch (error) {
            console.error("Erro ao mostrar tela de carregamento:", error);
        }
    }
    

    // Corrigir o método cleanupMenu para evitar erros ao limpar recursos
    cleanupMenu() {
        console.log("Limpando recursos do menu...");
        
        // Limpar recursos para liberar memória
        try {
            // Parar o loop de renderização antes de limpar a cena
            if (this.engine) {
                this.engine.stopRenderLoop();
            }
            
            // Parar a música do menu
            this.stopBackgroundMusic();
            
            // Limpar a cena
            if (this.scene && !this.scene.isDisposed) {
                this.scene.dispose();
            }
            
            // Limpar a interface do menu
            if (this.menuUI) {
                this.menuUI.dispose();
            }
            
            // Limpar referências
            this.scene = null;
            this.menuUI = null;
            
            console.log("Recursos do menu limpos com sucesso!");
        } catch (error) {
            console.error("Erro ao limpar recursos do menu:", error);
        }
    }

}

export default Menu;