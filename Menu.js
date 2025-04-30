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
        
        // Configurar cor de fundo
        scene.clearColor = new BABYLON.Color3(0.05, 0.05, 0.1);
        
        // Criar câmera
        const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(this.canvas, true);
        camera.upperBetaLimit = Math.PI / 2;
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 20;
        
        // Adicionar luz
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        
        // Criar elementos visuais para o menu
        this.createVisualElements(scene);
        
        // Adicionar efeitos
        this.addEffects(scene);
        
        // Adicionar música de fundo
        this.addBackgroundMusic(scene);
        
        return scene;
    }
    
    createVisualElements(scene) {
        // Criar um skybox
        const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 1000}, scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skybox.material = skyboxMaterial;
        
        // Criar chão com textura
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 50, height: 50}, scene);
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture("textures/floor.png", scene);
        groundMaterial.diffuseTexture.uScale = 10;
        groundMaterial.diffuseTexture.vScale = 10;
        ground.material = groundMaterial;
        ground.position.y = -1;
        
        // Adicionar decorações ambientais
        
        // 1. Muro do labirinto (Modo Maze)
        this.createMazePreview(scene, -5, 0, 0);
        
        // 2. Paisagem aberta (Modo Open World)
        this.createOpenWorldPreview(scene, 5, 0, 0);
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
            if (nx >= 0 && nx <= 1 && nz >= 0 && nz <= 1) {
                heightAtPoint = this.noise(nx * 5, nz * 5) * 0.5;
            }
            
            this.createTree(scene, x + treeX, y + heightAtPoint, z + treeZ, 0.3 + Math.random() * 0.3).parent = openWorldPreview;
        }
        
        // Adicionar uma pequena casa
        this.createHouse(scene, x - 1, y + 0.1, z - 1, 0.7).parent = openWorldPreview;
        
        // Adicionar texto "Open World Mode"
        const openWorldText = this.createFloatingText("OPEN WORLD MODE", x, y + 3, z, scene);
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
        
        // Título do jogo
        const titleContainer = new BABYLON.GUI.Rectangle();
        titleContainer.width = "100%";
        titleContainer.height = "150px";
        titleContainer.thickness = 0;
        titleContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        titleContainer.paddingTop = "50px";
        panel.addControl(titleContainer);
        
        const title = new BABYLON.GUI.TextBlock();
        title.text = "ESCAPE ROOM 3D";
        title.color = "white";
        title.fontSize = 70;
        title.fontFamily = "Impact";
        title.shadowColor = "black";
        title.shadowOffsetX = 3;
        title.shadowOffsetY = 3;
        title.shadowBlur = 6;
        titleContainer.addControl(title);
        
        // Sub-título
        const subtitleContainer = new BABYLON.GUI.Rectangle();
        subtitleContainer.width = "100%";
        subtitleContainer.height = "50px";
        subtitleContainer.thickness = 0;
        subtitleContainer.paddingTop = "10px";
        panel.addControl(subtitleContainer);
        
        const subtitle = new BABYLON.GUI.TextBlock();
        subtitle.text = "Selecione um modo de jogo";
        subtitle.color = "white";
        subtitle.fontSize = 24;
        subtitle.fontFamily = "Arial";
        subtitleContainer.addControl(subtitle);
        
        // Container para os botões
        const buttonsContainer = new BABYLON.GUI.Rectangle();
        buttonsContainer.width = "800px";
        buttonsContainer.height = "400px";
        buttonsContainer.thickness = 0;
        buttonsContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        panel.addControl(buttonsContainer);
        
        // Painéis para cada modo
        const modesContainer = new BABYLON.GUI.Grid();
        modesContainer.addColumnDefinition(0.5);
        modesContainer.addColumnDefinition(0.5);
        modesContainer.width = "100%";
        modesContainer.height = "100%";
        buttonsContainer.addControl(modesContainer);
        
        // Botão do Modo Maze
        const mazeModeContainer = new BABYLON.GUI.Rectangle();
        mazeModeContainer.width = "350px";
        mazeModeContainer.height = "350px";
        mazeModeContainer.thickness = 2;
        mazeModeContainer.cornerRadius = 10;
        mazeModeContainer.color = "white";
        mazeModeContainer.background = "rgba(30, 30, 30, 0.7)";
        mazeModeContainer.hoverCursor = "pointer";
        mazeModeContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        mazeModeContainer.paddingRight = "10px";
        modesContainer.addControl(mazeModeContainer, 0, 0);
        
        // Adicionar evento de clique para iniciar o modo Maze
        mazeModeContainer.onPointerClickObservable.add(() => {
            this.startMazeMode();
        });
        
        // Adicionar evento de hover para destaque
        mazeModeContainer.onPointerEnterObservable.add(() => {
            mazeModeContainer.background = "rgba(60, 60, 60, 0.7)";
            this.playHoverSound();
        });
        
        mazeModeContainer.onPointerOutObservable.add(() => {
            mazeModeContainer.background = "rgba(30, 30, 30, 0.7)";
        });
        
        // Imagem para o modo Maze
        const mazeModeImage = new BABYLON.GUI.Image("mazeModeImage", "textures/maze_mode.png");
        mazeModeImage.width = "340px";
        mazeModeImage.height = "200px";
        mazeModeImage.paddingTop = "10px";
        mazeModeContainer.addControl(mazeModeImage);
        
        // Título do modo Maze
        const mazeModeTitle = new BABYLON.GUI.TextBlock();
        mazeModeTitle.text = "MODO LABIRINTO";
        mazeModeTitle.color = "white";
        mazeModeTitle.fontSize = 24;
        mazeModeTitle.height = "40px";
        mazeModeTitle.paddingTop = "10px";
        mazeModeContainer.addControl(mazeModeTitle);
        
        // Descrição do modo Maze
        const mazeModeDesc = new BABYLON.GUI.TextBlock();
        mazeModeDesc.text = "Escape do labirinto, enfrente hordas de monstros e resolva quebra-cabeças para sobreviver";
        mazeModeDesc.color = "white";
        mazeModeDesc.fontSize = 16;
        mazeModeDesc.height = "80px";
        mazeModeDesc.textWrapping = true;
        mazeModeDesc.paddingLeft = "10px";
        mazeModeDesc.paddingRight = "10px";
        mazeModeContainer.addControl(mazeModeDesc);
        
        // Botão do Modo Open World
        const openWorldContainer = new BABYLON.GUI.Rectangle();
        openWorldContainer.width = "350px";
        openWorldContainer.height = "350px";
        openWorldContainer.thickness = 2;
        openWorldContainer.cornerRadius = 10;
        openWorldContainer.color = "white";
        openWorldContainer.background = "rgba(30, 30, 30, 0.7)";
        openWorldContainer.hoverCursor = "pointer";
        openWorldContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        openWorldContainer.paddingLeft = "10px";
        modesContainer.addControl(openWorldContainer, 0, 1);
        
        // Adicionar evento de clique para iniciar o modo Open World
        openWorldContainer.onPointerClickObservable.add(() => {
            this.startOpenWorldMode();
        });
        
        // Adicionar evento de hover para destaque
        openWorldContainer.onPointerEnterObservable.add(() => {
            openWorldContainer.background = "rgba(60, 60, 60, 0.7)";
            this.playHoverSound();
        });
        
        openWorldContainer.onPointerOutObservable.add(() => {
            openWorldContainer.background = "rgba(30, 30, 30, 0.7)";
        });
        
        // Imagem para o modo Open World
        const openWorldImage = new BABYLON.GUI.Image("openWorldImage", "textures/open_world_mode.png");
        openWorldImage.width = "340px";
        openWorldImage.height = "200px";
        openWorldImage.paddingTop = "10px";
        openWorldContainer.addControl(openWorldImage);
        
        // Título do modo Open World
        const openWorldTitle = new BABYLON.GUI.TextBlock();
        openWorldTitle.text = "MODO MUNDO ABERTO";
        openWorldTitle.color = "white";
        openWorldTitle.fontSize = 24;
        openWorldTitle.height = "40px";
        openWorldTitle.paddingTop = "10px";
        openWorldContainer.addControl(openWorldTitle);
        
        // Descrição do modo Open World
        const openWorldDesc = new BABYLON.GUI.TextBlock();
        openWorldDesc.text = "Explore um mundo gerado proceduralmente com diferentes biomas, vilas, construções e recursos";
        openWorldDesc.color = "white";
        openWorldDesc.fontSize = 16;
        openWorldDesc.height = "80px";
        openWorldDesc.textWrapping = true;
        openWorldDesc.paddingLeft = "10px";
        openWorldDesc.paddingRight = "10px";
        openWorldContainer.addControl(openWorldDesc);
        
        // Rodapé com créditos
        const footerContainer = new BABYLON.GUI.Rectangle();
        footerContainer.width = "100%";
        footerContainer.height = "30px";
        footerContainer.thickness = 0;
        footerContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        footerContainer.paddingBottom = "10px";
        panel.addControl(footerContainer);
        
        const footerText = new BABYLON.GUI.TextBlock();
        footerText.text = "© 2025 Escape Room 3D - Babylon.js";
        footerText.color = "white";
        footerText.fontSize = 14;
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
            
            // Fundo escuro
            const background = new BABYLON.GUI.Rectangle();
            background.width = "100%";
            background.height = "100%";
            background.color = "black";
            background.thickness = 0;
            background.background = "black";
            loadingTexture.addControl(background);
            
            // Texto de carregamento
            const loadingText = new BABYLON.GUI.TextBlock();
            loadingText.text = text;
            loadingText.color = "white";
            loadingText.fontSize = 36;
            loadingText.fontFamily = "Arial";
            loadingText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
            loadingText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            background.addControl(loadingText);
            
            // Barra de progresso
            const progressBarContainer = new BABYLON.GUI.Rectangle();
            progressBarContainer.width = "400px";
            progressBarContainer.height = "40px";
            progressBarContainer.cornerRadius = 5;
            progressBarContainer.color = "white";
            progressBarContainer.thickness = 2;
            progressBarContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            progressBarContainer.top = "80px";
            background.addControl(progressBarContainer);
            
            const progressBar = new BABYLON.GUI.Rectangle();
            progressBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            progressBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            progressBar.height = "30px";
            progressBar.width = "0px";
            progressBar.cornerRadius = 5;
            progressBar.color = "transparent";
            progressBar.background = "white";
            progressBar.paddingLeft = "5px";
            progressBar.paddingRight = "5px";
            progressBarContainer.addControl(progressBar);
            
            // Animar a barra de progresso
            let width = 0;
            const interval = setInterval(() => {
                width += 4;
                if (progressBar) {
                    progressBar.width = width + "px";
                }
                if (width >= 390) {
                    clearInterval(interval);
                }
            }, 30);
            
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