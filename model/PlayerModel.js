class PlayerModel {
    constructor(scene, startPosition = null) {
        this.scene = scene;
        // Se uma posição inicial for fornecida, use-a; caso contrário, use a posição padrão
        this.position = startPosition || new BABYLON.Vector3(0, 1, 0);
        this.moveSpeed = 0.27;
        this.rotationSpeed = 0.04;
        this.mesh = null;
        this.jumpForce = 0.3; // Aumentado para um pulo mais alto e perceptível
        this.isGrounded = true; // Flag para verificar se o player está no chão
        this.gravity = -0.015; // Gravidade um pouco mais forte
        this.verticalVelocity = 0; // Velocidade vertical atual
        this.justJumped = false; // Flag para indicar que acabou de pular
        this.jumpFrameCount = 0; // Contador de frames para controlar delay após pulo
        
        this.initialize();
    }

    initialize() {
        // Criar mesh do jogador (invisível na primeira pessoa)
        this.mesh = BABYLON.MeshBuilder.CreateCapsule(
            "player",
            { radius: 0.5, height: 1.8 },
            this.scene
        );
        this.mesh.position = this.position;
        this.mesh.isVisible = false; // invisível na primeira pessoa
        this.mesh.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5); // Ajustar elipsoide de colisão
        this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 0.9, 0); // Centralizar o elipsoide
    }
    
    setPosition(position) {
        this.position = position;
        this.mesh.position = position;
    }
    
    getPosition() {
        return this.mesh.position;
    }
    
    getMesh() {
        return this.mesh;
    }
    
    moveWithDirection(direction) {
        this.mesh.moveWithCollisions(direction);
    }

    // Método para aplicar o pulo
    jump() {
        if (this.isGrounded) {
            this.verticalVelocity = this.jumpForce;
            this.isGrounded = false;
            this.justJumped = true; // Marca que acabou de pular
            this.jumpFrameCount = 0; // Reset do contador de frames
        }
    }

    // Método para atualizar a física do pulo/gravidade
    updatePhysics() {
        if (!this.isGrounded) {
            // Aplicar gravidade à velocidade vertical
            this.verticalVelocity += this.gravity;
        } else {
            // Reset da velocidade vertical quando estiver no chão
            if (this.verticalVelocity !== 0) {
                this.verticalVelocity = 0;
            }
        }

        // Aplicar movimento vertical
        if (this.verticalVelocity !== 0) {
            const verticalMovement = new BABYLON.Vector3(0, this.verticalVelocity, 0);
            this.mesh.moveWithCollisions(verticalMovement);
            
            // Se colidir com algo acima durante o pulo, reverter a velocidade vertical
            if (this.verticalVelocity > 0 && this.hasVerticalCollision()) {
                this.verticalVelocity = 0;
            }
        }
    }
    
    // Verifica se há colisão vertical acima do jogador
    hasVerticalCollision() {
        const origin = this.mesh.position.clone();
        origin.y += 0.9; // Posição da cabeça
        
        const ray = new BABYLON.Ray(origin, new BABYLON.Vector3(0, 1, 0), 0.2);
        const hit = this.scene.pickWithRay(ray, mesh => mesh.checkCollisions && mesh !== this.mesh);
        
        return hit && hit.pickedMesh;
    }

    // Método para definir se o jogador está no chão
    setGrounded(grounded) {
        if (this.isGrounded !== grounded) {
            this.isGrounded = grounded;
        }
    }
}

export default PlayerModel;