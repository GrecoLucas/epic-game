// Menu.js - Menu principal para seleção de modos de jogo

import GameLoader from "./GameLoader.js";

class Menu {
    constructor() {
        this.scene = null;
        this.engine = null;
        this.canvas = null;
        this.menuUI = null;
        this.gameLoader = null;
        this.backgroundMusic = null;
        this.highScores = [];
    }

    async initialize() {
        // Carregar high scores primeiro
        await this.loadHighScores();
        
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
                if (this.scene) {
                    this.scene.render();
                }
            });
            
            // Ajustar ao tamanho da janela
            window.addEventListener('resize', () => {
                this.engine.resize();
            });
            
            console.log("Menu inicializado com sucesso!");
        } catch (error) {
            console.error("Erro ao inicializar o menu:", error);
        }
    }
    
    async loadHighScores() {
        try {
            const response = await fetch('highscores.csv');
            const csvText = await response.text();
            
            // Parse do CSV
            const lines = csvText.trim().split('\n');
            this.highScores = [];
            
            // Pular a primeira linha (header)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    const [name, score] = line.split(';');
                    if (name && score) {
                        this.highScores.push({
                            name: name.trim(),
                            score: parseInt(score.trim()) || 0
                        });
                    }
                }
            }
            
            // Ordenar por pontuação (maior para menor)
            this.highScores.sort((a, b) => b.score - a.score);
            
            console.log("High scores carregados:", this.highScores);
        } catch (error) {
            console.error("Erro ao carregar high scores:", error);
            // Criar um high score padrão se houver erro
            this.highScores = [{ name: "No data", score: 0 }];
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
            15,            // Distância ajustada para focar no labirinto
            new BABYLON.Vector3(0, 1.5, 0), // Elevado um pouco para melhor visibilidade
            scene
        );
        camera.attachControl(this.canvas, true);
        camera.upperBetaLimit = Math.PI / 2.2;
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 20;
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
        
        // Luz de spot para destacar o modelo do labirinto
        const spotLight = new BABYLON.SpotLight(
            "spotLight", 
            new BABYLON.Vector3(0, 8, 0), // Posição acima do modelo
            new BABYLON.Vector3(0, -1, 0), // Direção para baixo
            Math.PI/3,                     // Ângulo
            10,                            // Expoente
            scene
        );
        spotLight.diffuse = new BABYLON.Color3(0.8, 0.5, 0.5); // Tom avermelhado para o labirinto
        spotLight.intensity = 0.7;
        
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
        const platform = BABYLON.MeshBuilder.CreateDisc("platform", {radius: 8, tessellation: 64}, scene);
        const platformMaterial = new BABYLON.StandardMaterial("platformMaterial", scene);
        platformMaterial.diffuseTexture = new BABYLON.Texture("textures/floor.png", scene);
        platformMaterial.bumpTexture = new BABYLON.Texture("textures/floor.png", scene);
        platformMaterial.diffuseTexture.uScale = 4;
        platformMaterial.diffuseTexture.vScale = 4;
        platformMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        platform.material = platformMaterial;
        platform.rotation.x = Math.PI / 2;
        platform.position.y = -1;
        
        // Adicionar borda metálica à plataforma
        const platformBorder = BABYLON.MeshBuilder.CreateTorus("platformBorder", {diameter: 16, thickness: 0.8, tessellation: 64}, scene);
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
        
        // Criar preview do labirinto no centro
        this.createMazePreview(scene, 0, 0, 0);
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
        
        // Criar 8 pontos de luz ao redor do círculo
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.sin(angle) * 8;
            const z = Math.cos(angle) * 8;
            
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
        // Criar um labirinto maior para representar o modo Maze
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
        
        // Criar um labirinto mais complexo para preview
        const walls = [
            // Paredes externas
            createWall(0, -3, 6, 0.5),  // Norte
            createWall(0, 3, 6, 0.5),   // Sul
            createWall(-3, 0, 0.5, 6),  // Oeste
            createWall(3, 0, 0.5, 6),   // Leste
            
            // Paredes internas - padrão de labirinto
            createWall(-1.5, -1, 0.5, 2),
            createWall(1.5, 1, 0.5, 2),
            createWall(0, -0.5, 3, 0.5),
            createWall(-0.5, 1.5, 2, 0.5),
        ];
        
        // Agrupar os muros
        const mazePreview = new BABYLON.TransformNode("mazePreview", scene);
        walls.forEach(wall => wall.parent = mazePreview);
        
        // Adicionar monstros pequenos
        for (let i = 0; i < 3; i++) {
            const monsterSphere = BABYLON.MeshBuilder.CreateSphere(`monster${i}`, {diameter: 0.7}, scene);
            const monsterMaterial = new BABYLON.StandardMaterial(`monsterMaterial${i}`, scene);
            monsterMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.1, 0.1);
            monsterMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
            monsterSphere.material = monsterMaterial;
            
            const angle = (i / 3) * Math.PI * 2;
            const radius = 1.5;
            monsterSphere.position = new BABYLON.Vector3(
                x + Math.sin(angle) * radius, 
                y + 0.5, 
                z + Math.cos(angle) * radius
            );
            monsterSphere.parent = mazePreview;
            
            // Animação individual para cada monstro
            scene.registerBeforeRender(() => {
                const time = performance.now() * 0.001;
                monsterSphere.position.x = x + Math.sin(angle + time) * radius;
                monsterSphere.position.z = z + Math.cos(angle + time) * radius;
            });
        }
        
        // Adicionar texto "Maze Mode"
        const mazeModeText = this.createFloatingText("MAZE MODE", x, y + 3.5, z, scene);
        mazeModeText.parent = mazePreview;
        
        return mazePreview;
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
        particleSystem.minEmitBox = new BABYLON.Vector3(-15, -10, -15);
        particleSystem.maxEmitBox = new BABYLON.Vector3(15, 10, 15);
        
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
                    console.log("Música de fundo carregada com sucesso");
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
        titleShadow.text = "Demon survivor horror";
        titleShadow.color = "rgba(0,0,0,0.7)";
        titleShadow.fontSize = 76;
        titleShadow.fontFamily = "Impact, Anton, sans-serif";
        titleShadow.top = "5px";
        titleShadow.left = "5px";
        titleContainer.addControl(titleShadow);
        
        // Título principal
        const title = new BABYLON.GUI.TextBlock();
        title.text = "Demon survivor horror";
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
        
        // Sub-título simplificado
        const subtitleContainer = new BABYLON.GUI.Rectangle();
        subtitleContainer.width = "100%";
        subtitleContainer.height = "50px";
        subtitleContainer.thickness = 0;
        subtitleContainer.paddingTop = "20px";
        panel.addControl(subtitleContainer);
        
        const subtitle = new BABYLON.GUI.TextBlock();
        subtitle.text = " TRY TO SURVIVE THE MAXIMUM NUMBER OF HORDES";
        subtitle.color = "#b3e0ff";
        subtitle.fontSize = 24;
        subtitle.fontFamily = "Arial, Helvetica, sans-serif";
        subtitle.letterSpacing = "3px";
        subtitleContainer.addControl(subtitle);
    
        // Container principal centralizado para o botão de start
        const mainContainer = new BABYLON.GUI.Rectangle();
        mainContainer.width = "100%";
        mainContainer.height = "400px";
        mainContainer.thickness = 0;
        mainContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        panel.addControl(mainContainer);
    
        // Botão principal do jogo - Centralizado
        const gameContainer = new BABYLON.GUI.Rectangle();
        gameContainer.width = "500px";
        gameContainer.height = "350px";
        gameContainer.thickness = 0;
        gameContainer.cornerRadius = 15;
        gameContainer.color = "#3399ff";
        gameContainer.background = "linear-gradient(180deg, rgba(30, 30, 50, 0.8) 0%, rgba(60, 60, 100, 0.8) 100%)";
        gameContainer.hoverCursor = "pointer";
        gameContainer.shadowColor = "rgba(0, 0, 0, 0.5)";
        gameContainer.shadowBlur = 15;
        gameContainer.shadowOffsetX = 5;
        gameContainer.shadowOffsetY = 5;
        mainContainer.addControl(gameContainer);
        
        // Borda com efeito de brilho
        const gameBorder = new BABYLON.GUI.Rectangle();
        gameBorder.width = "100%";
        gameBorder.height = "100%";
        gameBorder.thickness = 2;
        gameBorder.cornerRadius = 15;
        gameBorder.color = "rgba(102, 179, 255, 0.7)";
        gameBorder.background = "transparent";
        gameContainer.addControl(gameBorder);
        
        // Adicionar evento de clique para iniciar o jogo
        gameContainer.onPointerClickObservable.add(() => {
            this.startMazeMode();
        });
        
        // Adicionar eventos de hover para efeitos visuais
        gameContainer.onPointerEnterObservable.add(() => {
            gameContainer.background = "linear-gradient(180deg, rgba(40, 40, 70, 0.9) 0%, rgba(80, 80, 130, 0.9) 100%)";
            gameBorder.color = "rgba(153, 204, 255, 1)";
            gameBorder.thickness = 3;
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
            
            gameContainer.animations = [animation, animation2];
            this.scene.beginAnimation(gameContainer, 0, 20, false);
        });
        
        gameContainer.onPointerOutObservable.add(() => {
            gameContainer.background = "linear-gradient(180deg, rgba(30, 30, 50, 0.8) 0%, rgba(60, 60, 100, 0.8) 100%)";
            gameBorder.color = "rgba(102, 179, 255, 0.7)";
            gameBorder.thickness = 2;
            
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
            
            gameContainer.animations = [animation, animation2];
            this.scene.beginAnimation(gameContainer, 0, 10, false);
        });
        
        // Barra superior colorida
        const topBar = new BABYLON.GUI.Rectangle();
        topBar.width = "100%";
        topBar.height = "8px";
        topBar.cornerRadius = 4;
        topBar.color = "transparent";
        topBar.background = "linear-gradient(90deg, #ff3366 0%, #ff9933 100%)";
        topBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        topBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        gameContainer.addControl(topBar);
        
        // Imagem para o jogo
        const gameImage = new BABYLON.GUI.Image("gameImage", "textures/maze_mode.png");
        gameImage.width = "450px";
        gameImage.height = "180px";
        gameImage.cornerRadius = 10;
        gameImage.paddingTop = "25px";
        gameContainer.addControl(gameImage);
        
        // Título do jogo
        const gameTitle = new BABYLON.GUI.TextBlock();
        gameTitle.text = "Start Game";
        gameTitle.color = "#ffffff";
        gameTitle.fontSize = 32;
        gameTitle.fontFamily = "Tahoma, Arial, sans-serif";
        gameTitle.fontWeight = "bold";
        gameTitle.height = "40px";
        gameTitle.paddingTop = "15px";
        gameTitle.shadowColor = "rgba(0, 0, 0, 0.7)";
        gameTitle.shadowOffsetX = 2;
        gameTitle.shadowOffsetY = 2;
        gameTitle.shadowBlur = 3;
        gameContainer.addControl(gameTitle);
                
        // Botão de início
        const startBtn = new BABYLON.GUI.Button();
        startBtn.name = "startBtn";
        startBtn.width = "250px";
        startBtn.height = "60px";
        startBtn.cornerRadius = 30;
        startBtn.color = "#ffffff";
        startBtn.background = "linear-gradient(90deg, #ff3366 0%, #ff9933 100%)";
        startBtn.thickness = 0;
        startBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        startBtn.paddingBottom = "25px";
        startBtn.hoverCursor = "pointer";
        gameContainer.addControl(startBtn);
        
        // Texto do botão
        const startBtnText = new BABYLON.GUI.TextBlock();
        startBtnText.text = "START GAME";
        startBtnText.color = "#ffffff";
        startBtnText.fontSize = 22;
        startBtnText.fontFamily = "Arial, sans-serif";
        startBtnText.fontWeight = "bold";
        startBtn.addControl(startBtnText);
    
        // Adicionar evento de clique ao botão
        startBtn.onPointerClickObservable.add(() => {
            this.startMazeMode();
        });
    
        // Eventos de hover para o botão
        startBtn.onPointerEnterObservable.add(() => {
            startBtn.background = "linear-gradient(90deg, #ff5c85 0%, #ffad5c 100%)";
            this.playHoverSound();
        });        startBtn.onPointerOutObservable.add(() => {
            startBtn.background = "linear-gradient(90deg, #ff3366 0%, #ff9933 100%)";
        });

        // Container separado para as instruções - posicionado no espaço vazio
        const instructionsMainContainer = new BABYLON.GUI.Rectangle();
        instructionsMainContainer.width = "100%";
        instructionsMainContainer.height = "280px";
        instructionsMainContainer.thickness = 0;
        instructionsMainContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        instructionsMainContainer.paddingBottom = "80px";
        panel.addControl(instructionsMainContainer);

        // Seção de instruções de como jogar
        const instructionsContainer = new BABYLON.GUI.Rectangle();
        instructionsContainer.width = "650px";
        instructionsContainer.height = "200px";
        instructionsContainer.thickness = 2;
        instructionsContainer.cornerRadius = 15;
        instructionsContainer.shadowBlur = 10;
        instructionsContainer.shadowOffsetX = 3;
        instructionsContainer.shadowOffsetY = 3;
        instructionsMainContainer.addControl(instructionsContainer);

        const instructionsPanel = new BABYLON.GUI.StackPanel();
        instructionsPanel.width = "90%";
        instructionsPanel.height = "140px";
        instructionsPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        instructionsPanel.paddingTop = "5px";
        instructionsContainer.addControl(instructionsPanel);

        // Criar as instruções
        const instructions = [
            "WASD - Move around the maze",
            "MOUSE - Look around and aim",
            "LEFT CLICK - Shoot / Use weapon",
            "R - Reload weapon",
            "1, 2, 3, 4, 5 - Switch weapons",
            "E - Pick up items and weapons",
            "B - Build mode (place blocks)",
            "H - Start monster horde",
            "P/ESC - Pause game",
            "wired fence - slows zombies",
        ];

        // Dividir as instruções em duas colunas
        const leftColumn = instructions.slice(0, 5);
        const rightColumn = instructions.slice(5);

        // Container para as colunas
        const columnsContainer = new BABYLON.GUI.Rectangle();
        columnsContainer.width = "100%";
        columnsContainer.height = "120px";
        columnsContainer.thickness = 0;
        instructionsPanel.addControl(columnsContainer);

        // Coluna esquerda
        const leftColumnContainer = new BABYLON.GUI.StackPanel();
        leftColumnContainer.width = "48%";
        leftColumnContainer.height = "100%";
        leftColumnContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        leftColumnContainer.paddingLeft = "20px";
        columnsContainer.addControl(leftColumnContainer);        leftColumn.forEach(instruction => {
            const instructionText = new BABYLON.GUI.TextBlock();
            instructionText.text = instruction;
            instructionText.color = "#ffffff";
            instructionText.fontSize = 14;
            instructionText.fontFamily = "Consolas, monospace";
            instructionText.height = "20px";
            instructionText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            instructionText.paddingLeft = "10px";
            instructionText.paddingBottom = "2px";
            leftColumnContainer.addControl(instructionText);
        });

        // Coluna direita
        const rightColumnContainer = new BABYLON.GUI.StackPanel();
        rightColumnContainer.width = "48%";
        rightColumnContainer.height = "100%";
        rightColumnContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        rightColumnContainer.paddingRight = "20px";
        columnsContainer.addControl(rightColumnContainer);

        rightColumn.forEach(instruction => {
            const instructionText = new BABYLON.GUI.TextBlock();
            instructionText.text = instruction;
            instructionText.color = "#ffffff";
            instructionText.fontSize = 14;
            instructionText.fontFamily = "Consolas, monospace";
            instructionText.height = "20px";
            instructionText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            instructionText.paddingLeft = "10px";
            instructionText.paddingBottom = "2px";
            rightColumnContainer.addControl(instructionText);
        });

        // Linha decorativa no final das instruções
        const instructionsLine = new BABYLON.GUI.Rectangle();
        instructionsLine.width = "80%";
        instructionsLine.height = "2px";
        instructionsLine.cornerRadius = 1;
        instructionsLine.color = "transparent";
        instructionsLine.background = "linear-gradient(90deg, rgba(102,179,255,0) 0%, rgba(102,179,255,0.8) 50%, rgba(102,179,255,0) 100%)";
        instructionsLine.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        instructionsLine.paddingBottom = "10px";
        instructionsContainer.addControl(instructionsLine);
        
        // Rodapé com créditos e versão
        const footerContainer = new BABYLON.GUI.Rectangle();
        footerContainer.width = "100%";
        footerContainer.height = "40px";
        footerContainer.thickness = 0;
        footerContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        footerContainer.paddingBottom = "15px";
        panel.addControl(footerContainer);
        
        const footerText = new BABYLON.GUI.TextBlock();
        footerText.text = "© 2025 Demon survivor horror | v1.2.0 | Developed with Babylon.js";
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
    
    // Iniciar o modo labirinto
    startMazeMode() {
        try {
            this.playClickSound();
            
            // Mostrar tela de carregamento
            this.showLoadingScreen("Carregando Labirinto...");
            
            // Parar a música do menu
            this.stopBackgroundMusic();
            
            // Carregar o modo Maze
            setTimeout(() => {
                this.cleanupMenu();
                this.gameLoader.loadMazeMode();
            }, 1500);
        } catch (error) {
            console.error("Erro ao iniciar modo labirinto:", error);
        }
    }
    
    // Função para mostrar tela de carregamento
    showLoadingScreen(text) {
        console.log(`Mostrando tela de carregamento: ${text}`);
        
        try {
            // Remover UI existente
            if (this.menuUI) {
                this.menuUI.dispose();
                this.menuUI = null;
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
            
            // Adicionar logo do jogo
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
            logoText.text = "DSH";
            logoText.color = "white";
            logoText.fontSize = 48;
            logoText.fontFamily = "Impact, Arial, sans-serif";
            logoText.shadowBlur = 5;
            logoText.shadowColor = "rgba(0, 100, 255, 0.5)";
            logoCircle.addControl(logoText);
            
            // Animar o círculo do logo (rotação)
            const animateLogo = () => {
                logoCircle.rotation += 0.01;
                requestAnimationFrame(animateLogo);
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
            
            // Simular progresso de carregamento
            let progress = 0;
            const updateProgress = () => {
                progress += Math.random() * 15;
                if (progress > 100) progress = 100;
                
                progressBar.width = progress + "%";
                progressText.text = Math.floor(progress) + "%";
                
                if (progress < 100) {
                    setTimeout(updateProgress, 100);
                }
            };
            updateProgress();
            
            // Dica aleatória
            const tips = [
                "Tip: Look for hidden items in the maze to gain advantages.",
                "Tip: Zombies are slower but attack in groups.",
                "Tip: Barricades can be destroyed by monsters after several attacks.",
                "Tip: The pistol has infinite ammo but deals less damage.",
                "Tip: Press 'H' to start a horde of monsters.",
                "Tip: Monsters deal more damage in surprise attacks."
            ];
            
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            
            const tipText = new BABYLON.GUI.TextBlock();
            tipText.text = randomTip;
            tipText.color = "rgba(255, 255, 255, 0.8)";
            tipText.fontSize = 16;
            tipText.fontFamily = "Segoe UI, Arial, sans-serif";
            tipText.textWrapping = true;
            tipText.top = "130px";
            tipText.height = "60px";
            tipText.paddingLeft = "20px";
            tipText.paddingRight = "20px";
            centerContainer.addControl(tipText);
            
        } catch (error) {
            console.error("Erro ao criar tela de carregamento:", error);
        }
    }
    
    // Limpar recursos do menu
    cleanupMenu() {
        console.log("Limpando recursos do menu...");
        
        // Limpar recursos para liberar memória
        try {
            // Dispose da UI
            if (this.menuUI) {
                this.menuUI.dispose();
                this.menuUI = null;
            }
            
            // Parar música
            this.stopBackgroundMusic();
            
            // Dispose da cena
            if (this.scene) {
                this.scene.dispose();
                this.scene = null;
            }
            
            // Dispose do engine
            if (this.engine) {
                this.engine.dispose();
                this.engine = null;
            }
        } catch (error) {
            console.error("Erro ao limpar recursos do menu:", error);
        }
    }
}

export default Menu;