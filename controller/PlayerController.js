import BuildingController from './BuildingController.js'; // Importar a nova classe
import ShootController from './ShootController/ShootController.js'; // Importar o novo ShootController
import Pause from '../objects/Pause.js'; // Importar o objeto de pausa
import HotBar from '../objects/HotBar.js';

class PlayerController {
    constructor(scene, playerModel, playerView) {
        this.scene = scene;
        this.model = playerModel;
        this.view = playerView;
        this.inputMap = {};
        this.nearbyButton = null;
        this.nearbyGun = null;
        this.nearbyTurret = null; // Nova variável para rastrear torretas próximas
        this.interactionDistance = 5;
        this.interactionHint = null;
        this.groundCheckDistance = 0.5;
        // Initialize buildingController as null initially
        this.buildingController = null;
        // Initialize shootController
        this.shootController = new ShootController(scene, playerView);
        
        // Add pointer lock state tracking
        this.pointerLockActive = false;
        
        // Inicializar o sistema de pausa
        this.pause = new Pause(scene, playerView);

        this.lastFootstepTime = 0;
        this.footstepInterval = 300;
        this.initialize();
    }

    initialize() {
        // Configurar o view com o mesh do model
        this.view.initialize(this.model.getMesh());
        
        // Configurar a câmera com o view
        this.camera = this.view.getCamera();

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
            // Não executar atualizações se o jogo estiver pausado
            if (this.pause.isPaused()) return;
            
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

        this.hotbar = new HotBar(this.scene);
        this.hotbar.initialize();

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
                this.scene.alreadyLocked = true;
                this.pointerLockActive = true;
            } else {
                // Pointer lock is no longer active
                this.scene.alreadyLocked = false;
                this.pointerLockActive = false;
                
            }
        };
        
        // Add event listeners for pointer lock change
        document.addEventListener('pointerlockchange', pointerLockChangeHandler);
        document.addEventListener('mozpointerlockchange', pointerLockChangeHandler);
        document.addEventListener('webkitpointerlockchange', pointerLockChangeHandler);
        document.addEventListener('mspointerlockchange', pointerLockChangeHandler);
    }
    

    // Adicionando um novo método para inicializar o BuildingController com segurança
   // Create a UI element to show interaction hint with buttons
    createInteractionHint() {
        // Create a GUI texture to add 2D elements
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("interactionUI");
        
        // Create the hint text
        const hintText = new BABYLON.GUI.TextBlock("hintText");
        hintText.text = "Press E to activate";
        hintText.color = "white";
        hintText.fontSize = 16;
        hintText.fontFamily = "Arial";
        hintText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        hintText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        hintText.paddingBottom = "120px";
        hintText.alpha = 0; // Initially invisible
        
        advancedTexture.addControl(hintText);
        this.interactionHint = hintText;
    }
    
    // Configurar detecção de proximidade com botões e armas
    setupProximityDetection() {
        // Registrar função para verificar proximidade antes de cada frame
        this.scene.registerBeforeRender(() => {
            const playerPosition = this.model.getPosition();
            
            // Verificar estruturas - FIX: Correção dos blocos if
            // Verificar estruturas - REFATORAÇÃO para melhorar a detecção
            if (this.camera) {
                // Criar um raio diretamente da câmera para frente
                const ray = new BABYLON.Ray(
                    this.camera.position, 
                    this.camera.getForwardRay().direction,
                    this.interactionDistance * 2 // Aumentar a distância máxima para melhorar a detecção
                );
                                
                // Lista de prefixos de nomes de estruturas a verificar
                const structurePrefixes = [
                    "playerWall_", 
                    "playerRamp_", 
                    "playerBarricade_", 
                    "playerTurret_",
                    "playerWiredFence_"
                ];                  // Função de predicado melhorada para detectar estruturas
                const structurePredicate = (mesh) => {
                    if (!mesh.isPickable) return false;
                    
                    // Ignorar hitboxes especiais de barricadas e damage zones
                    if (mesh.metadata && (mesh.metadata.isZombieCollisionOnly || 
                                         mesh.metadata.isBarricadeHitbox || 
                                         mesh.metadata.isWiredFenceDamageZone)) return false;
                    
                    // Verificar se o nome corresponde a algum dos prefixos
                    for (const prefix of structurePrefixes) {
                        if (mesh.name && mesh.name.startsWith(prefix)) {
                            return true;
                        }
                    }
                    
                    // NOVO: Verificar se é um collection hitbox de cerca de arame
                    if (mesh.metadata && mesh.metadata.isWiredFenceCollectionHitbox) {
                        return true;
                    }
                    
                    return false;
                };
                
                // Realizar o raycast com o predicado
                const hit = this.scene.pickWithRay(ray, structurePredicate);
                
                // Se encontrou estrutura, atualizar referência
                if (hit && hit.pickedMesh) {
                    this.nearbyStructure = hit.pickedMesh;
                    
                    // Mostrar dica de interação
                    if (this.interactionHint) {
                        this.interactionHint.text = "Pressione F para recolher";
                        this.interactionHint.alpha = 1;
                    }
                    
                    // Log para debug - estrutura encontrada
                    console.log("Estrutura detectada por raio:", this.nearbyStructure.name, 
                                "Distância:", hit.distance.toFixed(2));
                } else {
                    // Se não encontrou, limpar referência
                    this.nearbyStructure = null;
                    
                    // Log para debug quando nenhuma estrutura é encontrada
                    // console.log("Nenhuma estrutura detectada pelo raio");
                }
            }
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
                mesh.name && mesh.name.includes("gun_ground") && mesh.isEnabled() && mesh.isVisible
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
                    // Pular armas que já foram coletadas (invisíveis ou desativadas)
                    if (!gunMesh.isVisible || !gunMesh.isEnabled()) continue;
                    
                    // Encontrar o mesh raiz que contém todas as partes
                    let rootMesh = gunMesh;
                    while (rootMesh.parent && rootMesh.parent.name && rootMesh.parent.name.includes("gun_ground")) {
                        rootMesh = rootMesh.parent;
                    }
                    
                    // Verificar se a arma já está no inventário verificando o gunLoader
                    if (this.scene.gameInstance && this.scene.gameInstance.gunLoader) {
                        const gunInstance = this.findGunInstanceByMesh(rootMesh);
                        if (gunInstance && gunInstance.model.isInInventory) {
                            continue; // Pular armas que já estão no inventário
                        }
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

            // --- DETECÇÃO DE TORRETAS ---
            // Obter todas as torretas na cena
            const turretMeshes = this.scene.meshes.filter(mesh => 
                mesh.name && mesh.name.startsWith("playerTurret_") && 
                mesh.metadata && mesh.metadata.isTurret
            );
            
            // Resetar a torreta mais próxima
            this.nearbyTurret = null;
            
            // Verificar distância para cada torreta
            if (turretMeshes.length > 0) {
                let closestDistance = this.interactionDistance;
;
                let closestTurret = null;
                
                for (const turretMesh of turretMeshes) {
                    // Pegar o centro real da torreta (pode ser diferente da posição do mesh base)
                    let turretPosition;
                    
                    // Verificar se a torreta tem componentes e usar a posição central
                    if (turretMesh.metadata && turretMesh.metadata.components && turretMesh.metadata.components.root) {
                        // Usar o nó raiz para uma posição mais centralizada
                        turretPosition = turretMesh.metadata.components.root.getAbsolutePosition();
                        
                        // Ajustar a altura para considerar o centro vertical da torreta
                        if (turretMesh.metadata.components.body) {
                            turretPosition.y = turretMesh.metadata.components.body.getAbsolutePosition().y;
                        }
                    } else {
                        // Caso não encontre components, usar a posição do próprio mesh
                        turretPosition = turretMesh.position.clone();
                    }
                    
                    // Calcular a distância a partir da posição real do jogador ao centro da torreta
                    const distance = BABYLON.Vector3.Distance(playerPosition, turretPosition);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestTurret = turretMesh;
                    }
                }
                
                // Se encontrou uma torreta próxima, atualizar referência
                this.nearbyTurret = closestTurret;
            }
              // Update hint based on proximity (priority: gun > button > turret)
            if (this.interactionHint) {
                if (this.nearbyGun) {
                    this.interactionHint.text = "Press E to pick up weapon";
                    this.interactionHint.alpha = 1;
                } else if (this.nearbyButton) {
                    this.interactionHint.text = "Press E to activate";
                    this.interactionHint.alpha = 1;
                } else if (this.nearbyTurret) {
                    if (this.scene.gameInstance && 
                        this.scene.gameInstance.turretController) {
                        this.interactionHint.text = "Press E to buy ammo (100$)";
                        this.interactionHint.alpha = 1;
                        
                    } else {
                        this.interactionHint.alpha = 0;
                    }
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

            // Não processar cliques se o jogo estiver pausado
            if (this.pause.isPaused()) return;
            
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
                    this.inputMap[key] = true;                    if (key === "f") {
                        console.log("Tecla F pressionada, lançando raio de coleta");
                        this.castRayToCollectStructure(); 
                    }
    
                    // --- Tecla P ou ESC para pausar o jogo ---
                    if (key === "p" || key === "escape") {
                        // Se ESC for pressionado e o pointer lock estiver ativo, desbloquear primeiro
                        if (key === "escape" && this.pointerLockActive) {
                            this.unlockPointer();
                        }
                        
                        // Sempre mostrar o menu de pausa
                        this.pause.togglePause();
                        return; // Não processar outros inputs se estamos pausando
                    }
                    
                    // Não processar outros comandos se o jogo estiver pausado
                    if (this.pause.isPaused()) return;
                    
                    // --- Inputs Gerais (Fora do Modo Construção ou Sempre Ativos) ---
                    if (key === "e") {
                        if (!this.buildingController?.isEnabled) { // Só interage se NÃO estiver construindo
                            if (this.nearbyGun) this.pickupNearbyGun();
                            else if (this.nearbyButton) this.activateNearbyButton();
                            else if (this.nearbyTurret) this.interactWithNearbyTurret();
                        }
                    }
                    if (key === " ") {
                        this.model.jump();
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
                            if (key === "4") { // Selecionar Torreta
                                this.buildingController.setSelectedItem('turret');
                            }
                            if (key === "5") { // Selecionar Cerca de Arame
                                this.buildingController.setSelectedItem('wiredFence');
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
    
    unlockPointer() {
        try {
            if (document.exitPointerLock) {
                document.exitPointerLock();
            } else if (document.msExitPointerLock) {
                document.msExitPointerLock();
            } else if (document.mozExitPointerLock) {
                document.mozExitPointerLock();
            } else if (document.webkitExitPointerLock) {
                document.webkitExitPointerLock();
            }
            
            console.log("Pointer Lock desbloqueado");
        } catch (e) {
            console.error("Erro ao desbloquear Pointer Lock:", e);
        }
    }
    
    // Ativar o botão mais próximo
    activateNearbyButton() {
        if (this.nearbyButton && this.nearbyButton.actionManager) {
            try {
                this.nearbyButton.actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger);
            } catch (error) {
                console.log("Erro ao ativar botão próximo:", error);
            }
        }
    }
        
    // Pegar a arma mais próxima
    pickupNearbyGun() {
        if (this.nearbyGun) {
            try {
                // Encontrar a instância Gun associada a este mesh
                const gunInstance = this.findGunInstanceByMesh(this.nearbyGun);
                
                if (gunInstance) {
                    // Marcar a arma como adicionada ao inventário
                    gunInstance.model.addToInventory();
                    
                    // Atualizar visibilidade imediatamente para remover do chão
                    gunInstance.view.updateVisibility();
                    
                    // Adicionar à hotbar e obter o índice do slot onde foi adicionada
                    const slotIndex = this.hotbar.addWeapon(gunInstance);
                    
                    // Equipar a arma diretamente (em vez de apenas adicioná-la ao inventário)
                    if (slotIndex !== -1) {
                        this.hotbar.controller.selectSlot(slotIndex);
                        gunInstance.pickup(); // Garantir que a arma está equipada
                    }
    
                    // Limpar a referência para a arma próxima para evitar interação duplicada
                    this.nearbyGun = null;
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
        if (this.hotbar) {
            const selectedWeapon = this.hotbar.getSelectedWeapon();
            if (selectedWeapon) {
                return selectedWeapon;
            }
        }
        
        // Fallback para o método antigo se não houver hotbar ou arma selecionada
        if (this.scene.gameInstance && this.scene.gameInstance.gunLoader) {
            return this.scene.gameInstance.gunLoader.getPlayerGun();
        }
        return null;
    }
    
    // Novo método para interagir com torreta próxima (compra de munição)
    interactWithNearbyTurret() {
        if (!this.nearbyTurret) return;
        
        // Obter o jogador
        const player = this.scene.gameInstance?.player;
        if (!player) return;
        
        // Obter referência para o controlador de torretas
        let turretController;
        if (this.scene.gameInstance && this.scene.gameInstance.turretController) {
            turretController = this.scene.gameInstance.turretController;
        } else if (this.buildingController && this.buildingController.turretController) {
            turretController = this.buildingController.turretController;
        }
        
        if (!turretController) {
            console.warn("Controlador de torretas não encontrado.");
            this.showNotification("Erro ao interagir com a torreta.", "red");
            return;
        }
        
        // Verificar informações da munição da torreta
        const ammoInfo = turretController.getTurretAmmoInfo(this.nearbyTurret);
        if (!ammoInfo)
            return;
             
        // Definir valor fixo para comprar (40 munições por 100 dinheiro)
        const ammoAmount = 40;
        const cost = 100;
        
        // Verificar se o jogador tem dinheiro suficiente
        if (player.money < cost) {
            this.showNotification(`Você precisa de 100 dinheiro para comprar munição para a torreta.`, "red");
            return;
        }
        
        // Comprar a munição
        const result = turretController.buyAmmoForSpecificTurret(
            this.nearbyTurret, 
            ammoAmount, 
            player.money, 
            (newAmount) => {
                player.money = newAmount;
                player.updateMoneyDisplay();
            }
        );
        
        // Mostrar mensagem de resultado
        if (result && result.success) {
            this.showNotification(`Comprou ${ammoAmount} munições para a torreta por 100$.`, "green");
        } else {
            this.showNotification(result?.message || "Falha ao comprar munição.", "red");
        }
    
    }
    
    // Método para mostrar notificações
    showNotification(message, color = "white", duration = 3000) {
        // Criar uma GUI texture para a notificação
        const notificationTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("notificationUI", true);
        
        // Criar o texto da notificação
        const notification = new BABYLON.GUI.TextBlock("notification", message);
        notification.color = color;
        notification.fontSize = 18;
        notification.fontFamily = "Arial";
        notification.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        notification.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        notification.paddingTop = "30px";
        notification.resizeToFit = true;
        
        // Adicionar o texto à GUI
        notificationTexture.addControl(notification);
        
        // Configurar animação de fade-out
        setTimeout(() => {
            // Criar animação de fade-out
            const fadeOut = () => {
                let alpha = notification.alpha;
                alpha -= 0.05;
                notification.alpha = alpha;
                
                if (alpha <= 0) {
                    clearInterval(fadeInterval);
                    notificationTexture.dispose();
                }
            };
            
            const fadeInterval = setInterval(fadeOut, 50);
        }, duration - 500); // Começar a desaparecer 500ms antes do término
        
        // Remover a notificação após a duração
        setTimeout(() => {
            if (notificationTexture) {
                notificationTexture.dispose();
            }
        }, duration);
    }
    
    updateMovement() {
        // Não atualizar movimento se o jogo estiver pausado
        if (this.pause.isPaused()) return;
        
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
        this.playFootstepSound();
    }
    
    moveBackward() {
        // Mover na direção oposta à câmera com colisão
        const direction = this.getCameraDirection();
        this.model.moveWithDirection(direction.scale(-this.model.moveSpeed));
        this.playFootstepSound();
    }
    
    moveLeft() {
        // Mover para a esquerda em relação à direção da câmera com colisão
        const direction = this.getCameraRightDirection();
        this.model.moveWithDirection(direction.scale(-this.model.moveSpeed));
        this.playFootstepSound();
    }
    
    moveRight() {
        // Mover para a direita em relação à direção da câmera com colisão
        const direction = this.getCameraRightDirection();
        this.model.moveWithDirection(direction.scale(this.model.moveSpeed));
        this.playFootstepSound();
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

    collectNearbyStructure() {
        if (!this.nearbyStructure) {
            console.log("Nenhuma estrutura próxima detectada");
            return;
        }
        
        console.log("Tentando recolher estrutura:", this.nearbyStructure.name);
        
        // Determinar tipo da estrutura
        let structureType = null;
        let actualStructureName = null;
        
        // NOVO: Verificar se é um collection hitbox de cerca de arame
        if (this.nearbyStructure.metadata && this.nearbyStructure.metadata.isWiredFenceCollectionHitbox) {
            structureType = 'wiredFence';
            actualStructureName = this.nearbyStructure.metadata.parentFence;
            console.log("Detectado collection hitbox de cerca de arame:", actualStructureName);
        }
        // Verificações existentes para outros tipos
        else if (this.nearbyStructure.name.startsWith("playerWall_")) {
            structureType = 'wall';
            actualStructureName = this.nearbyStructure.name;
        } else if (this.nearbyStructure.name.startsWith("playerRamp_")) {
            structureType = 'ramp';
            actualStructureName = this.nearbyStructure.name;
        } else if (this.nearbyStructure.name.startsWith("playerBarricade_")) {
            structureType = 'barricade';
            actualStructureName = this.nearbyStructure.name;
        } else if (this.nearbyStructure.name.startsWith("playerTurret_")) {
            structureType = 'turret';
            actualStructureName = this.nearbyStructure.name;
        } else if (this.nearbyStructure.name.startsWith("playerWiredFence_")) {
            structureType = 'wiredFence';
            actualStructureName = this.nearbyStructure.name;
        }
        
        // Adicionar material de volta ao inventário
        if (this.buildingController && structureType && actualStructureName) {
            this.buildingController.addMaterials(
                structureType === 'wall' ? 1 : 0,
                structureType === 'ramp' ? 1 : 0,
                structureType === 'barricade' ? 1 : 0,
                structureType === 'turret' ? 1 : 0,
                structureType === 'wiredFence' ? 1 : 0
            );
            
            // Obter a posição da estrutura real (não do hitbox)
            let position;
            if (structureType === 'wiredFence' && this.nearbyStructure.metadata?.isWiredFenceCollectionHitbox) {
                // Para collection hitbox, usar a posição do parent
                const parentFence = this.scene.getMeshByName(actualStructureName) || 
                                   this.scene.getTransformNodeByName(actualStructureName);
                position = parentFence ? parentFence.position.clone() : this.nearbyStructure.position.clone();
            } else {
                position = this.nearbyStructure.position.clone();
            }
            
            try {
                // Usar os métodos de destruição existentes
                if (structureType === 'wall' && this.scene.gameInstance?.mazeView) {
                    this.scene.gameInstance.mazeView.destroyWallVisual(actualStructureName, position);
                } else if (structureType === 'ramp' && this.scene.gameInstance?.mazeView) {
                    this.scene.gameInstance.mazeView.destroyRampVisual(actualStructureName, position);
                } else if (structureType === 'barricade' && this.scene.gameInstance?.mazeView) {
                    this.scene.gameInstance.mazeView.destroyBarricadeVisual(actualStructureName, position);
                } else if (structureType === 'turret' && this.scene.gameInstance?.turretController) {
                    this.scene.gameInstance.turretController.turretHandler.destroyTurretVisual(
                        actualStructureName, position, null
                    );
                } else if (structureType === 'wiredFence' && this.scene.gameInstance?.mazeView) {
                    // NOVO: Usar o método de destruição de cerca de arame
                    this.scene.gameInstance.mazeView.destroyWiredFenceVisual(actualStructureName, position);
                } else {
                    // Fallback: simplesmente remover o mesh se não conseguir usar métodos específicos
                    if (structureType === 'wiredFence') {
                        // Para cerca de arame, remover o fence principal, não o hitbox
                        const parentFence = this.scene.getMeshByName(actualStructureName) || 
                                           this.scene.getTransformNodeByName(actualStructureName);
                        if (parentFence) {
                            parentFence.dispose();
                        }
                    } else {
                        this.nearbyStructure.dispose();
                    }
                    console.log("Estrutura removida via dispose padrão");
                }
                
                this.showNotification(`${structureType.charAt(0).toUpperCase() + structureType.slice(1)} recolhido!`, "green");
            } catch (error) {
                console.error("Erro ao destruir estrutura:", error);
                // Ainda assim, tentar remover o mesh
                try {
                    if (structureType === 'wiredFence') {
                        const parentFence = this.scene.getMeshByName(actualStructureName) || 
                                           this.scene.getTransformNodeByName(actualStructureName);
                        if (parentFence) {
                            parentFence.dispose();
                        }
                    } else {
                        this.nearbyStructure.dispose();
                    }
                    this.showNotification(`${structureType} recolhido (modo de recuperação)`, "orange");
                } catch (e) {
                    console.error("Falha ao remover estrutura:", e);
                }
            }
            
            // Limpar a referência para evitar interações duplicadas
            this.nearbyStructure = null;
        }
    }

    castRayToCollectStructure() {
        if (!this.camera) {
            console.log("Camera não disponível para raycasting");
            return;
        }
        
        // CORREÇÃO: Usar a posição do JOGADOR, não da câmera!
        const playerPosition = this.model.getPosition().clone();
        // Ajustar para a altura dos olhos do jogador usando a altura configurável da câmera
        playerPosition.y += this.view.getCameraHeight();
        
        // Manter a direção da câmera para o raycasting
        const cameraDirection = this.camera.getForwardRay().direction;
        
        console.log("Posição do jogador:", playerPosition);
        console.log("Direção da câmera:", cameraDirection);
        
        // Criar o raio começando da posição REAL do jogador
        const ray = new BABYLON.Ray(
            playerPosition,
            cameraDirection,
            30 // Distância do raio (30 unidades)
        );        // Lista de prefixos de estruturas que podem ser coletadas
        const structurePrefixes = [
            "playerWall_", 
            "playerRamp_", 
            "playerBarricade_", 
            "playerTurret_",
            "playerWiredFence_"
        ];        // Predicado para verificar estruturas coletáveis
        const structurePredicate = (mesh) => {
            if (!mesh.isPickable) return false;
            
            // Ignorar meshes de colisão especiais para zombies e damage zones
            if (mesh.metadata && (mesh.metadata.isZombieCollisionOnly || 
                                 mesh.metadata.isWiredFenceDamageZone)) return false;
            
            // Verificar se o nome corresponde a algum prefixo
            for (const prefix of structurePrefixes) {
                if (mesh.name && mesh.name.startsWith(prefix)) {
                    return true;
                }
            }
            
            // NOVO: Verificar se é um collection hitbox de cerca de arame
            if (mesh.metadata && mesh.metadata.isWiredFenceCollectionHitbox) {
                return true;
            }
            
            return false;
        };
        
        // DEBUG: Log all meshes that could be related to wired fence
        const allMeshes = this.scene.meshes.filter(mesh => 
            mesh.name && (mesh.name.includes("Fence") || mesh.name.includes("fence") || 
                         mesh.name.includes("playerWiredFence") || mesh.name.includes("collectionHitbox"))
        );
        console.log("DEBUG - All fence-related meshes in scene:", allMeshes.map(m => ({
            name: m.name,
            pickable: m.isPickable,
            visible: m.visibility,
            metadata: m.metadata ? {
                isWiredFenceCollectionHitbox: m.metadata.isWiredFenceCollectionHitbox,
                parentFence: m.metadata.parentFence
            } : null
        })));
        
        // DEBUG: Log ray details
        console.log("DEBUG - Ray details:", {
            origin: ray.origin,
            direction: ray.direction,
            length: ray.length
        });        // Realizar o raycast com o predicado
        const hit = this.scene.pickWithRay(ray, structurePredicate);
        
        // DEBUG: Log all intersections
        console.log("DEBUG - All pickable meshes near raycast:", this.scene.meshes.filter(mesh => {
            if (!mesh.isPickable) return false;
            const distance = BABYLON.Vector3.Distance(ray.origin, mesh.position);
            return distance < 50; // Show meshes within 50 units
        }).map(m => ({
            name: m.name,
            position: m.position,
            distance: BABYLON.Vector3.Distance(ray.origin, m.position).toFixed(2),
            pickable: m.isPickable,
            metadata: m.metadata ? {
                isWiredFenceCollectionHitbox: m.metadata.isWiredFenceCollectionHitbox,
                parentFence: m.metadata.parentFence
            } : null
        })));
        
        // FALLBACK: Se o raycast não encontrou, tentar busca por proximidade
        if (!hit || !hit.pickedMesh) {
            console.log("DEBUG - Raycast failed, trying proximity search...");
            const nearbyFences = this.scene.meshes.filter(mesh => {
                if (!mesh.isPickable) return false;
                
                // Check if it's a wired fence or collection hitbox
                if (mesh.metadata?.isWiredFenceCollectionHitbox || mesh.name.startsWith("playerWiredFence_")) {
                    const distance = BABYLON.Vector3.Distance(playerPosition, mesh.position);
                    console.log(`DEBUG - Found fence mesh: ${mesh.name}, distance: ${distance.toFixed(2)}, pickable: ${mesh.isPickable}`);
                    return distance < 10; // Within 10 units
                }
                return false;
            });
            
            if (nearbyFences.length > 0) {
                const closestFence = nearbyFences.reduce((closest, current) => {
                    const closestDist = BABYLON.Vector3.Distance(playerPosition, closest.position);
                    const currentDist = BABYLON.Vector3.Distance(playerPosition, current.position);
                    return currentDist < closestDist ? current : closest;
                });
                
                console.log("DEBUG - Found nearby fence via proximity:", closestFence.name);
                this.nearbyStructure = closestFence;
                this.collectNearbyStructure();
                return true;
            }
        }
        
        if (hit && hit.pickedMesh) {
            // Armazenar temporariamente a estrutura encontrada
            this.nearbyStructure = hit.pickedMesh;
            
            // Log para debug - estrutura encontrada
            console.log("Estrutura detectada por raio:", 
                        this.nearbyStructure.name, 
                        "Distância:", hit.distance.toFixed(2));
            
            // Coletar a estrutura
            this.collectNearbyStructure();
            
            return true;
        } else {
            console.log("Nenhuma estrutura detectada pelo raio");
            return false;
        }
    }
    playFootstepSound() {
        const currentTime = Date.now();           
        if (currentTime - this.lastFootstepTime > this.footstepInterval && this.model.isGrounded) {
            if (this.scene.gameInstance?.soundManager) {
                this.scene.gameInstance.soundManager.playPlayerSound('footstep');
                this.lastFootstepTime = currentTime;
            } else {
                console.warn("SoundManager não encontrado!");
            }
        }
    }
}

export default PlayerController;