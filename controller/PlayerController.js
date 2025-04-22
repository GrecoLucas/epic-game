// Controller - Responsável pelo controle e input do player
class PlayerController {
    constructor(scene, playerModel, playerView) {
        this.scene = scene;
        this.model = playerModel;
        this.view = playerView;
        this.inputMap = {};
        this.nearbyButton = null; // Referência ao botão mais próximo
        this.interactionDistance = 5; // Distância máxima para interagir com botões
        this.interactionHint = null; // Elemento UI para mostrar dica de interação
        
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
    
    // Configurar detecção de proximidade com botões
    setupProximityDetection() {
        // Registrar função para verificar proximidade antes de cada frame
        this.scene.registerBeforeRender(() => {
            // Obter todos os botões na cena
            const buttonMeshes = this.scene.meshes.filter(mesh => mesh.name && mesh.name.includes("button"));
            
            // Resetar o botão mais próximo
            this.nearbyButton = null;
            
            // Verificar distância para cada botão
            if (buttonMeshes.length > 0) {
                const playerPosition = this.model.getPosition();
                
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
                
                // Mostrar ou esconder dica baseado na proximidade
                if (this.nearbyButton && this.interactionHint) {
                    this.interactionHint.alpha = 1;
                } else if (this.interactionHint) {
                    this.interactionHint.alpha = 0;
                }
            }
        });
    }
    
    setupMouseControls() {
        this.scene.onPointerDown = (evt) => {
            if (!this.scene.alreadyLocked) {
                this.scene.getCameraByName("playerCamera").attachControl(document.getElementById("renderCanvas"));
                this.lockCamera();
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
            
            // Realizar um raycast a partir da câmera
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
                    
                    // Verificar se é a tecla de interação (E) e se há um botão próximo
                    if (key === "e" && this.nearbyButton) {
                        this.activateNearbyButton();
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
}

export default PlayerController;