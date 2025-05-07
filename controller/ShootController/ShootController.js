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
        
        // Calcular dano
        const baseDamage = equippedGun.model.getDamage();
        const finalDamage = Math.round(baseDamage * 0.5); // Reduzir dano às estruturas
        
        // Calcular saúde restante
        const currentHealth = hitMesh.metadata.health;
        const initialHealth = hitMesh.metadata.initialHealth || currentHealth;
        const remainingHealth = Math.max(0, currentHealth - finalDamage);
        
        // Atualizar saúde
        hitMesh.metadata.health = remainingHealth;
        
        // Efeito visual
        this.createHitEffect(hit.pickedPoint);
        
        // Aplicar efeito de dano visual
        if (meshName.startsWith("playerWall_")) {
            mazeView.applyWallDamageVisual(meshName, remainingHealth, initialHealth);
        } else if (meshName.startsWith("playerRamp_")) {
            mazeView.applyRampDamageVisual(meshName, remainingHealth, initialHealth);
        } else if (meshName.startsWith("playerBarricade_")) {
            mazeView.applyBarricadeDamageVisual(meshName, remainingHealth, initialHealth);
        }
        
        // Destruir a estrutura se a saúde chegou a zero
        if (remainingHealth <= 0) {
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