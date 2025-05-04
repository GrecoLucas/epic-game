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
        
        // Criar um modelo individual para esta torreta
        const turretModelInstance = new TurretModel();
        turretModelInstance.health = initialHealth;
        turretModelInstance.initialHealth = initialHealth;

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
                muzzle: muzzlePoint
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
            
            // Desativar antes de destruir para evitar problemas
            turretMesh.setEnabled(false);
            
            // Remover da lista de torretas rastreadas
            const turretIndex = this.turrets.findIndex(t => t.mesh.name === turretName);
            if (turretIndex !== -1) {
                const turretData = this.turrets[turretIndex];
                
                // Limpar todos os componentes da torreta
                if (turretData.components) {
                    for (const key in turretData.components) {
                        if (turretData.components[key] && !turretData.components[key].isDisposed()) {
                            turretData.components[key].dispose();
                        }
                    }
                }
                
                // Remover da lista
                this.turrets.splice(turretIndex, 1);
            } else {
                // Se não encontrou na lista de componentes, apenas destruir o mesh diretamente
                setTimeout(() => {
                    if (turretMesh && !turretMesh.isDisposed()) {
                        turretMesh.dispose();
                    }
                }, 100);
            }
            
            return true;
        }
        
        return false;
    }

    applyTurretDamageVisual(turretName, remainingHealth, initialHealth, onDamage) {
        const turretMesh = this.scene.getMeshByName(turretName);
        
        if (!turretMesh || !turretMesh.material) return;
        
        // Aplicar efeito visual de dano (escurecer e ficar mais vermelho conforme o dano aumenta)
        const damageRatio = 1 - (remainingHealth / initialHealth);
        
        // Modificar a cor para indicar dano
        turretMesh.material.diffuseColor = new BABYLON.Color3(
            0.3 + damageRatio * 0.2,  // Mais vermelho
            0.3 - damageRatio * 0.2,  // Menos verde
            0.3 - damageRatio * 0.2   // Menos azul
        );
        
        // Criar partículas de dano
        if (onDamage && turretMesh.position) {
            onDamage(turretMesh.position.clone());
        }
        
        // Salvar o valor de saúde atualizado
        if (turretMesh.metadata) {
            turretMesh.metadata.health = remainingHealth;
        }
    }
    
    
    // Atualiza todas as torretas (rotação para alvo, disparos, etc.)
    updateTurrets(deltaTime, getMonsters) {
        if (!this.turrets.length) return;
        
        // Obter o tempo atual para gerenciar cooldowns
        const now = performance.now();
        
        // Otimizar obtendo todos os monstros uma única vez
        const monsters = typeof getMonsters === 'function' ? getMonsters() : [];
        if (monsters.length === 0) return; // Se não há monstros, sair imediatamente
        
        // Para cada torreta ativa, buscar alvos e atirar se possível
        for (let turret of this.turrets) {
            // Verificar se a torreta ainda é válida (não destruída)
            if (!turret.mesh || turret.mesh.isDisposed() || !turret.mesh.metadata) continue;
            
            const metadata = turret.mesh.metadata;
            const components = metadata.components;
            const healthRatio = metadata.health / metadata.initialHealth;
            
            // Garantir que cada torreta tenha um modelo válido e com munição infinita
            if (!turret.model) {
                turret.model = new TurretModel(); // Criar um modelo novo se não existir
            }
            
            // Forçar munição infinita para todos os modelos de torreta
            turret.model.unlimitedAmmo = true;
            turret.model.ammo = Infinity;
            
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
                
                // Calcular direção para o alvo (apenas no plano horizontal - rotação Y)
                const direction = targetPos.subtract(turretPos);
                direction.y = 0; // Ignorar diferença de altura na rotação
                
                // Rotacionar suavemente apenas o corpo da torreta (não a base)
                if (components.body) {
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
                    if (isAimed && turretModel.canFire(now)) {
                        // Registrar disparo no modelo
                        turretModel.recordFire(now);
                        turret.lastShootTime = now;
                        
                        // Obter dano do modelo
                        const damage = turretModel.damage;
                        
                        // Adicionar efeito visual de disparo se necessário
                        if (components.muzzle && !components.muzzle.isDisposed()) {
                            // Efeito simples: Criar uma partícula ou luz temporária
                            const muzzlePos = components.muzzle.getAbsolutePosition();
                            this.createMuzzleFlash(muzzlePos);
                        }
                        
                        // Aplicar dano diretamente ao controlador do monstro
                        if (controller && typeof controller.takeDamage === 'function') {
                            console.log(`Torreta aplicando ${damage} de dano ao monstro`);
                            controller.takeDamage(damage);
                        }
                    }
                }
            }
        }
    }
    
    // Novo método para efeito visual de disparo da torreta
    createMuzzleFlash(position) {
        // Verificar se já temos muitos efeitos ativos (limitar para performance)
        if (this.activeEffects.size > 20) return;
        
        // Criar um sistema de partículas simples para o flash do disparo
        const effectId = `muzzleFlash_${Date.now()}`;
        
        // Usar um mesh simples com material emissivo para o flash
        const flash = BABYLON.MeshBuilder.CreateSphere(effectId, {diameter: 0.2}, this.scene);
        flash.position = position.clone();
        
        // Material emissivo para o flash
        const flashMaterial = new BABYLON.StandardMaterial(`${effectId}_material`, this.scene);
        flashMaterial.emissiveColor = new BABYLON.Color3(1, 0.7, 0);
        flashMaterial.alpha = 0.8;
        flash.material = flashMaterial;
        
        // Guardar referência para limpeza posterior
        this.activeEffects.set(effectId, flash);
        
        // Remover após um curto período
        setTimeout(() => {
            if (flash && !flash.isDisposed()) {
                flash.dispose();
                this.activeEffects.delete(effectId);
            }
        }, 50); // 50ms - flash muito rápido
    }
}

export default Turret;