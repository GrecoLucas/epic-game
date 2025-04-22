class GunView {
    constructor(scene, model) {
        this.scene = scene;
        this.model = model;
        this.meshOnGround = null;
        this.meshInHand = null;
        this.physicalMeshes = [];
        this.init();
    }

    init() {
        // Criar meshes para a arma no chão e na mão
        this.createGroundMesh();
        this.createHandMesh();
        
        // Inicialmente, mostrar apenas a arma no chão se não estiver pega
        this.updateVisibility();
    }

    createGroundMesh() {
        // Apenas definir as propriedades do mesh, a criação física será feita separadamente
        this.meshOnGround = {
            type: 'box',
            width: 0.5,
            height: 0.2,
            depth: 1.5,
            color: '#555555',
            position: this.model.position,
            rotation: { x: 0, y: 0, z: 0 }
        };
    }

    createHandMesh() {
        this.meshInHand = {
            type: 'box',
            width: 0.4,
            height: 0.2,
            depth: 1.2,
            color: '#333333',
            position: { x: 0.5, y: -0.3, z: 0.8 },
            rotation: { x: 0, y: 0, z: 0 }
        };
    }
    
    // Criar meshes físicos para a cena
    createPhysicalMeshes(scene) {
        if (!scene) scene = this.scene;
        
        // Limpar meshes existentes
        this.physicalMeshes.forEach(mesh => {
            if (mesh && mesh.dispose) mesh.dispose();
        });
        this.physicalMeshes = [];
        
        // Criar mesh da arma no chão
        const gunMesh = BABYLON.MeshBuilder.CreateBox(
            "gun_ground", 
            {
                width: this.meshOnGround.width,
                height: this.meshOnGround.height,
                depth: this.meshOnGround.depth
            }, 
            scene
        );
        
        const gunMaterial = new BABYLON.StandardMaterial("gunMaterial", scene);
        gunMaterial.diffuseColor = BABYLON.Color3.FromHexString(this.meshOnGround.color);
        gunMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        gunMesh.material = gunMaterial;
        
        // Posicionar o mesh
        gunMesh.position.x = this.model.position.x;
        gunMesh.position.y = this.model.position.y + 0.1; // Leve elevação para ficar visível
        gunMesh.position.z = this.model.position.z;
        
        // Fazer o mesh flutuar/girar para chamar atenção
        const animateGun = () => {
            if (this.model.isPickedUp) return;
            
            // Rotação lenta
            gunMesh.rotation.y += 0.01;
            
            // Flutuação leve
            const time = performance.now() * 0.001; // tempo em segundos
            gunMesh.position.y = this.model.position.y + 0.1 + Math.sin(time * 2) * 0.05;
        };
        
        scene.registerBeforeRender(animateGun);
        
        // Adicionar à lista de meshes físicos
        this.physicalMeshes.push(gunMesh);
        
        // Criar mesh da arma na mão (inicialmente invisível)
        const handGunMesh = BABYLON.MeshBuilder.CreateBox(
            "gun_hand", 
            {
                width: this.meshInHand.width,
                height: this.meshInHand.height,
                depth: this.meshInHand.depth
            }, 
            scene
        );
        
        const handGunMaterial = new BABYLON.StandardMaterial("handGunMaterial", scene);
        handGunMaterial.diffuseColor = BABYLON.Color3.FromHexString(this.meshInHand.color);
        handGunMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        handGunMesh.material = handGunMaterial;
        
        // Configurar mesh da mão para seguir a câmera
        handGunMesh.parent = scene.activeCamera;
        handGunMesh.position = new BABYLON.Vector3(
            this.meshInHand.position.x,
            this.meshInHand.position.y,
            this.meshInHand.position.z
        );
        
        // Inicialmente invisível
        handGunMesh.isVisible = false;
        
        this.physicalMeshes.push(handGunMesh);
        
        // Atualizar referências para os meshes físicos
        this.groundMesh = gunMesh;
        this.handMesh = handGunMesh;
        
        // Atualizar visibilidade inicial
        this.updateVisibility();
        
        return this.physicalMeshes;
    }

    updateVisibility() {
        // Se estamos usando meshes físicos
        if (this.groundMesh && this.handMesh) {
            this.groundMesh.isVisible = !this.model.isPickedUp;
            this.handMesh.isVisible = this.model.isPickedUp;
            return;
        }
        
        // Log para depuração
        if (this.model.isPickedUp) {
            console.log("Arma no modo POV (na mão do jogador)");
        } else {
            console.log("Arma no modo de coleta (no chão)");
        }
    }

    update() {
        // Atualizar posição da arma no chão se necessário
        if (!this.model.isPickedUp && this.groundMesh) {
            this.groundMesh.position.x = this.model.position.x;
            this.groundMesh.position.z = this.model.position.z;
        }
        
        this.updateVisibility();
    }

    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Efeito de recuo ao atirar
        const originalPosition = new BABYLON.Vector3(
            this.meshInHand.position.x,
            this.meshInHand.position.y,
            this.meshInHand.position.z
        );
        
        // Recuar a arma
        this.handMesh.position.z += 0.2;
        
        // Criar efeito de flash
        if (this.scene) {
            const flash = new BABYLON.PointLight("muzzleFlash", 
                new BABYLON.Vector3(0, 0, 2), 
                this.scene
            );
            flash.parent = this.handMesh;
            flash.intensity = 1;
            flash.diffuse = new BABYLON.Color3(1, 0.7, 0);
            
            // Remover o flash após 100ms
            setTimeout(() => {
                flash.dispose();
            }, 100);
        }
        
        // Retornar à posição original após 100ms
        setTimeout(() => {
            if (this.handMesh) {
                this.handMesh.position = new BABYLON.Vector3(
                    originalPosition.x,
                    originalPosition.y,
                    originalPosition.z
                );
            }
        }, 100);
    }

    playReloadEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Animação simples de recarga
        const originalPosition = new BABYLON.Vector3(
            this.meshInHand.position.x,
            this.meshInHand.position.y, 
            this.meshInHand.position.z
        );
        
        // Abaixar a arma durante a recarga
        this.handMesh.position.y -= 0.2;
        
        // Retornar à posição original após a recarga
        setTimeout(() => {
            if (this.handMesh) {
                this.handMesh.position = new BABYLON.Vector3(
                    originalPosition.x,
                    originalPosition.y,
                    originalPosition.z
                );
            }
        }, this.model.reloadTime * 1000);
    }
}

export default GunView;
