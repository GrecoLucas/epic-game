// Model - Responsável pelos dados e comportamento do monstro
class MonsterModel {
    constructor(scene, startPosition = new BABYLON.Vector3(0, 1, 0)) {
        this.scene = scene;
        this.position = startPosition;
        this.mesh = null;
        this.speed = 0.2; // Velocidade de movimento do monstro
        this.detectionRadius = 5000; // Raio de detecção do jogador
        this.isChasing = false; // Se está perseguindo o jogador
        this.chaseTimeout = null; // Tempo de perseguição
        this.moveTimeout = null; // Tempo de movimento aleatório
        this.health = 100; // Vida do monstro
        this.damage = 10; // Dano causado ao jogador
        this.attackCooldown = 2000; // Tempo entre ataques em milissegundos
        this.lastAttackTime = 0; // Timestamp do último ataque
        this.attackRange = 2; // Distância para poder atacar o jogador
        this.id = Math.random().toString(36).substring(2, 9); // ID único para cada monstro

        // Adicionar propriedades de física
        this.gravity = -0.01; // Força da gravidade
        this.verticalVelocity = 0; // Velocidade vertical
        this.isGrounded = false;
        this.groundCheckDistance = 0.2;
        
        // Propriedades para evitar sobreposição entre monstros
        this.monsterAvoidanceRadius = 1.5; // Distância mínima entre monstros
    }

    initialize() {
        // --- Create Root Mesh ---
        // This will be the main mesh for the model, used for positioning and collisions.
        const root = new BABYLON.Mesh("monsterRoot", this.scene);
        root.position = this.position.clone(); // Set initial world position
        root.isPickable = true; // Make the root pickable

        // --- Create Body ---
        const body = BABYLON.MeshBuilder.CreateBox("monsterBody", {
            width: 1.2,
            height: 2.6,
            depth: 0.8
        }, this.scene);
        body.position.y = 0; // Center the body vertically relative to the root's origin (0,0,0)
        body.parent = root; // Parent body to the root
        body.isPickable = true; // Make body pickable

        // --- Create Head ---
        const head = BABYLON.MeshBuilder.CreateBox("monsterHead", {
            width: 1.4,
            height: 0.9,
            depth: 0.9
        }, this.scene);
        // Position head relative to the root's origin
        head.position.y = body.position.y + (body.scaling.y * 2.6 / 2) + (head.scaling.y * 0.9 / 2) - 0.2; // Place on top of body
        head.parent = root; // Parent head to the root
        head.isPickable = true; // Make head pickable

        // --- Create Eyes ---
        const eyeLeft = BABYLON.MeshBuilder.CreateSphere("eyeLeft", { diameter: 0.25 }, this.scene);
        // Position relative to the root
        eyeLeft.position = new BABYLON.Vector3(-0.35, head.position.y + 0.1, 0.45);
        eyeLeft.parent = root; // Parent to root
        eyeLeft.isPickable = true; // Make eye pickable

        const eyeRight = BABYLON.MeshBuilder.CreateSphere("eyeRight", { diameter: 0.25 }, this.scene);
        // Position relative to the root
        eyeRight.position = new BABYLON.Vector3(0.35, head.position.y + 0.1, 0.45);
        eyeRight.parent = root; // Parent to root
        eyeRight.isPickable = true; // Make eye pickable

        // --- Create Horns ---
        const hornLeft = BABYLON.MeshBuilder.CreateCylinder("hornLeft", {
            height: 0.8,
            diameterTop: 0,
            diameterBottom: 0.2,
            tessellation: 4
        }, this.scene);
        hornLeft.rotation.x = Math.PI / 4;
        // Position relative to the root
        hornLeft.position = new BABYLON.Vector3(-0.5, head.position.y + 0.5, 0.2);
        hornLeft.parent = root; // Parent to root
        hornLeft.isPickable = true; // Make horn pickable

        const hornRight = BABYLON.MeshBuilder.CreateCylinder("hornRight", {
            height: 0.8,
            diameterTop: 0,
            diameterBottom: 0.2,
            tessellation: 4
        }, this.scene);
        hornRight.rotation.x = Math.PI / 4;
        // Position relative to the root
        hornRight.position = new BABYLON.Vector3(0.5, head.position.y + 0.5, 0.2);
        hornRight.parent = root; // Parent to root
        hornRight.isPickable = true; // Make horn pickable

        // --- Assign Root Mesh to Model ---
        this.mesh = root; // The root mesh is now the main mesh for the model

        // --- Materials ---
        // Eye Material
        const eyeMaterial = new BABYLON.StandardMaterial("eyeMaterial", this.scene);
        eyeMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        eyeMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);
        eyeMaterial.specularPower = 128;
        eyeLeft.material = eyeMaterial;
        eyeRight.material = eyeMaterial;

        // Monster Material (Lava)
        const monsterMaterial = new BABYLON.StandardMaterial("monsterMaterial", this.scene);
        monsterMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.1, 0.1);
        monsterMaterial.specularColor = new BABYLON.Color3(1, 0.2, 0.2);
        monsterMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05);
        const lavaTex = new BABYLON.NoiseProceduralTexture("lavaTexture", 256, this.scene);
        lavaTex.animationSpeedFactor = 1.0;
        lavaTex.brightness = 0.7;
        lavaTex.octaves = 4;
        monsterMaterial.emissiveTexture = lavaTex;
        body.material = monsterMaterial; // Apply to body
        head.material = monsterMaterial; // Apply to head

        // Horn Material
        const hornMaterial = new BABYLON.StandardMaterial("hornMaterial", this.scene);
        hornMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        hornMaterial.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        hornLeft.material = hornMaterial;
        hornRight.material = hornMaterial;

        // --- Collisions (Apply to the root mesh) ---
        this.mesh.checkCollisions = true;
        // Adjust ellipsoid based on the overall size (body height is 2.6, positioned at y=1.3)
        this.mesh.ellipsoid = new BABYLON.Vector3(0.6, 1.3, 0.4); // Ellipsoid radius x, y, z
        this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 1.3, 0); // Offset the ellipsoid center to match body position

        return this.mesh; // Return the root mesh
    }


    getMesh() {
        return this.mesh;
    }
    
    getPosition() {
        return this.mesh ? this.mesh.position : this.position;
    }
    
    setPosition(position) {
        // Garante que o monstro fique na altura correta do chão
        this.position = position.clone();
        this.position.y = 1; // ou o valor correto do plano do jogador
        if (this.mesh) {
            this.mesh.position = this.position.clone();
            this.mesh.position.y = 1; // força o mesh para a altura correta
        }
    }
    
    // Verificar se o jogador está no raio de detecção
    canDetectPlayer(playerPosition) {
        if (!this.mesh) return false;
        
        const distance = BABYLON.Vector3.Distance(this.getPosition(), playerPosition);
        return distance <= this.detectionRadius;
    }
    
    // Atualizar posição do monstro em direção ao jogador
    moveTowardsPlayer(playerPosition, delta) {
        if (!this.mesh) return;
        
        // Calcular a direção para o jogador
        const direction = playerPosition.subtract(this.getPosition());
        
        // Preservar a componente y da direção para subir/descer rampas
        const directionY = direction.y;
        direction.y = 0; // Zerar Y para mover apenas no plano horizontal
        direction.normalize();
        
        // Fazer o monstro olhar para o jogador mesmo quando parado
        this.lookAt(playerPosition);
        
        // Calcular nova posição
        const speedFactor = this.speed * (delta / 16.67); // Normalizar pela taxa de quadros padrão
        
        // Evitar sobreposição entre monstros
        const avoidanceDirection = this.calculateMonsterAvoidance();
        
        // Combinar a direção para o jogador com a direção de evitação de outros monstros
        // Se avoidanceDirection não for nulo, ajustar a direção
        let finalDirection = direction.clone();
        if (avoidanceDirection) {
            // Peso da força de evitação (0.5 = 50% evitação, 50% perseguição)
            const avoidanceWeight = 0.5;
            
            // Combinar as direções (perseguição ao jogador + evitar outros monstros)
            finalDirection = direction.scale(1 - avoidanceWeight).add(avoidanceDirection.scale(avoidanceWeight));
            finalDirection.normalize(); // Normalizar para manter velocidade consistente
        }
        
        // Calculamos o movimento com base na direção final
        const movement = finalDirection.scale(speedFactor);
        
        // Se o jogador está acima ou abaixo e há uma rampa próxima, tentar subir
        if (Math.abs(directionY) > 0.5 && this.isGrounded) {
            // Tentar "escalar" na direção do jogador se estiver no chão
            // Isto simula a capacidade de subir rampas
            movement.y = Math.sign(directionY) * 0.02;
        }
        
        // Aplicar movimento com colisão (gravidade é aplicada pelo método applyGravity)
        this.moveWithCollision(movement);
    }
    
    
    // Método para calcular a direção para evitar outros monstros próximos (Otimizado com grid espacial)
    calculateMonsterAvoidance() {
        if (!this.mesh) return null;
    
        // Recuperar o sistema de grid da instância do jogo, ou criá-lo se não existir
        if (!this.scene.gameInstance.spatialGrid) {
            // Inicializar o grid na primeira vez (10x10 células com 5 unidades por célula)
            this.scene.gameInstance.spatialGrid = {
                cellSize: 5,
                monsterCells: new Map(), // Mapa de células para monstros
                lastUpdateTime: 0,
                updateInterval: 500, // Atualizar posições a cada 500ms
            };
        }
    
        const grid = this.scene.gameInstance.spatialGrid;
        const now = Date.now();
        const currentPosition = this.getPosition();
        
        // Atualizar o grid periodicamente para reduzir chamadas de função
        if (now - grid.lastUpdateTime > grid.updateInterval) {
            grid.monsterCells.clear();
            
            // Populate grid with monsters
            const monsters = this.scene.gameInstance?.getMonsters() || [];
            for (const controller of monsters) {
                if (!controller.model || controller.isDisposed) continue;
                
                const pos = controller.model.getPosition();
                if (!pos) continue;
                
                // Calcular célula baseado na posição
                const cellX = Math.floor(pos.x / grid.cellSize);
                const cellZ = Math.floor(pos.z / grid.cellSize);
                const cellKey = `${cellX},${cellZ}`;
                
                // Adicionar monster à célula
                if (!grid.monsterCells.has(cellKey)) {
                    grid.monsterCells.set(cellKey, []);
                }
                grid.monsterCells.get(cellKey).push(controller);
            }
            
            grid.lastUpdateTime = now;
        }
        
        // Obter célula atual e células vizinhas para verificação
        const cellX = Math.floor(currentPosition.x / grid.cellSize);
        const cellZ = Math.floor(currentPosition.z / grid.cellSize);
        
        // Criar lista de células a verificar (atual + 8 adjacentes)
        const cellsToCheck = [];
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                const key = `${cellX + x},${cellZ + z}`;
                if (grid.monsterCells.has(key)) {
                    cellsToCheck.push(...grid.monsterCells.get(key));
                }
            }
        }
        
        let totalAvoidance = BABYLON.Vector3.Zero();
        let nearbyCount = 0;
        const avoidanceRadiusSq = this.monsterAvoidanceRadius * this.monsterAvoidanceRadius;
        
        // Verificar apenas monstros nas células adjacentes
        for (const otherController of cellsToCheck) {
            // Evitar verificar a si mesmo
            if (otherController.model === this) continue;
            
            const otherPos = otherController.model.getPosition();
            const distanceSq = BABYLON.Vector3.DistanceSquared(currentPosition, otherPos);
            
            // Verificar apenas monstros realmente próximos
            if (distanceSq < avoidanceRadiusSq && distanceSq > 0.0001) {
                // Reutilizar um vetor temporário para otimizar a memória
                if (!this._tempAwayDir) {
                    this._tempAwayDir = new BABYLON.Vector3();
                }
                
                // Calcular direção de afastamento
                this._tempAwayDir.copyFrom(currentPosition);
                this._tempAwayDir.subtractInPlace(otherPos);
                
                // Calcular força baseado na proximidade (quanto mais próximo, mais forte)
                const distance = Math.sqrt(distanceSq);
                const strength = (this.monsterAvoidanceRadius - distance) / this.monsterAvoidanceRadius;
                
                this._tempAwayDir.normalizeToNew(this._tempAwayDir);
                this._tempAwayDir.scaleInPlace(strength);
                
                totalAvoidance.addInPlace(this._tempAwayDir);
                nearbyCount++;
            }
        }
        
        // Normalizar apenas se houver forças aplicadas
        if (nearbyCount > 0 && totalAvoidance.lengthSquared() > 0.0001) {
            totalAvoidance.normalize();
            return totalAvoidance;
        }
        
        return null;
    }
    
    lookAt(targetPosition) {
        if (!this.mesh) return;
        
        // Criar uma cópia da posição alvo mas manter a mesma altura Y do monstro
        // para evitar que ele incline para cima ou para baixo
        const lookAtTarget = targetPosition.clone();
        lookAtTarget.y = this.mesh.position.y;
        
        // Calcular a direção para o alvo
        const direction = lookAtTarget.subtract(this.mesh.position).normalize();
        
        // Calcular o ângulo de rotação no eixo Y (rotação horizontal)
        const angle = Math.atan2(direction.x, direction.z);
        
        // Aplicar a rotação suavemente
        const currentRotation = this.mesh.rotation.y;
        const targetRotation = angle;
        
        // Rotação suave usando interpolação linear
        const rotationSpeed = 0.1; // Ajuste este valor para controlar a velocidade de rotação
        this.mesh.rotation.y = currentRotation + (targetRotation - currentRotation) * rotationSpeed;
        
        // Aplicar efeito visual aos olhos para intensificar a sensação de ameaça
        // Faz os olhos brilharem mais intensamente quando olhando diretamente para o jogador
        const eyeLeft = this.scene.getMeshByName("eyeLeft");
        const eyeRight = this.scene.getMeshByName("eyeRight");
        
        if (eyeLeft && eyeRight && eyeLeft.material) {
            // Intensificar o brilho dos olhos quando olhando diretamente para o jogador
            const dotProduct = Math.abs(BABYLON.Vector3.Dot(direction, new BABYLON.Vector3(0, 0, 1)));
            const intensity = 0.8 + dotProduct * 0.5; // Varia de 0.8 a 1.3 dependendo do quão diretamente está olhando
            
            eyeLeft.material.emissiveColor = new BABYLON.Color3(intensity, 0, 0);
            eyeRight.material.emissiveColor = new BABYLON.Color3(intensity, 0, 0);
        }
    }
    // Movimento com colisão
    moveWithCollision(movement) {
        if (!this.mesh) return;
        
        // Criar um vetor de movimento que mantém a velocidade vertical
        const fullMovement = new BABYLON.Vector3(
            movement.x, 
            this.verticalVelocity, 
            movement.z
        );
        
        // Aplicar movimento com detecção de colisão
        this.mesh.moveWithCollisions(fullMovement);
    }
    
    applyGravity(delta) {
        if (!this.mesh) return;
        
        // Calcular o fator de tempo para o delta
        const timeScale = delta / 16.67; // Normalizar para ~60 FPS
        
        // Verificar se está no chão
        const origin = this.mesh.position.clone();
        const direction = new BABYLON.Vector3(0, -1, 0);
        const length = this.groundCheckDistance;
        
        // Ray para checar colisão com o chão
        const ray = new BABYLON.Ray(origin, direction, length);
        const hit = this.scene.pickWithRay(ray);
        
        // Atualizar flag de grounded
        this.isGrounded = hit.hit;
        
        if (this.isGrounded && this.verticalVelocity <= 0) {
            // No chão - parar a queda
            this.verticalVelocity = 0;
            
            // Ajustar a altura para ficar exatamente acima do chão
            if (hit.pickedPoint) {
                this.mesh.position.y = hit.pickedPoint.y + 0.1; // 0.1 acima do chão
            }
        } else {
            // Aplicar gravidade
            this.verticalVelocity += this.gravity * timeScale;
            
            // Mover o monstro verticalmente
            this.mesh.position.y += this.verticalVelocity * timeScale;
            
            // Limitar a queda máxima para evitar bugs
            if (this.mesh.position.y < 0) {
                this.mesh.position.y = 0.1;
                this.verticalVelocity = 0;
                this.isGrounded = true;
            }
        }
    }

    // Verificar se pode atacar o jogador
    canAttackPlayer(playerPosition) {
        if (!this.mesh) return false;
        
        const distance = BABYLON.Vector3.Distance(this.getPosition(), playerPosition);
        const now = Date.now();
        
        // Verificar se está no alcance e se o tempo de recarga passou
        return distance <= this.attackRange && (now - this.lastAttackTime) >= this.attackCooldown;
    }
    
    // Registrar um ataque
    attack() {
        this.lastAttackTime = Date.now();
        return this.damage;
    }
    
    // Tomar dano
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
    
    // Iniciar perseguição ao jogador
    startChasing() {
        this.isChasing = true;
        
        // Limpar timeout de movimento aleatório se existir
        if (this.moveTimeout) {
            clearTimeout(this.moveTimeout);
            this.moveTimeout = null;
        }
    }
    
    // Parar de perseguir o jogador
    stopChasing() {
        this.isChasing = false;
    }
    
    // Verificar se está perseguindo
    isPlayerChased() {
        return this.isChasing;
    }
}

export default MonsterModel;