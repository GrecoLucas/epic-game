// Model - Responsável pelos dados e comportamento do monstro
class MonsterModel {
    constructor(scene, startPosition = new BABYLON.Vector3(0, 1, 0)) {
        this.scene = scene;
        this.position = startPosition;
        this.mesh = null;
        this.speed = 0.2; // Velocidade de movimento do monstro
        this.detectionRadius = 50   ; // Raio de detecção do jogador
        this.isChasing = false; // Se está perseguindo o jogador
        this.chaseTimeout = null; // Tempo de perseguição
        this.moveTimeout = null; // Tempo de movimento aleatório
        this.health = 100; // Vida do monstro
        this.damage = 10; // Dano causado ao jogador
        this.attackCooldown = 2000; // Tempo entre ataques em milissegundos
        this.lastAttackTime = 0; // Timestamp do último ataque
        this.attackRange = 2; // Distância para poder atacar o jogador
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
        body.position.y = 1.3; // Center the body vertically relative to the root's origin (0,0,0)
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

        // --- Particle System (Emit from the root mesh) ---
        const particleSystem = new BABYLON.ParticleSystem("monsterParticles", 100, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("/textures/flare.png", this.scene);
        particleSystem.emitter = this.mesh; // Emitter is the root mesh
        // Adjust emit box relative to the root mesh's origin (0,0,0)
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.6, 0, -0.4); // Based on body size/2
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.6, 2.6, 0.4); // Based on body size/2 and height
        particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.8, 0.2, 0, 1.0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.6;
        particleSystem.emitRate = 30;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        particleSystem.gravity = new BABYLON.Vector3(0, 0.5, 0);
        particleSystem.start();

        // --- Point Light (Parent to the root mesh) ---
        const monsterLight = new BABYLON.PointLight("monsterLight", new BABYLON.Vector3(0, 1.3, 0), this.scene); // Position relative to root
        monsterLight.diffuse = new BABYLON.Color3(1, 0.2, 0);
        monsterLight.specular = new BABYLON.Color3(1, 0.3, 0);
        monsterLight.intensity = 0.8;
        monsterLight.range = 5;
        monsterLight.parent = this.mesh; // Parent light to the root mesh

        // Light Animation
        const lightAnimation = new BABYLON.Animation(
            "lightPulse", "intensity", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        const keyFrames = [];
        keyFrames.push({ frame: 0, value: 0.8 });
        keyFrames.push({ frame: 15, value: 1.5 });
        keyFrames.push({ frame: 30, value: 0.8 });
        lightAnimation.setKeys(keyFrames);
        monsterLight.animations = [lightAnimation];
        this.scene.beginAnimation(monsterLight, 0, 30, true);

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
        direction.y = 0; // Manter no mesmo plano Y
        direction.normalize();
        
        // Fazer o monstro olhar para o jogador mesmo quando parado
        this.lookAt(playerPosition);
        
        // Calcular nova posição
        const speedFactor = this.speed * (delta / 16.67); // Normalizar pela taxa de quadros padrão
        const movement = direction.scale(speedFactor);
        
        // Aplicar movimento com colisão
        this.moveWithCollision(movement);
        this.mesh.position.y = 0;
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
        
        // Guardar a altura Y atual
        const originalY = this.mesh.position.y;
        
        // Aplicar movimento com detecção de colisão
        this.mesh.moveWithCollisions(movement);
        
        this.mesh.position.y = originalY;
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