// OpenWorldGame.js - Implementação do modo de jogo de mundo aberto
import Player from '../Player.js';
import WorldGenerator from './WorldGenerator.js';
import Collision from '../utils/Collision.js';
import BiomeManager from './BiomeManager.js';
import StructureManager from './StructureManager.js';
import EntityManager from './EntityManager.js';
import GunLoader from '../GunLoader.js';
import ZombieS from '../objects/ZombieS.js';
import SkySphere from "../objects/SkySphere.js";
import SkySphereController from "../controller/SkySphereController.js";
import BuildingController from '../controller/BuildingController.js';

class OpenWorldGame {
    constructor(engine, scene) {
        this.engine = engine;
        this.scene = scene;
        
        // Sistemas do jogo
        this.collisionSystem = null;
        this.player = null;
        this.worldGenerator = null;
        this.biomeManager = null;
        this.structureManager = null;
        this.entityManager = null;
        this.gunLoader = null;
        this.zombieSpawner = null;
        this.skySphereController = null;
        this.buildingController = null;
        
        // Configurações do mundo
        this.worldSeed = Math.floor(Math.random() * 1000000); // Seed aleatória
        this.worldSize = 1000; // Tamanho do mundo em unidades
        this.chunkSize = 10; // Tamanho de cada chunk em unidades
        this.visibleRange = 2; // Quantos chunks são visíveis em cada direção
        
        // Estado do jogo
        this.isPaused = false;
        this.isInitialized = false;
        this.loadedChunks = new Map(); // Mapa de chunks carregados
        
        // Definir explicitamente o modo de jogo
        this.gameMode = 'openworld';
        
        // Armazenar referência ao Game na cena
        this.scene.gameInstance = this;
    }
    async initialize() {
        console.log(`Inicializando mundo aberto com seed: ${this.worldSeed}`);
        
        try {
            // Configurar física
            this.scene.collisionsEnabled = true;
            this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
            
            // Tratar caso PhysicsEngine não esteja disponível
            try {
                this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
            } catch (e) {
                console.warn("Não foi possível habilitar física. Continuando sem física:", e);
            }
    
            // Criar sistema de colisão
            this.collisionSystem = new Collision(this.scene);
            
            // Inicializar biomeManager (gerencia os diferentes biomas)
            this.biomeManager = new BiomeManager(this.scene, this.worldSeed);
            
            // Inicializar geradores de mundo
            this.worldGenerator = new WorldGenerator(this.scene, this, this.worldSeed);
            
            // Inicializar gerenciador de estruturas (casas, árvores, etc.)
            this.structureManager = new StructureManager(this.scene, this, this.worldSeed);
            
            // Inicializar gerenciador de entidades (monstros, NPCs, itens)
            this.entityManager = new EntityManager(this.scene, this);
            
            // Criar jogador
            this.player = new Player(this.scene);
            this.player.initialize(this.engine.getRenderingCanvas());
            
            // Adicionar mesh do jogador ao sistema de colisão
            this.collisionSystem.addMesh(this.player.getMesh());
    
            // Configurar câmera para colisões
            this.collisionSystem.setupCameraCollisions(this.player.getCamera());
            
            // Posicionar o jogador no centro do mundo
            this.player.setPosition(new BABYLON.Vector3(0, 5, 0)); // Altura 5 para dar tempo de carregar o terreno
            
            // Inicializar SkySphere
            await this._initializeSkySphere();
            
            // Inicializar o carregador de armas
            this.gunLoader = new GunLoader(this.scene);
            
            // Posicionar algumas armas iniciais para o jogador
            this.placeInitialWeapons();
            
            // Inicializar o sistema de hordas de zumbis
            this.initializeZombieSpawner();
            
            // Gerar mundo inicial em torno do jogador
            await this.generateInitialWorld();
            
            // Configurar o sistema de atualização para carregar/descarregar chunks conforme o jogador se move
            this.setupChunkLoadingSystem();
            
            // Adicionar eventos de interface do usuário
            this.setupUIEvents();
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("Erro ao inicializar o mundo aberto:", error);
            return false;
        }
    }
    

    // 1. Improve generateInitialWorld to handle errors better
    async generateInitialWorld() {
        console.log("Generating initial world...");
        
        try {
            const playerPosition = this.player.getPosition();
            
            // CHANGE: First load only immediate chunks (range 1)
            const immediateChunks = this.getChunksAroundPosition(playerPosition, 1);
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Generate immediate chunks first
            for (let i = 0; i < immediateChunks.length; i++) {
                const progress = (i / immediateChunks.length) * 50; // First 50% of progress
                this.updateLoadingProgress(progress);
                try {
                    await this.generateChunk(immediateChunks[i].x, immediateChunks[i].z);
                } catch (error) {
                    console.warn(`Failed to generate initial chunk ${immediateChunks[i].x},${immediateChunks[i].z}:`, error);
                    // Continue with next chunk even if this one fails
                }
                
                // Small pause to allow UI to update
                await new Promise(resolve => setTimeout(resolve, 5));
            }
            
            // Now player can start playing while rest loads in background
            this.hideLoadingScreen();
            
            // CHANGE: Load remaining chunks in background over time
            if (this.visibleRange > 1) {
                // Get full range chunks and filter out already loaded ones
                const allChunks = this.getChunksAroundPosition(playerPosition, this.visibleRange);
                const remainingChunks = allChunks.filter(chunk => {
                    const chunkId = `${chunk.x},${chunk.z}`;
                    return !this.loadedChunks.has(chunkId);
                });
                
                // Load remaining chunks in small batches with delays
                this._loadRemainingChunksInBackground(remainingChunks);
            }
            
            console.log("Initial world generation complete!");
            return true;
        } catch (error) {
            console.error("Error generating initial world:", error);
            this.hideLoadingScreen();
            return false;
        }
    }
    

    async _loadRemainingChunksInBackground(chunks) {
        const BATCH_SIZE = 2; // Load 2 chunks at a time
        const DELAY_BETWEEN_BATCHES = 300; // 300ms delay between batches
        
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            
            // Load batch of chunks
            for (const chunk of batch) {
                try {
                    await this.generateChunk(chunk.x, chunk.z);
                } catch (error) {
                    console.warn(`Failed to load background chunk ${chunk.x},${chunk.z}:`, error);
                    // Continue with next chunk even if this one fails
                }
            }
            
            // Wait before loading next batch to avoid freezing the game
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    }
    
    // 3. Improve generateChunk with better error handling and fix pointer lock issues
    async generateChunk(chunkX, chunkZ) {
        // Fix pointer lock issues
        this.fixPointerLockIssues();
        const chunkId = `${chunkX},${chunkZ}`;
        
        // Check if chunk is already loaded
        if (this.loadedChunks.has(chunkId)) {
            return this.loadedChunks.get(chunkId);
        }
        
        try {
            // Calculate real world position
            const worldX = chunkX * this.chunkSize;
            const worldZ = chunkZ * this.chunkSize;
            
            // Determine biome for this chunk
            let biome = 'plains'; // Default biome
            if (this.biomeManager) {
                biome = this.biomeManager.getBiomeAt(worldX, worldZ);
            }
            
            // Default empty arrays in case of errors
            let chunkMeshes = [];
            let structures = [];
            let entities = [];
            
            // Generate terrain for this chunk
            if (this.worldGenerator) {
                try {
                    chunkMeshes = await this.worldGenerator.generateChunkTerrain(chunkX, chunkZ, biome);
                } catch (error) {
                    console.error(`Error generating terrain for chunk ${chunkId}:`, error);
                    // Create a simple flat ground as fallback
                    const fallbackGround = BABYLON.MeshBuilder.CreateGround(
                        `terrain_fallback_${chunkX}_${chunkZ}`,
                        { width: this.chunkSize, height: this.chunkSize },
                        this.scene
                    );
                    fallbackGround.position.x = worldX;
                    fallbackGround.position.z = worldZ;
                    fallbackGround.checkCollisions = true;
                    
                    const fallbackMaterial = new BABYLON.StandardMaterial(`fallback_material_${chunkId}`, this.scene);
                    fallbackMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                    fallbackGround.material = fallbackMaterial;
                    
                    fallbackGround.metadata = { isChunkTerrain: true };
                    chunkMeshes = [fallbackGround];
                }
            }
            
            // Add terrain meshes to collision system
            if (this.collisionSystem && chunkMeshes.length > 0) {
                this.collisionSystem.addMeshes(chunkMeshes);
            }
            
            // Generate structures for this chunk
            if (this.structureManager) {
                try {
                    structures = await this.structureManager.generateStructuresForChunk(chunkX, chunkZ, biome);
                    // Add to collision system
                    if (this.collisionSystem && structures && structures.length > 0) {
                        this.collisionSystem.addMeshes(structures);
                    }
                } catch (error) {
                    console.error(`Error generating structures for chunk ${chunkId}:`, error);
                }
            }
            
            // Generate entities for this chunk
            if (this.entityManager) {
                try {
                    entities = await this.entityManager.spawnEntitiesInChunk(chunkX, chunkZ, biome);
                } catch (error) {
                    console.error(`Error generating entities for chunk ${chunkId}:`, error);
                }
            }
            
            // Store chunk data
            const chunkData = {
                x: chunkX,
                z: chunkZ,
                biome: biome,
                terrain: chunkMeshes,
                structures: structures,
                entities: entities,
                lastAccessed: Date.now()
            };
            
            this.loadedChunks.set(chunkId, chunkData);
            
            return chunkData;
        } catch (error) {
            console.error(`Error generating chunk ${chunkId}:`, error);
            return null;
        }
    }
            
    // 3. Improve generateChunk with better error handling
    async generateChunk(chunkX, chunkZ) {
        const chunkId = `${chunkX},${chunkZ}`;
        
        // Check if chunk is already loaded
        if (this.loadedChunks.has(chunkId)) {
            return this.loadedChunks.get(chunkId);
        }
        
        try {
            // Calculate real world position
            const worldX = chunkX * this.chunkSize;
            const worldZ = chunkZ * this.chunkSize;
            
            // Determine biome for this chunk
            let biome = 'plains'; // Default biome
            if (this.biomeManager) {
                biome = this.biomeManager.getBiomeAt(worldX, worldZ);
            }
            
            // Default empty arrays in case of errors
            let chunkMeshes = [];
            let structures = [];
            let entities = [];
            
            // Generate terrain for this chunk
            if (this.worldGenerator) {
                try {
                    chunkMeshes = await this.worldGenerator.generateChunkTerrain(chunkX, chunkZ, biome);
                } catch (error) {
                    console.error(`Error generating terrain for chunk ${chunkId}:`, error);
                    // Create a simple flat ground as fallback
                    const fallbackGround = BABYLON.MeshBuilder.CreateGround(
                        `terrain_fallback_${chunkX}_${chunkZ}`,
                        { width: this.chunkSize, height: this.chunkSize },
                        this.scene
                    );
                    fallbackGround.position.x = worldX;
                    fallbackGround.position.z = worldZ;
                    fallbackGround.checkCollisions = true;
                    
                    const fallbackMaterial = new BABYLON.StandardMaterial(`fallback_material_${chunkId}`, this.scene);
                    fallbackMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                    fallbackGround.material = fallbackMaterial;
                    
                    fallbackGround.metadata = { isChunkTerrain: true };
                    chunkMeshes = [fallbackGround];
                }
            }
            
            // Add terrain meshes to collision system
            if (this.collisionSystem && chunkMeshes.length > 0) {
                this.collisionSystem.addMeshes(chunkMeshes);
            }
            
            // Generate structures for this chunk
            if (this.structureManager) {
                try {
                    structures = await this.structureManager.generateStructuresForChunk(chunkX, chunkZ, biome);
                    // Add to collision system
                    if (this.collisionSystem && structures && structures.length > 0) {
                        this.collisionSystem.addMeshes(structures);
                    }
                } catch (error) {
                    console.error(`Error generating structures for chunk ${chunkId}:`, error);
                }
            }
            
            // Generate entities for this chunk
            if (this.entityManager) {
                try {
                    entities = await this.entityManager.spawnEntitiesInChunk(chunkX, chunkZ, biome);
                } catch (error) {
                    console.error(`Error generating entities for chunk ${chunkId}:`, error);
                }
            }
            
            // Store chunk data
            const chunkData = {
                x: chunkX,
                z: chunkZ,
                biome: biome,
                terrain: chunkMeshes,
                structures: structures,
                entities: entities,
                lastAccessed: Date.now()
            };
            
            this.loadedChunks.set(chunkId, chunkData);
            
            return chunkData;
        } catch (error) {
            console.error(`Error generating chunk ${chunkId}:`, error);
            return null;
        }
    }

    // Método para descarregar um chunk
    unloadChunk(chunkX, chunkZ) {
        const chunkId = `${chunkX},${chunkZ}`;
        
        // Verificar se o chunk está carregado
        if (!this.loadedChunks.has(chunkId)) {
            return;
        }
        
        const chunk = this.loadedChunks.get(chunkId);
        
        // Remover meshes do terreno
        if (chunk.terrain && chunk.terrain.length > 0) {
            chunk.terrain.forEach(mesh => {
                if (mesh && !mesh.isDisposed()) {
                    mesh.dispose();
                }
            });
        }
        
        // Remover estruturas
        if (chunk.structures && chunk.structures.length > 0) {
            chunk.structures.forEach(mesh => {
                if (mesh && !mesh.isDisposed()) {
                    mesh.dispose();
                }
            });
        }
        
        // Remover entidades
        if (chunk.entities && chunk.entities.length > 0) {
            chunk.entities.forEach(entity => {
                if (entity && entity.dispose) {
                    entity.dispose();
                }
            });
        }
        
        // Remover o chunk do mapa
        this.loadedChunks.delete(chunkId);
        
        console.log(`Chunk descarregado: ${chunkId}`);
    }
    
    // Obter coordenadas dos chunks em torno de uma posição
    getChunksAroundPosition(position, range) {
        const chunks = [];
        
        // Converter posição do mundo para coordenadas de chunk
        const centerChunkX = Math.floor(position.x / this.chunkSize);
        const centerChunkZ = Math.floor(position.z / this.chunkSize);
        
        // Adicionar todos os chunks no raio especificado
        for (let x = -range; x <= range; x++) {
            for (let z = -range; z <= range; z++) {
                chunks.push({
                    x: centerChunkX + x,
                    z: centerChunkZ + z,
                    // Distância ao centro (útil para carregar os chunks mais próximos primeiro)
                    distance: Math.sqrt(x * x + z * z)
                });
            }
        }
        
        // Ordenar por distância para carregar primeiro os mais próximos
        chunks.sort((a, b) => a.distance - b.distance);
        
        return chunks;
    }
    
    // Configurar sistema de carregamento/descarregamento de chunks conforme o jogador se move
    setupChunkLoadingSystem() {
        let lastChunkX = null;
        let lastChunkZ = null;
        let checkInterval = null;
        
        // Função para verificar e atualizar chunks
        const checkChunks = async () => {
            if (!this.player) return;
            
            const playerPosition = this.player.getPosition();
            
            // Converter posição do jogador para coordenadas de chunk
            const currentChunkX = Math.floor(playerPosition.x / this.chunkSize);
            const currentChunkZ = Math.floor(playerPosition.z / this.chunkSize);
            
            // Se o jogador mudou de chunk
            if (currentChunkX !== lastChunkX || currentChunkZ !== lastChunkZ) {
                lastChunkX = currentChunkX;
                lastChunkZ = currentChunkZ;
                
                // Encontrar chunks que precisam ser carregados
                const visibleChunks = this.getChunksAroundPosition(playerPosition, this.visibleRange);
                const visibleChunkIds = new Set(visibleChunks.map(c => `${c.x},${c.z}`));
                
                // Descarregar chunks fora do alcance
                for (const [chunkId, chunk] of this.loadedChunks.entries()) {
                    if (!visibleChunkIds.has(chunkId)) {
                        this.unloadChunk(chunk.x, chunk.z);
                    }
                }
                
                // Carregar novos chunks visíveis
                for (const chunk of visibleChunks) {
                    if (!this.loadedChunks.has(`${chunk.x},${chunk.z}`)) {
                        await this.generateChunk(chunk.x, chunk.z);
                    }
                }
            }
        };
        
        // Verificar a cada 500ms
        checkInterval = setInterval(checkChunks, 500);
    }
    
    // Inicializar o controlador de construção
    initializeBuildingController() {
        if (this.player && this.player.controller) {
            // O BuildingController é inicializado dentro do PlayerController
            this.buildingController = this.player.controller.buildingController;
            
            // Dar ao jogador alguns materiais de construção iniciais
            if (this.buildingController) {
                this.buildingController.addMaterials(10, 5); // 10 blocos, 5 rampas
            }
        }
    }
    

    initializeZombieSpawner() {
        // ESTA FUNÇÃO AGORA ESTÁ VAZIA PARA IMPEDIR O SISTEMA DE HORDAS NO MUNDO ABERTO
        console.log("Sistema de hordas desabilitado no modo Open World.");
        
        // Não inicializa mais o ZombieS no modo Open World
        this.zombieSpawner = null;
    }
    
    // Colocar algumas armas iniciais para o jogador
    placeInitialWeapons() {
        if (this.gunLoader) {
            // Criar uma pistola perto da posição inicial do jogador
            const pistolPosition = this.player.getPosition().clone();
            pistolPosition.x += 2;
            pistolPosition.y = 1;
            
            this.gunLoader.createGunAtPosition(
                pistolPosition.x,
                pistolPosition.y,
                pistolPosition.z,
                'pistol'
            );
            
            console.log("Arma inicial posicionada para o jogador");
        }
    }
    
    // Inicializar a SkySphere
    async _initializeSkySphere() {
        try {
            // Criar a SkySphere
            const skySphere = new SkySphere(this.scene);
            
            // Criar e configurar o controlador
            this.skySphereController = new SkySphereController(this.scene);
            this.skySphereController.initialize(skySphere);
            
            // Tentar criar a SkySphere
            const success = this.skySphereController.createSkySphere();
            
            if (success) {
                console.log("SkySphere criada com sucesso após inicialização do player");
                return true;
            } else {
                // Se falhar, tentar novamente depois de um pequeno delay
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (this.skySphereController.createSkySphere()) {
                            console.log("SkySphere criada com sucesso após delay");
                            resolve(true);
                        } else {
                            console.error("Falha ao criar SkySphere mesmo após delay");
                            resolve(false);
                        }
                    }, 1000);
                });
            }
        } catch (error) {
            console.error("Erro ao inicializar SkySphere:", error);
            return false;
        }
    }
    
    // Mostrar tela de carregamento
    showLoadingScreen() {
        // Criar uma interface fullscreen para mostrar o progresso
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("loadingUI");
        
        // Criar painel de fundo
        const background = new BABYLON.GUI.Rectangle();
        background.width = "100%";
        background.height = "100%";
        background.color = "black";
        background.thickness = 0;
        background.background = "rgba(0, 0, 0, 0.7)";
        advancedTexture.addControl(background);
        
        // Texto de loading
        const loadingText = new BABYLON.GUI.TextBlock();
        loadingText.text = "Gerando Mundo Aberto...";
        loadingText.color = "white";
        loadingText.fontSize = 32;
        loadingText.height = "40px";
        loadingText.top = "-50px";
        background.addControl(loadingText);
        
        // Container da barra de progresso
        const progressContainer = new BABYLON.GUI.Rectangle();
        progressContainer.width = "600px";
        progressContainer.height = "40px";
        progressContainer.cornerRadius = 10;
        progressContainer.color = "white";
        progressContainer.thickness = 2;
        background.addControl(progressContainer);
        
        // Barra de progresso
        this.progressBar = new BABYLON.GUI.Rectangle();
        this.progressBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.progressBar.width = "0%";
        this.progressBar.height = "100%";
        this.progressBar.background = "white";
        this.progressBar.cornerRadius = 8;
        progressContainer.addControl(this.progressBar);
        
        // Texto de porcentagem
        this.progressText = new BABYLON.GUI.TextBlock();
        this.progressText.text = "0%";
        this.progressText.color = "black";
        this.progressText.fontSize = 18;
        this.progressBar.addControl(this.progressText);
        
        // Armazenar referência à UI de carregamento
        this.loadingUI = advancedTexture;
    }
    
    // Atualizar o progresso da tela de carregamento
    updateLoadingProgress(percent) {
        if (this.progressBar && this.progressText) {
            this.progressBar.width = percent + "%";
            this.progressText.text = Math.floor(percent) + "%";
        }
    }
    
    // Esconder tela de carregamento
    hideLoadingScreen() {
        if (this.loadingUI) {
            this.loadingUI.dispose();
            this.loadingUI = null;
        }
    }
    
    // Configurar eventos de interface do usuário
    setupUIEvents() {
        // Adicionar bússola e mini-mapa
        this.createNavigationUI();
        
        // Adicionar informações do bioma atual
        this.createBiomeInfoUI();
        
        // Adicionar contador de FPS
        this.createPerformanceUI();
    }
    // Redefinindo método updateUI para o player
    updateUI() {
        // Atualizar a exibição de munição se o player existir e tiver o método
        if (this.player && typeof this.player.updateAmmoDisplay === 'function') {
            this.player.updateAmmoDisplay();
        }
    }
    // Criar UI de navegação (bússola e mini-mapa)
    createNavigationUI() {
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("navigationUI");
        
        // Container do mini-mapa
        const minimapContainer = new BABYLON.GUI.Rectangle();
        minimapContainer.width = "200px";
        minimapContainer.height = "200px";
        minimapContainer.cornerRadius = 100;
        minimapContainer.color = "white";
        minimapContainer.thickness = 2;
        minimapContainer.background = "rgba(0, 0, 0, 0.4)";
        minimapContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        minimapContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        minimapContainer.top = "10px";
        minimapContainer.right = "10px";
        advancedTexture.addControl(minimapContainer);
        
        // Marcador do jogador no mini-mapa
        const playerMarker = new BABYLON.GUI.Ellipse();
        playerMarker.width = "10px";
        playerMarker.height = "10px";
        playerMarker.color = "yellow";
        playerMarker.thickness = 2;
        playerMarker.background = "yellow";
        minimapContainer.addControl(playerMarker);
        
        // Atualizar a posição do jogador no mini-mapa
        this.scene.registerBeforeRender(() => {
            if (this.player) {
                const playerPos = this.player.getPosition();
                
                // Converter posição do mundo para coordenadas do mini-mapa
                // Escala: 1 unidade do mundo = 0.5px no mini-mapa
                const scaleFactor = 0.5;
                
                // Centralizar o mini-mapa no jogador
                playerMarker.left = 0;
                playerMarker.top = 0;
                
                // Atualizar visualização do mini-mapa (chunks, entidades, etc.)
                this.updateMinimap(minimapContainer, playerPos, scaleFactor);
            }
        });
        
        // Bússola na parte superior da tela
        const compassContainer = new BABYLON.GUI.Rectangle();
        compassContainer.width = "400px";
        compassContainer.height = "40px";
        compassContainer.cornerRadius = 10;
        compassContainer.color = "white";
        compassContainer.thickness = 2;
        compassContainer.background = "rgba(0, 0, 0, 0.4)";
        compassContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        compassContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        compassContainer.top = "10px";
        advancedTexture.addControl(compassContainer);
        
        // Marcador da bússola
        const compassMarker = new BABYLON.GUI.Rectangle();
        compassMarker.width = "2px";
        compassMarker.height = "20px";
        compassMarker.background = "red";
        compassMarker.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        compassContainer.addControl(compassMarker);
        
        // Direções da bússola
        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const positions = [0, 45, 90, 135, 180, 225, 270, 315];
        
        // Criar marcações para as direções
        for (let i = 0; i < directions.length; i++) {
            const dirText = new BABYLON.GUI.TextBlock();
            dirText.text = directions[i];
            dirText.color = "white";
            dirText.fontSize = 16;
            dirText.top = -10;
            compassContainer.addControl(dirText);
            
            // Variável para armazenar a posição atual do texto
            const dirPosition = positions[i];
            
            // Atualizar posição com base na direção da câmera
            this.scene.registerBeforeRender(() => {
                if (this.player) {
                    const camera = this.player.getCamera();
                    if (camera) {
                        // Obter rotação Y da câmera em graus
                        let cameraRotation = camera.rotation.y * (180 / Math.PI);
                        
                        // Normalizar para 0-360
                        cameraRotation = ((cameraRotation % 360) + 360) % 360;
                        
                        // Calcular posição horizontal com base na diferença entre direção e rotação da câmera
                        const offset = (dirPosition - cameraRotation) % 360;
                        
                        // Converter para intervalo de -180 a 180
                        const normalizedOffset = (offset > 180) ? offset - 360 : offset;
                        
                        // Aplicar posição (escala: 1 grau = 1 pixel)
                        const maxOffset = 180; // Máximo offset visível
                        
                        // Só mostrar se estiver no campo de visão
                        if (Math.abs(normalizedOffset) <= maxOffset) {
                            dirText.left = (normalizedOffset / maxOffset) * (compassContainer.widthInPixels / 2) + "px";
                            dirText.isVisible = true;
                        } else {
                            dirText.isVisible = false;
                        }
                    }
                }
            });
        }
    }
    
    // Método auxiliar para atualizar o mini-mapa
    updateMinimap(container, playerPos, scaleFactor) {
        // Limpar marcadores antigos (exceto o jogador)
        const children = container.children.slice();
        for (const child of children) {
            if (child.name && (child.name.startsWith("chunk_") || child.name.startsWith("entity_"))) {
                container.removeControl(child);
            }
        }
        
        // Adicionar representação dos chunks carregados
        for (const [chunkId, chunk] of this.loadedChunks.entries()) {
            // Converter coordenadas do chunk para coordenadas do mundo
            const worldX = chunk.x * this.chunkSize;
            const worldZ = chunk.z * this.chunkSize;
            
            // Calcular posição relativa ao jogador
            const relX = (worldX - playerPos.x) * scaleFactor;
            const relZ = (worldZ - playerPos.z) * scaleFactor;
            
            // Criar marcador para o chunk
            const chunkMarker = new BABYLON.GUI.Rectangle();
            chunkMarker.name = "chunk_" + chunkId;
            chunkMarker.width = (this.chunkSize * scaleFactor) + "px";
            chunkMarker.height = (this.chunkSize * scaleFactor) + "px";
            chunkMarker.thickness = 1;
            
            // Cor baseada no bioma
            switch (chunk.biome) {
                case 'forest':
                    chunkMarker.color = "darkgreen";
                    chunkMarker.background = "rgba(0, 100, 0, 0.3)";
                    break;
                case 'plains':
                    chunkMarker.color = "green";
                    chunkMarker.background = "rgba(0, 200, 0, 0.3)";
                    break;
                case 'mountains':
                    chunkMarker.color = "gray";
                    chunkMarker.background = "rgba(100, 100, 100, 0.3)";
                    break;
                case 'desert':
                    chunkMarker.color = "yellow";
                    chunkMarker.background = "rgba(200, 200, 0, 0.3)";
                    break;
                case 'snow':
                    chunkMarker.color = "white";
                    chunkMarker.background = "rgba(255, 255, 255, 0.3)";
                    break;
                default:
                    chunkMarker.color = "blue";
                    chunkMarker.background = "rgba(0, 0, 200, 0.3)";
            }
            
            chunkMarker.left = relX + "px";
            chunkMarker.top = relZ + "px";
            container.addControl(chunkMarker);
            
            // Adicionar entidades neste chunk ao mini-mapa
            if (chunk.entities && chunk.entities.length > 0) {
                for (const entity of chunk.entities) {
                    if (entity && entity.getPosition) {
                        const entityPos = entity.getPosition();
                        const entityRelX = (entityPos.x - playerPos.x) * scaleFactor;
                        const entityRelZ = (entityPos.z - playerPos.z) * scaleFactor;
                        
                        // Criar marcador para a entidade
                        const entityMarker = new BABYLON.GUI.Ellipse();
                        entityMarker.name = "entity_" + entity.id;
                        entityMarker.width = "4px";
                        entityMarker.height = "4px";
                        entityMarker.thickness = 1;
                        
                        // Cor baseada no tipo de entidade
                        if (entity.type === 'monster') {
                            entityMarker.color = "red";
                            entityMarker.background = "red";
                        } else if (entity.type === 'npc') {
                            entityMarker.color = "blue";
                            entityMarker.background = "blue";
                        } else {
                            entityMarker.color = "purple";
                            entityMarker.background = "purple";
                        }
                        
                        entityMarker.left = entityRelX + "px";
                        entityMarker.top = entityRelZ + "px";
                        container.addControl(entityMarker);
                    }
                }
            }
        }
    }
    
    // Criar UI de informações do bioma
    createBiomeInfoUI() {
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("biomeInfoUI");
        
        // Container de informações do bioma
        const biomeInfoContainer = new BABYLON.GUI.Rectangle();
        biomeInfoContainer.width = "250px";
        biomeInfoContainer.height = "60px";
        biomeInfoContainer.cornerRadius = 10;
        biomeInfoContainer.color = "white";
        biomeInfoContainer.thickness = 2;
        biomeInfoContainer.background = "rgba(0, 0, 0, 0.4)";
        biomeInfoContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        biomeInfoContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        biomeInfoContainer.top = "10px";
        biomeInfoContainer.left = "10px";
        advancedTexture.addControl(biomeInfoContainer);
        
        // Texto do bioma atual
        const biomeNameText = new BABYLON.GUI.TextBlock();
        biomeNameText.text = "Bioma: Floresta";
        biomeNameText.color = "white";
        biomeNameText.fontSize = 20;
        biomeNameText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        biomeNameText.paddingLeft = "10px";
        biomeNameText.paddingTop = "5px";
        biomeNameText.height = "25px";
        biomeNameText.top = "-15px";
        biomeInfoContainer.addControl(biomeNameText);
        
        // Informações adicionais do bioma
        const biomeInfoText = new BABYLON.GUI.TextBlock();
        biomeInfoText.text = "Temperatura: 22°C | Recursos Abundantes";
        biomeInfoText.color = "white";
        biomeInfoText.fontSize = 14;
        biomeInfoText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        biomeInfoText.paddingLeft = "10px";
        biomeInfoText.height = "20px";
        biomeInfoText.top = "15px";
        biomeInfoContainer.addControl(biomeInfoText);
        
        // Atualizar informações do bioma conforme o jogador se move
        this.scene.registerBeforeRender(() => {
            if (this.player && this.biomeManager) {
                const playerPos = this.player.getPosition();
                const currentBiome = this.biomeManager.getBiomeAt(playerPos.x, playerPos.z);
                
                // Atualizar nome do bioma
                let biomeName = "Desconhecido";
                let biomeInfo = "Sem informações";
                let biomeColor = "white";
                
                switch (currentBiome) {
                    case 'forest':
                        biomeName = "Floresta";
                        biomeInfo = "Temperatura: 18°C | Rico em Madeira";
                        biomeColor = "#4CAF50";
                        break;
                    case 'plains':
                        biomeName = "Planícies";
                        biomeInfo = "Temperatura: 22°C | Rico em Comida";
                        biomeColor = "#8BC34A";
                        break;
                    case 'mountains':
                        biomeName = "Montanhas";
                        biomeInfo = "Temperatura: 5°C | Rico em Minérios";
                        biomeColor = "#9E9E9E";
                        break;
                    case 'desert':
                        biomeName = "Deserto";
                        biomeInfo = "Temperatura: 35°C | Rico em Minerais";
                        biomeColor = "#FFC107";
                        break;
                    case 'snow':
                        biomeName = "Neve";
                        biomeInfo = "Temperatura: -10°C | Rico em Cristais";
                        biomeColor = "#E0F7FA";
                        break;
                    case 'swamp':
                        biomeName = "Pântano";
                        biomeInfo = "Temperatura: 24°C | Rico em Plantas Raras";
                        biomeColor = "#795548";
                        break;
                }
                
                biomeNameText.text = "Bioma: " + biomeName;
                biomeNameText.color = biomeColor;
                biomeInfoText.text = biomeInfo;
            }
        });
    }
    
    // Criar UI de desempenho (FPS, chunks carregados)
    createPerformanceUI() {
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("performanceUI");
        
        // Container de desempenho
        const perfContainer = new BABYLON.GUI.Rectangle();
        perfContainer.width = "200px";
        perfContainer.height = "60px";
        perfContainer.cornerRadius = 10;
        perfContainer.color = "white";
        perfContainer.thickness = 2;
        perfContainer.background = "rgba(0, 0, 0, 0.4)";
        perfContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        perfContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        perfContainer.bottom = "10px";
        perfContainer.right = "10px";
        advancedTexture.addControl(perfContainer);
        
        // Texto de FPS
        const fpsText = new BABYLON.GUI.TextBlock();
        fpsText.text = "FPS: 60";
        fpsText.color = "white";
        fpsText.fontSize = 18;
        fpsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        fpsText.paddingLeft = "10px";
        fpsText.paddingTop = "5px";
        fpsText.height = "25px";
        fpsText.top = "-15px";
        perfContainer.addControl(fpsText);
        
        // Texto de chunks carregados
        const chunksText = new BABYLON.GUI.TextBlock();
        chunksText.text = "Chunks: 0 | Seeds: " + this.worldSeed;
        chunksText.color = "white";
        chunksText.fontSize = 14;
        chunksText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        chunksText.paddingLeft = "10px";
        chunksText.height = "20px";
        chunksText.top = "15px";
        perfContainer.addControl(chunksText);
        
        // Atualizar informações de desempenho
        let fpsUpdateCounter = 0;
        this.scene.registerBeforeRender(() => {
            // Atualizar FPS a cada 30 frames
            fpsUpdateCounter++;
            if (fpsUpdateCounter >= 30) {
                const fps = Math.round(this.engine.getFps());
                fpsText.text = "FPS: " + fps;
                
                // Colorir baseado no desempenho
                if (fps >= 50) {
                    fpsText.color = "#4CAF50"; // Verde
                } else if (fps >= 30) {
                    fpsText.color = "#FFC107"; // Amarelo
                } else {
                    fpsText.color = "#F44336"; // Vermelho
                }
                
                // Atualizar contador de chunks
                chunksText.text = "Chunks: " + this.loadedChunks.size + " | Seed: " + this.worldSeed;
                
                fpsUpdateCounter = 0;
            }
        });
    }
    
    // Métodos getter para acesso de outros componentes
    getPlayerCamera() {
        return this.player.getCamera();
    }
    
    getPlayer() {
        return this.player;
    }
    
    getMonsters() {
        return this.entityManager ? this.entityManager.getMonsters() : [];
    }
    
    // Adicionar um novo monstro
    addMonster(position) {
        // Criar o monstro passando a cena, o player e a posição inicial
        const monster = this.entityManager.spawnMonster(position);
        
        // Registrar mesh do monstro para colisão
        if (monster) {
            const monsterMesh = monster.getMesh();
            if (monsterMesh) {
                this.collisionSystem.addMesh(monsterMesh);
            }
        }
        
        return monster;
    }
    
    // Remover um monstro específico
    removeMonster(monster) {
        if (this.entityManager) {
            this.entityManager.removeEntity(monster);
        }
    }
}

export default OpenWorldGame;