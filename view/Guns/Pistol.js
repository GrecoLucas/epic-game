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
        const groundRoot = new BABYLON.TransformNode("gun_ground_root", scene);

        // Corpo principal
        const base = BABYLON.MeshBuilder.CreateBox("gun_ground_base", {
            width: 0.15, height: 0.18, depth: 0.8
        }, scene);
        base.parent = groundRoot;
        base.position.y = 0.05;

        // Slide
        const slide = BABYLON.MeshBuilder.CreateBox("gun_ground_slide", {
            width: 0.14, height: 0.1, depth: 0.61 
        }, scene);
        slide.parent = base;
        slide.position = new BABYLON.Vector3(0, 0.1, -0.1);

        // Cabo
        const handle = BABYLON.MeshBuilder.CreateBox("gun_ground_handle", {
            width: 0.12, height: 0.4, depth: 0.15
        }, scene);
        handle.parent = groundRoot;
        handle.position = new BABYLON.Vector3(0, -0.15, -0.2);
        handle.rotation.x = -0.2;

        // Cano
        const barrel = BABYLON.MeshBuilder.CreateCylinder("gun_ground_barrel", {
            height: 0.5, diameter: 0.06
        }, scene);
        barrel.parent = groundRoot;
        barrel.rotation.x = Math.PI / 2;
        barrel.position = new BABYLON.Vector3(0, 0.08, 0.55);

        // Miras
        const rearSight = BABYLON.MeshBuilder.CreateBox("gun_ground_rear_sight", { width: 0.08, height: 0.04, depth: 0.02 }, scene);
        rearSight.parent = slide;
        rearSight.position = new BABYLON.Vector3(0, 0.07, -0.25);

        const frontSight = BABYLON.MeshBuilder.CreateBox("gun_ground_front_sight", { width: 0.02, height: 0.05, depth: 0.02 }, scene);
        frontSight.parent = slide;
        frontSight.position = new BABYLON.Vector3(0, 0.07, 0.25);

        // --- Materiais ---
        const baseColor = this.meshOnGround.color; // '#303030'
        const handleColor = '#4a4a4a'; // Slightly lighter gray for handle
        const slideColor = '#252525'; // Darker gray for slide/barrel
        const sightColor = '#101010'; // Very dark gray for sights

        const baseMaterial = this.createMaterial(baseColor, scene, { emissive: '#1a1a1a' });
        const handleMaterial = this.createMaterial(handleColor, scene, { emissive: '#202020' });
        const slideMaterial = this.createMaterial(slideColor, scene, { emissive: '#101010' });
        const sightMaterial = this.createMaterial(sightColor, scene, { emissive: '#050505' });

        // Aplicar materiais às partes do chão
        base.material = baseMaterial;
        slide.material = slideMaterial;
        handle.material = handleMaterial;
        barrel.material = slideMaterial; // Re-use slide material for barrel
        rearSight.material = sightMaterial;
        frontSight.material = sightMaterial;

        const groundGunParts = [base, slide, handle, barrel, rearSight, frontSight];
        groundGunParts.forEach(part => {
            // part.material is already set above
            part.isPickable = true;
            this.physicalMeshes.push(part);

            // Configurar ActionManager para cada parte individual
            part.actionManager = new BABYLON.ActionManager(scene);

            // Ação de pickup
            part.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => {
                    if (this.onPickupCallback) {
                        console.log(`Pickup acionado na parte: ${part.name}`);
                        this.onPickupCallback();
                        this.playPickupEffect(groundRoot);
                    }
                }
            ));

            // Efeito de hover - Aplicar a todas as partes para consistência
            part.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                    groundGunParts.forEach(p => {
                        if (p.material) p.material.emissiveColor = BABYLON.Color3.FromHexString('#555555'); // Brilho uniforme no hover
                    });
                    document.body.style.cursor = 'pointer';
                }
            ));

            part.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    // Restaurar emissive original baseado no material da parte
                    groundGunParts.forEach(p => {
                        if (p.material === baseMaterial) p.material.emissiveColor = BABYLON.Color3.FromHexString('#1a1a1a');
                        else if (p.material === handleMaterial) p.material.emissiveColor = BABYLON.Color3.FromHexString('#202020');
                        else if (p.material === slideMaterial) p.material.emissiveColor = BABYLON.Color3.FromHexString('#101010');
                        else if (p.material === sightMaterial) p.material.emissiveColor = BABYLON.Color3.FromHexString('#050505');
                    });
                    document.body.style.cursor = 'auto';
                }
            ));
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
            if (this.model.isPickedUp || !groundRoot || !groundRoot.isEnabled()) return; // Check if enabled
            groundRoot.rotation.y += 0.01;
            const t = performance.now() * 0.001;
            groundRoot.position.y = this.model.position.y + Math.sin(t * 2) * 0.05;
        };
        scene.registerBeforeRender(animateGun);

        // --- ARMA NA MÃO (POV) ---
        const handRoot = new BABYLON.TransformNode("gun_hand_root", scene);
        handRoot.parent = scene.activeCamera;
        
        // Posição temporária modificada para visualização completa da arma
        handRoot.position = new BABYLON.Vector3(0.5, -0.25, 1);  // Movida para a frente e para o lado
        handRoot.rotation = new BABYLON.Vector3(-0.01, -0.1, 0);  // Ângulo modificado para melhor visualização

        // Replicar a estrutura e materiais da arma do chão para a mão
        const handBase = base.clone("gun_hand_base");
        handBase.material = baseMaterial.clone("handBaseMat"); // Clone material
        handBase.parent = handRoot;

        const handSlide = slide.clone("gun_hand_slide");
        handSlide.material = slideMaterial.clone("handSlideMat"); // Clone material
        handSlide.parent = handBase;

        const handHandle = handle.clone("gun_hand_handle");
        handHandle.material = handleMaterial.clone("handHandleMat"); // Clone material
        handHandle.parent = handRoot;

        const handBarrel = barrel.clone("gun_hand_barrel");
        handBarrel.material = slideMaterial.clone("handBarrelMat"); // Clone material (same as slide)
        handBarrel.parent = handRoot;

        const handRearSight = rearSight.clone("gun_hand_rear_sight");
        handRearSight.material = sightMaterial.clone("handRearSightMat"); // Clone material
        handRearSight.parent = handSlide;

        const handFrontSight = frontSight.clone("gun_hand_front_sight");
        handFrontSight.material = sightMaterial.clone("handFrontSightMat"); // Clone material
        handFrontSight.parent = handSlide;

        const handGunParts = [handBase, handSlide, handHandle, handBarrel, handRearSight, handFrontSight];
        handGunParts.forEach(part => {
            part.isPickable = false;
            this.physicalMeshes.push(part);
            // Remover ActionManager dos clones da mão
            part.actionManager = null;
        });

        // Ajustar emissiveColor dos materiais clonados da mão (se necessário, pode ser igual ao do chão)
        handBase.material.emissiveColor = BABYLON.Color3.FromHexString('#1a1a1a');
        handSlide.material.emissiveColor = BABYLON.Color3.FromHexString('#101010');
        handHandle.material.emissiveColor = BABYLON.Color3.FromHexString('#202020');
        handBarrel.material.emissiveColor = BABYLON.Color3.FromHexString('#101010');
        handRearSight.material.emissiveColor = BABYLON.Color3.FromHexString('#050505');
        handFrontSight.material.emissiveColor = BABYLON.Color3.FromHexString('#050505');

        // handRoot.isVisible = false; // Visibility is handled by setEnabled now
        this.handMesh = handRoot;
        this.physicalMeshes.push(handRoot);

        // Ponto de efeito para o tiro
        const muzzle = BABYLON.MeshBuilder.CreateSphere("muzzle_point", {diameter: 0.01}, scene);
        muzzle.parent = handRoot;
        // Use handBarrel which is already parented to handRoot
        muzzle.position = handBarrel.position.add(new BABYLON.Vector3(0, 0, handBarrel.scaling.y * 0.25)); // Adjusted based on cylinder height (0.5 / 2)
        muzzle.isVisible = false;
        this.muzzlePoint = muzzle;
        this.physicalMeshes.push(muzzle);

        this.updateVisibility(); // Atualizar visibilidade inicial

        return this.physicalMeshes;
    }

    // Método para mostrar efeito de recarga específico para a pistola
    playReloadEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Encontrar o cabo e o slide da arma na mão
        const handHandle = this.physicalMeshes.find(mesh => mesh.name === "gun_hand_handle");
        const handSlide = this.physicalMeshes.find(mesh => mesh.name === "gun_hand_slide");
        
        if (!handHandle || !handSlide) return;
        
        // Salvar posições originais
        const originalHandlePosition = handHandle.position.clone();
        const originalSlidePosition = handSlide.position.clone();
        
        // Criar efeito de partículas para a recarga
        const particleSystem = new BABYLON.ParticleSystem("reloadParticles", 30, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        particleSystem.emitter = handHandle.getAbsolutePosition();
        
        // Configurar partículas
        particleSystem.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.6); // Branco/prateado
        particleSystem.color2 = new BABYLON.Color4(0.5, 0.5, 0.5, 0.3);
        particleSystem.colorDead = new BABYLON.Color4(0.1, 0.1, 0.1, 0);
        
        particleSystem.minSize = 0.05;
        particleSystem.maxSize = 0.1;
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1.0;
        particleSystem.emitRate = 30;
        particleSystem.minEmitPower = 0.5;
        particleSystem.maxEmitPower = 1;
        particleSystem.updateSpeed = 0.01;
        
        // Animação de remoção do carregador
        const frames = 15;
        let frame = 0;
        
        // Animar a remoção do carregador
        const animateOut = () => {
            frame++;
            const progress = frame / frames;
            
            // Mover o carregador para baixo
            handHandle.position.y = originalHandlePosition.y - 0.4 * progress;
            
            // Inclinar levemente a arma durante a recarga
            this.handMesh.rotation.x = Math.sin(progress * Math.PI) * 0.2;
            
            if (frame < frames) {
                requestAnimationFrame(animateOut);
            } else {
                // Iniciar animação do slide
                this.animateSlide(handSlide, originalSlidePosition, () => {
                    // Quando terminar o slide, iniciar animação de inserção do novo carregador
                    frame = 0;
                    setTimeout(() => {
                        // Efeito sonoro de "clique" ao colocar carregador (via vibração visual)
                        this.handMesh.position.y -= 0.02;
                        setTimeout(() => this.handMesh.position.y += 0.02, 100);
                        
                        const animateIn = () => {
                            frame++;
                            const progress = frame / frames;
                            
                            // Retornar o carregador à posição original
                            handHandle.position.y = originalHandlePosition.y - 0.4 * (1 - progress);
                            
                            // Retornar a inclinação da arma ao normal
                            this.handMesh.rotation.x = Math.sin((1-progress) * Math.PI) * 0.2;
                            
                            if (frame < frames) {
                                requestAnimationFrame(animateIn);
                            } else {
                                // Animação final do slide voltando
                                setTimeout(() => {
                                    this.animateSlideReturn(handSlide, originalSlidePosition);
                                }, 150);
                            }
                        };
                        
                        animateIn();
                    }, 300);
                });
            }
        };
        
        // Iniciar animação de recarga e efeitos
        particleSystem.start();
        animateOut();
        
        // Limpar sistema de partículas após a animação
        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => particleSystem.dispose(), 1000);
        }, 1500);
    }
    
    // Método auxiliar para animar o slide da arma
    animateSlide(slide, originalPosition, callback) {
        const slideFrames = 10;
        let slideFrame = 0;
        
        const animateSlideBack = () => {
            slideFrame++;
            const progress = slideFrame / slideFrames;
            
            // Mover o slide para trás
            slide.position.z = originalPosition.z - 0.15 * progress;
            
            if (slideFrame < slideFrames) {
                requestAnimationFrame(animateSlideBack);
            } else if (callback) {
                callback();
            }
        };
        
        animateSlideBack();
    }
    
    // Método auxiliar para animar o retorno do slide
    animateSlideReturn(slide, originalPosition) {
        const slideFrames = 8;
        let slideFrame = 0;
        
        const animateSlideForward = () => {
            slideFrame++;
            const progress = slideFrame / slideFrames;
            
            // Retornar o slide à posição original rapidamente
            slide.position.z = originalPosition.z - 0.15 * (1 - progress);
            
            if (slideFrame < slideFrames) {
                requestAnimationFrame(animateSlideForward);
            }
        };
        
        animateSlideForward();
    }
}

export default Pistol;