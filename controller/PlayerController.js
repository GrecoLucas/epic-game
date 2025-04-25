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
            // console.log("Attempted to shoot without an equipped gun."); // Optional: Less console spam
            return;
        }

        // --- Configuração do Raycast ---
        const camera = this.view.getCamera();
        if (!camera) {
            console.error("Player camera not found for shooting.");
            return;
        }
        const rayLength = 200; // Alcance máximo do tiro (pode ser movido para config/propriedade)
        const rayOriginOffset = 0.1; // Pequeno offset para evitar colisão com a própria câmera
        const DEBUG_MODE = false; // Ativar para visualização e logs detalhados

        const cameraPosition = camera.globalPosition;
        const forwardDirection = camera.getForwardRay(1).direction;

        // Origem ligeiramente à frente da câmera
        const rayOrigin = cameraPosition.add(forwardDirection.scale(rayOriginOffset));

        // Cria o raio principal
        const ray = new BABYLON.Ray(rayOrigin, forwardDirection, rayLength);

        // --- Debug Visual (Opcional) ---
        if (DEBUG_MODE) {
            this.debugShootRay(ray);
            this.logAllHits(ray); // Loga todos os objetos que o raio *poderia* atingir
        }

        // --- Lógica de Detecção de Hit ---

        // 1. Primeiro, verifica o PRIMEIRO objeto sólido atingido pelo raio (obstáculo ou monstro)
        //    Isso determina a distância máxima que o "projétil" pode viajar.
        //    Ignora o próprio jogador (assumindo que o mesh do jogador contém "Player" no nome).
        const firstHit = this.scene.pickWithRay(ray, (mesh) => mesh.isPickable && !mesh.name.includes("Player"));
        const hitDistance = firstHit && firstHit.pickedMesh ? firstHit.distance : rayLength;

        // 2. Agora, verifica especificamente por PARTES DE MONSTROS, mas apenas DENTRO da distância do primeiro hit.
        //    Isso garante que não atingimos monstros através de paredes.
        let closestMonsterHit = null;
        if (hitDistance > 0.1) { // Só busca monstros se o primeiro hit não for muito próximo
            // Cria um raio limitado pela distância do primeiro obstáculo
            const limitedRay = new BABYLON.Ray(rayOrigin, forwardDirection, hitDistance);

            // Predicate para identificar partes de monstros
            const monsterPartPredicate = (mesh) => {
                if (!mesh.isPickable) return false;
                // Lista de partes de monstros (pode ser otimizada/configurada)
                const monsterPartNames = ["monsterBody", "monsterHead", "monsterRoot", "eye", "horn"];
                let currentMesh = mesh;
                // Verifica o mesh atual e seus pais na hierarquia
                while (currentMesh) {
                    if (currentMesh.name && monsterPartNames.some(part => currentMesh.name.includes(part))) {
                        // Opcional: Armazenar referência no metadata para otimizar processMonsterHit
                        // if (!mesh.metadata) mesh.metadata = {};
                        // if (currentMesh.metadata?.monsterInstance) {
                        //     mesh.metadata.monsterInstance = currentMesh.metadata.monsterInstance;
                        // }
                        return true;
                    }
                    currentMesh = currentMesh.parent;
                }
                return false;
            };

            // Busca por múltiplos hits de monstros dentro do alcance limitado
            // multiPickWithRay retorna os hits ordenados por distância (mais próximo primeiro)
            const monsterHits = this.scene.multiPickWithRay(limitedRay, monsterPartPredicate);

            // Pega o hit de monstro mais próximo
            if (monsterHits && monsterHits.length > 0) {
                closestMonsterHit = monsterHits[0];
            }
        }

        // --- Processamento do Hit ---
        let hitProcessed = false;
        if (closestMonsterHit && closestMonsterHit.pickedMesh) {
            // Prioridade: Acertou uma parte de monstro válida dentro do alcance
            this.processMonsterHit(closestMonsterHit, equippedGun);
            hitProcessed = true;
        } else if (DEBUG_MODE && firstHit && firstHit.pickedMesh) {
            // Se não acertou monstro, mas acertou *algo* (e estamos em debug), loga o obstáculo
            console.log(`Hitscan hit non-monster object: '${firstHit.pickedMesh.name}' at distance ${firstHit.distance.toFixed(3)}`);
        }

        // --- Efeitos do Tiro ---
        // Chama o método shoot da arma independentemente de ter acertado algo ou não
        // (consome munição, toca som, animação da arma, etc.)
        const shotFired = equippedGun.shoot();

        // Log de feedback (opcional, pode ser removido para menos spam)
        if (!shotFired && !hitProcessed) { // Loga falha apenas se não houve hit e o tiro falhou (sem munição/recarregando)
             console.log("Disparo falhou (sem munição ou recarregando).");
        } else if (shotFired && !hitProcessed && !DEBUG_MODE) {
             // console.log("Missed!"); // Log de erro apenas se não estiver em debug
        }
    }
    
    // Método auxiliar para processamento de hits em monstros
    processMonsterHit(hit, equippedGun) {
        console.log("Hit monster part:", hit.pickedMesh.name, "at distance", hit.distance.toFixed(3));

        // Busca otimizada pelo monstro - Tenta obter do metadata primeiro
        // (Assume que a instância do monstro foi adicionada ao metadata do mesh raiz ou partes importantes)
        let hitMonster = hit.pickedMesh.metadata?.monsterInstance;
        let searchMesh = hit.pickedMesh;

        // Se não encontrou no metadata do mesh atingido, sobe na hierarquia procurando
        while (!hitMonster && searchMesh.parent) {
            searchMesh = searchMesh.parent;
            hitMonster = searchMesh.metadata?.monsterInstance;
        }

        // Fallback: Busca manual na lista de monstros se metadata não estiver disponível/configurado
        if (!hitMonster) {
            console.warn("Metadata lookup failed, falling back to list search for monster.");
            const monstersList = this.scene.gameInstance?.getMonsters() || [];
            for (const monster of monstersList) {
                const monsterMeshRoot = monster.getMesh(); // Assume que getMesh() retorna o root/collider principal
                if (!monsterMeshRoot) continue;

                // Verifica se o mesh atingido é o mesh principal ou um descendente
                if (hit.pickedMesh === monsterMeshRoot || hit.pickedMesh.isDescendantOf(monsterMeshRoot)) {
                    hitMonster = monster;
                    // Opcional: Armazenar referência no metadata para futuras buscas mais rápidas
                    // if (!hit.pickedMesh.metadata) hit.pickedMesh.metadata = {};
                    // hit.pickedMesh.metadata.monsterInstance = monster;
                    break;
                }
            }
        }


        if (hitMonster) {
            const monsterController = hitMonster.getController();
            if (monsterController && !monsterController.isDisposed) {
                const baseDamage = equippedGun.model.getDamage();

                // Calcula multiplicador de dano baseado na parte atingida
                let damageMultiplier = 1.0;
                const hitName = hit.pickedMesh.name.toLowerCase(); // Normaliza para minúsculas

                // Simplifica a verificação de headshot
                if (hitName.includes("head") || hitName.includes("eye")) {
                    damageMultiplier = 2.0; // Dano crítico para cabeça/olho
                    console.log("CRITICAL HIT! Headshot x2 damage");
                }
                // Poderia adicionar outras partes aqui (e.g., pernas = 0.5x)
                // else if (hitName.includes("leg") || hitName.includes("arm")) {
                //    damageMultiplier = 0.75; // Dano reduzido para membros
                //    console.log("Limb shot! 0.75x damage");
                // }

                const finalDamage = Math.round(baseDamage * damageMultiplier);
                console.log(`Applying ${finalDamage} damage to monster.`);

                // Aplica dano e stun
                monsterController.takeDamage(finalDamage);
                monsterController.stun(2000); // Stun de 2 segundos (pode ser configurável)

                // Cria efeito visual no ponto de impacto
                this.createHitEffect(hit.pickedPoint);
            } else {
                 console.warn(`Found monster instance for ${hit.pickedMesh.name} but its controller is disposed or missing.`);
            }
        } else {
            // Isso pode acontecer se o predicate identificar uma parte de monstro, mas a lógica de busca falhar
            console.error(`Hit mesh '${hit.pickedMesh.name}' identified as monster part, but failed to associate it with a Monster instance.`);
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