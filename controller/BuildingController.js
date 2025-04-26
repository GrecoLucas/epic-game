class BuildingController {
    // Update constructor signature
    constructor(scene, camera, collisionSystem, mazeView, mazeModel) {
        this.scene = scene;
        this.camera = camera; // Should be valid now
        this.collisionSystem = collisionSystem;
        this.mazeView = mazeView;
        this.mazeModel = mazeModel; // Store the model

        this.isEnabled = false;
        this.selectedItem = 'wall';
        this.buildPreviewMesh = null;
        // Reduzir a distância máxima de construção para ficar mais próximo e intuitivo
        this.placementDistance = 5; // Reduzido de 10 para 5
        
        // Access cellSize from the model
        this.cellSize = this.mazeModel.cellSize;
        // Access wallHeight via mazeView (assuming it's set correctly there)
        this.wallHeight = this.mazeView.wallMaterial?.wallHeight || 4; // Use default if needed

        // Sistema de materiais disponíveis
        this.availableMaterials = {
            wall: 0,
            ramp: 0
        };

        this.previewMaterialValid = null;
        this.previewMaterialInvalid = null;
        this._createPreviewMaterials();

        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        this.currentPlacementRotation = 0;
        // Adicionar direção da rampa (east ou south)
        this.rampDirection = 'east'; // Padrão: east

        // Interface do modo de construção
        this.buildModeUI = null;
        this._createBuildModeUI();

        // Add a check for camera validity during initialization
        if (!this.camera) {
            console.error("BuildingController initialized with an invalid camera!");
        } else {
            console.log("BuildingController initialized successfully.");
        }
    }

    // Criar a interface do modo de construção
    _createBuildModeUI() {
        // Criar uma UI fullscreen para mostrar informações do modo de construção
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("buildModeUI");
        
        // Criar um painel para a parte inferior da tela
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = "400px";
        panel.height = "150px"; // Aumentei a altura para acomodar melhor os elementos
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        panel.paddingBottom = "20px";
        panel.isVisible = false; // Inicialmente invisível
        advancedTexture.addControl(panel);
        
        // Fundo do painel (retângulo semi-transparente)
        const background = new BABYLON.GUI.Rectangle();
        background.width = "400px";
        background.height = "120px"; // Aumentei a altura do fundo
        background.cornerRadius = 10;
        background.color = "white";
        background.thickness = 2;
        background.background = "black";
        background.alpha = 0.7;
        panel.addControl(background);
        
        // Criando um container para organizar os elementos verticalmente
        const contentContainer = new BABYLON.GUI.StackPanel();
        contentContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        contentContainer.paddingTop = "10px"; // Espaçamento do topo
        background.addControl(contentContainer);
        
        // Texto de título (Modo Construção)
        const titleText = new BABYLON.GUI.TextBlock();
        titleText.text = "MODO CONSTRUÇÃO";
        titleText.color = "white";
        titleText.fontSize = 20;
        titleText.height = "30px";
        contentContainer.addControl(titleText);
        
        // Painel de informações de materiais
        const materialsPanel = new BABYLON.GUI.StackPanel();
        materialsPanel.isVertical = false;
        materialsPanel.height = "40px";
        materialsPanel.paddingTop = "10px"; // Espaçamento após o título
        contentContainer.addControl(materialsPanel);
        
        // Texto para blocos
        const wallText = new BABYLON.GUI.TextBlock();
        wallText.text = "Blocos: 0";
        wallText.color = "white";
        wallText.fontSize = 16;
        wallText.width = "150px";
        wallText.paddingLeft = "30px";
        wallText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        materialsPanel.addControl(wallText);
        
        // Texto para rampas
        const rampText = new BABYLON.GUI.TextBlock();
        rampText.text = "Rampas: 0";
        rampText.color = "white";
        rampText.fontSize = 16;
        rampText.width = "150px";
        rampText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        materialsPanel.addControl(rampText);
        
        // Dicas de controle (na parte inferior)
        const controlsText = new BABYLON.GUI.TextBlock();
        controlsText.text = "1: Bloco | 2: Rampa | B: Alternar | Botão Direito: Rotacionar";
        controlsText.color = "yellow";
        controlsText.fontSize = 12;
        controlsText.height = "30px";
        controlsText.paddingTop = "15px"; // Espaçamento antes das instruções
        contentContainer.addControl(controlsText);
        
        // Armazenar referências para atualização
        this.buildModeUI = {
            panel: panel,
            wallText: wallText,
            rampText: rampText
        };
    }
    
    // Adicionar materiais ao inventário do jogador
    addMaterials(wallCount, rampCount) {
        this.availableMaterials.wall += wallCount;
        this.availableMaterials.ramp += rampCount;
        this._updateBuildModeUI();
    }
    
    // Atualizar a UI do modo de construção
    _updateBuildModeUI() {
        if (!this.buildModeUI) return;
        
        // Atualizar textos com contagens atuais
        this.buildModeUI.wallText.text = `Blocos: ${this.availableMaterials.wall}`;
        this.buildModeUI.rampText.text = `Rampas: ${this.availableMaterials.ramp}`;
        
        // Atualizar visibilidade da UI
        this.buildModeUI.panel.isVisible = this.isEnabled;
    }

    _createPreviewMaterials() {
        this.previewMaterialValid = new BABYLON.StandardMaterial("previewMatValid", this.scene);
        this.previewMaterialValid.diffuseColor = new BABYLON.Color3(0, 1, 0); // Verde
        this.previewMaterialValid.alpha = 0.5;

        this.previewMaterialInvalid = new BABYLON.StandardMaterial("previewMatInvalid", this.scene);
        this.previewMaterialInvalid.diffuseColor = new BABYLON.Color3(1, 0, 0); // Vermelho
        this.previewMaterialInvalid.alpha = 0.5;
    }

    enable() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        console.log("Build Mode Enabled. Selected:", this.selectedItem);
        // Adicionar lógica de UI se necessário
        this._updateBuildModeUI();
    }

    disable() {
        if (!this.isEnabled) return;
        this.isEnabled = false;
        if (this.buildPreviewMesh) {
            this.buildPreviewMesh.dispose();
            this.buildPreviewMesh = null;
        }
        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        console.log("Build Mode Disabled.");
        // Adicionar lógica de UI se necessário
        this._updateBuildModeUI();
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    setSelectedItem(itemType) {
        if (!this.isEnabled || !['wall', 'ramp'].includes(itemType)) return;
        if (this.selectedItem !== itemType) {
            this.selectedItem = itemType;
            console.log("Selected build item:", this.selectedItem);
            // Forçar recriação do preview no próximo update
            if (this.buildPreviewMesh) {
                this.buildPreviewMesh.dispose();
                this.buildPreviewMesh = null;
            }
        }
    }

    // Chamado a cada frame quando o modo de construção está ativo
    update() {
        if (!this.isEnabled || !this.camera) return;

        const placementInfo = this._getPlacementPosition();
        
        if (placementInfo) {
            this.currentPlacementPosition = placementInfo.position;
            this.currentPlacementValid = this._isValidPlacement(this.currentPlacementPosition);
            this._updatePreviewMesh(placementInfo.position, this.currentPlacementValid);
        } else if (this.buildPreviewMesh) {
            this.buildPreviewMesh.setEnabled(false);
            this.currentPlacementValid = false;
            this.currentPlacementPosition = null;
        }
    }

    // Tenta colocar o item selecionado na posição atual do preview
    placeItem() {
        if (!this.isEnabled || !this.currentPlacementValid || !this.currentPlacementPosition) {
            console.log("Cannot place item: Invalid position or not in build mode.");
            return false;
        }
        
        // Verificar se o jogador tem materiais suficientes
        if (this.selectedItem === 'wall' && this.availableMaterials.wall <= 0) {
            console.log("Sem blocos disponíveis!");
            // Mostrar notificação de erro para o jogador
            this._showNotification("Sem blocos disponíveis!", "red");
            return false;
        }
        
        if (this.selectedItem === 'ramp' && this.availableMaterials.ramp <= 0) {
            console.log("Sem rampas disponíveis!");
            // Mostrar notificação de erro para o jogador
            this._showNotification("Sem rampas disponíveis!", "red");
            return false;
        }
        
        console.log(`Attempting to place ${this.selectedItem} at ${this.currentPlacementPosition}`);
        let newMesh = null;
        
        // Definir valores de saúde inicial
        const wallInitialHealth = 100;
        const rampInitialHealth = 150;
    
        if (this.selectedItem === 'wall') {
            // Passar o cellSize e saúde inicial para garantir que o tamanho seja consistente
            newMesh = this.mazeView.createPlayerWall(
                this.currentPlacementPosition, 
                this.cellSize,
                wallInitialHealth
            );
        } else if (this.selectedItem === 'ramp') {
            // Passar o cellSize, rotação, direção da rampa e saúde inicial
            newMesh = this.mazeView.createPlayerRamp(
                this.currentPlacementPosition, 
                this.currentPlacementRotation, 
                this.cellSize, 
                this.rampDirection,
                rampInitialHealth
            );
        }
    
        if (newMesh) {
            // Adicionar ao sistema de colisão
            this.collisionSystem.addMesh(newMesh);
    
            // Consumir o material do inventário
            if (this.selectedItem === 'wall') {
                this.availableMaterials.wall--;
            } else if (this.selectedItem === 'ramp') {
                this.availableMaterials.ramp--;
            }
    
            // Atualizar a UI
            this._updateBuildModeUI();
    
            // Mostrar notificação de sucesso
            this._showNotification(`${this.selectedItem === 'wall' ? 'Bloco' : 'Rampa'} construído com sucesso!`, "green");
    
            return true;
        } else {
            console.error("Failed to create build item mesh.");
            return false;
        }
    }
    
    // Mostrar notificação temporária
    _showNotification(message, color = "white") {
        // Criar uma notificação na tela
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("buildNotificationUI", true);
        
        // Criar um retângulo para o fundo
        const rect = new BABYLON.GUI.Rectangle();
        rect.width = "300px";
        rect.height = "50px";
        rect.cornerRadius = 10;
        rect.color = "white";
        rect.thickness = 1;
        rect.background = color === "red" ? "darkred" : (color === "green" ? "darkgreen" : "black");
        rect.alpha = 0.8;
        rect.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        rect.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        rect.top = "100px";
        advancedTexture.addControl(rect);
        
        // Criar o texto da notificação
        const text = new BABYLON.GUI.TextBlock();
        text.text = message;
        text.color = "white";
        text.fontSize = 18;
        rect.addControl(text);
        
        // Animar a notificação (fade in/out)
        rect.alpha = 0;
        let alpha = 0;
        
        // Animação de fade in
        const fadeInInterval = setInterval(() => {
            alpha += 0.1;
            rect.alpha = alpha;
            
            if (alpha >= 0.8) {
                clearInterval(fadeInInterval);
                
                // Manter visível por um tempo
                setTimeout(() => {
                    // Animação de fade out
                    const fadeOutInterval = setInterval(() => {
                        alpha -= 0.1;
                        rect.alpha = alpha;
                        
                        if (alpha <= 0) {
                            clearInterval(fadeOutInterval);
                            advancedTexture.dispose();
                        }
                    }, 50);
                }, 2000);
            }
        }, 50);
    }

    // Calcula a posição na grade baseada no raycast a partir do centro da tela (crosshair)
    _getPlacementPosition() {
        // Verificar se a câmera é válida
        if (!this.camera) {
            console.error("Attempted to get placement position with invalid camera.");
            return null;
        }
        
        // Criar um ray a partir do centro da tela (onde está o crosshair)
        // Este método é melhor que getForwardRay pois usa exatamente o ponto onde o jogador está mirando
        const ray = this.scene.createPickingRay(
            this.scene.getEngine().getRenderWidth() / 2,  // Centro X da tela
            this.scene.getEngine().getRenderHeight() / 2, // Centro Y da tela
            BABYLON.Matrix.Identity(),
            this.camera
        );
        
        // Predicate para acertar apenas o chão ou outras construções
        const predicate = (mesh) => {
            return mesh.isPickable && 
                  !mesh.name.startsWith("preview_") && 
                  (mesh.name === "floor" || mesh.metadata?.isBuildableSurface);
        };
        
        const hit = this.scene.pickWithRay(ray, predicate);

        if (hit && hit.pickedPoint) {
            // --- Grid Snapping ---
            const gridX = Math.round(hit.pickedPoint.x / this.cellSize) * this.cellSize;
            const gridZ = Math.round(hit.pickedPoint.z / this.cellSize) * this.cellSize;

            // Ajustar Y baseado no item e na superfície atingida
            const hitMeshBB = hit.pickedMesh.getBoundingInfo().boundingBox;
            const groundY = hit.pickedMesh.name === "floor" ? 0 : hit.pickedMesh.position.y + hitMeshBB.extendSizeWorld.y;
            let buildY = groundY;
            
            // Ajustar a altura para ambos os tipos (bloco ou rampa)
            if (this.selectedItem === 'wall') {
                buildY += this.wallHeight / 2;
            }
            // Não mudamos a altura para a rampa, pois ela deve ficar na superfície

            const position = new BABYLON.Vector3(gridX, buildY, gridZ);
            return { position: position };
        } else {
            // Se não acertou nada, criar um ponto a uma distância fixa na direção do centro da tela
            const rayDirection = ray.direction.clone();
            const fixedDistance = 5; // Distância fixa mais próxima
            
            const rayOrigin = this.camera.position.clone();
            const rayTarget = rayOrigin.add(rayDirection.scale(fixedDistance));
            
            // Aplicar grid snapping na posição calculada
            const gridX = Math.round(rayTarget.x / this.cellSize) * this.cellSize;
            const gridZ = Math.round(rayTarget.z / this.cellSize) * this.cellSize;
            
            // Altura para o bloco flutuante
            let buildY = rayTarget.y;
            // Se for uma parede, ajustar para o centro vertical
            if (this.selectedItem === 'wall') {
                buildY = Math.max(0, Math.round(buildY - (this.wallHeight / 2)) + (this.wallHeight / 2));
            } else {
                // Para rampas, arredondar para a grade mais próxima, mas manter na superfície
                buildY = Math.max(0, Math.floor(buildY));
            }
            
            const position = new BABYLON.Vector3(gridX, buildY, gridZ);
            return { position: position };
        }
    }

    // Verifica se a posição é válida (ex: não colide com jogador, monstros, outras estruturas)
    _isValidPlacement(position) {
        if (!position) return false;

        // Adicionando verificação de sanidade (debugging)
        console.log(`Verificando posição: ${position.x}, ${position.y}, ${position.z}`);
        
        // Verificar colisões usando uma caixa de colisão temporária
        const testBox = BABYLON.MeshBuilder.CreateBox(
            "placementTestBox", 
            {
                width: this.cellSize * 0.95, // Ligeiramente menor para permitir colocação próxima
                height: this.selectedItem === 'wall' ? this.wallHeight * 0.95 : 0.2,
                depth: this.cellSize * 0.95
            },
            this.scene
        );
        testBox.position = position.clone();
        testBox.isVisible = false;
        testBox.isPickable = false;
        
        // Checar colisões manuais com todas as malhas relevantes
        const collisions = this.scene.meshes.filter(mesh => {
            // Ignorar o próprio testBox, o chão e previews
            if (mesh === testBox || 
                mesh.name === "floor" || 
                mesh.name.startsWith("preview_") || 
                !mesh.checkCollisions) {
                return false;
            }
            
            // Verificar se o objeto está na mesma posição
            const dx = Math.abs(mesh.position.x - position.x);
            const dz = Math.abs(mesh.position.z - position.z);
            
            // Ajustar limites baseado no tamanho da célula (permitir construção lado a lado)
            const xzThreshold = this.cellSize * 0.1; // 10% do tamanho da célula de tolerância
            
            // Para construção no mesmo X,Z mas em altura diferente (empilhamento)
            if (dx < xzThreshold && dz < xzThreshold) {
                // Tratamento especial para rampas: se estamos colocando uma rampa em cima de um bloco,
                // vamos permitir desde que o bloco esteja imediatamente abaixo
                if (this.selectedItem === 'ramp' && mesh.name.startsWith("playerWall_")) {
                    // Obter a altura do bloco abaixo
                    const meshHeight = mesh.getBoundingInfo().boundingBox.extendSizeWorld.y;
                    const meshTop = mesh.position.y + meshHeight;
                    
                    // Se a base da rampa está aproximadamente no topo do bloco, permitir a colocação
                    // Tolerância pequena para ajustar imprecisões numéricas
                    const isOnTop = Math.abs(position.y - meshTop) < 0.2;
                    
                    if (isOnTop) {
                        console.log("Rampa colocada sobre bloco, permitindo colocação");
                        return false; // Não é uma colisão, é um suporte válido
                    }
                }
                
                // Para outros casos, verificar sobreposição em Y normalmente
                const meshHeight = mesh.getBoundingInfo().boundingBox.extendSizeWorld.y;
                const testBoxHeight = testBox.getBoundingInfo().boundingBox.extendSizeWorld.y;
                
                const meshTop = mesh.position.y + meshHeight;
                const meshBottom = mesh.position.y - meshHeight;
                const testBoxTop = position.y + testBoxHeight;
                const testBoxBottom = position.y - testBoxHeight;
                
                // Se não há sobreposição em Y, então não há colisão
                const overlapY = !(testBoxBottom >= meshTop || testBoxTop <= meshBottom);
                
                if (overlapY) {
                    console.log(`Colisão detectada com ${mesh.name} na mesma posição`);
                    return true;
                }
            }
            
            return false;
        });
        
        // Limpar o mesh de teste
        testBox.dispose();
        
        // Se houver colisões, não é válido
        if (collisions.length > 0) {
            return false;
        }
        
        // Verificar se há suporte abaixo (exceto para o chão)
        if (position.y > this.wallHeight / 4) { // Se não está praticamente no chão
            const rayStart = position.clone();
            rayStart.y -= (this.selectedItem === 'wall' ? this.wallHeight / 2 : 0.1);
            
            const ray = new BABYLON.Ray(
                rayStart, 
                new BABYLON.Vector3(0, -1, 0), // Direção para baixo
                this.cellSize / 2 // Distância máxima do raio
            );
            
            const hit = this.scene.pickWithRay(ray, mesh => 
                mesh.name === "floor" || 
                (mesh.checkCollisions && 
                 !mesh.name.startsWith("preview_") && 
                 (mesh.name.startsWith("playerWall_") || 
                  mesh.name.startsWith("playerRamp_") || 
                  mesh.name.startsWith("wall_")))
            );
            
            if (!hit.pickedMesh) {
                console.log("Posição inválida: Sem suporte abaixo");
                return false;
            }
        }
        
        // Se passou por todas as verificações, é válido
        return true;
    }

    // Cria ou atualiza o mesh de pré-visualização
    _updatePreviewMesh(position, isValid) {
        const previewName = `preview_${this.selectedItem}`;
        const rampDir = this.rampDirection || 'east'; // Usar a direção atual da rampa

        // Recriar se o tipo de item mudou ou não existe
        if (!this.buildPreviewMesh || this.buildPreviewMesh.name !== `${previewName}_${rampDir}`) {
            if (this.buildPreviewMesh) this.buildPreviewMesh.dispose();

            if (this.selectedItem === 'wall') {
                this.buildPreviewMesh = BABYLON.MeshBuilder.CreateBox(`${previewName}_wall`, {
                    width: this.cellSize, height: this.wallHeight, depth: this.cellSize
                }, this.scene);
            } else { // ramp
                // Criar um preview mais detalhado baseado na direção da rampa
                if (rampDir === 'east') {
                    // Rampa East: Inclinação de oeste para leste (sobe no lado leste)
                    const eastRampMesh = this._createRampPreviewMesh('east');
                    this.buildPreviewMesh = eastRampMesh;
                } else if (rampDir === 'south') {
                    // Rampa South: Inclinação de norte para sul (sobe no lado sul)
                    const southRampMesh = this._createRampPreviewMesh('south');
                    this.buildPreviewMesh = southRampMesh;
                }
                
                // Aplicar rotação inicial (se houver)
                this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
            }
            
            this.buildPreviewMesh.isPickable = false;
            this.buildPreviewMesh.checkCollisions = false;
            // Adicionar texto 3D identificando o tipo de rampa
            this._addRampDirectionLabel();
        }

        // Atualizar posição e material
        this.buildPreviewMesh.position = position;
        this.buildPreviewMesh.material = isValid ? this.previewMaterialValid : this.previewMaterialInvalid;
        this.buildPreviewMesh.setEnabled(true);

        // Atualizar rótulo de direção se existir
        if (this._rampDirectionLabel) {
            this._rampDirectionLabel.position = new BABYLON.Vector3(
                position.x, 
                position.y + this.wallHeight / 2 + 0.5, // Posicionar acima da rampa
                position.z
            );
        }
    }

    // Método auxiliar para criar o preview mesh da rampa com a forma correta
    _createRampPreviewMesh(direction) {
        const previewName = `preview_ramp_${direction}`;
        const rampWidth = this.cellSize;
        const rampHeight = this.wallHeight / 2; // Metade da altura para o preview
        const rampDepth = this.cellSize;

        // Criar uma malha personalizada para o preview da rampa
        const positions = [];
        const indices = [];
        const normals = [];
        const colors = []; // Adicionar cores para melhor distinção visual

        if (direction === 'south') {
            // Rampa South (inclinação de norte para sul)
            positions.push(
                // Base (retângulo)
                -rampWidth/2, 0, -rampDepth/2,  // 0: frente esquerda
                rampWidth/2, 0, -rampDepth/2,   // 1: frente direita
                rampWidth/2, 0, rampDepth/2,    // 2: trás direita
                -rampWidth/2, 0, rampDepth/2,   // 3: trás esquerda
                
                // Topo (inclinado)
                -rampWidth/2, rampHeight, -rampDepth/2,  // 4: frente esquerda alto
                rampWidth/2, rampHeight, -rampDepth/2,   // 5: frente direita alto
                rampWidth/2, 0, rampDepth/2,            // 6: trás direita (base)
                -rampWidth/2, 0, rampDepth/2            // 7: trás esquerda (base)
            );
            
            // Indicadores visuais na parte frontal (texto "SOUTH")
            for (let i = 0; i < 8; i++) {
                // Azul para rampa sul
                colors.push(0.2, 0.2, 0.8, 0.7);
            }
        } else { // 'east'
            // Rampa East (inclinação de oeste para leste)
            positions.push(
                // Base (retângulo)
                -rampDepth/2, 0, -rampWidth/2,  // 0: frente esquerda
                rampDepth/2, 0, -rampWidth/2,   // 1: frente direita
                rampDepth/2, 0, rampWidth/2,    // 2: trás direita
                -rampDepth/2, 0, rampWidth/2,   // 3: trás esquerda
                
                // Topo (inclinado)
                -rampDepth/2, 0, -rampWidth/2,          // 4: frente esquerda (base)
                rampDepth/2, rampHeight, -rampWidth/2,  // 5: frente direita alto
                rampDepth/2, rampHeight, rampWidth/2,   // 6: trás direita alto
                -rampDepth/2, 0, rampWidth/2           // 7: trás esquerda (base)
            );
            
            // Indicadores visuais na parte lateral (texto "EAST")
            for (let i = 0; i < 8; i++) {
                // Verde para rampa leste
                colors.push(0.2, 0.8, 0.2, 0.7);
            }
        }
        
        // Índices comuns para ambas direções
        indices.push(
            // Base
            0, 2, 1, 0, 3, 2,
            // Frente
            0, 1, 5, 0, 5, 4,
            // Trás
            3, 6, 2, 3, 7, 6,
            // Esquerda
            0, 4, 7, 0, 7, 3,
            // Direita
            1, 2, 6, 1, 6, 5,
            // Topo
            4, 5, 6, 4, 6, 7
        );
        
        // Calcular normais para iluminação correta
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        
        // Criar malha personalizada
        const mesh = new BABYLON.Mesh(previewName, this.scene);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.colors = colors; // Adicionar cores à malha
        vertexData.applyToMesh(mesh);
        
        return mesh;
    }

    // Método para adicionar um rótulo 3D indicando a direção da rampa
    _addRampDirectionLabel() {
        if (this.selectedItem !== 'ramp') return;
        
        // Remover rótulo existente se houver
        if (this._rampDirectionLabel) {
            this._rampDirectionLabel.dispose();
        }
        
        // Texto descritivo baseado na direção
        const labelText = this.rampDirection === 'east' ? "EAST ➜" : "SOUTH ⬇";
        
        // Criar um plano com texto
        const labelPlane = BABYLON.MeshBuilder.CreatePlane("rampDirectionLabel", {
            width: 1.5, 
            height: 0.5
        }, this.scene);
        
        // Garantir que o rótulo sempre olhe para a câmera
        labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        // Criar textura dinâmica para o texto
        const labelTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(labelPlane);
        
        // Criar texto
        const text = new BABYLON.GUI.TextBlock();
        text.text = labelText;
        text.color = this.rampDirection === 'east' ? "lime" : "lightblue";
        text.fontSize = 24;
        text.outlineWidth = 2;
        text.outlineColor = "black";
        
        // Adicionar o texto à textura
        labelTexture.addControl(text);
        
        // Armazenar referência ao rótulo
        this._rampDirectionLabel = labelPlane;
        
        // Posicionar inicialmente (será atualizado em _updatePreviewMesh)
        labelPlane.position = new BABYLON.Vector3(0, this.wallHeight/2 + 0.5, 0);
        
        // Garantir que o rótulo não seja interativo
        labelPlane.isPickable = false;
    }

    // TODO: Adicionar métodos para rotacionar o item (ex: rotatePreview(angle))
    rotatePreview(clockwise = true) {
        if (!this.isEnabled || this.selectedItem !== 'ramp') return;

        // Rotacionar em incrementos de 90 graus
        const increment = Math.PI / 2;
        this.currentPlacementRotation += clockwise ? increment : -increment;
        
        // Normalizar rotação para ficar entre 0 e 2π
        this.currentPlacementRotation = (this.currentPlacementRotation + 2 * Math.PI) % (2 * Math.PI);

        // Atualizar visualização apenas se o preview estiver visível
        if (this.buildPreviewMesh?.isEnabled()) {
            this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
                
            // Re-validar posicionamento após a rotação
            if (this.currentPlacementPosition) {
                this.currentPlacementValid = this._isValidPlacement(this.currentPlacementPosition);
                this.buildPreviewMesh.material = this.currentPlacementValid ? 
                    this.previewMaterialValid : this.previewMaterialInvalid;
            }
        }
    }
}

export default BuildingController;