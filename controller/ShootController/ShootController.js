class ShootController {
    constructor(scene, playerView) {
        this.scene = scene;
        this.playerView = playerView;
        this.automaticFireInterval = null;
        // Cache para melhorar desempenho
        this._monsterPartPredicate = this._createMonsterPartPredicate();
    }

    // Método que verifica se o jogador tem uma arma equipada e dispara
    handleShoot(equippedGun) {
        // --- Validações Iniciais ---
        if (!equippedGun || !this.playerView?.getCamera()) {
            return false;
        }

        // --- Efeitos do Tiro ---
        const shotFired = equippedGun.shoot();
        if (!shotFired) return false;
        
        // --- Configurações ---
        const config = {
            rayLength: 200,
            rayOriginOffset: 0.1,
            minObstacleDistance: 0.5
        };

        // --- Configuração do Ray Principal ---
        const camera = this.playerView.getCamera();
        const rayOrigin = camera.globalPosition.add(
            camera.getForwardRay(1).direction.scale(config.rayOriginOffset)
        );
        const ray = new BABYLON.Ray(rayOrigin, camera.getForwardRay(1).direction, config.rayLength);
        
        if (this.scene.gameInstance?.multiplayerManager && 
    !this.scene.gameInstance.multiplayerManager.isHost) {
    
    // Buscar o hit primeiramente
    const monsterHits = this.scene.multiPickWithRay(ray, this._monsterPartPredicate);
    
    // Ordenar por distância se houver múltiplos
    if (monsterHits.length > 1) {
        monsterHits.sort((a, b) => a.distance - b.distance);
    }
    
    // Se acertou um monstro, processar localmente antes de enviar
    if (monsterHits.length > 0 && monsterHits[0].pickedMesh) {
        const hitMonster = this._findMonsterFromMesh(monsterHits[0].pickedMesh);
        if (hitMonster) {
            const controller = hitMonster.getController();
            if (controller && !controller.isDisposed) {
                // Salvar ID e saúde atual antes do dano para sincronização
                const monsterId = controller.model.id;
                const currentHealth = controller.model.health;
                
                // Calcular e aplicar dano localmente
                const damage = equippedGun.model.getDamage();
                controller.takeDamage(damage);
                
                // Enviar ação ao host com informações adicionais sobre o dano já aplicado
                this.scene.gameInstance.multiplayerManager.sendPlayerAction('shoot', {
                    direction: {
                        x: camera.getForwardRay(1).direction.x,
                        y: camera.getForwardRay(1).direction.y,
                        z: camera.getForwardRay(1).direction.z
                    },
                    gunDamage: damage,
                    targetMonsterId: monsterId,
                    previousHealth: currentHealth,
                    appliedDamage: damage,
                    newHealth: controller.model.health
                });
                
                return true; // Hit detectado e processado localmente
            }
        }
    }
    
    // Caso não tenha detectado um monstro, envia normalmente
    this.scene.gameInstance.multiplayerManager.sendPlayerAction('shoot', {
        direction: {
            x: camera.getForwardRay(1).direction.x,
            y: camera.getForwardRay(1).direction.y,
            z: camera.getForwardRay(1).direction.z
        },
        gunDamage: equippedGun.model.getDamage()
    });
}

        // 1. Detectar qualquer obstáculo no caminho
        const obstacleFilterPredicate = (mesh) => {
            return mesh.isPickable && 
                  mesh.checkCollisions && 
                  !mesh.name.includes("Player") &&
                  !mesh.name.includes("floor");
        };
        
        const firstObstacleHit = this.scene.pickWithRay(ray, obstacleFilterPredicate);
        const obstacleDistance = firstObstacleHit?.pickedMesh ? firstObstacleHit.distance : config.rayLength;

        // 2. Procurar por monstros até a distância do primeiro obstáculo
        let monsterHits = [];
        
        if (obstacleDistance > config.minObstacleDistance) {
            const limitedRay = new BABYLON.Ray(rayOrigin, camera.getForwardRay(1).direction, obstacleDistance);
            monsterHits = this.scene.multiPickWithRay(limitedRay, this._monsterPartPredicate);
            
            // Ordenar apenas se houver múltiplos hits
            if (monsterHits.length > 1) {
                monsterHits.sort((a, b) => a.distance - b.distance);
            }
        }

        // --- Processamento do Hit ---
        // Processar o hit de monstro mais próximo (se houver)
        if (monsterHits.length > 0 && monsterHits[0].pickedMesh) {
            return this.processMonsterHit(monsterHits[0], equippedGun);
        } 
        // Verificar se acertamos estrutura destrutível
        else if (firstObstacleHit?.pickedMesh) {
            const pickedMesh = firstObstacleHit.pickedMesh;
            
            if (pickedMesh.name.startsWith("playerWall_") || 
                pickedMesh.name.startsWith("playerRamp_") || 
                pickedMesh.name.startsWith("playerBarricade_")) {
                
                return this.processStructureHit(firstObstacleHit, equippedGun);
            }
        }
        
        return false;
    }
    
    _createMonsterPartPredicate() {
        return (mesh) => {
            // Se o mesh não é pickable, ignoramos imediatamente
            if (!mesh.isPickable) return false;
            
            // Verificação por metadata (abordagem ideal)
            if (mesh.metadata?.isMonsterPart === true) return true;
            
            // Verificação por nome (fallback)
            const monsterPartNames = ["monsterBody", "monsterHead", "monsterRoot", "eye", "horn", "monster"];
            
            // Verificar o mesh atual e sua hierarquia de pais
            let currentMesh = mesh;
            while (currentMesh) {
                // Se encontrarmos metadata em qualquer nível, usamos
                if (currentMesh.metadata?.isMonsterPart === true) {
                    // Propagar a metadata para o mesh atual para otimizar futuros hits
                    if (!mesh.metadata) mesh.metadata = {};
                    mesh.metadata.isMonsterPart = true;
                    return true;
                }
                
                // Verificação por nome como fallback
                if (currentMesh.name) {
                    const nameLower = currentMesh.name.toLowerCase();
                    if (monsterPartNames.some(part => nameLower.includes(part.toLowerCase()))) {
                        // Otimizar futuros hits
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
        if (!hit?.pickedMesh) return false;
        
        const hitMesh = hit.pickedMesh;
        let hitMonster = this._findMonsterFromMesh(hitMesh);
        
        // Aplicar Dano (se encontrou o monstro)
        if (hitMonster) {
            const monsterController = hitMonster.getController();
            if (!monsterController || monsterController.isDisposed) {
                return false;
            }
            
            // Calcular dano
            const baseDamage = equippedGun.model.getDamage();
            const hitNameLower = hitMesh.name.toLowerCase();
            
            // Headshot = dano crítico (2x)
            const isHeadshot = 
                hitNameLower.includes("head") || 
                hitNameLower.includes("eye") ||
                (hitMesh.metadata?.bodyPart === "head");
                
            const damageMultiplier = isHeadshot ? 2.0 : 1.0;
            const finalDamage = Math.round(baseDamage * damageMultiplier);
            
            // Aplicar dano
            monsterController.takeDamage(finalDamage);
            this.createHitEffect(hit.pickedPoint);
            
            return true;
        }
        
        return false;
    }
    
    // Método para encontrar a instância de monstro a partir de um mesh
    _findMonsterFromMesh(hitMesh) {
        // 1. Buscar via metadata do mesh
        if (hitMesh.metadata?.monsterInstance) {
            return hitMesh.metadata.monsterInstance;
        }
        
        // 2. Buscar na hierarquia de pais
        let currentMesh = hitMesh.parent;
        while (currentMesh) {
            if (currentMesh.metadata?.monsterInstance) {
                // Propagar referência para otimização
                if (!hitMesh.metadata) hitMesh.metadata = {};
                hitMesh.metadata.monsterInstance = currentMesh.metadata.monsterInstance;
                hitMesh.metadata.isMonsterPart = true;
                return currentMesh.metadata.monsterInstance;
            }
            currentMesh = currentMesh.parent;
        }
        
        // 3. Fallback: buscar na lista global
        const monstersList = this.scene.gameInstance?.getMonsters() || [];
        for (const monster of monstersList) {
            const rootMesh = monster.getMesh();
            if (!rootMesh) continue;
            
            if (hitMesh === rootMesh || hitMesh.isDescendantOf(rootMesh)) {
                // Armazenar referência para otimização
                if (!hitMesh.metadata) hitMesh.metadata = {};
                hitMesh.metadata.monsterInstance = monster;
                hitMesh.metadata.isMonsterPart = true;
                
                // Propagar para o mesh raiz também
                if (rootMesh) {
                    if (!rootMesh.metadata) rootMesh.metadata = {};
                    rootMesh.metadata.monsterInstance = monster;
                    rootMesh.metadata.isMonsterPart = true;
                }
                
                return monster;
            }
        }
        
        return null;
    }
    
    // Método para processar hits em estruturas (paredes, rampas e barricadas)
    processStructureHit(hit, equippedGun) {
        if (!hit?.pickedMesh) return false;
        
        const hitMesh = hit.pickedMesh;
        const meshName = hitMesh.name;
        
        // Verificar se temos acesso ao MazeView
        const mazeView = this.scene.gameInstance?.maze?.view;
        if (!mazeView) return false;
        
        // Verificar metadata de saúde
        if (!hitMesh.metadata?.health) return false;
        
        // Verificar se a arma é uma ferramenta de reparo
        const isRepairTool = equippedGun.model.isRepairTool === true;
        
        // Calcular dano ou reparo
        const baseValue = equippedGun.model.getDamage();
        let finalValue;
        
        if (isRepairTool) {
            // Se for ferramenta de reparo, usar o valor de reparo
            finalValue = Math.round(baseValue * 2); // Aumentar efeito de reparo
        } else {
            // Se for arma, aplicar dano reduzido às estruturas
            finalValue = Math.round(baseValue * 0.5);
        }
        
        // Calcular saúde restante
        const currentHealth = hitMesh.metadata.health;
        const initialHealth = hitMesh.metadata.initialHealth || currentHealth;
        let remainingHealth;
        
        if (isRepairTool) {
            // Aumentar a saúde, mas não ultrapassar a saúde inicial
            remainingHealth = Math.min(initialHealth, currentHealth + finalValue);
        } else {
            // Reduzir a saúde, não ficando abaixo de zero
            remainingHealth = Math.max(0, currentHealth - finalValue);
        }
        
        // Atualizar saúde
        hitMesh.metadata.health = remainingHealth;
        
        // Efeito visual - usar efeito diferente para reparo
        if (isRepairTool) {
            this.createRepairEffect(hit.pickedPoint);
        } else {
            this.createHitEffect(hit.pickedPoint);
        }
        
        // Aplicar efeito visual de dano ou reparo
        if (meshName.startsWith("playerWall_")) {
            mazeView.applyWallDamageVisual(meshName, remainingHealth, initialHealth);
        } else if (meshName.startsWith("playerRamp_")) {
            mazeView.applyRampDamageVisual(meshName, remainingHealth, initialHealth);
        } else if (meshName.startsWith("playerBarricade_")) {
            mazeView.applyBarricadeDamageVisual(meshName, remainingHealth, initialHealth);
        }
        
        // Destruir a estrutura se a saúde chegou a zero (apenas para dano, não para reparo)
        if (!isRepairTool && remainingHealth <= 0) {
            setTimeout(() => {
                if (meshName.startsWith("playerWall_")) {
                    mazeView.destroyWallVisual(meshName, hitMesh.position);
                } else if (meshName.startsWith("playerRamp_")) {
                    mazeView.destroyRampVisual(meshName, hitMesh.position);
                } else if (meshName.startsWith("playerBarricade_")) {
                    mazeView.destroyBarricadeVisual(meshName, hitMesh.position);
                }
            }, 100);
        }
        
        return true;
    }
    
    // Novo método para criar efeito visual de reparo
    createRepairEffect(position) {
        // Criar uma esfera verde no ponto de impacto
        const repairMarker = BABYLON.MeshBuilder.CreateSphere("repairMarker", { 
            diameter: 0.2,
            segments: 8
        }, this.scene);
        
        repairMarker.position = position;
        repairMarker.material = new BABYLON.StandardMaterial("repairMarkerMat", this.scene);
        repairMarker.material.emissiveColor = new BABYLON.Color3(0, 1, 0.3); // Verde brilhante
        repairMarker.material.disableLighting = true;
        repairMarker.isPickable = false;
        
        // Animação de pulso
        const initialScale = repairMarker.scaling.clone();
        BABYLON.Animation.CreateAndStartAnimation(
            "repairMarkerPulse", 
            repairMarker, 
            "scaling", 
            30, 
            12, 
            initialScale, 
            initialScale.scale(2), 
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Auto-destruição
        setTimeout(() => {
            if (repairMarker && !repairMarker.isDisposed()) {
                repairMarker.dispose();
            }
        }, 400);
    }
    
    // Método para criar efeito visual no ponto de impacto
    createHitEffect(position) {
        // Criar uma esfera vermelha no ponto de impacto
        const hitMarker = BABYLON.MeshBuilder.CreateSphere("hitMarker", { 
            diameter: 0.15,
            segments: 8
        }, this.scene);
        
        hitMarker.position = position;
        hitMarker.material = new BABYLON.StandardMaterial("hitMarkerMat", this.scene);
        hitMarker.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
        hitMarker.material.disableLighting = true;
        hitMarker.isPickable = false;
        
        // Animação de pulso
        const initialScale = hitMarker.scaling.clone();
        BABYLON.Animation.CreateAndStartAnimation(
            "hitMarkerPulse", 
            hitMarker, 
            "scaling", 
            30, 
            10, 
            initialScale, 
            initialScale.scale(1.5), 
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Auto-destruição
        setTimeout(() => {
            if (hitMarker && !hitMarker.isDisposed()) {
                hitMarker.dispose();
            }
        }, 300);
    }

    // Configurar disparo automático
    setupAutomaticFire(equippedGun, callback) {
        this.stopAutomaticFire();
        this.automaticFireInterval = setInterval(callback, 80);
    }

    // Parar disparo automático
    stopAutomaticFire() {
        if (this.automaticFireInterval) {
            clearInterval(this.automaticFireInterval);
            this.automaticFireInterval = null;
        }
    }
}

export default ShootController;