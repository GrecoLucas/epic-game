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

        // Corpo principal
        const base = BABYLON.MeshBuilder.CreateBox("gun_ground_base", {
            width: 0.15, height: 0.2, depth: 1.2
        }, scene);
        base.parent = groundRoot;
        base.position.y = 0.1;

        // Recebedor Superior
        const upperReceiver = BABYLON.MeshBuilder.CreateBox("gun_ground_upper_receiver", {
            width: 0.14, height: 0.12, depth: 0.8
        }, scene);
        upperReceiver.parent = base;
        upperReceiver.position = new BABYLON.Vector3(0, 0.12, -0.1);

        // Cano
        const barrel = BABYLON.MeshBuilder.CreateCylinder("gun_ground_barrel", {
            height: 1.0, diameter: 0.05
        }, scene);
        barrel.parent = groundRoot;
        barrel.rotation.x = Math.PI / 2;
        barrel.position = new BABYLON.Vector3(0, 0.12, 0.8);

        // Coronha
        const stock = BABYLON.MeshBuilder.CreateBox("gun_ground_stock", {
            width: 0.1, height: 0.18, depth: 0.6
        }, scene);
        stock.parent = groundRoot;
        stock.position = new BABYLON.Vector3(0, 0.1, -0.7);

        // Punho
        const handle = BABYLON.MeshBuilder.CreateBox("gun_ground_handle", {
            width: 0.12, height: 0.4, depth: 0.15
        }, scene);
        handle.parent = groundRoot;
        handle.position = new BABYLON.Vector3(0, -0.15, -0.2);
        handle.rotation.x = -0.2;

        // Carregador
        const magazine = BABYLON.MeshBuilder.CreateBox("gun_ground_magazine", {
            width: 0.1, height: 0.3, depth: 0.15
        }, scene);
        magazine.parent = groundRoot;
        magazine.position = new BABYLON.Vector3(0, -0.3, 0);
        magazine.rotation.x = 0.1;

        // Rail tático
        const rail = BABYLON.MeshBuilder.CreateBox("gun_ground_rail", {
            width: 0.16, height: 0.05, depth: 0.8
        }, scene);
        rail.parent = upperReceiver;
        rail.position = new BABYLON.Vector3(0, 0.08, 0);

        // Mira frontal
        const frontSight = BABYLON.MeshBuilder.CreateBox("gun_ground_front_sight", {
            width: 0.03, height: 0.06, depth: 0.03
        }, scene);
        frontSight.parent = rail;
        frontSight.position = new BABYLON.Vector3(0, 0.06, 0.35);

        // Mira traseira
        const rearSight = BABYLON.MeshBuilder.CreateBox("gun_ground_rear_sight", {
            width: 0.08, height: 0.05, depth: 0.04
        }, scene);
        rearSight.parent = rail;
        rearSight.position = new BABYLON.Vector3(0, 0.05, -0.3);

        // --- Materiais ---
        const baseColor = '#303030'; // Cor padrão para o corpo
        const stockColor = '#222222'; // Cor mais escura para a coronha
        const handleColor = '#111111'; // Cor para o punho
        const barrelColor = '#252525'; // Cor para o cano
        const magazineColor = '#191919'; // Cor para o carregador
        const sightColor = '#090909'; // Cor para as miras

        const baseMaterial = this.createMaterial(baseColor, scene, { emissive: '#1a1a1a' });
        const stockMaterial = this.createMaterial(stockColor, scene, { emissive: '#151515' });
        const handleMaterial = this.createMaterial(handleColor, scene, { emissive: '#0a0a0a' });
        const barrelMaterial = this.createMaterial(barrelColor, scene, { emissive: '#101010' });
        const magazineMaterial = this.createMaterial(magazineColor, scene, { emissive: '#0c0c0c' });
        const sightMaterial = this.createMaterial(sightColor, scene, { emissive: '#050505' });

        // Aplicar materiais às partes
        base.material = baseMaterial;
        upperReceiver.material = baseMaterial;
        stock.material = stockMaterial;
        handle.material = handleMaterial;
        barrel.material = barrelMaterial;
        magazine.material = magazineMaterial;
        rail.material = baseMaterial;
        frontSight.material = sightMaterial;
        rearSight.material = sightMaterial;

        const groundGunParts = [base, upperReceiver, stock, handle, barrel, magazine, rail, frontSight, rearSight];
        groundGunParts.forEach(part => {
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
                    }
                }
            ));

            // Efeito de hover - Aplicar a todas as partes para consistência
            part.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                    groundGunParts.forEach(p => {
                        if (p.material) p.material.emissiveColor = BABYLON.Color3.FromHexString('#555555');
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
                        else if (p.material === stockMaterial) p.material.emissiveColor = BABYLON.Color3.FromHexString('#151515');
                        else if (p.material === handleMaterial) p.material.emissiveColor = BABYLON.Color3.FromHexString('#0a0a0a');
                        else if (p.material === barrelMaterial) p.material.emissiveColor = BABYLON.Color3.FromHexString('#101010');
                        else if (p.material === magazineMaterial) p.material.emissiveColor = BABYLON.Color3.FromHexString('#0c0c0c');
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
            if (this.model.isPickedUp || !groundRoot || !groundRoot.isEnabled()) return;
            groundRoot.rotation.y += 0.01;
            const t = performance.now() * 0.001;
            groundRoot.position.y = this.model.position.y + Math.sin(t * 2) * 0.05;
        };
        scene.registerBeforeRender(animateGun);

        // --- ARMA NA MÃO (POV) ---
        const handRoot = new BABYLON.TransformNode("gun_hand_root", scene);
        handRoot.parent = scene.activeCamera;
        
        // Posição da arma na mão
        handRoot.position = new BABYLON.Vector3(0.4, -0.3, 1.1);
        handRoot.rotation = new BABYLON.Vector3(0, -0.1, 0);

        // Replicar a estrutura da arma para a mão
        const handBase = base.clone("gun_hand_base");
        handBase.material = baseMaterial.clone("handBaseMat");
        handBase.parent = handRoot;

        const handUpperReceiver = upperReceiver.clone("gun_hand_upper_receiver");
        handUpperReceiver.material = baseMaterial.clone("handUpperReceiverMat");
        handUpperReceiver.parent = handBase;

        const handStock = stock.clone("gun_hand_stock");
        handStock.material = stockMaterial.clone("handStockMat");
        handStock.parent = handRoot;

        const handHandle = handle.clone("gun_hand_handle");
        handHandle.material = handleMaterial.clone("handHandleMat");
        handHandle.parent = handRoot;

        const handBarrel = barrel.clone("gun_hand_barrel");
        handBarrel.material = barrelMaterial.clone("handBarrelMat");
        handBarrel.parent = handRoot;

        const handMagazine = magazine.clone("gun_hand_magazine");
        handMagazine.material = magazineMaterial.clone("handMagazineMat");
        handMagazine.parent = handRoot;

        const handRail = rail.clone("gun_hand_rail");
        handRail.material = baseMaterial.clone("handRailMat");
        handRail.parent = handUpperReceiver;

        const handFrontSight = frontSight.clone("gun_hand_front_sight");
        handFrontSight.material = sightMaterial.clone("handFrontSightMat");
        handFrontSight.parent = handRail;

        const handRearSight = rearSight.clone("gun_hand_rear_sight");
        handRearSight.material = sightMaterial.clone("handRearSightMat");
        handRearSight.parent = handRail;

        const handGunParts = [
            handBase, handUpperReceiver, handStock, handHandle, 
            handBarrel, handMagazine, handRail, handFrontSight, handRearSight
        ];
        
        handGunParts.forEach(part => {
            part.isPickable = false;
            this.physicalMeshes.push(part);
            part.actionManager = null;
        });

        this.handMesh = handRoot;
        this.physicalMeshes.push(handRoot);

        // Ponto de efeito para o tiro (ponta do cano)
        const muzzle = BABYLON.MeshBuilder.CreateSphere("muzzle_point", {diameter: 0.01}, scene);
        muzzle.parent = handRoot;
        muzzle.position = handBarrel.position.add(new BABYLON.Vector3(0, 0, handBarrel.scaling.y * 0.5));
        muzzle.isVisible = false;
        this.muzzlePoint = muzzle;
        this.physicalMeshes.push(muzzle);

        this.updateVisibility();

        return this.physicalMeshes;
    }

    // Efeito de recarga específico para rifle de assalto
    playReloadEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Encontrar partes relevantes para animação
        const handMagazine = this.physicalMeshes.find(mesh => mesh.name === "gun_hand_magazine");
        const handUpperReceiver = this.physicalMeshes.find(mesh => mesh.name === "gun_hand_upper_receiver");
        
        if (!handMagazine || !handUpperReceiver) return;
        
        // Salvar posições originais
        const originalMagazinePosition = handMagazine.position.clone();
        const originalUpperReceiverPosition = handUpperReceiver.position.clone();
        
        // Animação de recarga
        const frames = 15;
        let frame = 0;
        
        // Animar a remoção do carregador
        const animateOut = () => {
            frame++;
            const progress = frame / frames;
            
            // Mover o carregador para baixo e para trás
            handMagazine.position.y = originalMagazinePosition.y - 0.5 * progress;
            handMagazine.position.z = originalMagazinePosition.z - 0.2 * progress;
            
            // Inclinar a arma durante a recarga
            this.handMesh.rotation.x = Math.sin(progress * Math.PI) * 0.15;
            
            if (frame < frames) {
                requestAnimationFrame(animateOut);
            } else {
                // Puxar ferrolho
                this.animateBoltAction(handUpperReceiver, originalUpperReceiverPosition, () => {
                    // Quando terminar, iniciar inserção do novo carregador
                    frame = 0;
                    setTimeout(() => {
                        // Efeito de "clique" ao colocar carregador
                        this.handMesh.position.y -= 0.02;
                        setTimeout(() => this.handMesh.position.y += 0.02, 100);
                        
                        const animateIn = () => {
                            frame++;
                            const progress = frame / frames;
                            
                            // Retornar o carregador à posição original
                            handMagazine.position.y = originalMagazinePosition.y - 0.5 * (1 - progress);
                            handMagazine.position.z = originalMagazinePosition.z - 0.2 * (1 - progress);
                            
                            // Retornar a inclinação ao normal
                            this.handMesh.rotation.x = Math.sin((1-progress) * Math.PI) * 0.15;
                            
                            if (frame < frames) {
                                requestAnimationFrame(animateIn);
                            } else {
                                // Som e animação final (liberar ferrolho)
                                setTimeout(() => {
                                    // Som de ferrolho liberado
                                    // this.scene.onPointerDown(); // Simulação de som de clique
                                    // Animação de ferrolho voltando
                                    this.animateBoltReturn(handUpperReceiver, originalUpperReceiverPosition);
                                }, 200);
                            }
                        };
                        
                        animateIn();
                    }, 400);
                });
            }
        };
        
        // Iniciar animação de recarga e efeitos
        animateOut();
        
    }
    
    // Método auxiliar para animar o ferrolho
    animateBoltAction(bolt, originalPosition, callback) {
        const boltFrames = 8;
        let boltFrame = 0;
        
        const animateBoltBack = () => {
            boltFrame++;
            const progress = boltFrame / boltFrames;
            
            // Mover o ferrolho para trás
            bolt.position.z = originalPosition.z - 0.1 * progress;
            
            if (boltFrame < boltFrames) {
                requestAnimationFrame(animateBoltBack);
            } else if (callback) {
                callback();
            }
        };
        
        animateBoltBack();
    }
    
    // Método auxiliar para animar o retorno do ferrolho
    animateBoltReturn(bolt, originalPosition) {
        const boltFrames = 5; // Mais rápido que o puxar
        let boltFrame = 0;
        
        const animateBoltForward = () => {
            boltFrame++;
            const progress = boltFrame / boltFrames;
            
            // Retornar o ferrolho à posição original rapidamente
            bolt.position.z = originalPosition.z - 0.1 * (1 - progress);
            
            if (boltFrame < boltFrames) {
                requestAnimationFrame(animateBoltForward);
            }
        };
        
        animateBoltForward();
    }

    // Sobrescrever o efeito de tiro para adicionar características de rifle de assalto
    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Usar o método da classe pai
        super.playShootEffect();
        
        // Adicionar efeito de recuo mais intenso
        if (this.handMesh) {
            const originalRotation = this.handMesh.rotation.clone();
            
            // Adicionar mais recuo rotacional para rifles
            this.handMesh.rotation.x += 0.03;
            
            // Animar retorno à posição original
            setTimeout(() => {
                const frames = 5;
                let frame = 0;
                
                const animateRecoil = () => {
                    frame++;
                    const progress = frame / frames;
                    
                    this.handMesh.rotation.x = originalRotation.x + 0.03 * (1 - progress);
                    
                    if (frame < frames) {
                        requestAnimationFrame(animateRecoil);
                    }
                };
                
                animateRecoil();
            }, 30);
        }
    }
}

export default AssaultRifle;