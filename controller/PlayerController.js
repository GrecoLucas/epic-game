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
        
        // Configurar controles do mouse
        this.setupMouseControls();
        
        // Configurar inputs do teclado
        this.setupInputHandling();
        
        // Configurar raycast para melhorar a interação com objetos
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
    
    setupMouseControls() {
        this.scene.onPointerDown = (evt) => {
            // Verificar se é o botão esquerdo do mouse (0)
            const isLeftClick = evt.button === 0;
            
            if (!this.scene.alreadyLocked) {
                this.scene.getCameraByName("playerCamera").attachControl(document.getElementById("renderCanvas"));
                this.lockCamera();
            } else if (isLeftClick) {
                // Se já bloqueado e é um clique esquerdo, verificar se temos uma arma e atirar
                this.handleShoot();
            }
        };
    }
    
    // Novo método para configurar o raycast e melhorar a interação com objetos
    setupRaycastForInteraction() {
        // Configurar um predicate para identificar objetos clicáveis
        const predicate = (mesh) => {
            return mesh.isPickable && mesh.name && mesh.name.includes("button");
        };
        
        // Registrar callback para evento de clique
        this.scene.onPointerDown = (evt) => {
            // Primeiro verificar o lock da câmera
            if (!this.scene.alreadyLocked) {
                this.scene.getCameraByName("playerCamera").attachControl(document.getElementById("renderCanvas"));
                this.lockCamera();
                return;
            }
            
            // Verificar se é o botão esquerdo do mouse (0)
            const isLeftClick = evt.button === 0;
            
            if (isLeftClick) {
                // Verificar se o jogador tem uma arma e ativar o disparo
                this.handleShoot();
                
                // Realizar um raycast a partir da câmera para interação com botões
                const camera = this.view.getCamera();
                const ray = camera.getForwardRay(3); // Distância maior para facilitar a interação
                const hit = this.scene.pickWithRay(ray, predicate);
                
                if (hit && hit.pickedMesh) {
                    // Simulamos um clique no objeto sem precisar acertar diretamente
                    const actionManager = hit.pickedMesh.actionManager;
                    if (actionManager) {
                        try {
                            // Dispara as ações registradas para o evento OnPickTrigger
                            actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger);
                        } catch (error) {
                            console.log("Erro ao processar trigger:", error);
                        }
                    }
                }
            }
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
        const equippedGun = this.getPlayerEquippedGun();
        
        if (!equippedGun) {
            console.log("Attempted to shoot without an equipped gun.");
            return;
        }
        
        // Configuração do raio a partir da câmera
        const camera = this.view.getCamera();
        const cameraPosition = camera.globalPosition;
        const forwardDirection = camera.getForwardRay(1).direction;
        
        // Ajuste da origem do raio (ligeiramente à frente da câmera)
        const rayOriginOffset = 0.1;
        const rayOrigin = cameraPosition.add(forwardDirection.scale(rayOriginOffset));
        const rayLength = 200; // Alcance máximo do tiro
        
        // Cria o raio com a origem ajustada
        const ray = new BABYLON.Ray(rayOrigin, forwardDirection, rayLength);
        
        // Ativa visualização de debug apenas se necessário
        const DEBUG_MODE = false; // Pode ser ativado com uma variável de configuração
        
        if (DEBUG_MODE) {
            // Visualização do raio
            this.scene.getMeshByName("rayVisualizer")?.dispose();
            const rayHelper = new BABYLON.RayHelper(ray);
            rayHelper.show(this.scene, new BABYLON.Color3(1, 1, 0));
            const visualizer = this.scene.getMeshByName("rayLine");
            if(visualizer) visualizer.name = "rayVisualizer";
            
            // Cleanup de visualizadores de boundingbox
            this.scene.meshes.filter(m => m.name === "bboxVisualizer").forEach(m => m.dispose());
            
            // Detecta e registra todos os hits (para debug)
            this.logAllHits(ray);
        }
        
        // Definição otimizada do predicate para filtrar apenas partes de monstros
        const monsterPartPredicate = (mesh) => {
            if (!mesh.isPickable) return false;
            
            // Lista de partes de monstros para verificar
            const monsterPartNames = ["monsterBody", "monsterHead", "monsterRoot", "eye", "horn"];
            
            // Verifica o mesh atual e toda sua hierarquia de pais
            let currentMesh = mesh;
            while (currentMesh) {
                if (currentMesh.name) {
                    // Verifica se o nome inclui alguma das partes de monstro
                    if (monsterPartNames.some(part => currentMesh.name.includes(part))) {
                        return true;
                    }
                }
                currentMesh = currentMesh.parent;
            }
            return false;
        };
        
        // Primeiro: checar se há obstáculos no caminho (paredes, etc)
        const rawHit = this.scene.pickWithRay(ray);
        const obstacleDistance = rawHit && rawHit.pickedMesh ? rawHit.distance : rayLength;
        
        // Verifica hits de monstros, mas apenas até o primeiro obstáculo
        let validHits = [];
        
        // Otimização: Verifica monstros apenas se não houver obstáculos muito próximos
        if (obstacleDistance > 0.5) {
            // Limita o ray para o primeiro obstáculo
            const limitedRay = new BABYLON.Ray(rayOrigin, forwardDirection, obstacleDistance);
            validHits = this.scene.multiPickWithRay(limitedRay, monsterPartPredicate);
        }
        
        // Processa o hit mais próximo
        const closestHit = validHits.length > 0 ? validHits[0] : null;
        
        if (closestHit && closestHit.pickedMesh) {
            // Processamento do hit no monstro
            this.processMonsterHit(closestHit, equippedGun);
        } else if (DEBUG_MODE && rawHit && rawHit.pickedMesh) {
            console.log(`Hitscan hit non-monster object: '${rawHit.pickedMesh.name}' at distance ${rawHit.distance.toFixed(3)}`);
        }
        
        // Efeito de tiro (som, animação, etc)
        const shotFired = equippedGun.shoot();
        if (shotFired) {
            console.log("Disparo efetuado (ammo/effects)!");
        } else {
            console.log("Disparo falhou (sem munição ou recarregando).");
        }
    }
    
    // Método auxiliar para processamento de hits em monstros
    processMonsterHit(hit, equippedGun) {
        console.log("Hit monster part:", hit.pickedMesh.name, "at distance", hit.distance.toFixed(3));
        
        const monstersList = this.scene.gameInstance?.getMonsters() || [];
        let hitMonster = null;
        
        // Encontra o monstro baseado no mesh atingido
        for (const monster of monstersList) {
            const monsterMesh = monster.getMesh();
            if (!monsterMesh) continue;
            
            if (hit.pickedMesh === monsterMesh || hit.pickedMesh.isDescendantOf(monsterMesh)) {
                hitMonster = monster;
                break;
            }
        }
        
        if (hitMonster) {
            const monsterController = hitMonster.getController();
            if (monsterController && !monsterController.isDisposed) {
                const damage = equippedGun.model.getDamage();
                
                // Adiciona variação de dano baseada na parte atingida
                let damageMultiplier = 1.0;
                if (hit.pickedMesh.name.includes("Head") || hit.pickedMesh.name.includes("eye")) {
                    damageMultiplier = 2.0; // Dano crítico para cabeça
                    console.log("CRITICAL HIT! Headshot x2 damage");
                }
                
                const finalDamage = Math.round(damage * damageMultiplier);
                console.log(`Applying ${finalDamage} damage and stunning monster.`);
                
                monsterController.takeDamage(finalDamage);
                monsterController.stun(2000);
                
                // Efeito visual de hit
                this.createHitEffect(hit.pickedPoint);
            }
        } else {
            console.log("Hit monster mesh part, but couldn't find associated Monster instance.");
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
        // Partículas ou decal no ponto de impacto
        const hitMarker = BABYLON.MeshBuilder.CreateSphere("hitMarker", { diameter: 0.1 }, this.scene);
        hitMarker.position = position;
        hitMarker.material = new BABYLON.StandardMaterial("hitMarkerMat", this.scene);
        hitMarker.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
        
        // Auto-destruição após 300ms
        setTimeout(() => {
            hitMarker.dispose();
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