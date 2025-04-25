// Controller - Responsável pelo controle e input do player
class PlayerController {
    constructor(scene, playerModel, playerView) {
        this.scene = scene;
        this.model = playerModel;
        this.view = playerView;
        this.inputMap = {};
        this.nearbyButton = null; // Referência ao botão mais próximo
        this.nearbyGun = null; // Referência à arma mais próxima
        this.interactionDistance = 5; // Distância máxima para interagir com botões
        this.interactionHint = null; // Elemento UI para mostrar dica de interação
        this.groundCheckDistance = 0.5; // Aumentado para detectar o chão a uma distância maior
        
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
        });
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
        // Configurar um predicate para identificar objetos clicáveis (botões)
        const buttonPredicate = (mesh) => {
            return mesh.isPickable && mesh.name && mesh.name.includes("button");
        };
        
        // Registrar callback para evento de clique
        this.scene.onPointerDown = (evt) => {
            // Primeiro verificar o lock da câmera
            if (!this.scene.alreadyLocked) {
                // Use getCamera() which should return the active player camera
                const camera = this.view.getCamera(); 
                if (camera) {
                    camera.attachControl(document.getElementById("renderCanvas"));
                    this.lockCamera();
                }
                return;
            }
            
            // Verificar se é o botão esquerdo do mouse (0)
            const isLeftClick = evt.button === 0;
            
            if (isLeftClick) {
                // 1. Lógica de Disparo
                this.handleShoot();
                
                // 2. Lógica de Interação com Botão (via Raycast)
                const camera = this.view.getCamera();
                if (!camera) return; // Safety check

                const ray = camera.getForwardRay(this.interactionDistance); // Usar a distância de interação definida
                const hit = this.scene.pickWithRay(ray, buttonPredicate);
                
                if (hit && hit.pickedMesh) {
                    // Ativar o botão atingido pelo raycast
                    const actionManager = hit.pickedMesh.actionManager;
                    if (actionManager) {
                        try {
                            // Disparar animação visual de feedback
                            this.createFeedbackAnimation(hit.pickedMesh);
                            // Dispara as ações registradas para o evento OnPickTrigger
                            actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger);
                        } catch (error) {
                            console.log("Erro ao processar trigger do botão via raycast:", error);
                        }
                    }
                }
            }
            // Adicione aqui lógica para outros botões do mouse se necessário (e.g., evt.button === 1 for middle, evt.button === 2 for right)
        };
    }
    
    lockCamera() {
        document.getElementById("renderCanvas").requestPointerLock = 
            document.getElementById("renderCanvas").requestPointerLock || 
            document.getElementById("renderCanvas").msRequestPointerLock || 
            document.getElementById("renderCanvas").mozRequestPointerLock || 
            document.getElementById("renderCanvas").webkitRequestPointerLock;
            
        if (document.getElementById("renderCanvas").requestPointerLock) {
            document.getElementById("renderCanvas").requestPointerLock();
        }
        
        this.scene.alreadyLocked = true;
    }
    
    setupInputHandling() {
        // Keyboard
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        
        // Detectar teclas pressionadas
        this.scene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnKeyDownTrigger,
                (evt) => {
                    const key = evt.sourceEvent.key.toLowerCase();
                    this.inputMap[key] = true;
                    
                    // Verificar se é a tecla de interação (E)
                    if (key === "e") {
                        // Prioridade: arma > botão
                        if (this.nearbyGun) {
                            this.pickupNearbyGun();
                        } else if (this.nearbyButton) {
                            this.activateNearbyButton();
                        }
                    }
                    
                    // Verificar se é a tecla de pulo (Espaço)
                    if (key === " ") {
                        this.model.jump();
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
        
        // Atualizar movimento a cada frame
        this.scene.registerBeforeRender(() => this.updateMovement());
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
            
            // Aplicar stun (tempo poderia ser baseado na arma/dano)
            monsterController.stun(2000);
            
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