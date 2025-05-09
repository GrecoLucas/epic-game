import GunView from '../GunView.js';

class Hammer extends GunView {
    constructor(scene, model) {
        super(scene, model);
        this.hammerSwingAnimation = null;
    }

    createPhysicalMeshes(scene) {
        if (!scene) scene = this.scene;
        this.physicalMeshes.forEach(mesh => mesh.dispose?.());
        this.physicalMeshes = [];
    
        // --- MARTELO NO CHÃO ---
        const groundRoot = new BABYLON.TransformNode("gun_ground_root", scene);
        
        // Carregar o modelo GLTF do martelo para exibir no chão
        BABYLON.SceneLoader.ImportMesh("", "models/Gun/hammer/", "scene.gltf", scene, (meshes) => {
            // Parent todos os meshes ao groundRoot
            meshes.forEach(mesh => {
                if (mesh.name !== "gun_ground_root") {
                    mesh.parent = groundRoot;
                    mesh.name = "gun_ground_" + mesh.name;
                    mesh.isPickable = true;
                    this.physicalMeshes.push(mesh);
                    
                    // Configurar ActionManager para cada parte individual
                    mesh.actionManager = new BABYLON.ActionManager(scene);
    
                    // Ação de pickup
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPickTrigger,
                        () => {
                            if (this.onPickupCallback) {
                                this.onPickupCallback();
                            }
                        }
                    ));
    
                    // Efeito de hover
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPointerOverTrigger,
                        () => {
                            meshes.forEach(p => {
                                if (p.material) p.material.emissiveColor = BABYLON.Color3.FromHexString('#555555');
                            });
                            document.body.style.cursor = 'pointer';
                        }
                    ));
    
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPointerOutTrigger,
                        () => {
                            meshes.forEach(p => {
                                if (p.material) p.material.emissiveColor = BABYLON.Color3.FromHexString('#1a1a1a');
                            });
                            document.body.style.cursor = 'auto';
                        }
                    ));
                }
            });
    
            // Ajustar tamanho e posição do modelo no chão
            groundRoot.scaling = new BABYLON.Vector3(0.04, 0.04, 0.04);
            groundRoot.rotation = new BABYLON.Vector3(0, math.PI / 4, 0);
        });
    
        groundRoot.position = new BABYLON.Vector3(
            this.model.position.x,
            this.model.position.y,
            this.model.position.z
        );
        
        this.groundMesh = groundRoot;
        this.physicalMeshes.push(groundRoot);
    
        // Animação de flutuação/rotação
        const animateGun = () => {
            if (this.model.isPickedUp || !groundRoot || !groundRoot.isEnabled()) return;
            groundRoot.rotation.y += 0.01;
            const t = performance.now() * 0.001;
            groundRoot.position.y = this.model.position.y + Math.sin(t * 2) * 0.05;
        };
        scene.registerBeforeRender(animateGun);
    
        // --- MARTELO NA MÃO (POV) ---
        const handRoot = new BABYLON.TransformNode("hammer_hand_root", scene);
        handRoot.parent = scene.activeCamera;
        handRoot.position = new BABYLON.Vector3(0.5, -0.6, 1.0);
        handRoot.rotation = new BABYLON.Vector3(-0.2, 0, 0);
    
        // Carregar o modelo GLTF do martelo para segurar na mão
        BABYLON.SceneLoader.ImportMesh("", "models/Gun/hammer/", "scene.gltf", scene, (meshes) => {
            // Parent todos os meshes ao handRoot
            meshes.forEach(mesh => {
                if (mesh.name !== "hammer_hand_root") {
                    mesh.parent = handRoot;
                    mesh.name = "hammer_hand_" + mesh.name;
                    mesh.isPickable = false;
                    this.physicalMeshes.push(mesh);
                }
            });
    
            // Ajustar tamanho e posição do modelo na mão
            handRoot.scaling = new BABYLON.Vector3(0.03, 0.03, 0.03); // Ajuste conforme necessário
            handRoot.rotation.x = -0.2;
            handRoot.rotation.y = 0;
            handRoot.rotation.z = 0;
        });
    
        this.handMesh = handRoot;
        this.physicalMeshes.push(handRoot);
    
        // Adicionar colisão para o martelo no chão
        const groundCollider = BABYLON.MeshBuilder.CreateBox("gun_ground_hammer_collider", {
            width: 0.8,
            height: 0.3,
            depth: 0.3
        }, scene);
        groundCollider.position.y = 0.5;
        groundCollider.isVisible = false;
        groundCollider.parent = this.groundMesh;
        
        // Definir interação
        groundCollider.isPickable = true;
        groundCollider.actionManager = new BABYLON.ActionManager(scene);
        groundCollider.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => {
                    if (this.onPickupCallback) this.onPickupCallback();
                }
            )
        );
        
        this.physicalMeshes.push(groundCollider);
        
        this.updateVisibility();
        return this.physicalMeshes;
    }

    playRepairAnimation() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Não iniciar nova animação se uma já estiver em andamento
        if (this.isAnimating) return;
        
        // Marca que uma animação está em andamento
        this.isAnimating = true;
        
        // Cancelar animação anterior, se houver
        if (this.hammerSwingAnimation) {
            this.scene.stopAnimation(this.handMesh);
        }
        
        // Configurar animação de balançar o martelo (aumentando o frameRate para acelerar)
        const frameRate = 30; // Aumentado de 20 para 30
        
        // Salvar rotação original
        const originalRotation = {
            x: this.handMesh.rotation.x,
            y: this.handMesh.rotation.y,
            z: this.handMesh.rotation.z
        };
        
        // Criar animação
        this.hammerSwingAnimation = new BABYLON.Animation(
            "hammerSwing",
            "rotation.x",
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Keyframes da animação (reduzidos para acelerar)
        const keyFrames = [];
        
        // Posição inicial
        keyFrames.push({
            frame: 0,
            value: originalRotation.x
        });
        
        // Martelo para trás (preparação)
        keyFrames.push({
            frame: 3, // Reduzido de 5 para 3
            value: originalRotation.x - Math.PI / 3
        });
        
        // Golpe para frente
        keyFrames.push({
            frame: 7, // Reduzido de 10 para 7
            value: originalRotation.x + Math.PI / 4
        });
        
        // Retornar à posição original
        keyFrames.push({
            frame: 12, // Reduzido de 20 para 12
            value: originalRotation.x
        });
        
        this.hammerSwingAnimation.setKeys(keyFrames);
        
        // Adicionar animação e iniciar
        this.handMesh.animations = [this.hammerSwingAnimation];
        
        // Iniciar a animação e configurar callback para quando terminar
        this.scene.beginAnimation(this.handMesh, 0, 12, false, 1.0, () => {
            // Liberar a flag de animação quando terminar
            this.isAnimating = false;
        });
        
        // Reproduzir som de martelada
        if (this.model.isPickedUp && this.onPlaySoundCallback) {
            this.onPlaySoundCallback('hammer_hit');
        }
    }
    // Sobrescrever o playShootEffect para usar a animação de martelo
    playShootEffect() {
        this.playRepairAnimation();
    }
    
    // Sobrescrever o método de recarga para não fazer nada
    playReloadEffect(callback) {
        if (callback) callback();
    }
}

export default Hammer;