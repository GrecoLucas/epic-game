// Controller - Responsável pelo controle e lógica dos botões
class ButtonController {
    constructor(scene) {
        this.scene = scene;
        this.buttons = [];
        this.onAllButtonsPressed = null;
        this.pressedCount = 0;
        this.proximityRadius = 3; // Raio para detectar aproximação do jogador
        this.proximityTexts = {}; // Armazenar textos de proximidade para cada botão
        
        // Definição dos valores para custos dos botões
        this.medkitCost = 60; // Custo do MedKit (botão 2)
        this.ammoCost = 50;   // Custo da Munição (botão 3)
        this.barricadeCost = 70; // Custo da Barricada (botão 4)
    }
    
    // Adiciona um botão ao controlador
    addButton(model, view) {
        this.buttons.push({ model, view });
        
        // Inicializa o modelo e configura a interação na view
        model.initialize(this.scene);
        view.updateAppearance(model, this.scene);
        view.setupInteraction(model, this.scene, (buttonId) => this.handleButtonPress(buttonId));
        
        // Configurar detecção de proximidade para este botão
        this.setupProximityDetection(model, view);
    }
    
    // Limpa todos os botões existentes
    clearButtons() {
        // Remover todos os meshes dos botões da cena
        for (const button of this.buttons) {
            if (button.model.getMesh()) {
                button.model.getMesh().dispose();
            }
            
            // Limpar eventuais timeouts restantes
            if (button.model.resetTimeout) {
                clearTimeout(button.model.resetTimeout);
            }
        }
        
        // Limpar textos de proximidade
        for (const id in this.proximityTexts) {
            if (this.proximityTexts[id]) {
                this.proximityTexts[id].dispose();
            }
        }
        
        this.buttons = [];
        this.pressedCount = 0;
        this.proximityTexts = {};
    }
    
    // Trata o evento de pressionar um botão
    handleButtonPress(buttonId) {
        const button = this.buttons.find(btn => btn.model.getId() === buttonId);
        if (!button) return;
        
        // Manter track do estado atual de cada botão com um mapa
        if (!this.buttonTimers) {
            this.buttonTimers = new Map();
        }
        
        // Cancelar qualquer timer anterior para este botão
        if (this.buttonTimers.has(buttonId)) {
            clearTimeout(this.buttonTimers.get(buttonId));
            this.buttonTimers.delete(buttonId);
        }
        
        // Atualizar o estado do botão (agora sempre retorna true após nossa modificação)
        button.model.press();
        
        // Atualiza a aparência
        button.view.updateAppearance(button.model, this.scene);
        
        // Processar a funcionalidade específica do botão com base no ID
        this.processButtonAction(buttonId);
        
        // Configurar novo timer para este botão
        const timer = setTimeout(() => {
            // Atualizar a aparência novamente quando o botão voltar ao normal
            button.view.updateAppearance(button.model, this.scene);
            
            // Remover do mapa de timers
            this.buttonTimers.delete(buttonId);
            
            // Verificar se todos os botões estão ativos simultaneamente
            this.checkAllButtonsPressed();
        }, button.model.resetDelay);
        
        // Armazenar o timer para referência futura
        this.buttonTimers.set(buttonId, timer);
        
        // Verificar imediatamente se todos os botões estão pressionados
        this.checkAllButtonsPressed();
    }
    
    // Novo método para processar ações específicas de cada botão
    processButtonAction(buttonId) {
        // Obter o jogador (assumindo que está disponível na cena)
        const player = this.scene.gameInstance?.player;
        if (!player) return;
        
        switch (buttonId) {
            case 2: // MedKit - cura total com custo de 20$
                if (player.money >= this.medkitCost) {
                    // Verificar se o jogador precisa de cura
                    if (player.health < player.maxHealth) {
                        // Deduzir 20$ do dinheiro do jogador
                        player.money -= this.medkitCost;
                        player.updateMoneyDisplay();
                        
                        // Curar completamente o jogador
                        player.heal();
                        
                        // Efeito visual e sonoro de sucesso
                        this.showSuccessNotification("Curado!", "green");
                    } else {
                        // Jogador já está com vida cheia
                        this.showErrorNotification("Vida já está cheia!");
                    }
                } else {
                    // Jogador não tem dinheiro suficiente
                    this.showErrorNotification("Dinheiro insuficiente!");
                }
                break;
                
            case 3: // 50 Ammo - aumenta munição com custo de 40$
                // Verificar se o jogador possui arma equipada
                const equippedGun = player.controller.getPlayerEquippedGun();
                if (!equippedGun) {
                    this.showErrorNotification("Sem arma equipada!");
                    break;
                }
                
                // Verificar se o jogador tem dinheiro suficiente
                if (player.money >= this.ammoCost) {
                    // Deduzir 40$ do dinheiro do jogador
                    player.money -= this.ammoCost;
                    player.updateMoneyDisplay();
                    
                    // Adicionar 50 balas à munição total da arma
                    equippedGun.model.addAmmo(50);
                    
                    // Atualizar a exibição de munição
                    player.updateAmmoDisplay();
                    
                    // Efeito visual e sonoro de sucesso
                    this.showSuccessNotification("50 Munições adicionadas!", "blue");
                    
                } else {
                    // Jogador não tem dinheiro suficiente
                    this.showErrorNotification("Dinheiro insuficiente!");
                }
                break;
                
            case 4: // Barricade - cria barricada com custo de 60$
                // Verificar se o jogador tem dinheiro suficiente
                if (player.money >= this.barricadeCost) {
                    // Obter referência ao controlador de construção
                    const buildingController = player.controller.buildingController;
                    
                    if (!buildingController) {
                        this.showErrorNotification("Sistema de construção não disponível!");
                        break;
                    }
                    
                    // Deduzir 60$ do dinheiro do jogador
                    player.money -= this.barricadeCost;
                    player.updateMoneyDisplay();
                    
                    // Adicionar materiais ao inventário de construção (2 blocos e 1 rampa)
                    buildingController.addMaterials(2, 2);
                    
                    this.showSuccessNotification("Kit de Barricadas comprado!", "blue");
                    // Exibir mensagem de ajuda
                    setTimeout(() => {
                        this.showSuccessNotification("Pressione B para entrar no modo de construção", "yellow");
                    }, 2000);
                } else {
                    // Jogador não tem dinheiro suficiente
                    this.showErrorNotification("Dinheiro insuficiente!");
                }
                break;
        }
    }
    
    // Método para mostrar notificação de sucesso
    showSuccessNotification(message, color = "green") {
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("notificationUI", true);
        
        const notification = new BABYLON.GUI.Rectangle();
        notification.width = "300px";
        notification.height = "50px";
        notification.cornerRadius = 10;
        notification.color = "white";
        notification.thickness = 2;
        notification.background = color;
        notification.alpha = 0.8;
        notification.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        notification.top = "150px";
        advancedTexture.addControl(notification);
        
        const text = new BABYLON.GUI.TextBlock();
        text.text = message;
        text.color = "white";
        text.fontSize = 24;
        text.fontWeight = "bold";
        notification.addControl(text);
        
        // Animar a notificação
        notification.alpha = 0;
        
        // Animação de fade-in
        const fadeIn = () => {
            let alpha = 0;
            const interval = setInterval(() => {
                alpha += 0.1;
                notification.alpha = alpha;
                if (alpha >= 0.8) {
                    clearInterval(interval);
                    setTimeout(() => fadeOut(), 1000); // Manter visível por 1 segundo
                }
            }, 50);
        };
        
        // Animação de fade-out
        const fadeOut = () => {
            let alpha = 0.8;
            const interval = setInterval(() => {
                alpha -= 0.1;
                notification.alpha = alpha;
                if (alpha <= 0) {
                    clearInterval(interval);
                    advancedTexture.dispose(); // Remover da UI
                }
            }, 50);
        };
        
        fadeIn();
    }
    
    // Método para mostrar notificação de erro
    showErrorNotification(message) {
        this.showSuccessNotification(message, "red");
    }
    
    
    // Novo método para verificar se todos os botões estão pressionados simultaneamente
    checkAllButtonsPressed() {
        // Contar quantos botões estão atualmente pressionados
        const pressedButtons = this.buttons.filter(btn => btn.model.isPressed());
        
        // Se todos os botões estiverem pressionados ao mesmo tempo, ativar o callback
        if (pressedButtons.length === this.buttons.length && this.onAllButtonsPressed) {
            this.onAllButtonsPressed();
        }
    }
    
    // Novo método para configurar detecção de proximidade
    setupProximityDetection(model, view) {
        const buttonMesh = model.getMesh();
        if (!buttonMesh) return;
        
        // Registrar uma função que será executada antes de cada renderização
        this.scene.registerBeforeRender(() => {
            // Obter o jogador (assumindo que está disponível na cena)
            const player = this.scene.gameInstance?.player;
            if (!player) return;
            
            const playerPosition = player.getPosition();
            if (!playerPosition) return;
            
            // Verificar distância entre jogador e botão
            const distance = BABYLON.Vector3.Distance(playerPosition, buttonMesh.position);
            
            // Se o jogador está dentro do raio de proximidade
            if (distance <= this.proximityRadius) {
                // Mostrar texto informativo se ainda não estiver visível
                this.showProximityText(model);
            } else {
                // Esconder texto se o jogador se afastar
                this.hideProximityText(model.getId());
            }
        });
    }
    
    // Método para mostrar texto quando jogador está próximo
    showProximityText(model) {
        const buttonId = model.getId();
        
        // Se já existe um texto para este botão, não criar novo
        if (this.proximityTexts[buttonId]) return;
        
        // Criar um texto 3D acima do botão
        const buttonPosition = model.getMesh().position.clone();
        buttonPosition.y += 0.5; // Posicionar um pouco acima do botão
        
        // Criar painel GUI para texto 3D
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("buttonProximityUI_" + buttonId);
        const rect = new BABYLON.GUI.Rectangle();
        rect.width = "150px";
        rect.height = "40px";
        rect.cornerRadius = 10;
        rect.color = "white";
        rect.thickness = 1;
        rect.background = "black";
        rect.alpha = 0.7;
                
        // Criar texto
        const text = new BABYLON.GUI.TextBlock();
        text.text = model.getInfoText();
        text.color = "white";
        text.fontSize = 14;
        rect.addControl(text);
        
        // Posicionar o texto no espaço 3D - ele vai seguir o botão
        const mesh = model.getMesh();
        
        // Criar um gerenciador de posição para o texto seguir o botão
        const plane = BABYLON.MeshBuilder.CreatePlane("infoPlane_" + buttonId, {width: 1, height: 0.5}, this.scene);
        plane.position = new BABYLON.Vector3(
            mesh.position.x,
            mesh.position.y + 0.6, // Acima do botão
            mesh.position.z
        );
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // Sempre olha para o jogador
        plane.isPickable = false; // Não bloqueia cliques
        
        // Conectar o GUI ao plano
        const planeMaterial = new BABYLON.StandardMaterial("infoMat_" + buttonId, this.scene);
        planeMaterial.disableLighting = true;
        plane.material = planeMaterial;
        
        // Criar textura dinâmica anexada ao plano
        const dynamicTexture = new BABYLON.DynamicTexture("infoTexture_" + buttonId, {width: 256, height: 128}, this.scene);
        planeMaterial.diffuseTexture = dynamicTexture;
        planeMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        planeMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        planeMaterial.backFaceCulling = false;
        
        // Limpar o fundo e definir para transparente
        dynamicTexture.hasAlpha = true;
        const context = dynamicTexture.getContext();
        context.clearRect(0, 0, 256, 128);
        
        // Desenhar o texto
        dynamicTexture.drawText(model.getInfoText(), null, 64, "bold 24px Arial", "white", "transparent");
        
        // Guardar referência para poder remover depois
        this.proximityTexts[buttonId] = plane;
    }
    
    // Método para esconder o texto de proximidade
    hideProximityText(buttonId) {
        if (this.proximityTexts[buttonId]) {
            this.proximityTexts[buttonId].dispose();
            delete this.proximityTexts[buttonId];
        }
    }
    
    // Define o callback para quando todos os botões forem pressionados
    setOnAllButtonsPressed(callback) {
        this.onAllButtonsPressed = callback;
    }
    
    // Retorna todos os meshes dos botões
    getMeshes() {
        return this.buttons.map(button => button.model.getMesh());
    }
    
    // Reseta todos os botões
    resetAllButtons() {
        this.pressedCount = 0;
        this.buttons.forEach(button => {
            button.model.reset();
            button.view.updateAppearance(button.model, this.scene);
        });
    }
}

export default ButtonController;