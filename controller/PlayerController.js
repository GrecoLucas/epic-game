import BuildingController from './BuildingController.js'; // Importar a nova classe

class PlayerController {
    constructor(scene, playerModel, playerView) {
        this.scene = scene;
        this.model = playerModel;
        this.view = playerView;
        this.inputMap = {};
        this.nearbyButton = null;
        this.nearbyGun = null;
        this.interactionDistance = 5;
        this.interactionHint = null;
        this.groundCheckDistance = 0.5;
        // Initialize buildingController as null initially
        this.buildingController = null;

        this.initialize();
    }

    initialize() {
        // Configurar o view com o mesh do model
        this.view.initialize(this.model.getMesh());
        
        // Configurar inputs do teclado
        this.setupInputHandling();
        
        // Configurar raycast para melhorar a interação com objetos e mouse click
        this.setupRaycastForInteraction();
        
        // Configurar a detecção de proximidade com botões
        this.setupProximityDetection();
        
        // Criar dica de interação
        this.createInteractionHint();
        
        // Registrar a verificação de chão e atualização da física a cada frame
        this.scene.registerBeforeRender(() => {
            this.checkIfGrounded();
            this.model.updatePhysics();
            // Add call to updateMovement
            this.updateMovement();
            if (this.buildingController?.isEnabled) { // Chamar update do building controller se ativo
                this.buildingController.update();
            }
        });

        // --- Instantiate BuildingController AFTER view and camera are initialized ---
        if (this.scene.gameInstance && this.scene.gameInstance.collisionSystem && this.scene.gameInstance.maze?.view && this.scene.gameInstance.maze?.model) {
             this.buildingController = new BuildingController(
                 this.scene,
                 this.view.getCamera(), // Camera should exist now
                 this.scene.gameInstance.collisionSystem,
                 this.scene.gameInstance.maze.view,
                 this.scene.gameInstance.maze.model // Pass the model
             );
        } else {
            console.error("Falha ao inicializar BuildingController: Dependências (collisionSystem, mazeView, mazeModel) não encontradas na cena.");
            // this.buildingController remains null
        }
        setTimeout(() => {
            this.initializeBuildingController();
        }, 2000); // Atraso de 2 segundos para garantir que o jogo foi inicializado
    }

    // Adicionando um novo método para inicializar o BuildingController com segurança
    initializeBuildingController() {
        // Verificar se já existe um buildingController
        if (this.buildingController) {
            return;
        }
        
        console.log("Tentando inicializar BuildingController...");
        
        // Obter referências para o mundo aberto se for o modo escolhido
        if (this.scene.gameInstance && this.scene.gameInstance.gameMode === 'openworld') {
            if (this.scene.gameInstance.collisionSystem) {
                // Criar um BuildingController simplificado sem dependências do maze
                this.buildingController = new BuildingController(
                    this.scene,
                    this.view.getCamera(),
                    this.scene.gameInstance.collisionSystem,
                    null, // mazeView não necessário no modo mundo aberto
                    null  // mazeModel não necessário no modo mundo aberto
                );
                
                // Configurar valores padrão que seriam fornecidos pelo maze
                this.buildingController.cellSize = this.scene.gameInstance.chunkSize || 16;
                this.buildingController.wallHeight = 4;
                
                // Adicionar materiais iniciais
                this.buildingController.addMaterials(10, 5); // 10 blocos, 5 rampas
                
                console.log("BuildingController inicializado com sucesso no modo mundo aberto!");
            } else {
                console.error("collisionSystem não disponível para inicializar BuildingController");
            }
        } 
        // Modo labirinto - usar a implementação original
        else if (this.scene.gameInstance && this.scene.gameInstance.maze?.view && this.scene.gameInstance.maze?.model) {
            this.buildingController = new BuildingController(
                this.scene,
                this.view.getCamera(),
                this.scene.gameInstance.collisionSystem,
                this.scene.gameInstance.maze.view,
                this.scene.gameInstance.maze.model
            );
            console.log("BuildingController inicializado com sucesso no modo labirinto!");
        } else {
            // Caso ainda não tenha as dependências necessárias, tentar novamente mais tarde
            console.warn("Dependências para BuildingController ainda não disponíveis, reagendando...");
            setTimeout(() => {
                this.initializeBuildingController();
            }, 2000);
        }
    }

    // Criar um elemento de UI para mostrar dica de interação com botões
    createInteractionHint() {
        // Criar uma GUI texture para adicionar elementos 2D
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("interactionUI");
        
        // Criar o texto de dica
        const hintText = new BABYLON.GUI.TextBlock("hintText");
        hintText.text = "Pressione E para ativar";
        hintText.color = "white";
        hintText.fontSize = 16;
        hintText.fontFamily = "Arial";
        hintText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        hintText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        hintText.paddingBottom = "30px";
        hintText.alpha = 0; // Inicialmente invisível
        
        advancedTexture.addControl(hintText);
        this.interactionHint = hintText;
    }
    
    // Configurar detecção de proximidade com botões e armas
    setupProximityDetection() {
        // Registrar função para verificar proximidade antes de cada frame
        this.scene.registerBeforeRender(() => {
            const playerPosition = this.model.getPosition();
            
            // --- DETECÇÃO DE BOTÕES ---
            // Obter todos os botões na cena
            const buttonMeshes = this.scene.meshes.filter(mesh => mesh.name && mesh.name.includes("button"));
            
            // Resetar o botão mais próximo
            this.nearbyButton = null;
            
            // Verificar distância para cada botão
            if (buttonMeshes.length > 0) {
                let closestDistance = this.interactionDistance;
                let closestButton = null;
                
                for (const buttonMesh of buttonMeshes) {
                    const distance = BABYLON.Vector3.Distance(playerPosition, buttonMesh.position);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestButton = buttonMesh;
                    }
                }
                
                // Se encontrou um botão próximo, atualizar referência
                this.nearbyButton = closestButton;
            }
            
            // --- DETECÇÃO DE ARMAS ---
            // Obter todas as armas na cena (qualquer mesh que contenha "gun_ground")
            const gunMeshes = this.scene.meshes.filter(mesh => 
                mesh.name && mesh.name.includes("gun_ground")
            );
            
            // Resetar a arma mais próxima
            this.nearbyGun = null;
            
            // Verificar distância para cada arma
            if (gunMeshes.length > 0) {
                let closestDistance = this.interactionDistance;
                let closestGun = null;
                
                // Agrupar os meshes por arma (todas as partes com o mesmo pai)
                const gunGroups = {};
                
                for (const gunMesh of gunMeshes) {
                    // Pular armas que já foram coletadas (invisíveis)
                    if (!gunMesh.isVisible) continue;
                    
                    // Encontrar o mesh raiz que contém todas as partes
                    let rootMesh = gunMesh;
                    while (rootMesh.parent && rootMesh.parent.name && rootMesh.parent.name.includes("gun_ground")) {
                        rootMesh = rootMesh.parent;
                    }
                    
                    // Usar o ID do rootMesh como chave para agrupar
                    const rootId = rootMesh.uniqueId || rootMesh.id;
                    if (!gunGroups[rootId]) {
                        gunGroups[rootId] = rootMesh;
                    }
                }
                
                // Verificar a distância para cada grupo (arma)
                for (const rootId in gunGroups) {
                    const rootMesh = gunGroups[rootId];
                    const distance = BABYLON.Vector3.Distance(playerPosition, rootMesh.position);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestGun = rootMesh;
                    }
                }
                
                // Se encontrou uma arma próxima, atualizar referência
                this.nearbyGun = closestGun;
            }
            
            // Atualizar dica baseado na proximidade (prioridade: arma > botão)
            if (this.interactionHint) {
                if (this.nearbyGun) {
                    this.interactionHint.text = "Pressione E para pegar a arma";
                    this.interactionHint.alpha = 1;
                } else if (this.nearbyButton) {
                    this.interactionHint.text = "Pressione E para ativar";
                    this.interactionHint.alpha = 1;
                } else {
                    this.interactionHint.alpha = 0;
                }
            }
        });
    }
    
    // Novo método para configurar o raycast e melhorar a interação com objetos
    setupRaycastForInteraction() {
        const buttonPredicate = (mesh) => {
            return mesh.isPickable && mesh.name && mesh.name.includes("button");
        };

        // Variável para controlar o disparo automático
        let automaticFireInterval = null;

        // Adicionar event listener para mousedown
        this.scene.onPointerDown = (evt) => {
            if (!this.scene.alreadyLocked) {
                const camera = this.view.getCamera();
                if (camera) {
                    camera.attachControl(document.getElementById("renderCanvas"));
                    this.lockCamera();
                }
                return;
            }

            const isLeftClick = evt.button === 0;
            const isRightClick = evt.button === 2;

            if (isLeftClick) {
                // --- Prioridade: Construção ---
                if (this.buildingController?.isEnabled) {
                    this.buildingController.placeItem();
                }
                // --- Senão, Disparo ---
                else {
                    // Obter a arma equipada
                    const equippedGun = this.getPlayerEquippedGun();
                    
                    // Disparo único imediato
                    this.handleShoot();
                    
                    // Se for arma automática, configurar intervalo para disparo contínuo
                    if (equippedGun && equippedGun.model.isAutomatic) {
                        // Limpar qualquer intervalo existente
                        if (automaticFireInterval) {
                            clearInterval(automaticFireInterval);
                        }
                        
                        // Configurar intervalo para disparo automático a cada 400ms
                        automaticFireInterval = setInterval(() => {
                            this.handleShoot();
                        }, 80);
                    }
                }

                // --- Interação com Botão (Raycast) ---
                if (!this.buildingController?.isEnabled) {
                    const camera = this.view.getCamera();
                    if (!camera) return;
                    const ray = camera.getForwardRay(this.interactionDistance);
                    const hit = this.scene.pickWithRay(ray, buttonPredicate);
                    if (hit && hit.pickedMesh) {
                        const actionManager = hit.pickedMesh.actionManager;
                        if (actionManager) {
                            try {
                                this.createFeedbackAnimation(hit.pickedMesh);
                                actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger);
                            } catch (error) {
                                console.log("Erro ao processar trigger do botão via raycast:", error);
                            }
                        }
                    }
                }
            } else if (isRightClick) {
                 // Exemplo: Usar botão direito para rotacionar no modo construção
                 if (this.buildingController?.isEnabled) {
                     this.buildingController.rotatePreview(); // Rotaciona o preview (se for rampa)
                 }
                 // Adicionar outra lógica para botão direito se necessário (mira?)
            }
        };

        // Adicionar event listener para mouseup para parar o disparo automático
        this.scene.onPointerUp = (evt) => {
            if (evt.button === 0 && automaticFireInterval) {
                clearInterval(automaticFireInterval);
                automaticFireInterval = null;
            }
        };
    }

    // Modifique o lockCamera para resolver o problema do Pointer Lock
    lockCamera() {
        try {
            const canvas = document.getElementById("renderCanvas");
            if (!canvas) {
                console.error("Canvas não encontrado");
                return;
            }
            
            canvas.requestPointerLock = 
                canvas.requestPointerLock || 
                canvas.msRequestPointerLock || 
                canvas.mozRequestPointerLock || 
                canvas.webkitRequestPointerLock;
                
            // Solicitar o Pointer Lock apenas se o evento for acionado por um gesto do usuário
            // (geralmente será chamado a partir de um evento de clique ou tecla)
            if (canvas.requestPointerLock && !this.scene.alreadyLocked) {
                // Envolver em um try-catch para lidar com possíveis exceções
                try {
                    // Adicionar um ouvinte para capturar erros de Pointer Lock
                    const lockErrorCallback = (e) => {
                        console.log("Erro ao solicitar Pointer Lock:", e);
                        document.removeEventListener('pointerlockerror', lockErrorCallback);
                    };
                    document.addEventListener('pointerlockerror', lockErrorCallback);
                    
                    canvas.requestPointerLock();
                    this.scene.alreadyLocked = true;
                    console.log("Pointer Lock solicitado com sucesso");
                } catch (error) {
                    console.error("Erro ao solicitar Pointer Lock:", error);
                }
            } else if (this.scene.alreadyLocked) {
                console.log("Pointer Lock já está ativo");
            } else {
                console.warn("requestPointerLock não está disponível neste navegador");
            }
        } catch (e) {
            console.error("Erro ao configurar Pointer Lock:", e);
        }
    }
    
    setupInputHandling() {
        if (!this.scene.actionManager) { // Garante que o actionManager exista
             this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        }

        // Detectar teclas pressionadas
        this.scene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnKeyDownTrigger,
                (evt) => {
                    const key = evt.sourceEvent.key.toLowerCase();
                    this.inputMap[key] = true;

                    // --- Inputs Gerais (Fora do Modo Construção ou Sempre Ativos) ---
                    if (key === "e") {
                        if (!this.buildingController?.isEnabled) { // Só interage se NÃO estiver construindo
                            if (this.nearbyGun) this.pickupNearbyGun();
                            else if (this.nearbyButton) this.activateNearbyButton();
                        }
                    }
                    if (key === " ") {
                        if (!this.buildingController?.isEnabled) { // Só pula se NÃO estiver construindo? (Opcional)
                             this.model.jump();
                        }
                    }
                    // Tecla R para recarregar a arma equipada
                    if (key === "r") {
                        const equippedGun = this.getPlayerEquippedGun();
                        if (equippedGun) {
                            equippedGun.reload();
                            // Atualizar exibição de munição
                            if (this.scene.gameInstance && this.scene.gameInstance.player) {
                                this.scene.gameInstance.player.updateAmmoDisplay();
                            }
                        }
                    }

                    // --- Inputs do Modo Construção ---
                    if (this.buildingController) {
                        if (key === "b") { // Tecla para ativar/desativar modo construção
                            this.buildingController.toggle();
                        }
                        if (this.buildingController.isEnabled) {
                            if (key === "1") { // Selecionar Parede
                                this.buildingController.setSelectedItem('wall');
                            }
                            if (key === "2") { // Selecionar Rampa East
                                this.buildingController.setSelectedItem('ramp');
                                this.buildingController.rampDirection = 'east';
                                this.buildingController.currentPlacementRotation = 0; // Reset para orientação east
                            }
                            if (key === "3") { // Selecionar Rampa South
                                this.buildingController.setSelectedItem('ramp');
                                this.buildingController.rampDirection = 'south';
                                this.buildingController.currentPlacementRotation = Math.PI / 2; // 90 graus (direção sul)
                            }
                        }
                    }
                }
            )
        );

        // Detectar teclas liberadas
        this.scene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnKeyUpTrigger,
                (evt) => {
                    this.inputMap[evt.sourceEvent.key.toLowerCase()] = false;
                }
            )
        );
    }
    
    // Ativar o botão mais próximo
    activateNearbyButton() {
        if (this.nearbyButton && this.nearbyButton.actionManager) {
            try {
                // Obter o ID do botão a partir do nome
                const buttonId = parseInt(this.nearbyButton.name.replace("button", ""));
                
                // Disparar animação visual de feedback
                this.createFeedbackAnimation(this.nearbyButton);
                
                // Disparar as ações registradas para o evento OnPickTrigger
                this.nearbyButton.actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger);
            } catch (error) {
                console.log("Erro ao ativar botão próximo:", error);
            }
        }
    }
    
    // Criar uma animação para feedback visual ao ativar o botão
    createFeedbackAnimation(buttonMesh) {
        // Animação simples de escala para feedback visual
        const originalScale = buttonMesh.scaling.clone();
        
        // Diminuir escala brevemente
        BABYLON.Animation.CreateAndStartAnimation(
            "buttonFeedback",
            buttonMesh,
            "scaling",
            30,
            10,
            originalScale,
            originalScale.scale(0.8),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Restaurar escala original
        setTimeout(() => {
            BABYLON.Animation.CreateAndStartAnimation(
                "buttonRestore",
                buttonMesh,
                "scaling",
                30,
                10,
                buttonMesh.scaling,
                originalScale,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        }, 100);
    }
    
    // Pegar a arma mais próxima
    pickupNearbyGun() {
        if (this.nearbyGun) {
            try {
                // Encontrar a instância Gun associada a este mesh
                // Percorrer todas as instâncias de Gun no GunLoader através do sistema de metadados
                const gunInstance = this.findGunInstanceByMesh(this.nearbyGun);
                
                if (gunInstance) {
                    // Chamar o método pickup da instância Gun
                    gunInstance.pickup();
                    console.log("Arma coletada com a tecla E");
                } else {
                    // Alternativa: disparar o evento de clique no mesh da arma
                    if (this.nearbyGun.actionManager) {
                        this.nearbyGun.actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger);
                        console.log("Ação de pickup disparada via ActionManager");
                    }
                }
            } catch (error) {
                console.log("Erro ao pegar arma próxima:", error);
            }
        }
    }
    
    // Método auxiliar para encontrar a instância de Gun associada a um mesh
    findGunInstanceByMesh(gunMesh) {
        // Verificar se temos o GunLoader no game
        if (this.scene.gameInstance && this.scene.gameInstance.gunLoader) {
            const guns = this.scene.gameInstance.gunLoader.getGuns();
            
            // Verificar cada arma para encontrar aquela que possui este mesh
            for (const gun of guns) {
                // Comparar os meshes físicos com o mesh da arma próxima
                const meshes = gun.view.physicalMeshes;
                if (meshes && meshes.includes(gunMesh)) {
                    return gun;
                }
            }
        }
        
        return null;
    }
    
    // Método que verifica se o jogador tem uma arma equipada e dispara
    handleShoot() {
        // --- Validações Iniciais ---
        const equippedGun = this.getPlayerEquippedGun();
        if (!equippedGun) {
            console.log("Tentativa de disparo sem arma equipada.");
            return;
        }

        const camera = this.view.getCamera();
        if (!camera) {
            console.error("Câmera do jogador não encontrada para disparo.");
            return;
        }

        // --- Configurações ---
        const config = {
            rayLength: 200,         // Alcance máximo do tiro em unidades
            rayOriginOffset: 0.1,   // Offset para evitar colisão com a própria câmera
            minObstacleDistance: 0.5, // Distância mínima para verificar monstros
            DEBUG_MODE: false       // Ativar para visualização e logs
        };

        // --- Configuração do Ray Principal ---
        const cameraPosition = camera.globalPosition;
        const forwardDirection = camera.getForwardRay(1).direction;
        const rayOrigin = cameraPosition.add(forwardDirection.scale(config.rayOriginOffset));
        const ray = new BABYLON.Ray(rayOrigin, forwardDirection, config.rayLength);

        // --- Detecção de Obstáculos e Monstros ---
        
        // 1. Primeiro detectamos qualquer obstáculo no caminho (incluindo monstros)
        //    Isto determina a distância máxima que o projétil pode percorrer
        //    Ignoramos o próprio jogador e objetos não-colidíveis
        const obstacleFilterPredicate = (mesh) => {
            return mesh.isPickable && 
                   mesh.checkCollisions && 
                   !mesh.name.includes("Player") &&
                   !mesh.name.includes("floor");  // Opcional: ignorar o chão
        };
        
        const firstObstacleHit = this.scene.pickWithRay(ray, obstacleFilterPredicate);
        const obstacleDistance = firstObstacleHit?.pickedMesh ? firstObstacleHit.distance : config.rayLength;

        // 2. Agora procuramos especificamente por partes de monstros até a distância do primeiro obstáculo
        //    Isso impede que atiremos em monstros através de paredes
        let monsterHits = [];
        
        if (obstacleDistance > config.minObstacleDistance) {
            // Criar um ray limitado à distância do primeiro obstáculo
            const limitedRay = new BABYLON.Ray(rayOrigin, forwardDirection, obstacleDistance);
            
            // Predicate otimizado para partes de monstros
            const monsterPartPredicate = this._createMonsterPartPredicate();
            
            // Encontrar todos os hits de monstros (ordenados por distância)
            monsterHits = this.scene.multiPickWithRay(limitedRay, monsterPartPredicate);
                    }

        // --- Processamento do Hit ---
        let hitSuccessful = false;
        
        // Processar o hit de monstro mais próximo (se houver)
        if (monsterHits.length > 0 && monsterHits[0].pickedMesh) {
            hitSuccessful = this.processMonsterHit(monsterHits[0], equippedGun);
            
            if (hitSuccessful && config.DEBUG_MODE) {
                console.log(`Hit bem sucedido no monstro a ${monsterHits[0].distance.toFixed(2)} unidades.`);
            }
        } 
        else if (config.DEBUG_MODE && firstObstacleHit && firstObstacleHit.pickedMesh) {
            // Se não acertamos monstro, mas acertamos algum obstáculo e estamos em debug
            console.log(`Tiro acertou objeto: '${firstObstacleHit.pickedMesh.name}' a ${firstObstacleHit.distance.toFixed(2)} unidades.`);
        }

        // --- Efeitos do Tiro (sempre executados, independente de acertar) ---
        const shotFired = equippedGun.shoot();
        
        if (!shotFired) {
            console.log("Disparo falhou (sem munição ou recarregando).");
        }
    }
    
        
    _createMonsterPartPredicate() {
        return (mesh) => {
            // Se o mesh não é pickable, ignoramos imediatamente
            if (!mesh.isPickable) return false;
            
            // OPÇÃO 1: Verificação por metadata (abordagem ideal)
            // Verificar se este mesh já está marcado como parte de monstro via metadata
            if (mesh.metadata?.isMonsterPart === true) return true;
            
            // OPÇÃO 2: Verificação por nome (fallback)
            // Lista de keywords para identificar partes de monstros
            const monsterPartNames = ["monsterBody", "monsterHead", "monsterRoot", "eye", "horn", "monster"];
            
            // Verificar o mesh atual e sua hierarquia de pais
            let currentMesh = mesh;
            while (currentMesh) {
                // Se encontrarmos metadata em qualquer nível, usamos
                if (currentMesh.metadata?.isMonsterPart === true) {
                    // Opcionalmente, propagar a metadata para o mesh atual para otimizar futuros hits
                    if (!mesh.metadata) mesh.metadata = {};
                    mesh.metadata.isMonsterPart = true;
                    return true;
                }
                
                // Verificação por nome como fallback
                if (currentMesh.name) {
                    const nameLower = currentMesh.name.toLowerCase();
                    if (monsterPartNames.some(part => nameLower.includes(part.toLowerCase()))) {
                        // Opcionalmente, adicionar metadata para otimizar futuros hits
                        if (!mesh.metadata) mesh.metadata = {};
                        mesh.metadata.isMonsterPart = true;
                        return true;
                    }
                }
                
                // Subir na hierarquia
                currentMesh = currentMesh.parent;
            }
            
            return false;
        };
    }


    // Método auxiliar para processamento de hits em monstros
    processMonsterHit(hit, equippedGun) {
        if (!hit || !hit.pickedMesh) return false;
        
        const hitMesh = hit.pickedMesh;
        console.log(`Hit em parte de monstro: ${hitMesh.name} a ${hit.distance.toFixed(2)} unidades`);
        
        // 1. Busca Otimizada: Primeiro tentamos encontrar o monstro via metadata
        let hitMonster = null;
        
        // Verificar metadata do próprio mesh
        if (hitMesh.metadata?.monsterInstance) {
            hitMonster = hitMesh.metadata.monsterInstance;
        } 
        // Verificar hierarquia de pais se não encontrado no mesh atual
        else {
            let currentMesh = hitMesh.parent;
            while (currentMesh && !hitMonster) {
                if (currentMesh.metadata?.monsterInstance) {
                    hitMonster = currentMesh.metadata.monsterInstance;
                    
                    // Propagar a referência para o mesh atual para otimizar futuros hits
                    if (!hitMesh.metadata) hitMesh.metadata = {};
                    hitMesh.metadata.monsterInstance = hitMonster;
                    hitMesh.metadata.isMonsterPart = true;
                }
                currentMesh = currentMesh.parent;
            }
        }
        
        // 2. Fallback: Se não encontrado via metadata, buscar na lista global
        if (!hitMonster) {
            const monstersList = this.scene.gameInstance?.getMonsters() || [];
            
            for (const monster of monstersList) {
                const rootMesh = monster.getMesh();
                if (!rootMesh) continue;
                
                // Verificar se o mesh é o próprio monstro ou um descendente
                if (hitMesh === rootMesh || hitMesh.isDescendantOf(rootMesh)) {
                    hitMonster = monster;
                    
                    // Armazenar referência no metadata para otimizar futuros hits
                    if (!hitMesh.metadata) hitMesh.metadata = {};
                    hitMesh.metadata.monsterInstance = monster;
                    hitMesh.metadata.isMonsterPart = true;
                    
                    // Propagar para o mesh raiz também
                    if (rootMesh && !rootMesh.metadata) rootMesh.metadata = {};
                    if (rootMesh) {
                        rootMesh.metadata.monsterInstance = monster;
                        rootMesh.metadata.isMonsterPart = true;
                    }
                    
                    break;
                }
            }
        }
        
        // 3. Aplicar Dano (se encontrou o monstro)
        if (hitMonster) {
            const monsterController = hitMonster.getController();
            if (!monsterController || monsterController.isDisposed) {
                console.warn(`Controlador do monstro não encontrado ou inválido para ${hitMesh.name}.`);
                return false;
            }
            
            // Obter dano base da arma
            const baseDamage = equippedGun.model.getDamage();
            
            // Calcular multiplicador de dano baseado na parte atingida
            let damageMultiplier = 1.0;
            const hitNameLower = hitMesh.name.toLowerCase();
            
            // Headshot = dano crítico (2x)
            const isHeadshot = 
                hitNameLower.includes("head") || 
                hitNameLower.includes("eye") ||
                (hitMesh.metadata?.bodyPart === "head"); // Usar metadata se disponível
                
            if (isHeadshot) {
                damageMultiplier = 2.0;
                console.log("ACERTO CRÍTICO! Headshot com x2 dano");
            }
            
            // Aplicar dano final
            const finalDamage = Math.round(baseDamage * damageMultiplier);
            console.log(`Aplicando ${finalDamage} de dano ao monstro.`);
            
            monsterController.takeDamage(finalDamage);
            
            // Criar efeito visual no ponto de impacto
            this.createHitEffect(hit.pickedPoint);
            
            return true; // Hit processado com sucesso
        } else {
            console.error(`Não foi possível associar o mesh '${hitMesh.name}' a uma instância de Monster.`);
            return false; // Falha no processamento do hit
        }
    }
    
    // Método auxiliar para logging de hits (apenas para debug)
    logAllHits(ray) {   
        const allHits = this.scene.multiPickWithRay(ray);
        
        if (allHits && allHits.length > 0) {
            console.log(`--- MultiPick (All Hits) ---`);
            allHits.forEach((h, index) => {
                console.log(`  Hit ${index}: Name='${h.pickedMesh.name}', Distance=${h.distance.toFixed(3)}, Pickable=${h.pickedMesh.isPickable}`);
            });
            console.log(`---------------------------`);
        } else {
            console.log("MultiPick found nothing.");
        }
    }
    
    // Método para criar efeito visual no ponto de impacto
    createHitEffect(position) {
        // Criar uma esfera vermelha no ponto de impacto
        const hitMarker = BABYLON.MeshBuilder.CreateSphere("hitMarker", { 
            diameter: 0.15, // Tamanho um pouco maior para melhor visibilidade
            segments: 8     // Menos segmentos para performance
        }, this.scene);
        
        hitMarker.position = position;
        hitMarker.material = new BABYLON.StandardMaterial("hitMarkerMat", this.scene);
        hitMarker.material.emissiveColor = new BABYLON.Color3(1, 0, 0); // Vermelho brilhante
        hitMarker.material.disableLighting = true; // Para garantir que seja bem visível
        hitMarker.isPickable = false; // Não deve interferir com raycasts futuros
        
        // Opcional: Adicionar uma pequena animação de pulso
        const initialScale = hitMarker.scaling.clone();
        BABYLON.Animation.CreateAndStartAnimation("hitMarkerPulse", hitMarker, "scaling", 30, 10, 
            initialScale, initialScale.scale(1.5), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        
        // Auto-destruição após tempo curto
        setTimeout(() => {
            if (hitMarker && !hitMarker.isDisposed()) {
                hitMarker.dispose();
            }
        }, 300);
    }
    
    // Método para obter a arma que o jogador está segurando (se houver)
    getPlayerEquippedGun() {
        // Verificar se temos o GunLoader no game
        if (this.scene.gameInstance && this.scene.gameInstance.gunLoader) {
            // Obter a arma que está sendo carregada pelo jogador (isPickedUp = true)
            return this.scene.gameInstance.gunLoader.getPlayerGun();
        }
        return null;
    }
    
    updateMovement() {
        // Movimento para frente/trás
        if (this.inputMap["w"]) {
            this.moveForward();
        }
        if (this.inputMap["s"]) {
            this.moveBackward();
        }
        
        // Movimento para os lados
        if (this.inputMap["a"]) {
            this.moveLeft();
        }
        if (this.inputMap["d"]) {
            this.moveRight();
        }
    }
    
    moveForward() {
        // Usar a direção da câmera para movimento com colisão
        const direction = this.getCameraDirection();
        this.model.moveWithDirection(direction.scale(this.model.moveSpeed));
    }
    
    moveBackward() {
        // Mover na direção oposta à câmera com colisão
        const direction = this.getCameraDirection();
        this.model.moveWithDirection(direction.scale(-this.model.moveSpeed));
    }
    
    moveLeft() {
        // Mover para a esquerda em relação à direção da câmera com colisão
        const direction = this.getCameraRightDirection();
        this.model.moveWithDirection(direction.scale(-this.model.moveSpeed));
    }
    
    moveRight() {
        // Mover para a direita em relação à direção da câmera com colisão
        const direction = this.getCameraRightDirection();
        this.model.moveWithDirection(direction.scale(this.model.moveSpeed));
    }
    
    getCameraDirection() {
        // Calcular vetor de direção baseado na rotação da câmera
        const camera = this.view.getCamera();
        const cameraRotation = camera.rotation;
        const forward = new BABYLON.Vector3(
            Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x),
            Math.sin(-cameraRotation.x),
            Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x)
        );
        
        // Normalizar e remover componente Y (para não voar/afundar)
        forward.normalize();
        
        // Criar vetor de movimento no plano horizontal (2D)
        return new BABYLON.Vector3(forward.x, 0, forward.z).normalize();
    }
    
    getCameraRightDirection() {
        // Direção para a direita (perpendicular à direção da câmera no plano horizontal)
        const forward = this.getCameraDirection();
        return new BABYLON.Vector3(forward.z, 0, -forward.x).normalize();
    }
    
    // Método para verificar se o jogador está no chão
    checkIfGrounded() {
        const playerMesh = this.model.getMesh();
        if (!playerMesh) return;
        
        // Se o jogador acabou de pular, não verificamos o chão por alguns frames
        // para permitir que ele realmente saia do chão
        if (this.model.justJumped) {
            this.model.jumpFrameCount++;
            if (this.model.jumpFrameCount < 5) { // Ignorar verificação por 5 frames após o pulo
                return;
            } else {
                this.model.justJumped = false;
                this.model.jumpFrameCount = 0;
            }
        }
        
        // Posição de origem do raio (um pouco acima da base do player para evitar problemas de precisão)
        const origin = playerMesh.position.clone();
        origin.y += 0.1;
        
        // Direção do raio (para baixo)
        const direction = new BABYLON.Vector3(0, -1, 0);
        
        // Criar o raio com distância de verificação maior
        const ray = new BABYLON.Ray(origin, direction, this.groundCheckDistance + 0.1);
        
        // Debug visual do raio (opcional)
        if (this._rayHelper) {
            this._rayHelper.dispose();
        }
        this._rayHelper = new BABYLON.RayHelper(ray);
        this._rayHelper.show(this.scene, new BABYLON.Color3(1, 0, 0)); // Vermelho
        
        // Função para determinar quais objetos são válidos para colisão
        const predicate = (mesh) => {
            return mesh.isPickable && mesh.checkCollisions && mesh !== playerMesh;
        };
        
        // Realizar o raycast
        const hit = this.scene.pickWithRay(ray, predicate);
          // Se encontrou algo, o jogador está no chão
        if (hit && hit.pickedMesh) {
            this.model.setGrounded(true);
        } else {
            this.model.setGrounded(false);
        }
    }
}

export default PlayerController;