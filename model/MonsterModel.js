// Model - Responsável pelos dados e comportamento do monstro
class MonsterModel {
    constructor(scene, startPosition = new BABYLON.Vector3(0, 1, 0), modelPath = "textures/models/Zombie_Basic.obj") {
        this.scene = scene;
        this.position = startPosition;
        this.mesh = null;
        this.speed = 0.2;
        this.detectionRadius = 700; 
        this.isChasing = false;
        this.moveTimeout = null;
        this.health = 100;
        this.damage = 10;
        this.attackCooldown = 2000;
        this.lastAttackTime = 0;
        this.attackRange = 2;
        this.id = Math.random().toString(36).substring(2, 9);
        
        // Física
        this.gravity = -0.01;
        this.verticalVelocity = 0;
        this.isGrounded = false;
        this.groundCheckDistance = 0.2;
        
        // Evitar sobreposição
        this.monsterAvoidanceRadius = 1.5;
        
        // Cache para cálculos
        this._tempAwayDir = new BABYLON.Vector3();
    }

    async initialize() {
        const root = new BABYLON.Mesh("monsterRoot", this.scene);
        root.position = this.position.clone();
        root.isPickable = true;
        
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "", 
                "textures/models/", 
                "Zombie_Basic.obj", 
                this.scene
            );

            if (result.meshes.length > 0) {
                for (let i = 1; i < result.meshes.length; i++) {
                    result.meshes[i].parent = root;
                    result.meshes[i].isPickable = true;
                }
                
                root.scaling = new BABYLON.Vector3(3.5, 3.5, 3.5);
                root.checkCollisions = true;
                root.ellipsoid = new BABYLON.Vector3(1.8, 3.9, 1.2);
                root.ellipsoidOffset = new BABYLON.Vector3(0, 3.9, 0);
                
                const monsterLight = new BABYLON.PointLight("monsterLight", new BABYLON.Vector3(0, 2, 0), this.scene);
                monsterLight.parent = root;
                monsterLight.intensity = 0.5;
                monsterLight.diffuse = new BABYLON.Color3(0.7, 0.3, 0.3);
                monsterLight.range = 8;
                
                this.scene.registerBeforeRender(() => {
                    if (monsterLight && !monsterLight.isDisposed()) {
                        monsterLight.intensity = 0.3 + Math.sin(performance.now() * 0.002) * 0.2;
                    }
                });
            }
            
            this.mesh = root;
        } catch (error) {
            console.error(`Error loading monster model: ${error.message}`);
        }
        
        return this.mesh;
    }

    getMesh() {
        return this.mesh;
    }
    
    getPosition() {
        return this.mesh ? this.mesh.position : this.position;
    }
    
    setPosition(position) {
        this.position = position.clone();
        this.position.y = 1;
        if (this.mesh) {
            this.mesh.position = this.position.clone();
        }
    }
    
    canDetectPlayer(playerPosition) {
        if (!this.mesh) return false;
        const distance = BABYLON.Vector3.Distance(this.getPosition(), playerPosition);
        return distance <= this.detectionRadius;
    }
    
    moveTowardsPlayer(playerPosition, delta) {
        if (!this.mesh) return;
        
        const direction = playerPosition.subtract(this.getPosition());
        const directionY = direction.y;
        direction.y = 0;
        direction.normalize();
        
        this.lookAt(playerPosition);
        
        const speedFactor = this.speed * (delta / 16.67);
        
        const avoidanceDirection = this.calculateMonsterAvoidance();
        
        let finalDirection = direction.clone();
        if (avoidanceDirection) {
            const avoidanceWeight = 0.5;
            finalDirection = direction.scale(1 - avoidanceWeight).add(avoidanceDirection.scale(avoidanceWeight));
            finalDirection.normalize();
        }
        
        const movement = finalDirection.scale(speedFactor);
        
        if (Math.abs(directionY) > 0.5 && this.isGrounded) {
            movement.y = Math.sign(directionY) * 0.02;
        }
        
        this.moveWithCollision(movement);
    }
    
    calculateMonsterAvoidance() {
        if (!this.mesh || !this.scene.gameInstance) return null;
    
        // Inicializar grid se não existir
        if (!this.scene.gameInstance.spatialGrid) {
            this.scene.gameInstance.spatialGrid = {
                cellSize: 5,
                monsterCells: new Map(),
                lastUpdateTime: 0,
                updateInterval: 500,
            };
        }
    
        const grid = this.scene.gameInstance.spatialGrid;
        const now = Date.now();
        const currentPosition = this.getPosition();
        
        // Atualizar o grid periodicamente
        if (now - grid.lastUpdateTime > grid.updateInterval) {
            grid.monsterCells.clear();
            
            const monsters = this.scene.gameInstance.getMonsters?.() || [];
            for (const monster of monsters) {
                if (!monster.controller?.model || monster.controller.isDisposed) continue;
                
                const controller = monster.getController();
                if (!controller?.model) continue;
                
                const pos = controller.model.getPosition();
                if (!pos) continue;
                
                const cellX = Math.floor(pos.x / grid.cellSize);
                const cellZ = Math.floor(pos.z / grid.cellSize);
                const cellKey = `${cellX},${cellZ}`;
                
                if (!grid.monsterCells.has(cellKey)) {
                    grid.monsterCells.set(cellKey, []);
                }
                grid.monsterCells.get(cellKey).push(controller);
            }
            
            grid.lastUpdateTime = now;
        }
        
        // Obter células vizinhas
        const cellX = Math.floor(currentPosition.x / grid.cellSize);
        const cellZ = Math.floor(currentPosition.z / grid.cellSize);
        
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
        
        for (const otherController of cellsToCheck) {
            if (!otherController?.model || otherController.model === this || otherController.isDisposed) continue;
            
            const otherPos = otherController.model.getPosition();
            const distanceSq = BABYLON.Vector3.DistanceSquared(currentPosition, otherPos);
            
            if (distanceSq < avoidanceRadiusSq && distanceSq > 0.0001) {
                this._tempAwayDir.copyFrom(currentPosition);
                this._tempAwayDir.subtractInPlace(otherPos);
                
                const distance = Math.sqrt(distanceSq);
                const strength = (this.monsterAvoidanceRadius - distance) / this.monsterAvoidanceRadius;
                
                this._tempAwayDir.normalizeToNew(this._tempAwayDir);
                this._tempAwayDir.scaleInPlace(strength);
                
                totalAvoidance.addInPlace(this._tempAwayDir);
                nearbyCount++;
            }
        }
        
        if (nearbyCount > 0 && totalAvoidance.lengthSquared() > 0.0001) {
            totalAvoidance.normalize();
            return totalAvoidance;
        }
        
        return null;
    }
    
    lookAt(targetPosition) {
        if (!this.mesh) return;
        
        const lookAtTarget = targetPosition.clone();
        lookAtTarget.y = this.mesh.position.y;
        
        const direction = lookAtTarget.subtract(this.mesh.position).normalize();
        const angle = Math.atan2(direction.x, direction.z);
        
        // Suavização da rotação
        this.mesh.rotation.y += (angle - this.mesh.rotation.y) * 0.1;
    }

    moveWithCollision(movement) {
        if (!this.mesh) return;
        
        const fullMovement = new BABYLON.Vector3(
            movement.x, 
            this.verticalVelocity, 
            movement.z
        );
        
        this.mesh.moveWithCollisions(fullMovement);
    }
    
    applyGravity(delta) {
        if (!this.mesh) return;
        
        const timeScale = delta / 16.67;
        
        const origin = this.mesh.position.clone();
        const direction = new BABYLON.Vector3(0, -1, 0);
        const ray = new BABYLON.Ray(origin, direction, this.groundCheckDistance);
        const hit = this.scene.pickWithRay(ray);
        
        this.isGrounded = hit.hit;
        
        if (this.isGrounded && this.verticalVelocity <= 0) {
            this.verticalVelocity = 0;
            if (hit.pickedPoint) {
                this.mesh.position.y = hit.pickedPoint.y + 0.1;
            }
        } else {
            this.verticalVelocity += this.gravity * timeScale;
            this.mesh.position.y += this.verticalVelocity * timeScale;
            
            if (this.mesh.position.y < 0) {
                this.mesh.position.y = 0.1;
                this.verticalVelocity = 0;
                this.isGrounded = true;
            }
        }
    }

    canAttackPlayer(playerPosition) {
        if (!this.mesh) return false;
        
        const distance = BABYLON.Vector3.Distance(this.getPosition(), playerPosition);
        const now = Date.now();
        
        return distance <= this.attackRange && (now - this.lastAttackTime) >= this.attackCooldown;
    }
    
    attack() {
        this.lastAttackTime = Date.now();
        return this.damage;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
    
    startChasing() {
        this.isChasing = true;
        
        if (this.moveTimeout) {
            clearTimeout(this.moveTimeout);
            this.moveTimeout = null;
        }
    }
    
    stopChasing() {
        this.isChasing = false;
    }
    
    isPlayerChased() {
        return this.isChasing;
    }
}

export default MonsterModel;