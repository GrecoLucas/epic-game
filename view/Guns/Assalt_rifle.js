import GunView from '../GunView.js';

class AssaultRifle extends GunView {
    constructor(scene, model) {
        super(scene, model);
    }

    // Método específico para criar meshes físicos do rifle de assalto
    createPhysicalMeshes(scene) {
        if (!scene) scene = this.scene;
        this.physicalMeshes.forEach(mesh => mesh.dispose?.());
        this.physicalMeshes = [];

        // --- ARMA NO CHÃO ---
        const groundRoot = new BABYLON.TransformNode("gun_ground_root", scene);

        // Carregar o modelo OBJ do rifle para exibir no chão
        BABYLON.SceneLoader.ImportMesh("", "models/Gun/rifle/", "Rifle.obj", scene, (meshes) => {
            // Parent todos os meshes ao groundRoot
            meshes.forEach(mesh => {
                if (mesh.name !== "gun_ground_root") {
                    mesh.parent = groundRoot;
                    mesh.name = "gun_ground_" + mesh.name;
                    mesh.isPickable = true;
                    this.physicalMeshes.push(mesh);
                    
                    // Aplicar textura de Atlas para todas as partes da arma
                    const material = new BABYLON.StandardMaterial("gunMaterial", scene);
                    material.diffuseTexture = new BABYLON.Texture("models/Atlas.png", scene);
                    material.emissiveColor = BABYLON.Color3.FromHexString('#1a1a1a');
                    mesh.material = material;

                    // Configurar ActionManager para cada parte individual
                    mesh.actionManager = new BABYLON.ActionManager(scene);

                    // Ação de pickup
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                        BABYLON.ActionManager.OnPickTrigger,
                        () => {
                            if (this.onPickupCallback) {
                                console.log(`Pickup acionado na parte: ${mesh.name}`);
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

            // Ajustar tamanho e posição do modelo
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
        const animateGun = () => {
            if (this.model.isPickedUp || !groundRoot || !groundRoot.isEnabled()) return;
            groundRoot.rotation.y += 0.01;
            const t = performance.now() * 0.001;
            groundRoot.position.y = this.model.position.y + Math.sin(t * 2) * 0.05;
        };
        scene.registerBeforeRender(animateGun);

        // --- ARMA NA MÃO (POV) ---
        const handRoot = new BABYLON.TransformNode("gun_hand_root", scene);
        handRoot.parent = scene.activeCamera;
        
        // Posição temporária modificada para visualização completa da arma
        handRoot.position = new BABYLON.Vector3(1.0, -0.6, 1.0);  // Movida para a frente e para o lado
        handRoot.rotation = new BABYLON.Vector3(-0.01, -0.1, 0);  // Ângulo modificado para melhor visualização


        // Carregar o modelo OBJ do rifle para segurar na mão
        BABYLON.SceneLoader.ImportMesh("", "models/Gun/rifle/", "Rifle.obj", scene, (meshes) => {
            // Parent todos os meshes ao handRoot
            meshes.forEach(mesh => {
                if (mesh.name !== "gun_hand_root") {
                    mesh.parent = handRoot;
                    mesh.name = "gun_hand_" + mesh.name;
                    mesh.isPickable = false;
                    this.physicalMeshes.push(mesh);
                    
                    // Aplicar textura de Atlas para todas as partes da arma
                    const material = new BABYLON.StandardMaterial("gunHandMaterial", scene);
                    material.diffuseTexture = new BABYLON.Texture("models/Atlas.png", scene);
                    material.emissiveColor = BABYLON.Color3.FromHexString('#1a1a1a');
                    mesh.material = material;
                }
            });

            // Ajustar tamanho e posição do modelo
            handRoot.scaling = new BABYLON.Vector3(2, 2, 2);
            handRoot.rotation.x = -0.1;
            handRoot.rotation.y = -0.1;
            handRoot.rotation.z = 0;
            
            // Criar ponto de muzzle (boca do cano) para efeitos de tiro
            const muzzle = BABYLON.MeshBuilder.CreateSphere("muzzle_point", {diameter: 0.01}, scene);
            muzzle.parent = handRoot;
            muzzle.position = new BABYLON.Vector3(0, 0.025, 1.2); // Ajustada para o tamanho maior do rifle
            muzzle.isVisible = false;
            this.muzzlePoint = muzzle;
            this.physicalMeshes.push(muzzle);
        });

        this.handMesh = handRoot;
        this.physicalMeshes.push(handRoot);

        this.updateVisibility();
        return this.physicalMeshes;
    }
        // Sobrescrevendo o método playShootEffect para o rifle de assalto
    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Usar o método da classe pai como base
        super.playShootEffect();
        
        if (this.handMesh) {
            const originalRotation = this.handMesh.rotation.clone();
            
            // Recuo mais forte para rifle de assalto
            this.handMesh.rotation.x += 0.05;
            
            // Animar retorno à posição original
            setTimeout(() => {
                const frames = 6; // Mais frames para rifle (recuperação mais lenta)
                let frame = 0;
                
                const animateRecoil = () => {
                    frame++;
                    const progress = frame / frames;
                    
                    this.handMesh.rotation.x = originalRotation.x + 0.05 * (1 - progress);
                    
                    if (frame < frames) {
                        requestAnimationFrame(animateRecoil);
                    }
                };
                
                animateRecoil();
            }, 40);
        }
    }
    
    playReloadEffect(onCompleteCallback) {
        if (!this.model.isPickedUp || !this.handMesh) {
            if (onCompleteCallback) onCompleteCallback();
            return;
        }
        
        const DOWN_FRAMES = 40;
        const MAG_OUT_FRAMES = 20;
        const MAG_IN_FRAMES = 40;
        const UP_FRAMES = 32;
        const BOLT_PULL_FRAMES = 16;
        const BOLT_RELEASE_FRAMES = 20;
        
        const MAG_OUT_DELAY = 150;
        const MAG_IN_DELAY = 250;
        const BOLT_DELAY = 180;
        const FINISH_DELAY = 100;
        
        // Save original position and rotation
        const originalPosition = this.handMesh.position.clone();
        const originalRotation = this.handMesh.rotation.clone();
        
        // --- Sound effects (uncomment if you have a sound system) ---
        // this.playSound('reload_start');
        
        // --- PHASE 1: Lower weapon and tilt for magazine access ---
        let frame = 0;
        const animateDown = () => {
            frame++;
            const progress = frame / DOWN_FRAMES;
            const easeProgress = Math.sin(progress * Math.PI / 2); // Ease-out effect
            
            // Lower the rifle and tilt it for better magazine access
            this.handMesh.position.y = originalPosition.y - 0.25 * easeProgress;
            this.handMesh.rotation.x = originalRotation.x - 0.35 * easeProgress;
            // Add slight roll to simulate weapon manipulation
            this.handMesh.rotation.z = originalRotation.z + 0.1 * easeProgress;
            
            if (frame < DOWN_FRAMES) {
                requestAnimationFrame(animateDown);
            } else {
                // --- PHASE 2: Magazine removal ---
                // this.playSound('mag_out');
                frame = 0;
                
                const animateMagOut = () => {
                    frame++;
                    const progress = frame / MAG_OUT_FRAMES;
                    
                    // Slight backward motion to simulate magazine removal
                    this.handMesh.position.z = originalPosition.z - 0.03 * progress;
                    // Additional tilt during magazine removal
                    this.handMesh.rotation.x = originalRotation.x - 0.35 - (0.1 * Math.sin(progress * Math.PI));
                    
                    if (frame < MAG_OUT_FRAMES) {
                        requestAnimationFrame(animateMagOut);
                    } else {
                        // Magazine has been removed, wait before inserting new one
                        setTimeout(() => {
                            frame = 0;
                            // --- PHASE 3: Magazine insertion ---
                            // this.playSound('mag_in');
                            
                            const animateMagIn = () => {
                                frame++;
                                const progress = frame / MAG_IN_FRAMES;
                                const snapProgress = progress < 0.7 ? progress / 0.7 : 1;
                                
                                // Move weapon to simulate new magazine alignment
                                this.handMesh.position.z = originalPosition.z - 0.03 + (0.03 * snapProgress);
                                
                                // Simulate the "snap" of magazine insertion at the end
                                if (progress > 0.8) {
                                    const snapEffect = Math.sin((progress - 0.8) * 5 * Math.PI) * 0.015;
                                    this.handMesh.position.y = originalPosition.y - 0.25 + snapEffect;
                                }
                                
                                if (frame < MAG_IN_FRAMES) {
                                    requestAnimationFrame(animateMagIn);
                                } else {
                                    setTimeout(() => {
                                        // --- PHASE 4: Bring weapon back up ---
                                        frame = 0;
                                        
                                        const animateUp = () => {
                                            frame++;
                                            const progress = frame / UP_FRAMES;
                                            const easeProgress = 1 - Math.cos(progress * Math.PI / 2); // Ease-in effect
                                            
                                            // Return to original position but maintain some offset for bolt operation
                                            this.handMesh.position.y = originalPosition.y - 0.25 * (1 - easeProgress);
                                            this.handMesh.rotation.x = originalRotation.x - 0.35 * (1 - easeProgress);
                                            this.handMesh.rotation.z = originalRotation.z + 0.1 * (1 - easeProgress);
                                            
                                            if (frame < UP_FRAMES) {
                                                requestAnimationFrame(animateUp);
                                            } else {
                                                setTimeout(() => {
                                                    // --- PHASE 5: Operate the bolt ---
                                                    // this.playSound('bolt_pull');
                                                    frame = 0;
                                                    
                                                    // Pull bolt back
                                                    const animateBoltPull = () => {
                                                        frame++;
                                                        const progress = frame / BOLT_PULL_FRAMES;
                                                        const easeProgress = Math.sin(progress * Math.PI / 2); // Ease-out
                                                        
                                                        // Pull bolt back and slightly rotate the weapon
                                                        this.handMesh.position.z = originalPosition.z - 0.12 * easeProgress;
                                                        this.handMesh.rotation.y = originalRotation.y - 0.05 * easeProgress;
                                                        
                                                        if (frame < BOLT_PULL_FRAMES) {
                                                            requestAnimationFrame(animateBoltPull);
                                                        } else {
                                                            // Bolt is fully back, now release it
                                                            setTimeout(() => {
                                                                // this.playSound('bolt_release');
                                                                frame = 0;
                                                                
                                                                const animateBoltRelease = () => {
                                                                    frame++;
                                                                    const progress = frame / BOLT_RELEASE_FRAMES;
                                                                    // Faster snap-back for bolt release
                                                                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                                                                    
                                                                    // Quick bolt return with slight weapon shake
                                                                    this.handMesh.position.z = originalPosition.z - 0.12 * (1 - easeProgress);
                                                                    this.handMesh.rotation.y = originalRotation.y - 0.05 * (1 - easeProgress);
                                                                    
                                                                    // Add a slight vertical "jolt" when the bolt slams forward
                                                                    if (progress < 0.5) {
                                                                        this.handMesh.position.y = originalPosition.y + 0.02 * Math.sin(progress * Math.PI);
                                                                    }
                                                                    
                                                                    if (frame < BOLT_RELEASE_FRAMES) {
                                                                        requestAnimationFrame(animateBoltRelease);
                                                                    } else {
                                                                        // Animation complete, final reset and callback
                                                                        setTimeout(() => {
                                                                            // this.playSound('reload_complete');
                                                                            if (onCompleteCallback) onCompleteCallback();
                                                                        }, FINISH_DELAY);
                                                                    }
                                                                };
                                                                
                                                                animateBoltRelease();
                                                            }, BOLT_DELAY);
                                                        }
                                                    };
                                                    
                                                    animateBoltPull();
                                                }, MAG_IN_DELAY);
                                            }
                                        };
                                        
                                        animateUp();
                                    }, MAG_OUT_DELAY);
                                }
                            };
                            
                            animateMagIn();
                        }, MAG_OUT_DELAY);
                    }
                };
                
                animateMagOut();
            }
        };
        
        // Start the animation sequence
        animateDown();
    }

}

export default AssaultRifle;