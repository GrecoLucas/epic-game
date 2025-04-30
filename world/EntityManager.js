// EntityManager.js - Gerencia todas as entidades no mundo aberto (monstros, NPCs, itens)

import Monster from '../Monster.js';

class EntityManager {
    constructor(scene, gameInstance) {
        this.scene = scene;
        this.gameInstance = gameInstance;
        this.entities = [];
        this.monsters = [];
        this.npcs = [];
        this.items = [];
        this.entityIdCounter = 0;
        
        // Configurações
        this.maxEntitiesPerChunk = 8;
        this.maxMonstersPerChunk = 5;
        this.minSpawnDistance = 20; // Distância mínima do jogador para spawn
        this.despawnDistance = 100; // Distância para remover entidades
        
        // Inicializar sistema de atualização de entidades
        this._setupUpdateLoop();
    }
    
    // Configurar loop de atualização das entidades
    _setupUpdateLoop() {
        // A cada segundo, verificar entidades para spawn/despawn
        setInterval(() => this._updateEntities(), 1000);
        
        // A cada frame, atualizar entidades ativas
        this.scene.registerBeforeRender(() => {
            this._updateActiveEntities();
        });
    }
    
    // Gerar ID único para entidades
    _generateEntityId() {
        return 'entity_' + (++this.entityIdCounter);
    }
    
    // Spawnar entidades em um chunk específico
    async spawnEntitiesInChunk(chunkX, chunkZ, biome) {
        // Calcular posição real do chunk no mundo
        const chunkSize = this.gameInstance.chunkSize || 16;
        const worldX = chunkX * chunkSize;
        const worldZ = chunkZ * chunkSize;
        
        // Lista para armazenar entidades criadas
        const entities = [];
        
        // Determinar quantas e quais entidades criar baseado no bioma
        const entityCount = this._determineEntityCount(biome);
        
        // Criar as entidades
        for (let i = 0; i < entityCount; i++) {
            // Posição aleatória dentro do chunk
            const posX = worldX + Math.random() * chunkSize;
            const posZ = worldZ + Math.random() * chunkSize;
            
            // Determinar tipo de entidade baseado no bioma
            const entityType = this._determineEntityType(biome, posX, posZ);
            
            // Criar a entidade
            const entity = await this._createEntity(posX, posZ, entityType, biome);
            
            if (entity) {
                // Adicionar às listas apropriadas
                this.entities.push(entity);
                
                // Categorizar por tipo
                if (entity.type === 'monster') {
                    this.monsters.push(entity);
                } else if (entity.type === 'npc') {
                    this.npcs.push(entity);
                } else {
                    this.items.push(entity);
                }
                
                entities.push(entity);
            }
        }
        
        return entities;
    }
    
    // Determinar quantidade de entidades para um chunk baseado no bioma
    _determineEntityCount(biome) {
        let baseCount = 0;
        
        // CHANGE: Reduce base counts by ~50%
        switch(biome) {
            case 'forest':
                baseCount = 2; // Reduced from 4
                break;
            case 'mountains':
                baseCount = 1; // Reduced from 2
                break;
            case 'desert':
                baseCount = 1; // No change (already minimal)
                break;
            case 'plains':
                baseCount = 2; // Reduced from 3
                break;
            case 'snow':
                baseCount = 1; // Reduced from 2
                break;
            case 'swamp':
                baseCount = 3; // Reduced from 5
                break;
            default:
                baseCount = 1;
        }
        
        // CHANGE: Smaller random variation
        const variation = Math.floor(Math.random() * 2); // 0 or 1 instead of 0-2
        
        // CHANGE: Reduce max entities per chunk
        this.maxEntitiesPerChunk = 5; // Reduced from 8
        
        return Math.min(baseCount + variation, this.maxEntitiesPerChunk);
    }
    // EntityManager.js - Add to _updateActiveEntities method
    _updateActiveEntities() {
        // Get player position
        const player = this.gameInstance.player;
        if (!player) return;
        
        const playerPosition = player.getPosition();
        
        // CHANGE: Define different update distances
        const FULL_UPDATE_DISTANCE = 30; // Entities within this range get full updates
        const PARTIAL_UPDATE_DISTANCE = 60; // Entities within this range get partial updates
        const PAUSE_UPDATE_DISTANCE = 100; // Entities beyond this range are paused
        
        for (const entity of this.entities) {
            if (!entity || (entity.isDisposed === true)) continue;
            
            // Get entity position
            const entityPosition = entity.getPosition ? entity.getPosition() : null;
            if (!entityPosition) continue;
            
            // Calculate distance to player
            const distance = BABYLON.Vector3.Distance(playerPosition, entityPosition);
            
            // Apply different update strategies based on distance
            if (distance < FULL_UPDATE_DISTANCE) {
                // Full update for nearby entities
                entity.updateFrequency = 1; // Update every frame
                
                // Update behavior based on entity type
                if (entity.type === 'monster') {
                    // Monster specific updates (already handled by monster controller)
                } else if (entity.type === 'npc') {
                    // NPC behavior
                    // ...rest of the NPC behavior code
                }
            } 
            else if (distance < PARTIAL_UPDATE_DISTANCE) {
                // Partial update for medium-distance entities
                // Only update every 3 frames
                if (entity.updateCounter === undefined) entity.updateCounter = 0;
                
                entity.updateCounter = (entity.updateCounter + 1) % 3;
                if (entity.updateCounter === 0) {
                    // Simplified update for medium range
                    if (entity.type === 'monster') {
                        // Simplified monster updates
                        // Don't check for wall collisions or other expensive operations
                    }
                }
            }
            else if (distance < PAUSE_UPDATE_DISTANCE) {
                // Minimal update for distant entities
                // Only update every 10 frames
                if (entity.updateCounter === undefined) entity.updateCounter = 0;
                
                entity.updateCounter = (entity.updateCounter + 1) % 10;
                if (entity.updateCounter === 0) {
                    // Very minimal updates for distant entities
                    // Just basic position maintenance
                }
            }
            else {
                // Pause updates for very distant entities
                // Optionally despawn if too far away
                if (entity.type !== 'npc') { // Keep NPCs loaded
                    this.removeEntity(entity);
                }
            }
        }
    }
    // Determinar tipo de entidade com base no bioma
    _determineEntityType(biome, x, z) {
        const rand = Math.random();
        
        // Probabilidades baseadas no bioma
        switch(biome) {
            case 'forest':
                if (rand < 0.7) return 'monster';
                if (rand < 0.9) return 'item';
                return 'npc';
                
            case 'mountains':
                if (rand < 0.6) return 'monster';
                if (rand < 0.95) return 'item';
                return 'npc';
                
            case 'desert':
                if (rand < 0.8) return 'monster';
                if (rand < 0.95) return 'item';
                return 'npc';
                
            case 'plains':
                if (rand < 0.5) return 'monster';
                if (rand < 0.8) return 'item';
                return 'npc';
                
            case 'snow':
                if (rand < 0.7) return 'monster';
                if (rand < 0.9) return 'item';
                return 'npc';
                
            case 'swamp':
                if (rand < 0.8) return 'monster';
                if (rand < 0.9) return 'item';
                return 'npc';
                
            default:
                if (rand < 0.7) return 'monster';
                if (rand < 0.9) return 'item';
                return 'npc';
        }
    }
    
    // Criar entidade específica
    async _createEntity(x, z, entityType, biome) {
        // Determinar a altura Y com base na altura do terreno
        const y = await this._getTerrainHeightAt(x, z);
        
        // Criar entidade baseada no tipo
        switch(entityType) {
            case 'monster':
                return await this._createMonster(x, y, z, biome);
                
            case 'npc':
                return await this._createNPC(x, y, z, biome);
                
            case 'item':
                return await this._createItem(x, y, z, biome);
                
            default:
                console.warn(`Tipo de entidade desconhecido: ${entityType}`);
                return null;
        }
    }
    
    // Obter altura do terreno em uma posição específica
    async _getTerrainHeightAt(x, z) {
        // Raycast para encontrar a altura do terreno
        const rayStart = new BABYLON.Vector3(x, 100, z); // Começar suficientemente alto
        const rayDirection = new BABYLON.Vector3(0, -1, 0); // Apontar para baixo
        
        // Criar ray
        const ray = new BABYLON.Ray(rayStart, rayDirection, 200); // Comprimento suficiente
        
        // Função para filtrar apenas meshes do terreno
        const predicate = (mesh) => {
            return mesh.metadata && mesh.metadata.isChunkTerrain;
        };
        
        // Fazer o raycast
        const hit = this.scene.pickWithRay(ray, predicate);
        
        if (hit.hit) {
            // Retornar a altura do terreno no ponto de impacto
            return hit.pickedPoint.y;
        }
        
        // Se não acertar nada, retornar um valor padrão
        return 0;
    }
    
    // Criar um monstro
    async _createMonster(x, y, z, biome) {
        // Tipo específico de monstro para o bioma
        const monsterType = this._getMonsterTypeForBiome(biome);
        
        // Posição inicial
        const position = new BABYLON.Vector3(x, y, z);
        
        // Criar o monstro
        const monster = this.spawnMonster(position, monsterType);
        
        // Configurar propriedades específicas
        if (monster) {
            // Adicionar metadados
            monster.id = this._generateEntityId();
            monster.type = 'monster';
            monster.biome = biome;
            monster.monsterType = monsterType;
            
            // Configurar comportamento baseado no bioma
            this._setupMonsterBehavior(monster, biome);
        }
        
        return monster;
    }
    
    // Spawn de monstro (método público para uso pelo jogo)
    spawnMonster(position, monsterType = null) {
        try {
            // Criar o monstro
            const monster = new Monster(this.scene, this.gameInstance.player, position);
            
            // Inicializar o monstro
            const monsterMesh = monster.initialize();
            
            // Registrar mesh do monstro para colisão
            if (monsterMesh && this.gameInstance.collisionSystem) {
                this.gameInstance.collisionSystem.addMesh(monsterMesh);
            }
            
            // Configurar tipo se especificado
            if (monsterType) {
                monster.setType(monsterType);
            }
            
            return monster;
        } catch (error) {
            console.error(`Erro ao criar monstro: ${error.message}`);
            return null;
        }
    }
    
    // Determinar tipo de monstro baseado no bioma
    _getMonsterTypeForBiome(biome) {
        switch(biome) {
            case 'forest':
                return Math.random() < 0.7 ? 'wolf' : 'bear';
                
            case 'desert':
                return Math.random() < 0.6 ? 'scorpion' : 'snake';
                
            case 'mountains':
                return Math.random() < 0.5 ? 'troll' : 'golem';
                
            case 'plains':
                return Math.random() < 0.8 ? 'zombie' : 'skeleton';
                
            case 'snow':
                return Math.random() < 0.7 ? 'frost_wolf' : 'yeti';
                
            case 'swamp':
                return Math.random() < 0.6 ? 'swamp_creature' : 'ghost';
                
            default:
                return 'zombie';
        }
    }
    
    // Configurar comportamento específico para o monstro baseado no bioma
    _setupMonsterBehavior(monster, biome) {
        const controller = monster.getController();
        
        if (controller && controller.model) {
            // Ajustar propriedades do monstro baseado no bioma
            switch(biome) {
                case 'desert':
                    // Monstros do deserto são mais lentos mas mais fortes
                    controller.model.speed *= 0.8;
                    controller.model.damage *= 1.5;
                    controller.model.health *= 1.2;
                    break;
                    
                case 'forest':
                    // Monstros da floresta são mais rápidos
                    controller.model.speed *= 1.2;
                    break;
                    
                case 'mountains':
                    // Monstros das montanhas são muito resistentes
                    controller.model.health *= 1.5;
                    controller.model.speed *= 0.9;
                    controller.model.damage *= 1.3;
                    break;
                    
                case 'plains':
                    // Monstros das planícies são balanceados
                    // Nenhuma mudança
                    break;
                    
                case 'snow':
                    // Monstros da neve são mais lentos mas fazem mais dano
                    controller.model.speed *= 0.85;
                    controller.model.damage *= 1.4;
                    break;
                    
                case 'swamp':
                    // Monstros do pântano são venenosos (mais dano)
                    controller.model.damage *= 1.3;
                    break;
            }
            
            // Atualizar texto de vida para refletir as mudanças
            controller.updateHealthText();
        }
    }
    
    // Criar um NPC (personagem não jogável)
    async _createNPC(x, y, z, biome) {
        // Implementação básica por enquanto
        // Similar ao monstro mas com comportamento amigável
        
        // Posição inicial
        const position = new BABYLON.Vector3(x, y, z);
        
        // Criar um NPC (usando um cubo simples por enquanto)
        const npc = BABYLON.MeshBuilder.CreateBox(
            `npc_${this._generateEntityId()}`,
            { width: 1, height: 2, depth: 1 },
            this.scene
        );
        
        // Posicionar o NPC
        npc.position = position;
        
        // Material colorido baseado no bioma
        const npcMaterial = new BABYLON.StandardMaterial(`npc_material_${biome}`, this.scene);
        
        switch(biome) {
            case 'forest':
                npcMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.3); // Verde
                break;
                
            case 'desert':
                npcMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.2); // Marrom claro
                break;
                
            case 'mountains':
                npcMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.7); // Cinza azulado
                break;
                
            case 'plains':
                npcMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.8, 0.2); // Verde claro
                break;
                
            case 'snow':
                npcMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.9); // Branco azulado
                break;
                
            case 'swamp':
                npcMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.3); // Verde acinzentado
                break;
                
            default:
                npcMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Cinza
        }
        
        npc.material = npcMaterial;
        
        // Configurar física
        npc.checkCollisions = true;
        npc.isPickable = true;
        
        // Adicionar metadados
        npc.id = this._generateEntityId();
        npc.type = 'npc';
        npc.biome = biome;
        
        // Adicionar métodos para compatibilidade com o sistema de entidades
        npc.getPosition = function() {
            return this.position;
        };
        
        npc.dispose = function() {
            if (this.isDisposed) return;
            this.isDisposed = true;
            this.dispose();
        };
        
        return npc;
    }
    
    // Criar um item colecionável
    async _createItem(x, y, z, biome) {
        // Tipo de item baseado no bioma
        const itemType = this._getItemTypeForBiome(biome);
        
        // Posição inicial
        const position = new BABYLON.Vector3(x, y, z);
        
        // Criar um item (esfera colorida por enquanto)
        const item = BABYLON.MeshBuilder.CreateSphere(
            `item_${this._generateEntityId()}`,
            { diameter: 0.5 },
            this.scene
        );
        
        // Posicionar levemente acima do chão
        item.position = new BABYLON.Vector3(x, y + 0.5, z);
        
        // Material brilhante baseado no tipo de item
        const itemMaterial = new BABYLON.StandardMaterial(`item_material_${itemType}`, this.scene);
        
        switch(itemType) {
            case 'health_potion':
                itemMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.2, 0.2); // Vermelho
                itemMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.1);
                break;
                
            case 'ammo':
                itemMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.2); // Amarelo
                itemMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.1);
                break;
                
            case 'food':
                itemMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.4, 0.0); // Laranja
                itemMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.2, 0.0);
                break;
                
            case 'building_material':
                itemMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Cinza
                itemMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                break;
                
            case 'rare_material':
                itemMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.1, 0.8); // Roxo
                itemMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.05, 0.4);
                break;
                
            default:
                itemMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.8); // Azul
                itemMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.3, 0.4);
        }
        
        // Adicionar brilho
        itemMaterial.specularPower = 64;
        itemMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        
        item.material = itemMaterial;
        
        // Animação de flutuação e rotação
        const amplitude = 0.2;
        const speed = 1 + Math.random() * 0.5;
        
        this.scene.registerBeforeRender(() => {
            if (item && !item.isDisposed) {
                // Flutuação
                const time = performance.now() * 0.001 * speed;
                item.position.y = y + 0.5 + Math.sin(time) * amplitude;
                
                // Rotação
                item.rotation.y += 0.01;
            }
        });
        
        // Configurar interação (pegar o item)
        item.actionManager = new BABYLON.ActionManager(this.scene);
        
        // Ação quando o jogador clica no item
        item.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => this._collectItem(item, itemType)
            )
        );
        
        // Adicionar metadados
        item.id = this._generateEntityId();
        item.type = 'item';
        item.itemType = itemType;
        item.biome = biome;
        
        // Adicionar métodos para compatibilidade com o sistema de entidades
        item.getPosition = function() {
            return this.position;
        };
        
        item.dispose = function() {
            if (this.isDisposed) return;
            this.isDisposed = true;
            this.dispose();
        };
        
        return item;
    }
    
    // Determinar tipo de item baseado no bioma
    _getItemTypeForBiome(biome) {
        const rand = Math.random();
        
        switch(biome) {
            case 'forest':
                if (rand < 0.4) return 'food';
                if (rand < 0.7) return 'health_potion';
                if (rand < 0.9) return 'building_material';
                return 'rare_material';
                
            case 'desert':
                if (rand < 0.3) return 'ammo';
                if (rand < 0.6) return 'building_material';
                if (rand < 0.9) return 'health_potion';
                return 'rare_material';
                
            case 'mountains':
                if (rand < 0.4) return 'building_material';
                if (rand < 0.7) return 'ammo';
                if (rand < 0.9) return 'health_potion';
                return 'rare_material';
                
            case 'plains':
                if (rand < 0.4) return 'food';
                if (rand < 0.7) return 'health_potion';
                if (rand < 0.9) return 'ammo';
                return 'rare_material';
                
            case 'snow':
                if (rand < 0.4) return 'health_potion';
                if (rand < 0.7) return 'ammo';
                if (rand < 0.9) return 'building_material';
                return 'rare_material';
                
            case 'swamp':
                if (rand < 0.3) return 'health_potion';
                if (rand < 0.6) return 'rare_material';
                if (rand < 0.9) return 'ammo';
                return 'food';
                
            default:
                if (rand < 0.3) return 'health_potion';
                if (rand < 0.6) return 'ammo';
                if (rand < 0.9) return 'food';
                return 'building_material';
        }
    }
    
    // Coletar um item
    _collectItem(item, itemType) {
        if (!item || item.isDisposed) return;
        
        // Obter o jogador
        const player = this.gameInstance.player;
        if (!player) return;
        
        // Fornecer benefícios baseados no tipo de item
        switch(itemType) {
            case 'health_potion':
                // Curar o jogador
                player.heal();
                this._showPickupMessage("Poção de Cura coletada!", "green");
                break;
                
            case 'ammo':
                // Adicionar munição
                const equippedGun = this._getPlayerEquippedGun();
                if (equippedGun) {
                    equippedGun.model.addAmmo(25);
                    player.updateAmmoDisplay();
                    this._showPickupMessage("25 Munições coletadas!", "yellow");
                } else {
                    this._showPickupMessage("Munição coletada, mas sem arma equipada!", "orange");
                }
                break;
                
            case 'food':
                // Pequena cura e buff temporário
                player.health = Math.min(player.maxHealth, player.health + 20);
                player.updateHealthBar();
                this._showPickupMessage("Comida coletada! (+20 Vida)", "orange");
                break;
                
            case 'building_material':
                // Adicionar materiais de construção
                const buildingController = player.controller?.buildingController;
                if (buildingController) {
                    buildingController.addMaterials(5, 2); // 5 blocos, 2 rampas
                    this._showPickupMessage("Materiais de Construção coletados!", "gray");
                } else {
                    this._showPickupMessage("Materiais coletados, mas modo construção não disponível!", "gray");
                }
                break;
                
            case 'rare_material':
                // Adicionar dinheiro e algum bônus especial
                if (player.addMoney) {
                    player.addMoney(50);
                    this._showPickupMessage("Material Raro coletado! (+50$)", "purple");
                } else {
                    this._showPickupMessage("Material Raro coletado!", "purple");
                }
                break;
                
            default:
                this._showPickupMessage("Item coletado!", "blue");
        }
        
        // Reproduzir som de coleta
        this._playPickupSound(itemType);
        
        // Remover o item do mundo
        this.removeEntity(item);
    }
    
    // Obter a arma equipada pelo jogador
    _getPlayerEquippedGun() {
        if (this.gameInstance.gunLoader) {
            return this.gameInstance.gunLoader.getPlayerGun();
        }
        return null;
    }
    
    // Mostrar mensagem de coleta de item
    _showPickupMessage(message, color) {
        // Criar uma interface fullscreen para mostrar a mensagem
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("pickupMessageUI", true);
        
        // Criar texto
        const textBlock = new BABYLON.GUI.TextBlock();
        textBlock.text = message;
        textBlock.color = "white";
        textBlock.fontSize = 24;
        textBlock.resizeToFit = true;
        textBlock.height = "40px";
        textBlock.fontFamily = "Arial";
        textBlock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        textBlock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        textBlock.paddingBottom = "100px";
        textBlock.outlineWidth = 2;
        textBlock.outlineColor = "black";
        
        advancedTexture.addControl(textBlock);
        
        // Animação de fade-in e fade-out
        textBlock.alpha = 0;
        
        // Fade-in
        const fadeIn = new BABYLON.Animation(
            "fadeIn",
            "alpha",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        const fadeInKeys = [];
        fadeInKeys.push({ frame: 0, value: 0 });
        fadeInKeys.push({ frame: 15, value: 1 });
        fadeIn.setKeys(fadeInKeys);
        
        // Fade-out
        const fadeOut = new BABYLON.Animation(
            "fadeOut",
            "alpha",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        const fadeOutKeys = [];
        fadeOutKeys.push({ frame: 0, value: 1 });
        fadeOutKeys.push({ frame: 30, value: 0 });
        fadeOut.setKeys(fadeOutKeys);
        
        // Executar animação
        this.scene.beginAnimation(textBlock, 0, 15, false, 1, () => {
            // Após fade-in, aguardar 1.5s e fazer fade-out
            setTimeout(() => {
                this.scene.beginAnimation(textBlock, 0, 30, false, 1, () => {
                    // Remover a UI após o fade-out
                    advancedTexture.dispose();
                });
            }, 1500);
        });
    }
    
    // Reproduzir som de coleta de item
    _playPickupSound(itemType) {
        // Verificar se o sistema de som está disponível
        if (!BABYLON.Sound) return;
        
        let soundName = "pickup_generic";
        
        // Escolher som baseado no tipo de item
        switch(itemType) {
            case 'health_potion':
                soundName = "pickup_potion";
                break;
            case 'ammo':
                soundName = "pickup_ammo";
                break;
            case 'food':
                soundName = "pickup_food";
                break;
            case 'building_material':
                soundName = "pickup_material";
                break;
            case 'rare_material':
                soundName = "pickup_rare";
                break;
        }
        
        // Reproduzir o som
        const sound = new BABYLON.Sound(
            soundName,
            "sounds/" + soundName + ".mp3",
            this.scene,
            null,
            {
                volume: 0.5,
                autoplay: true
            }
        );
    }
    
    // Atualizar entidades
    _updateEntities() {
        // Obter posição do jogador
        const player = this.gameInstance.player;
        if (!player) return;
        
        const playerPosition = player.getPosition();
        
        // Verificar entidades para despawn
        this.entities = this.entities.filter(entity => {
            if (!entity || (entity.isDisposed === true)) return false;
            
            // Obter posição da entidade
            const entityPosition = entity.getPosition ? entity.getPosition() : null;
            if (!entityPosition) return false;
            
            // Calcular distância ao jogador
            const distance = BABYLON.Vector3.Distance(playerPosition, entityPosition);
            
            // Se estiver muito longe, despawnar
            if (distance > this.despawnDistance) {
                this.removeEntity(entity);
                return false;
            }
            
            return true;
        });
        
        // Atualizar listas filtradas
        this.monsters = this.entities.filter(e => e.type === 'monster');
        this.npcs = this.entities.filter(e => e.type === 'npc');
        this.items = this.entities.filter(e => e.type === 'item');
    }
    
    // Atualizar entidades ativas (em cada frame)
    _updateActiveEntities() {
        // Obter posição do jogador
        const player = this.gameInstance.player;
        if (!player) return;
        
        const playerPosition = player.getPosition();
        
        // Processar apenas entidades próximas do jogador
        for (const entity of this.entities) {
            if (!entity || (entity.isDisposed === true)) continue;
            
            // Obter posição da entidade
            const entityPosition = entity.getPosition ? entity.getPosition() : null;
            if (!entityPosition) continue;
            
            // Calcular distância ao jogador
            const distance = BABYLON.Vector3.Distance(playerPosition, entityPosition);
            
            // Se estiver dentro do alcance de processamento
            if (distance < this.despawnDistance * 0.5) {
                // Atualizar comportamento baseado no tipo
                if (entity.type === 'monster') {
                    // Os monstros já possuem seu próprio controlador, não precisamos fazer nada aqui
                } else if (entity.type === 'npc') {
                    // Comportamento simples de NPC (rotação para o jogador se estiver perto)
                    if (distance < 10) {
                        // Calcular direção para o jogador
                        const direction = playerPosition.subtract(entityPosition).normalize();
                        
                        // Rotacionar para o jogador (apenas Y)
                        const angle = Math.atan2(direction.x, direction.z);
                        entity.rotation.y = angle;
                    }
                } else if (entity.type === 'item') {
                    // Animação de item já é feita no método de criação
                }
            }
        }
    }
    
    // Remover uma entidade
    removeEntity(entity) {
        if (!entity) return;
        
        // Marcar como disposto para evitar uso futuro
        entity.isDisposed = true;
        
        // Remover das listas
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
        
        // Remover da lista específica de tipo
        if (entity.type === 'monster') {
            const monsterIndex = this.monsters.indexOf(entity);
            if (monsterIndex > -1) {
                this.monsters.splice(monsterIndex, 1);
            }
        } else if (entity.type === 'npc') {
            const npcIndex = this.npcs.indexOf(entity);
            if (npcIndex > -1) {
                this.npcs.splice(npcIndex, 1);
            }
        } else if (entity.type === 'item') {
            const itemIndex = this.items.indexOf(entity);
            if (itemIndex > -1) {
                this.items.splice(itemIndex, 1);
            }
        }
        
        // Remover da cena (se for um mesh do Babylon)
        if (entity.dispose && typeof entity.dispose === 'function') {
            try {
                entity.dispose();
            } catch (error) {
                console.warn(`Erro ao remover entidade: ${error.message}`);
            }
        }
    }
    
    // Obter todas as entidades
    getAllEntities() {
        return this.entities;
    }
    
    // Obter todos os monstros
    getMonsters() {
        return this.monsters;
    }
    
    // Obter todos os NPCs
    getNPCs() {
        return this.npcs;
    }
    
    // Obter todos os itens
    getItems() {
        return this.items;
    }
}

export default EntityManager;