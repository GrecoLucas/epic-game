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
        // Create turret components as a hierarchical structure
        const turretRoot = new BABYLON.TransformNode(`playerTurretRoot_${Date.now()}`, this.scene);
        turretRoot.position = position.clone();
        turretRoot.rotation.y = rotation;
        
        // Create base platform mesh for collision and picking
        const baseWidth = cellSize * 0.8;
        const baseHeight = 0.5;
        const baseDepth = cellSize * 0.8;
        
        // Create invisible base for collision detection
        const base = BABYLON.MeshBuilder.CreateBox(`playerTurret_${Date.now()}`, {
            width: baseWidth,
            height: baseHeight,
            depth: baseDepth
        }, this.scene);
        
        base.parent = turretRoot;
        base.position.y = -baseHeight/2;
        base.checkCollisions = true;
        base.isPickable = true;
        base.visibility = 0; // Make it invisible
        
        // Create a larger collision box for the entire turret
        const collisionWidth = cellSize * 0.5; // Larger than base
        const collisionHeight = cellSize * 1.5; // Tall enough to cover the model
        const collisionDepth = cellSize * 0.5; // Larger than base
        
        const collisionBox = BABYLON.MeshBuilder.CreateBox(`turretCollision_${Date.now()}`, {
            width: collisionWidth,
            height: collisionHeight,
            depth: collisionDepth
        }, this.scene);
        
        collisionBox.parent = turretRoot;
        collisionBox.position.y = collisionHeight/2 - baseHeight/2; // Center it vertically above base
        collisionBox.checkCollisions = true;
        collisionBox.isPickable = false; // Not pickable, just for collision
        collisionBox.visibility = 0; // Make it invisible
        
        // Create turret body node for rotation
        const turretBody = new BABYLON.TransformNode(`turretBody_${Date.now()}`, this.scene);
        turretBody.parent = turretRoot;
        
        // Create muzzle point for shooting effects
        const muzzlePoint = new BABYLON.TransformNode(`turretMuzzle_${Date.now()}`, this.scene);
        muzzlePoint.parent = turretBody;
        muzzlePoint.position = new BABYLON.Vector3(0, 0.8, 1.2); // Position where bullets will come from
    
        // Load the 3D model
        BABYLON.SceneLoader.ImportMeshAsync("", "models/Turret/", "scene.gltf", this.scene).then((result) => {
            const turretModel = result.meshes[0]; // Root of imported model
            turretModel.parent = turretBody;
            
            // Scale the model to fit the cell size
            const scaleFactor = cellSize * 0.08; // Adjust this value based on model size
            turretModel.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            
            // Position adjustments if needed
            turretModel.position.y = 0.2; // Adjust height as needed
            
            // Make model meshes not respond to collisions (the collision box handles this)
            result.meshes.forEach(mesh => {
                if (mesh !== turretModel) {
                    mesh.isPickable = true; // Keep pickable for selection
                    mesh.checkCollisions = false; // The collision box handles collisions
                }
            });
        });
        
        // Create a turret model instance for game logic
        const turretModelInstance = new TurretModel();
        turretModelInstance.health = initialHealth;
        turretModelInstance.initialHealth = initialHealth;
        
        // Create the ammo indicator
        const ammoIndicator = this.createAmmoIndicator(turretRoot, cellSize, turretModelInstance);
        
        // Add metadata for identification and behavior
        base.metadata = {
            isTurret: true,
            isPlayerBuilt: true,
            initialHealth: initialHealth,
            health: initialHealth,
            isBuildableSurface: true,
            supportingBlock: null,
            dependentBlocks: [],
            components: {
                root: turretRoot,
                base: base,
                body: turretBody,
                muzzle: muzzlePoint,
                collisionBox: collisionBox, 
                ammoIndicator: ammoIndicator
            },
            turretModel: turretModelInstance
        };
        
        // Raycast to check for support below
        const ray = new BABYLON.Ray(
            position.clone().add(new BABYLON.Vector3(0, -baseHeight/2, 0)),
            new BABYLON.Vector3(0, -1, 0),
            0.2
        );
        
        const hit = this.scene.pickWithRay(ray, mesh => 
            mesh.isPickable && 
            (mesh.name.startsWith("playerWall_") || 
             mesh.name.startsWith("playerRamp_") || 
             mesh.name.startsWith("playerBarricade_"))
        );
        
        // Register dependencies
        if (hit && hit.pickedMesh) {
            base.metadata.supportingBlock = hit.pickedMesh.name;
            
            if (hit.pickedMesh.metadata && Array.isArray(hit.pickedMesh.metadata.dependentBlocks)) {
                hit.pickedMesh.metadata.dependentBlocks.push(base.name);
                console.log(`${base.name} is supported by ${hit.pickedMesh.name}`);
            }
        }
        
        // Add physics if necessary
        if (this.scene.getPhysicsEngine()?.getPhysicsPlugin()) {
            base.physicsImpostor = new BABYLON.PhysicsImpostor(base, BABYLON.PhysicsImpostor.BoxImpostor, 
                            { mass: 0, restitution: 0.1 }, this.scene);
        } else {
            console.warn("Physics not enabled, skipping impostor for turret");
        }
        
        // Add to tracked turrets list
        this.turrets.push({
            mesh: base,
            components: base.metadata.components,
            lastTargetUpdate: 0,
            currentTarget: null,
            lastShootTime: 0,
            model: turretModelInstance
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
    
    destroyTurretVisual(turretName, position, onDestroy) {
        const turretMesh = this.scene.getMeshByName(turretName);
    
        if (turretMesh) {
            // Dispose of all child meshes and the root node
            const rootNode = turretMesh.parent; // Assuming the turret root is the parent node
            if (rootNode) {
                rootNode.getChildMeshes().forEach(mesh => {
                    if (mesh && !mesh.isDisposed()) {
                        mesh.dispose();
                    }
                });
                rootNode.dispose();
            } else {
                // If no parent node, dispose of the turret mesh directly
                if (!turretMesh.isDisposed()) {
                    turretMesh.dispose();
                }
            }
    
            // Trigger destruction effects if provided
            if (onDestroy && position) {
                onDestroy(position);
            }
    
            console.log(`Turret ${turretName} destroyed.`);
            return true;
        }
    
        console.warn(`Turret ${turretName} not found for destruction.`);
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
    
    // Verificar se há um caminho livre entre a torreta e o alvo
    hasLineOfSight(turretPosition, targetPosition) {
        // Criar um raio da torreta até o alvo
        const direction = targetPosition.subtract(turretPosition);
        const distance = direction.length();
        direction.normalize();
        
        // Ajustar a altura de origem para ficar no nível do cano da torreta
        const sourcePosition = turretPosition.clone();
        sourcePosition.y += 0.8; // Altura aproximada do cano da torreta
        
        // Obter o bloco que está suportando esta torreta (se houver)
        let supportingBlock = null;
        
        // Verificar a área abaixo da torreta para encontrar blocos de suporte
        const supportRay = new BABYLON.Ray(turretPosition, new BABYLON.Vector3(0, -1, 0), 1.5);
        const supportHit = this.scene.pickWithRay(supportRay, (mesh) => {
            return mesh.isPickable && 
                   mesh.checkCollisions && 
                   (mesh.name.startsWith("playerWall_") || 
                    mesh.name.startsWith("playerRamp_") || 
                    mesh.name.startsWith("playerBarricade_"));
        });
        
        if (supportHit.pickedMesh) {
            supportingBlock = supportHit.pickedMesh;
        }
        
        // Criar o raio
        const ray = new BABYLON.Ray(sourcePosition, direction, distance);
        
        // Função de predicado para determinar quais objetos bloqueiam a visão
        const predicate = (mesh) => {
            // Ignorar o bloco de suporte da própria torreta
            if (supportingBlock && mesh.name === supportingBlock.name) {
                return false;
            }
            
            // Verificar apenas objetos sólidos que podem bloquear a visão
            return mesh.isPickable && 
                   mesh.checkCollisions && 
                   !mesh.name.startsWith("preview_") && 
                   (mesh.name.startsWith("playerWall_") || 
                    mesh.name.startsWith("playerRamp_") || 
                    mesh.name.startsWith("playerBarricade_") || 
                    mesh.name.startsWith("wall_")) &&
                    mesh.isVisible; // Ignorar meshes invisíveis
        };
        
        // Realizar o raio de verificação
        const hit = this.scene.pickWithRay(ray, predicate);
        
        // Verificação especial: se o alvo está próximo do bloco que serve de base para a torreta
        if (hit.pickedMesh && supportingBlock) {
            // Calcular distância horizontal entre o alvo e o centro do bloco de suporte
            const supportPos = supportingBlock.position.clone();
            const horizontalDistSq = 
                Math.pow(targetPosition.x - supportPos.x, 2) + 
                Math.pow(targetPosition.z - supportPos.z, 2);
            
            // Se o zumbi está muito próximo do bloco de suporte (1.5 unidades), considerar como visível
            // mesmo que o bloco esteja bloqueando a linha de visão
            const targetIsAttackingBase = horizontalDistSq < 2.25; // 1.5^2 = 2.25
            
            if (targetIsAttackingBase) {
                return true; // O zumbi está atacando a base, considerar visível
            }
        }
        
        // Temos linha de visão se não houver nada bloqueando o raio
        return !hit.pickedMesh;
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

            // Verificar se a torreta está destruída (saúde <= 0)
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
                // Procurar pelo monstro mais próximo dentro do alcance E com linha de visão
                const range = turretModel.range;
                let closestDistance = range;
                let closestMonster = null;
                
                // Percorrer todos os monstros e encontrar o mais próximo com linha de visão
                for (const monster of monsters) {
                    const monsterMesh = monster.getMesh();
                    if (!monsterMesh || monsterMesh.isDisposed()) continue;
                    
                    // Verificar distância (usar distanceSquared para performance)
                    const monsterPos = monsterMesh.position;
                    const dx = turretPos.x - monsterPos.x;
                    const dz = turretPos.z - monsterPos.z;
                    const distanceSquared = dx * dx + dz * dz; // Ignora Y para performance
                    const distance = Math.sqrt(distanceSquared); // Só calculamos a raiz uma vez
                    
                    // Verificar se está dentro do alcance e se tem linha de visão
                    if (distance < closestDistance && this.hasLineOfSight(turretPos, monsterPos)) {
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
                
                // Verificar se ainda está no alcance e se ainda tem linha de visão
                const dx = turretPos.x - targetPos.x;
                const dz = turretPos.z - targetPos.z;
                const distanceSquared = dx * dx + dz * dz;
                
                // Se estiver fora de alcance ou sem linha de visão, procurar novo alvo
                if (distanceSquared > turretModel.range * turretModel.range || 
                    !this.hasLineOfSight(turretPos, targetPos)) {
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
                        
                        // Reproduzir som de tiro com melhor garantia de execução
                        const soundManager = this.scene.gameInstance ? 
                                            this.scene.gameInstance.soundManager : null;
                        if (soundManager) {
                            soundManager.play('assault_rifle_shot', 0.01);
                        }
                        // Obter dano do modelo
                        const damage = turretModel.damage;
                        
                        // Reduzir a munição e atualizar o indicador
                        turretModel.ammo -= 1;
                        if (components.ammoIndicator) {
                            components.ammoIndicator.update();
                        }
                        
                        // Aplicar dano diretamente ao controlador do monstro
                        if (controller && typeof controller.takeDamage === 'function') {
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