import BuildingController from './BuildingController.js'; // Importar a nova classe
import ShootController from './ShootController/ShootController.js'; // Importar o novo ShootController

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
        // Initialize shootController
        this.shootController = new ShootController(scene, playerView);
        
        // Add pointer lock state tracking
        this.pointerLockActive = false;

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

        // Set up pointer lock change detection
        this.setupPointerLockHandling();
    }
    
    // Add new method to handle pointer lock events
    setupPointerLockHandling() {
        // Define pointer lock change event handler
        const pointerLockChangeHandler = () => {
            const canvas = document.getElementById("renderCanvas");
            
            if (document.pointerLockElement === canvas || 
                document.mozPointerLockElement === canvas ||
                document.webkitPointerLockElement === canvas ||
                document.msPointerLockElement === canvas) {
                // Pointer lock is active
                console.log("Pointer lock active");
                this.scene.alreadyLocked = true;
                this.pointerLockActive = true;
            } else {
                // Pointer lock is no longer active
                console.log("Pointer lock inactive - press click to re-enable");
                this.scene.alreadyLocked = false;
                this.pointerLockActive = false;
                
                // Show instruction to click to re-enable camera control
                this.showPointerLockInstruction();
            }
        };
        
        // Add event listeners for pointer lock change
        document.addEventListener('pointerlockchange', pointerLockChangeHandler);
        document.addEventListener('mozpointerlockchange', pointerLockChangeHandler);
        document.addEventListener('webkitpointerlockchange', pointerLockChangeHandler);
        document.addEventListener('mspointerlockchange', pointerLockChangeHandler);
    }
    
    // Show instruction to re-enable pointer lock
    showPointerLockInstruction() {
        // Create or update instruction text
        if (!this.pointerLockInstruction) {
            const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("pointerLockUI", true);
            
            this.pointerLockInstruction = new BABYLON.GUI.TextBlock();
            this.pointerLockInstruction.text = "Clique 1 ou 2 vezes para retornar ao jogo";
            this.pointerLockInstruction.color = "white";
            this.pointerLockInstruction.fontSize = 24;
            this.pointerLockInstruction.fontFamily = "Arial";
            this.pointerLockInstruction.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
            this.pointerLockInstruction.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            
            advancedTexture.addControl(this.pointerLockInstruction);
        } else {
            this.pointerLockInstruction.isVisible = true;
        }
        
        // Hide instruction after 3 seconds or when pointer lock is re-enabled
        setTimeout(() => {
            if (this.pointerLockInstruction && !this.pointerLockActive) {
                this.pointerLockInstruction.isVisible = false;
            }
        }, 3000);
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
                        // Configurar disparo automático usando o shootController
                        this.shootController.setupAutomaticFire(equippedGun, () => {
                            this.handleShoot();
                        });
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
            if (evt.button === 0) {
                // Parar disparo automático usando o shootController
                this.shootController.stopAutomaticFire();
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
            
            // Normalize the pointer lock API across browsers
            canvas.requestPointerLock = 
                canvas.requestPointerLock || 
                canvas.msRequestPointerLock || 
                canvas.mozRequestPointerLock || 
                canvas.webkitRequestPointerLock;
                
            // Only request pointer lock if it's not already active and API is available
            if (canvas.requestPointerLock && !this.pointerLockActive) {
                // Set up error handling for pointer lock request
                const lockErrorCallback = (e) => {
                    console.log("Erro ao solicitar Pointer Lock:", e);
                    document.removeEventListener('pointerlockerror', lockErrorCallback);
                };
                document.addEventListener('pointerlockerror', lockErrorCallback);
                
                // Request pointer lock
                canvas.requestPointerLock();
                
                // Hide instructions if visible
                if (this.pointerLockInstruction) {
                    this.pointerLockInstruction.isVisible = false;
                }
                
                console.log("Pointer Lock solicitado com sucesso");
            } else if (this.pointerLockActive) {
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
                            if (key === "2") { // Selecionar Rampa
                                this.buildingController.setSelectedItem('ramp');
                                
                                // Se implementar direções diferentes para rampa
                                if (this.buildingController.rampController) {
                                    this.buildingController.rampController.setDirection('east');
                                    this.buildingController.currentPlacementRotation = 0; // Reset para orientação east
                                }
                            }
                            if (key === "3") { // Selecionar Barricada
                                this.buildingController.setSelectedItem('barricade');
                            }
                            if (key === "4") { // Alternar direção da rampa (east ou south)
                                if (this.buildingController.selectedItem === 'ramp' && 
                                    this.buildingController.rampController) {
                                    // Alternar entre east e south
                                    const currentDirection = this.buildingController.rampController.rampDirection;
                                    const newDirection = currentDirection === 'east' ? 'south' : 'east';
                                    this.buildingController.rampController.setDirection(newDirection);
                                    
                                    // Ajustar rotação para a direção
                                    if (newDirection === 'south') {
                                        this.buildingController.currentPlacementRotation = Math.PI / 2; // 90 graus
                                    } else {
                                        this.buildingController.currentPlacementRotation = 0;
                                    }
                                }
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
        const equippedGun = this.getPlayerEquippedGun();
        this.shootController.handleShoot(equippedGun);
        
        // Atualizar exibição de munição se necessário
        if (this.scene.gameInstance && this.scene.gameInstance.player) {
            this.scene.gameInstance.player.updateAmmoDisplay();
        }
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