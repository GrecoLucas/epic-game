import GunView from '../GunView.js';

class Pistol extends GunView {
    constructor(scene, model) {
        super(scene, model);
    }

    // Método específico para criar meshes físicos da pistola
    createPhysicalMeshes(scene) {
        if (!scene) scene = this.scene;
        this.physicalMeshes.forEach(mesh => mesh.dispose?.());
        this.physicalMeshes = [];

        // --- ARMA NO CHÃO ---
        const groundRoot = this._createGroundGunMesh(scene);
        
        // --- ARMA NA MÃO (POV) ---
        const handRoot = this._createHandGunMesh(scene);

        this.updateVisibility();
        return this.physicalMeshes;
    }
    
    _createGroundGunMesh(scene) {
        const groundRoot = new BABYLON.TransformNode("gun_ground_root", scene);

        BABYLON.SceneLoader.ImportMesh("", "models/Gun/pistol/", "Pistol.obj", scene, (meshes) => {
            meshes.forEach(mesh => {
                if (mesh.name !== "gun_ground_root") {
                    mesh.parent = groundRoot;
                    mesh.name = "gun_ground_" + mesh.name;
                    mesh.isPickable = true;
                    this.physicalMeshes.push(mesh);
                    
                    // Material comum para todas as partes
                    const material = new BABYLON.StandardMaterial("gunMaterial", scene);
                    material.diffuseTexture = new BABYLON.Texture("models/Atlas.png", scene);
                    material.emissiveColor = BABYLON.Color3.FromHexString('#1a1a1a');
                    mesh.material = material;

                    // ActionManager para interações
                    this._setupMeshInteractions(mesh, meshes);
                }
            });

            groundRoot.scaling = new BABYLON.Vector3(2, 2, 2);
            groundRoot.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
        });

        groundRoot.position = new BABYLON.Vector3(
            this.model.position.x,
            this.model.position.y,
            this.model.position.z
        );
        
        this.groundMesh = groundRoot;
        this.physicalMeshes.push(groundRoot);

        // Animação de flutuação/rotação
        this._setupFloatingAnimation(groundRoot);
        
        return groundRoot;
    }
    
    _createHandGunMesh(scene) {
        const handRoot = new BABYLON.TransformNode("gun_hand_root", scene);
        handRoot.parent = scene.activeCamera;
        handRoot.position = new BABYLON.Vector3(1.0, -0.6, 1.2);
        handRoot.rotation = new BABYLON.Vector3(-0.01, -0.1, 0);

        BABYLON.SceneLoader.ImportMesh("", "models/Gun/pistol/", "Pistol.obj", scene, (meshes) => {
            meshes.forEach(mesh => {
                if (mesh.name !== "gun_hand_root") {
                    mesh.parent = handRoot;
                    mesh.name = "gun_hand_" + mesh.name;
                    mesh.isPickable = false;
                    this.physicalMeshes.push(mesh);
                    
                    const material = new BABYLON.StandardMaterial("gunHandMaterial", scene);
                    material.diffuseTexture = new BABYLON.Texture("models/Atlas.png", scene);
                    material.emissiveColor = BABYLON.Color3.FromHexString('#1a1a1a');
                    mesh.material = material;
                }
            });

            handRoot.scaling = new BABYLON.Vector3(2, 2, 2);
            handRoot.rotation.x = -0.2;
            handRoot.rotation.y = -0.1;
            handRoot.rotation.z = 0;
            
            // Muzzle point para efeitos visuais
            this._createMuzzlePoint(handRoot, scene);
        });

        this.handMesh = handRoot;
        this.physicalMeshes.push(handRoot);
        
        return handRoot;
    }
    
    _setupMeshInteractions(mesh, allMeshes) {
        mesh.actionManager = new BABYLON.ActionManager(this.scene);

        // Pickup action
        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => this.onPickupCallback?.()
            )
        );

        // Hover effect
        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                    allMeshes.forEach(p => {
                        if (p.material) p.material.emissiveColor = BABYLON.Color3.FromHexString('#555555');
                    });
                    document.body.style.cursor = 'pointer';
                }
            )
        );

        mesh.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    allMeshes.forEach(p => {
                        if (p.material) p.material.emissiveColor = BABYLON.Color3.FromHexString('#1a1a1a');
                    });
                    document.body.style.cursor = 'auto';
                }
            )
        );
    }
    
    _setupFloatingAnimation(rootMesh) {
        const animateGun = () => {
            if (this.model.isPickedUp || !rootMesh || !rootMesh.isEnabled()) return;
            
            rootMesh.rotation.y += 0.01;
            const t = performance.now() * 0.001;
            rootMesh.position.y = this.model.position.y + Math.sin(t * 2) * 0.05;
        };
        
        this.scene.registerBeforeRender(animateGun);
    }
    
    _createMuzzlePoint(parentMesh, scene) {
        const muzzle = BABYLON.MeshBuilder.CreateSphere("muzzle_point", {diameter: 0.01}, scene);
        muzzle.parent = parentMesh;
        muzzle.position = new BABYLON.Vector3(0, 0.025, 0.8);
        muzzle.isVisible = false;
        this.muzzlePoint = muzzle;
        this.physicalMeshes.push(muzzle);
    }

    // Método para criar efeito visual ao recarregar a pistola
    playReloadEffect(onCompleteCallback) {
        if (!this.model.isPickedUp || !this.handMesh) {
            if (onCompleteCallback) onCompleteCallback();
            return;
        }
        
        // Salvar a posição e rotação original da arma
        const originalPosition = this.handMesh.position.clone();
        const originalRotation = this.handMesh.rotation.clone();
        
        // Animação de movimento para simular recarga
        const frames = 15;
        let frame = 0;
        
        // Primeira fase: baixar a arma e rotacionar
        const animateDown = () => {
            frame++;
            const progress = frame / frames;
            
            this.handMesh.position.y = originalPosition.y - 0.2 * progress;
            this.handMesh.rotation.x = originalRotation.x - 0.3 * progress;
            
            if (frame < frames) {
                requestAnimationFrame(animateDown);
            } else {
                // Segunda fase: inserir novo carregador
                setTimeout(() => {
                    // Efeito de clique
                    this.handMesh.position.z -= 0.05;
                    setTimeout(() => this.handMesh.position.z += 0.05, 100);
                    
                    // Retornar à posição original
                    frame = 0;
                    const animateUp = () => {
                        frame++;
                        const progress = frame / frames;
                        
                        this.handMesh.position.y = originalPosition.y - 0.2 * (1 - progress);
                        this.handMesh.rotation.x = originalRotation.x - 0.3 * (1 - progress);
                        
                        if (frame < frames) {
                            requestAnimationFrame(animateUp);
                        } else {
                            // Simular o slide da pistola
                            setTimeout(() => {
                                this.handMesh.position.z -= 0.1;
                                
                                setTimeout(() => {
                                    const slideFrames = 5;
                                    let slideFrame = 0;
                                    
                                    const animateSlide = () => {
                                        slideFrame++;
                                        const slideProgress = slideFrame / slideFrames;
                                        
                                        this.handMesh.position.z = originalPosition.z - 0.1 * (1 - slideProgress);
                                        
                                        if (slideFrame < slideFrames) {
                                            requestAnimationFrame(animateSlide);
                                        } else {
                                            if (onCompleteCallback) {
                                                onCompleteCallback();
                                            }
                                        }
                                    };
                                    
                                    animateSlide();
                                }, 200);
                            }, 200);
                        }
                    };
                    
                    animateUp();
                }, 300);
            }
        };
        
        animateDown();
    }
    
    // Método para obter a duração total da animação de recarga
    getReloadAnimationDuration() {
        const framesTime = (15 + 15 + 5) * 16.7;
        const delaysTime = 300 + 200 + 200;
        return framesTime + delaysTime;
    }

    // Sobrescrevendo o método playShootEffect para a pistola
    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Usar o método da classe pai como base
        super.playShootEffect();
        
        if (this.handMesh) {
            const originalRotation = this.handMesh.rotation.clone();
            
            // Recuo da pistola (mais leve que rifle)
            this.handMesh.rotation.x += 0.025;
            
            // Animação de retorno do recuo
            setTimeout(() => {
                const frames = 4;
                let frame = 0;
                
                const animateRecoil = () => {
                    frame++;
                    const progress = frame / frames;
                    
                    this.handMesh.rotation.x = originalRotation.x + 0.025 * (1 - progress);
                    
                    if (frame < frames) {
                        requestAnimationFrame(animateRecoil);
                    }
                };
                
                animateRecoil();
            }, 25);
        }
    }

    getMuzzleFlashParams() {
        const params = super.getMuzzleFlashParams();
        // Modificando apenas a posição para a pistola
        params.position = new BABYLON.Vector3(0, 0.1, -0.1);
        return params;
    }
}

export default Pistol;