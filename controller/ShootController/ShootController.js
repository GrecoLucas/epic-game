class ShootController {
    constructor(scene, playerView) {
        this.scene = scene;
        this.playerView = playerView;
        this.automaticFireInterval = null;
    }

    // Método que verifica se o jogador tem uma arma equipada e dispara
    handleShoot(equippedGun) {
        // --- Validações Iniciais ---
        if (!equippedGun) {
            console.log("Tentativa de disparo sem arma equipada.");
            return;
        }

        const camera = this.playerView.getCamera();
        if (!camera) {
            console.error("Câmera do jogador não encontrada para disparo.");
            return;
        }

        // --- Configurações ---
        const config = {
            rayLength: 200,         // Alcance máximo do tiro em unidades
            rayOriginOffset: 0.1,   // Offset para evitar colisão com a própria câmera
            minObstacleDistance: 0.5, // Distância mínima para verificar monstros
            DEBUG_MODE: false       // Ativar para visualização e logs
        };

        // --- Configuração do Ray Principal ---
        const cameraPosition = camera.globalPosition;
        const forwardDirection = camera.getForwardRay(1).direction;
        const rayOrigin = cameraPosition.add(forwardDirection.scale(config.rayOriginOffset));
        const ray = new BABYLON.Ray(rayOrigin, forwardDirection, config.rayLength);

        // --- Detecção de Obstáculos e Monstros ---
        
        // 1. Primeiro detectamos qualquer obstáculo no caminho (incluindo monstros)
        //    Isto determina a distância máxima que o projétil pode percorrer
        //    Ignoramos o próprio jogador e objetos não-colidíveis
        const obstacleFilterPredicate = (mesh) => {
            return mesh.isPickable && 
                   mesh.checkCollisions && 
                   !mesh.name.includes("Player") &&
                   !mesh.name.includes("floor");  // Opcional: ignorar o chão
        };
        
        const firstObstacleHit = this.scene.pickWithRay(ray, obstacleFilterPredicate);
        const obstacleDistance = firstObstacleHit?.pickedMesh ? firstObstacleHit.distance : config.rayLength;

        // 2. Agora procuramos especificamente por partes de monstros até a distância do primeiro obstáculo
        //    Isso impede que atiremos em monstros através de paredes
        let monsterHits = [];
        
        if (obstacleDistance > config.minObstacleDistance) {
            // Criar um ray limitado à distância do primeiro obstáculo
            const limitedRay = new BABYLON.Ray(rayOrigin, forwardDirection, obstacleDistance);
            
            // Predicate otimizado para partes de monstros
            const monsterPartPredicate = this._createMonsterPartPredicate();
            
            // Encontrar todos os hits de monstros (ordenados por distância)
            monsterHits = this.scene.multiPickWithRay(limitedRay, monsterPartPredicate);
        }

        // --- Processamento do Hit ---
        let hitSuccessful = false;
        
        // Processar o hit de monstro mais próximo (se houver)
        if (monsterHits.length > 0 && monsterHits[0].pickedMesh) {
            hitSuccessful = this.processMonsterHit(monsterHits[0], equippedGun);
            
            if (hitSuccessful && config.DEBUG_MODE) {
                console.log(`Hit bem sucedido no monstro a ${monsterHits[0].distance.toFixed(2)} unidades.`);
            }
        } 
        // Se não acertamos monstro, verificamos se acertamos estrutura destrutível (parede, rampa, barricada)
        else if (firstObstacleHit && firstObstacleHit.pickedMesh) {
            const pickedMesh = firstObstacleHit.pickedMesh;
            
            // Verificar se é uma estrutura construída pelo jogador
            if (pickedMesh.name.startsWith("playerWall_") || 
                pickedMesh.name.startsWith("playerRamp_") || 
                pickedMesh.name.startsWith("playerBarricade_")) {
                
                hitSuccessful = this.processStructureHit(firstObstacleHit, equippedGun);
                
                if (hitSuccessful && config.DEBUG_MODE) {
                    console.log(`Hit bem sucedido na estrutura ${pickedMesh.name} a ${firstObstacleHit.distance.toFixed(2)} unidades.`);
                }
            }
            else if (config.DEBUG_MODE) {
                // Se não acertamos estrutura, mas acertamos algum outro obstáculo e estamos em debug
                console.log(`Tiro acertou objeto: '${firstObstacleHit.pickedMesh.name}' a ${firstObstacleHit.distance.toFixed(2)} unidades.`);
            }
        }

        // --- Efeitos do Tiro (sempre executados, independente de acertar) ---
        const shotFired = equippedGun.shoot();
        
        if (!shotFired) {
            console.log("Disparo falhou (sem munição ou recarregando).");
        }
    }
    
    _createMonsterPartPredicate() {
        return (mesh) => {
            // Se o mesh não é pickable, ignoramos imediatamente
            if (!mesh.isPickable) return false;
            
            // OPÇÃO 1: Verificação por metadata (abordagem ideal)
            // Verificar se este mesh já está marcado como parte de monstro via metadata
            if (mesh.metadata?.isMonsterPart === true) return true;
            
            // OPÇÃO 2: Verificação por nome (fallback)
            // Lista de keywords para identificar partes de monstros
            const monsterPartNames = ["monsterBody", "monsterHead", "monsterRoot", "eye", "horn", "monster"];
            
            // Verificar o mesh atual e sua hierarquia de pais
            let currentMesh = mesh;
            while (currentMesh) {
                // Se encontrarmos metadata em qualquer nível, usamos
                if (currentMesh.metadata?.isMonsterPart === true) {
                    // Opcionalmente, propagar a metadata para o mesh atual para otimizar futuros hits
                    if (!mesh.metadata) mesh.metadata = {};
                    mesh.metadata.isMonsterPart = true;
                    return true;
                }
                
                // Verificação por nome como fallback
                if (currentMesh.name) {
                    const nameLower = currentMesh.name.toLowerCase();
                    if (monsterPartNames.some(part => nameLower.includes(part.toLowerCase()))) {
                        // Opcionalmente, adicionar metadata para otimizar futuros hits
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
        if (!hit || !hit.pickedMesh) return false;
        
        const hitMesh = hit.pickedMesh;
        console.log(`Hit em parte de monstro: ${hitMesh.name} a ${hit.distance.toFixed(2)} unidades`);
        
        // 1. Busca Otimizada: Primeiro tentamos encontrar o monstro via metadata
        let hitMonster = null;
        
        // Verificar metadata do próprio mesh
        if (hitMesh.metadata?.monsterInstance) {
            hitMonster = hitMesh.metadata.monsterInstance;
        } 
        // Verificar hierarquia de pais se não encontrado no mesh atual
        else {
            let currentMesh = hitMesh.parent;
            while (currentMesh && !hitMonster) {
                if (currentMesh.metadata?.monsterInstance) {
                    hitMonster = currentMesh.metadata.monsterInstance;
                    
                    // Propagar a referência para o mesh atual para otimizar futuros hits
                    if (!hitMesh.metadata) hitMesh.metadata = {};
                    hitMesh.metadata.monsterInstance = hitMonster;
                    hitMesh.metadata.isMonsterPart = true;
                }
                currentMesh = currentMesh.parent;
            }
        }
        
        // 2. Fallback: Se não encontrado via metadata, buscar na lista global
        if (!hitMonster) {
            const monstersList = this.scene.gameInstance?.getMonsters() || [];
            
            for (const monster of monstersList) {
                const rootMesh = monster.getMesh();
                if (!rootMesh) continue;
                
                // Verificar se o mesh é o próprio monstro ou um descendente
                if (hitMesh === rootMesh || hitMesh.isDescendantOf(rootMesh)) {
                    hitMonster = monster;
                    
                    // Armazenar referência no metadata para otimizar futuros hits
                    if (!hitMesh.metadata) hitMesh.metadata = {};
                    hitMesh.metadata.monsterInstance = monster;
                    hitMesh.metadata.isMonsterPart = true;
                    
                    // Propagar para o mesh raiz também
                    if (rootMesh && !rootMesh.metadata) rootMesh.metadata = {};
                    if (rootMesh) {
                        rootMesh.metadata.monsterInstance = monster;
                        rootMesh.metadata.isMonsterPart = true;
                    }
                    
                    break;
                }
            }
        }
        
        // 3. Aplicar Dano (se encontrou o monstro)
        if (hitMonster) {
            const monsterController = hitMonster.getController();
            if (!monsterController || monsterController.isDisposed) {
                console.warn(`Controlador do monstro não encontrado ou inválido para ${hitMesh.name}.`);
                return false;
            }
            
            // Obter dano base da arma
            const baseDamage = equippedGun.model.getDamage();
            
            // Calcular multiplicador de dano baseado na parte atingida
            let damageMultiplier = 1.0;
            const hitNameLower = hitMesh.name.toLowerCase();
            
            // Headshot = dano crítico (2x)
            const isHeadshot = 
                hitNameLower.includes("head") || 
                hitNameLower.includes("eye") ||
                (hitMesh.metadata?.bodyPart === "head"); // Usar metadata se disponível
                
            if (isHeadshot) {
                damageMultiplier = 2.0;
                console.log("ACERTO CRÍTICO! Headshot com x2 dano");
            }
            
            // Aplicar dano final
            const finalDamage = Math.round(baseDamage * damageMultiplier);
            console.log(`Aplicando ${finalDamage} de dano ao monstro.`);
            
            monsterController.takeDamage(finalDamage);
            
            // Criar efeito visual no ponto de impacto
            this.createHitEffect(hit.pickedPoint);
            
            return true; // Hit processado com sucesso
        } else {
            console.error(`Não foi possível associar o mesh '${hitMesh.name}' a uma instância de Monster.`);
            return false; // Falha no processamento do hit
        }
    }
    
    // Método para processar hits em estruturas (paredes, rampas e barricadas)
    processStructureHit(hit, equippedGun) {
        if (!hit || !hit.pickedMesh) return false;
        
        const hitMesh = hit.pickedMesh;
        const meshName = hitMesh.name;
        
        // Verificar se temos acesso ao MazeView para aplicar danos visuais
        const mazeView = this.scene.gameInstance?.maze?.view;
        if (!mazeView) {
            console.error("MazeView não encontrado para processar dano à estrutura.");
            return false;
        }
        
        // Obter informações de saúde da estrutura
        if (!hitMesh.metadata || typeof hitMesh.metadata.health === 'undefined') {
            console.warn(`Estrutura ${meshName} não possui metadata de saúde.`);
            return false;
        }
        
        // Obter dano base da arma
        const baseDamage = equippedGun.model.getDamage();
        
        // Calcular dano final (pode ser modificado com base no tipo de arma/estrutura)
        let finalDamage = Math.round(baseDamage * 0.5); // Reduzir dano às estruturas para equilíbrio
        
        // Calcular saúde restante
        const currentHealth = hitMesh.metadata.health;
        const initialHealth = hitMesh.metadata.initialHealth || currentHealth;
        const remainingHealth = Math.max(0, currentHealth - finalDamage);
        
        // Atualizar saúde na metadata
        hitMesh.metadata.health = remainingHealth;
        
        console.log(`Aplicando ${finalDamage} de dano à estrutura ${meshName}. Saúde: ${currentHealth} -> ${remainingHealth}`);
        
        // Criar efeito visual no ponto de impacto
        this.createHitEffect(hit.pickedPoint);
        
        // Aplicar efeito de dano visual
        if (meshName.startsWith("playerWall_")) {
            mazeView.applyWallDamageVisual(meshName, remainingHealth, initialHealth);
        } else if (meshName.startsWith("playerRamp_")) {
            mazeView.applyRampDamageVisual(meshName, remainingHealth, initialHealth);
        } else if (meshName.startsWith("playerBarricade_")) {
            mazeView.applyBarricadeDamageVisual(meshName, remainingHealth, initialHealth);
        }
        
        // Se a saúde chegou a zero, destruir a estrutura
        if (remainingHealth <= 0) {
            setTimeout(() => {
                // Destruir a estrutura com base em seu tipo
                if (meshName.startsWith("playerWall_")) {
                    mazeView.destroyWallVisual(meshName, hitMesh.position);
                } else if (meshName.startsWith("playerRamp_")) {
                    mazeView.destroyRampVisual(meshName, hitMesh.position);
                } else if (meshName.startsWith("playerBarricade_")) {
                    mazeView.destroyBarricadeVisual(meshName, hitMesh.position);
                }
            }, 100); // Pequeno delay para efeito visual
        }
        
        return true;
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
        // Criar uma esfera vermelha no ponto de impacto
        const hitMarker = BABYLON.MeshBuilder.CreateSphere("hitMarker", { 
            diameter: 0.15, // Tamanho um pouco maior para melhor visibilidade
            segments: 8     // Menos segmentos para performance
        }, this.scene);
        
        hitMarker.position = position;
        hitMarker.material = new BABYLON.StandardMaterial("hitMarkerMat", this.scene);
        hitMarker.material.emissiveColor = new BABYLON.Color3(1, 0, 0); // Vermelho brilhante
        hitMarker.material.disableLighting = true; // Para garantir que seja bem visível
        hitMarker.isPickable = false; // Não deve interferir com raycasts futuros
        
        // Opcional: Adicionar uma pequena animação de pulso
        const initialScale = hitMarker.scaling.clone();
        BABYLON.Animation.CreateAndStartAnimation("hitMarkerPulse", hitMarker, "scaling", 30, 10, 
            initialScale, initialScale.scale(1.5), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        
        // Auto-destruição após tempo curto
        setTimeout(() => {
            if (hitMarker && !hitMarker.isDisposed()) {
                hitMarker.dispose();
            }
        }, 300);
    }

    // Configurar disparo automático
    setupAutomaticFire(equippedGun, callback) {
        // Limpar qualquer intervalo existente
        if (this.automaticFireInterval) {
            clearInterval(this.automaticFireInterval);
        }
        
        // Configurar intervalo para disparo automático a cada 80ms
        this.automaticFireInterval = setInterval(() => {
            callback();
        }, 80);
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