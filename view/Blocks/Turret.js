// Turret.js - Responsible for turret visualization and rendering
import TurretModel from '../../model/TurretModel.js';

class Turret {
    constructor(scene, materials) {
        this.scene = scene;
        this.wallMaterial = materials?.wallMaterial;
        this.activeEffects = new Map(); // Para guardar efeitos como muzzle flash, etc.
        this.turrets = [];
        
        // Criar modelo de torreta para acessar as configurações centralizadas
        this.turretModel = new TurretModel();
    }

    createPlayerTurret(position, cellSize, rotation = 0, initialHealth = 150) {
        // Use cellSize if provided, otherwise use default
        const baseWidth = cellSize * 0.8 || 3.2;
        const baseHeight = 0.5; // Base baixa
        const baseDepth = cellSize * 0.8 || 3.2;
        
        // Create turret components as a hierarchical structure
        const turretRoot = new BABYLON.TransformNode(`playerTurretRoot_${Date.now()}`, this.scene);
        turretRoot.position = position.clone();
        turretRoot.rotation.y = rotation;
        
        // 1. Base/plataforma (box)
        const base = BABYLON.MeshBuilder.CreateBox(`playerTurret_${Date.now()}`, {
            width: baseWidth,
            height: baseHeight,
            depth: baseDepth
        }, this.scene);
        
        base.parent = turretRoot;
        base.position.y = -baseHeight/2; // Ajustar para alinhar o topo com o chão
        base.checkCollisions = true;
        base.isPickable = true;
        
        // Aplicar material base
        base.material = this.wallMaterial ? 
            this.wallMaterial.clone(`turretBaseMat_${base.uniqueId}`) : 
            new BABYLON.StandardMaterial(`turretBaseMat_${base.uniqueId}`, this.scene);
        
        // Customizar para dar aparência de torreta (cor mais escura que parede normal)
        if (base.material) {
            base.material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            base.material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        }
        
        // 2. Torre giratória (cilindro)
        const turretBody = BABYLON.MeshBuilder.CreateCylinder(`turretBody_${Date.now()}`, {
            height: cellSize * 0.4,
            diameter: cellSize * 0.6,
            tessellation: 16
        }, this.scene);
        
        turretBody.parent = turretRoot;
        turretBody.position.y = baseHeight/2;
        turretBody.checkCollisions = true;
        
        // Material para o corpo
        const bodyMaterial = new BABYLON.StandardMaterial(`turretBodyMat_${turretBody.uniqueId}`, this.scene);
        bodyMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        bodyMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        turretBody.material = bodyMaterial;
        
        // 3. Cano da arma (cilindro)
        const gunBarrel = BABYLON.MeshBuilder.CreateCylinder(`turretBarrel_${Date.now()}`, {
            height: cellSize * 0.8,
            diameter: cellSize * 0.15,
            tessellation: 12
        }, this.scene);
        
        gunBarrel.parent = turretBody;
        gunBarrel.rotation.x = Math.PI / 2; // Rotacionar para horizontal
        gunBarrel.position.z = cellSize * 0.4; // Estender para frente
        gunBarrel.position.y = cellSize * 0.1; // Pequeno offset para cima
        
        // Material para o cano
        const barrelMaterial = new BABYLON.StandardMaterial(`turretBarrelMat_${gunBarrel.uniqueId}`, this.scene);
        barrelMaterial.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
        barrelMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        gunBarrel.material = barrelMaterial;
        
        // 4. Ponto de disparo (invisível, mas usado para efeitos)
        const muzzlePoint = BABYLON.MeshBuilder.CreateSphere(`turretMuzzle_${Date.now()}`, {
            diameter: 0.1
        }, this.scene);
        muzzlePoint.parent = gunBarrel;
        muzzlePoint.position.y = 0;
        muzzlePoint.position.z = gunBarrel.scaling.y; // Posicionar na ponta do cano
        muzzlePoint.isVisible = false;
        
        // 5. Criar indicador de munição        
        // Criar um modelo individual para esta torreta
        const turretModelInstance = new TurretModel();
        turretModelInstance.health = initialHealth;
        turretModelInstance.initialHealth = initialHealth;
        const ammoIndicator = this.createAmmoIndicator(turretRoot, cellSize, turretModelInstance);
        // Adicionar metadados para identificação e comportamento
        base.metadata = {
            isTurret: true,
            isPlayerBuilt: true,
            initialHealth: initialHealth,
            health: initialHealth,
            isBuildableSurface: true,  // Pode construir em cima
            supportingBlock: null,      // Bloco abaixo (suporte)
            dependentBlocks: [],        // Blocos acima (dependentes)
            components: {              // Referências para os componentes da torreta
                root: turretRoot,
                base: base,
                body: turretBody,
                barrel: gunBarrel,
                muzzle: muzzlePoint,
                ammoIndicator: ammoIndicator  // Adicionar referência ao indicador de munição
            },
            // Armazenar modelo desta torreta específica
            turretModel: turretModelInstance
        };
        
        // Raycast para verificar se tem suporte abaixo
        const ray = new BABYLON.Ray(
            position.clone().add(new BABYLON.Vector3(0, -baseHeight/2, 0)),
            new BABYLON.Vector3(0, -1, 0),
            0.2 // Pequena distância
        );
        
        const hit = this.scene.pickWithRay(ray, mesh => 
            mesh.isPickable && 
            (mesh.name.startsWith("playerWall_") || 
             mesh.name.startsWith("playerRamp_") || 
             mesh.name.startsWith("playerBarricade_"))
        );
        
        // Registrar dependências
        if (hit && hit.pickedMesh) {
            // Registrar o bloco abaixo como suporte
            base.metadata.supportingBlock = hit.pickedMesh.name;
            
            // E este bloco como dependente do bloco abaixo
            if (hit.pickedMesh.metadata && Array.isArray(hit.pickedMesh.metadata.dependentBlocks)) {
                hit.pickedMesh.metadata.dependentBlocks.push(base.name);
                console.log(`${base.name} is supported by ${hit.pickedMesh.name}`);
            }
        }
        
        // Adicionar física se necessário
        if (this.scene.getPhysicsEngine()?.getPhysicsPlugin()) {
            base.physicsImpostor = new BABYLON.PhysicsImpostor(base, BABYLON.PhysicsImpostor.BoxImpostor, 
                            { mass: 0, restitution: 0.1 }, this.scene);
        } else {
            console.warn("Physics not enabled, skipping impostor for turret");
        }
        
        // Adicionar a lista de torretas rastreadas
        this.turrets.push({
            mesh: base,
            components: base.metadata.components,
            lastTargetUpdate: 0,
            currentTarget: null,
            lastShootTime: 0,
            model: turretModelInstance // Referência para o modelo desta torreta
        });
        
        console.log(`Created player turret at ${position} with health ${initialHealth}`);
        return base;
    }


    // Método para criar o indicador de munição
    createAmmoIndicator(parentNode, cellSize, turretModel) {
        // Criar um plano dinâmico acima da torreta, mas transparente
        const plane = BABYLON.MeshBuilder.CreatePlane(`ammoIndicator_${Date.now()}`, {
            width: cellSize * 0.7,
            height: cellSize * 0.25
        }, this.scene);
        
        // Posicionar acima da torreta
        plane.parent = parentNode;
        plane.position.y = cellSize * 0.5; // Ajuste esta altura conforme necessário
        plane.position.x = -0.25; 
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y; // Sempre olha para a câmera (eixo Y)
        
        // Criar material dinâmico completamente transparente (sem fundo preto)
        const dynamicTexture = new BABYLON.DynamicTexture(`ammoTexture_${Date.now()}`, 
            {width: 256, height: 64}, this.scene, true);
        const material = new BABYLON.StandardMaterial(`ammoMaterial_${Date.now()}`, this.scene);
        
        // Configurações para remover o fundo e só mostrar o texto
        material.diffuseTexture = dynamicTexture;
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.emissiveColor = new BABYLON.Color3(1, 1, 1); // Fazer o texto brilhar
        material.opacityTexture = dynamicTexture; // Usar a mesma textura para transparência
        material.useAlphaFromDiffuseTexture = true;
        material.diffuseTexture.hasAlpha = true;
        material.backFaceCulling = false;
        material.alpha = 1.0;
        
        plane.material = material;
        
        // Atualizar texto de munição
        this.updateAmmoText(dynamicTexture, turretModel);
        
        // Retornar objeto com referências necessárias para atualização
        return {
            mesh: plane,
            texture: dynamicTexture,
            turretModel: turretModel,
            update: () => this.updateAmmoText(dynamicTexture, turretModel)
        };
    }

    // Método para atualizar o texto de munição
    updateAmmoText(dynamicTexture, turretModel) {
        // Limpar a textura completamente (garantir que não há fundo)
        dynamicTexture.clear();
        
        // Deixar a área ao redor do texto transparente
        const ctx = dynamicTexture.getContext();
        ctx.clearRect(0, 0, dynamicTexture.getSize().width, dynamicTexture.getSize().height);
        
        // Se tiver munição infinita, mostrar símbolo de infinito
        if (turretModel.unlimitedAmmo) {
            // Desenhar símbolo de infinito com sombra para melhor visibilidade
            dynamicTexture.drawText("∞", 128, 32, "bold 42px Arial", "white", null, true, true);
        } else {
            // Caso contrário, mostrar quantidade atual/máxima com sombra para melhor visibilidade
            const ammoText = `${turretModel.ammo}`;
            
            // Adicionar sombra para fazer o texto se destacar sem fundo
            ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
            ctx.shadowBlur = 7;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            // Desenhar o número centralizado com fonte maior e mais visível
            dynamicTexture.drawText(ammoText, 128, 34, "bold 36px Arial", "white", null, true, true);
            
            // Resetar sombra após desenho
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }
    
    destroyTurretVisual(turretName, position, onDestroy, destroyDependentBlock) {
        const turretMesh = this.scene.getMeshByName(turretName);

        if (turretMesh) {
            if (turretMesh.metadata && turretMesh.metadata.isBeingDestroyed) {
                return true; // Já está sendo destruído, evitar loop recursivo
            }
            
            if (turretMesh.metadata) {
                turretMesh.metadata.isBeingDestroyed = true;
            }
            
            // Verificar se há blocos dependentes que precisam ser destruídos primeiro
            if (turretMesh.metadata && turretMesh.metadata.dependentBlocks && turretMesh.metadata.dependentBlocks.length > 0) {
                console.log(`${turretName} has ${turretMesh.metadata.dependentBlocks.length} dependent blocks that will be destroyed in cascade`);
                
                // Criar uma cópia da lista de dependentes para evitar problemas durante iteração
                const dependentBlocks = [...turretMesh.metadata.dependentBlocks];
                
                // Destruir cada bloco dependente
                for (const dependentBlockName of dependentBlocks) {
                    const dependentMesh = this.scene.getMeshByName(dependentBlockName);
                    if (dependentMesh) {
                        // Determinar o tipo de estrutura para chamar o método correto
                        if (dependentBlockName.startsWith("playerWall_")) {
                            destroyDependentBlock(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerRamp_")) {
                            destroyDependentBlock(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerBarricade_")) {
                            this.destroyBarricadeVisual(dependentBlockName, dependentMesh.position, onDestroy, destroyDependentBlock);
                        } else if (dependentBlockName.startsWith("playerTurret_")) {
                            this.destroyTurretVisual(dependentBlockName, dependentMesh.position, onDestroy, destroyDependentBlock);
                        }
                    }
                }
            }
            
            // Criar efeito de destruição
            if (onDestroy && position) {
                onDestroy(position);
            }
            if (components.ammoIndicator && components.ammoIndicator.mesh && !components.ammoIndicator.mesh.isDisposed()) {
                components.ammoIndicator.mesh.dispose();
            }
            
            // Encontrar a entrada da torreta na lista de torretas rastreadas
            const turretIndex = this.turrets.findIndex(t => t.mesh && t.mesh.name === turretName);
            
            if (turretIndex !== -1) {
                const turretData = this.turrets[turretIndex];
                
                // Torreta encontrada na lista - garantir destruição de todos os componentes
                if (turretData.mesh && turretData.mesh.metadata && turretData.mesh.metadata.components) {
                    const components = turretData.mesh.metadata.components;
                    
                    // Destruir explicitamente cada componente na ordem inversa (de fora para dentro)
                    if (components.muzzle && !components.muzzle.isDisposed()) components.muzzle.dispose();
                    if (components.barrel && !components.barrel.isDisposed()) components.barrel.dispose();
                    if (components.body && !components.body.isDisposed()) components.body.dispose();
                    if (components.base && !components.base.isDisposed()) components.base.dispose();
                    
                    // Por fim, destruir o nó raiz que contém tudo
                    if (components.root && !components.root.isDisposed()) {
                        components.root.dispose();
                    }
                }
                
                // Remover da lista de torretas
                this.turrets.splice(turretIndex, 1);
                
                console.log(`Torreta ${turretName} completamente destruída.`);
            } else {
                // Se não encontrou na lista, verificar se tem nó raiz no nome
                const rootNode = this.scene.getTransformNodeByName(`playerTurretRoot_${turretName.split('_')[1]}`);
                
                if (rootNode) {
                    // Destruir hierarquia de meshes
                    rootNode.getChildMeshes().forEach(mesh => {
                        if (mesh && !mesh.isDisposed()) {
                            mesh.dispose();
                        }
                    });
                    
                    // Destruir o nó raiz
                    rootNode.dispose();
                } else {
                    // Último recurso: destruir apenas o mesh principal da torreta
                    if (turretMesh && !turretMesh.isDisposed()) {
                        turretMesh.dispose();
                    }
                }
            }
            
            return true;
        }
        
        return false;
    }

    applyTurretDamageVisual(turretName, remainingHealth, initialHealth, onDamage) {
        const turretMesh = this.scene.getMeshByName(turretName);
        
        if (!turretMesh || !turretMesh.metadata) return;
        
        // Calcular o índice de dano (0 = sem dano, 1 = destruído)
        const damageRatio = 1 - (remainingHealth / initialHealth);
        
        // Nova cor baseada no dano (fica mais vermelha conforme o dano aumenta)
        const damageColor = new BABYLON.Color3(
            0.3 + damageRatio * 0.7,  // Mais vermelho
            0.3 - damageRatio * 0.3,  // Menos verde
            0.3 - damageRatio * 0.3   // Menos azul
        );
        
        // Obter todos os componentes da torreta a partir dos metadados
        if (turretMesh.metadata.components) {
            const components = turretMesh.metadata.components;
            
            // Aplicar cor de dano a todos os componentes visíveis
            for (const key in components) {
                const component = components[key];
                if (component && component.material && component !== components.root && !component.isDisposed()) {
                    component.material.diffuseColor = damageColor;
                    
                    // Aumentar o brilho com base no dano para efeito visual
                    if (damageRatio > 0.5) {
                        component.material.emissiveColor = new BABYLON.Color3(
                            damageRatio * 0.3, 0, 0
                        );
                    }
                }
            }
        } else {
            // Fallback para o método antigo se não tiver components
            if (turretMesh.material) {
                turretMesh.material.diffuseColor = damageColor;
            }
        }
        
        // Criar partículas de dano
        if (onDamage && turretMesh.position) {
            onDamage(turretMesh.position.clone());
        }
        
        // Salvar o valor de saúde atualizado
        turretMesh.metadata.health = remainingHealth;
    }
    
    // Método para recarregar munição de uma torreta específica
    reloadTurretAmmo(turretMesh, ammoAmount) {
        if (!turretMesh || !turretMesh.metadata || !turretMesh.metadata.isTurret) {
            console.warn("Tentativa de recarregar uma não-torreta");
            return false;
        }
        
        // Encontrar a torreta na nossa lista
        const turretData = this.turrets.find(t => t.mesh && t.mesh.name === turretMesh.name);
        if (!turretData) {
            console.warn(`Torreta ${turretMesh.name} não encontrada na lista de torretas.`);
            return false;
        }
        
        // Verificar se o modelo existe
        if (!turretData.model) {
            turretData.model = turretMesh.metadata.turretModel || new TurretModel();
        }
        
        // Adicionar munição ao modelo
        const oldAmmo = turretData.model.ammo;
        turretData.model.addAmmo(ammoAmount);
        const newAmmo = turretData.model.ammo;
        const ammoAdded = newAmmo - oldAmmo;
        
        // Atualizar o indicador de munição
        const components = turretMesh.metadata.components;
        if (components && components.ammoIndicator) {
            components.ammoIndicator.update();
        }
                
        
        return true;
    }
    
    
    // Método para comprar munição para uma torreta específica
    buyAmmoForTurret(turretMesh, amountToBuy, costPerRound, playerResources, updatePlayerResources) {
        if (!turretMesh || !turretMesh.metadata || !turretMesh.metadata.isTurret) {
            return {
                success: false,
                message: "Objeto inválido. Não é uma torreta."
            };
        }
        
        // Procurar o modelo da torreta nas várias fontes possíveis
        let turretModel = null;
        
        // 1. Verificar metadados diretos
        if (turretMesh.metadata.turretModel) {
            turretModel = turretMesh.metadata.turretModel;
        } 
        // 2. Verificar componentes
        else if (turretMesh.metadata.components?.ammoIndicator?.turretModel) {
            turretModel = turretMesh.metadata.components.ammoIndicator.turretModel;
        } 
        // 3. Verificar na lista de torretas rastreadas
        else {
            const turretData = this.turrets.find(t => t.mesh && t.mesh.name === turretMesh.name);
            if (turretData?.model) {
                turretModel = turretData.model;
            }
        }
        
        // Se não encontrou modelo, criar um novo
        if (!turretModel) {
            turretModel = new TurretModel();
            turretModel.ammo = 100;
            turretModel.maxAmmo = Infinity; // Definir limite como infinito
            
            // Armazenar o modelo para uso futuro
            turretMesh.metadata.turretModel = turretModel;
            
            // Adicionar à lista de torretas se não estiver lá
            if (!this.turrets.some(t => t.mesh && t.mesh.name === turretMesh.name)) {
                this.turrets.push({
                    mesh: turretMesh,
                    components: turretMesh.metadata.components || {},
                    lastTargetUpdate: 0,
                    currentTarget: null,
                    lastShootTime: 0,
                    model: turretModel
                });
            }
        } else {
            // Configurar modelo existente para ter limite infinito
            turretModel.maxAmmo = Infinity;
        }
        
        // Calcular o custo total
        const totalCost = costPerRound;
        
        // Verificar se o jogador tem recursos suficientes
        if (playerResources < totalCost) {
            return {
                success: false,
                message: `Recursos insuficientes. Necessário ${totalCost} para ${amountToBuy} munições.`
            };
        }
        
        // Deduzir os recursos do jogador
        if (typeof updatePlayerResources === 'function') {
            updatePlayerResources(playerResources - totalCost);
        }
        
        // Adicionar a munição à torreta
        turretModel.addAmmo(amountToBuy);
        
        // Atualizar o indicador de munição
        if (turretMesh.metadata.components?.ammoIndicator?.update) {
            turretMesh.metadata.components.ammoIndicator.update();
        }
        
        
        return {
            success: true,
            message: `Comprou ${amountToBuy} munições por ${totalCost} recursos.`,
            ammoAdded: amountToBuy,
            costPaid: totalCost,
            currentAmmo: turretModel.ammo
        };
    }
    
    // Atualiza todas as torretas (rotação para alvo, disparos, etc.)
    updateTurrets(deltaTime, getMonsters) {
        if (!this.turrets.length) return;
        
        // Obter o tempo atual para gerenciar cooldowns
        const now = performance.now();
        
        // Otimizar obtendo todos os monstros uma única vez
        const monsters = typeof getMonsters === 'function' ? getMonsters() : [];
        if (monsters.length === 0) return; // Se não há monstros, sair imediatamente
        
        // Array para rastrear as torretas que precisam ser removidas
        const turretsToDestroy = [];

        // Para cada torreta ativa, buscar alvos e atirar se possível
        for (let turret of this.turrets) {
            // Verificar se a torreta ainda é válida (não destruída)
            if (!turret.mesh || turret.mesh.isDisposed() || !turret.mesh.metadata) continue;
            
            const metadata = turret.mesh.metadata;
            const components = metadata.components;
            const healthRatio = metadata.health / metadata.initialHealth;
            
            // Atualizar o indicador de munição
            if (components && components.ammoIndicator) {
                components.ammoIndicator.update();
                // Sempre exibir o indicador de munição
                components.ammoIndicator.mesh.setEnabled(true);
            }

            // NOVO: Verificar se a torreta está destruída (saúde <= 0)
            if (metadata.health <= 0) {
                turretsToDestroy.push({
                    name: turret.mesh.name,
                    position: turret.mesh.position.clone()
                });
                continue; // Pular o resto do processamento para esta torreta
            }
            
            // Garantir que cada torreta tenha um modelo válido
            if (!turret.model) {
                turret.model = new TurretModel(); // Criar um modelo novo se não existir
                turret.model.unlimitedAmmo = false; // Definir munição limitada
                turret.model.ammo = 100; // Definir munição inicial
                turret.model.maxAmmo = 100; // Capacidade máxima
            }
            
            // Garantir que a munição não seja infinita
            turret.model.unlimitedAmmo = false;
            
            // Se estiver sem munição, pular o resto do processamento
            if (turret.model.ammo <= 0) {
                continue;
            }
            
            const turretModel = turret.model;
            const turretPos = turret.mesh.getAbsolutePosition();
            
            // Otimizar: Atualizar alvos com menos frequência para melhorar o desempenho
            if (turretModel.shouldUpdateTarget(now)) {
                // Procurar pelo monstro mais próximo dentro do alcance
                const range = turretModel.range;
                let closestDistance = range;
                let closestMonster = null;
                
                // Percorrer todos os monstros e encontrar o mais próximo
                for (const monster of monsters) {
                    const monsterMesh = monster.getMesh();
                    if (!monsterMesh || monsterMesh.isDisposed()) continue;
                    
                    // Verificar distância (usar distanceSquared para performance)
                    const monsterPos = monsterMesh.position;
                    const dx = turretPos.x - monsterPos.x;
                    const dz = turretPos.z - monsterPos.z;
                    const distanceSquared = dx * dx + dz * dz; // Ignora Y para performance
                    const distance = Math.sqrt(distanceSquared); // Só calculamos a raiz uma vez
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestMonster = monster;
                    }
                }
                
                // Atualizar o alvo atual
                turret.currentTarget = closestMonster;
                turretModel.markTargetUpdated(now);
            }
            
            // 2. Se tiver um alvo, rotacionar a torreta para ele e atirar
            if (turret.currentTarget) {
                const targetMesh = turret.currentTarget.getMesh();
                if (!targetMesh || targetMesh.isDisposed()) {
                    turret.currentTarget = null;
                    continue;
                }
                
                // Verificar se o alvo ainda existe e é válido
                const controller = turret.currentTarget.getController && turret.currentTarget.getController();
                if (!controller) {
                    turret.currentTarget = null;
                    continue;
                }
                
                // Posição do alvo e da torreta
                const targetPos = targetMesh.position.clone();
                
                // Verificar se ainda está no alcance
                const dx = turretPos.x - targetPos.x;
                const dz = turretPos.z - targetPos.z;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared > turretModel.range * turretModel.range) {
                    turret.currentTarget = null;
                    continue;
                }
                
                const direction = new BABYLON.Vector3(
                    targetPos.x - turretPos.x,  // Componente X
                    0,                          // Ignoramos completamente a altura (Y)
                    targetPos.z - turretPos.z   // Componente Z
                );
                
                // Normalizar o vetor de direção
                direction.normalize();
                
                // Rotacionar suavemente apenas o corpo da torreta (não a base)
                if (components.body) {
                    // Calcular o ângulo no plano XZ usando Math.atan2
                    const angle = Math.atan2(direction.x, direction.z);
                    
                    // Interpolação da rotação atual para a rotação desejada (movimento mais suave)
                    const currentRotation = components.body.rotation.y;
                    const targetRotation = angle;
                    
                    // Calcular a diferença de ângulo
                    let angleDiff = targetRotation - currentRotation;
                    
                    // Normalizar para o intervalo de -PI a PI
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // Velocidade de rotação - mais rápida com saúde > 50%, mais lenta quando danificada
                    const rotationSpeed = healthRatio > 0.5 ? 0.1 : 0.05;
                    
                    // Aplicar uma fração da rotação a cada frame
                    if (Math.abs(angleDiff) > 0.02) { // Evitar micro-oscilações
                        components.body.rotation.y += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotationSpeed);
                    } else {
                        components.body.rotation.y = targetRotation; // Alinhar exatamente quando próximo
                    }
                    
                    // Se o cano estiver apontando para o alvo (com margem de erro), pode atirar
                    const aimTolerance = 0.15; // Tolerância aumentada para ~8.6 graus (mais fácil acertar)
                    const isAimed = Math.abs(angleDiff) < aimTolerance;
                    
                    // Verificar se pode disparar (usando o modelo)
                    if (isAimed && turretModel.canFire(now) && turretModel.ammo > 0) {
                        // Registrar disparo no modelo
                        turretModel.recordFire(now);
                        turret.lastShootTime = now;
                        
                        // Obter dano do modelo
                        const damage = turretModel.damage;
                        
                        // Reduzir a munição e atualizar o indicador
                        turretModel.ammo -= 1;
                        if (components.ammoIndicator) {
                            components.ammoIndicator.update();
                        }
                        
                        // Aplicar dano diretamente ao controlador do monstro
                        if (controller && typeof controller.takeDamage === 'function') {
                            console.log(`Torreta aplicando ${damage} de dano ao monstro. Munição restante: ${turretModel.ammo}`);
                            controller.takeDamage(damage);
                        }
                    }
                }
            }
      }

        // Destruir as torretas que foram marcadas para remoção
        if (turretsToDestroy.length > 0) {
            for (const turretData of turretsToDestroy) {
                console.log(`Destruindo torreta ${turretData.name} por falta de saúde`);
                this.destroyTurretVisual(
                    turretData.name, 
                    turretData.position,
                    // Função de callback para efeitos de destruição
                    (position) => {
                        // Criar efeito de explosão básico
                        const particleSystem = new BABYLON.ParticleSystem("turretDestruction", 50, this.scene);
                        particleSystem.emitter = position;
                        particleSystem.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
                        particleSystem.maxEmitBox = new BABYLON.Vector3(1, 2, 1);
                        
                        // Aparência das partículas
                        particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
                        particleSystem.color2 = new BABYLON.Color4(1, 0.2, 0, 1.0);
                        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
                        
                        // Tamanho
                        particleSystem.minSize = 0.3;
                        particleSystem.maxSize = 1.0;
                        
                        // Tempo de vida
                        particleSystem.minLifeTime = 0.5;
                        particleSystem.maxLifeTime = 1.5;
                        
                        // Emissão
                        particleSystem.emitRate = 100;
                        particleSystem.start();
                        
                        // Parar após curto período
                        setTimeout(() => {
                            particleSystem.stop();
                            setTimeout(() => particleSystem.dispose(), 2000);
                        }, 200);
                    },
                    null // Não precisamos de destroyDependentBlock aqui
                );
            }
        }
    }
}

export default Turret;