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
            // Criar um corpo principal para o monstro (mais alto)
            this.mesh = BABYLON.MeshBuilder.CreateBox("monsterBody", {
                width: 1.2,
                height: 2.6, // altura aumentada de 2 para 2.6
                depth: 0.8
            }, this.scene);
            
            // Posicionar o monstro
            this.mesh.position = this.position.clone();
            
            // Criar cabeça do monstro (ligeiramente maior que o corpo)
            const head = BABYLON.MeshBuilder.CreateBox("monsterHead", {
                width: 1.4,
                height: 0.9,
                depth: 0.9
            }, this.scene);
            head.position.y = 1.6; // Colocar a cabeça mais acima do corpo
            
            head.parent = this.mesh;
            
            // Criar olhos do monstro (vermelhos e brilhantes)
            const eyeLeft = BABYLON.MeshBuilder.CreateSphere("eyeLeft", { diameter: 0.25 }, this.scene);
            eyeLeft.position = new BABYLON.Vector3(-0.35, 1.7, 0.45); // ajustar altura dos olhos
            eyeLeft.parent = this.mesh;
            
            const eyeRight = BABYLON.MeshBuilder.CreateSphere("eyeRight", { diameter: 0.25 }, this.scene);
            eyeRight.position = new BABYLON.Vector3(0.35, 1.7, 0.45); // ajustar altura dos olhos
            eyeRight.parent = this.mesh;
            
            // Material para os olhos (brilhantes e emissivos)
            const eyeMaterial = new BABYLON.StandardMaterial("eyeMaterial", this.scene);
            eyeMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
            eyeMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);
            eyeMaterial.specularPower = 128;
            eyeLeft.material = eyeMaterial;
            eyeRight.material = eyeMaterial;
            
            // Criar chifres
            const hornLeft = BABYLON.MeshBuilder.CreateCylinder("hornLeft", {
                height: 0.8,
                diameterTop: 0,
                diameterBottom: 0.2,
                tessellation: 4
            }, this.scene);
            hornLeft.rotation.x = Math.PI / 4;
            hornLeft.position = new BABYLON.Vector3(-0.5, 2.1, 0.2); // ajustar altura dos chifres
            hornLeft.parent = this.mesh;
            
            const hornRight = BABYLON.MeshBuilder.CreateCylinder("hornRight", {
                height: 0.8,
                diameterTop: 0,
                diameterBottom: 0.2,
                tessellation: 4
            }, this.scene);
            hornRight.rotation.x = Math.PI / 4;
            hornRight.position = new BABYLON.Vector3(0.5, 2.1, 0.2); // ajustar altura dos chifres
            hornRight.parent = this.mesh;
            
            // Material principal do monstro com textura de lava/fogo
            const monsterMaterial = new BABYLON.StandardMaterial("monsterMaterial", this.scene);
            monsterMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.1, 0.1);
            monsterMaterial.specularColor = new BABYLON.Color3(1, 0.2, 0.2);
            monsterMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05);
            
            // Criar textura procedural de "lava"
            const lavaTex = new BABYLON.NoiseProceduralTexture("lavaTexture", 256, this.scene);
            lavaTex.animationSpeedFactor = 1.0;
            lavaTex.brightness = 0.7;
            lavaTex.octaves = 4;
            monsterMaterial.emissiveTexture = lavaTex;
            
            // Aplicar material ao corpo e cabeça
            this.mesh.material = monsterMaterial;
            head.material = monsterMaterial;
            
            // Material para chifres
            const hornMaterial = new BABYLON.StandardMaterial("hornMaterial", this.scene);
            hornMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            hornMaterial.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
            hornLeft.material = hornMaterial;
            hornRight.material = hornMaterial;
            
            // Configurar colisões
            this.mesh.checkCollisions = true;
            this.mesh.ellipsoid = new BABYLON.Vector3(0.6, 1.3, 0.4); // ajustar altura do elipsoide
            this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);
            
            // Adicionar efeito de partículas (fumaça/fogo ao redor do monstro)
            const particleSystem = new BABYLON.ParticleSystem("monsterParticles", 100, this.scene);
            particleSystem.particleTexture = new BABYLON.Texture("assets/textures/flare.png", this.scene);
            particleSystem.emitter = this.mesh;
            particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
            particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 2.6, 0.5); // ajustar altura das partículas
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
            
            // Adicionar luz principal do monstro (mais intensa e pulsante)
            const monsterLight = new BABYLON.PointLight("monsterLight", new BABYLON.Vector3(0, 1.3, 0), this.scene); // ajustar altura da luz
            monsterLight.diffuse = new BABYLON.Color3(1, 0.2, 0);
            monsterLight.specular = new BABYLON.Color3(1, 0.3, 0);
            monsterLight.intensity = 0.8;
            monsterLight.range = 5;
            
            // Anexar a luz ao monstro
            monsterLight.parent = this.mesh;
            
            // Criar animação de pulso para a luz
            const lightAnimation = new BABYLON.Animation(
                "lightPulse",
                "intensity",
                30,
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
        if (this.mesh) {
            this.mesh.position = position.clone();
            this.mesh.position.y = 0;
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