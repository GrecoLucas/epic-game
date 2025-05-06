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

        // Carregar o modelo OBJ da pistola para exibir no chão
        BABYLON.SceneLoader.ImportMesh("", "models/Gun/pistol/", "Pistol.obj", scene, (meshes) => {
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
            groundRoot.scaling = new BABYLON.Vector3(2, 2, 2); // Aumentado de 0.2 para 0.4
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
        handRoot.position = new BABYLON.Vector3(1.0, -0.6, 1.2);  // Movida para a frente e para o lado
        handRoot.rotation = new BABYLON.Vector3(-0.01, -0.1, 0);  // Ângulo modificado para melhor visualização

        // Carregar o modelo OBJ da pistola para segurar na mão
        BABYLON.SceneLoader.ImportMesh("", "models/Gun/pistol/", "Pistol.obj", scene, (meshes) => {
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
            handRoot.scaling = new BABYLON.Vector3(2, 2, 2); // Aumentado de 0.15 para 0.3
            handRoot.rotation.x = -0.2;
            handRoot.rotation.y = -0.1;
            handRoot.rotation.z = 0;
            
            // Criar ponto de muzzle (boca do cano) para efeitos de tiro
            const muzzle = BABYLON.MeshBuilder.CreateSphere("muzzle_point", {diameter: 0.01}, scene);
            muzzle.parent = handRoot;
            muzzle.position = new BABYLON.Vector3(0, 0.025, 0.8); // Ajuste esta posição conforme necessário para o modelo
            muzzle.isVisible = false;
            this.muzzlePoint = muzzle;
            this.physicalMeshes.push(muzzle);
        });

        this.handMesh = handRoot;
        this.physicalMeshes.push(handRoot);

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
        animateOut();
        
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