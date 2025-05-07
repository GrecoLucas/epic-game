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
    
    // Método para obter a duração total da animação de recarga
    getReloadAnimationDuration() {
        // Calcular a duração total baseada nos frames e tempos de espera
        // frames iniciais (15) + animação do ferrolho (8) + delay (400) + 
        // frames de retorno (15) + delay final (200) + frames do ferrolho de retorno (5)
        // Assumindo ~16.7ms por frame (60fps)
        const framesTime = (15 + 8 + 15 + 5) * 16.7;
        const delaysTime = 400 + 200;
        return framesTime + delaysTime;
    }

    // Sobrescrevendo o método playShootEffect para a pistola
    playShootEffect() {
        if (!this.model.isPickedUp || !this.handMesh) return;
        
        // Usar o método da classe pai como base
        super.playShootEffect();
        
        // Adicionar efeitos específicos da pistola
        if (this.handMesh) {
            const originalRotation = this.handMesh.rotation.clone();
            
            // Adicionar rotação para simular recuo mais leve (pistola)
            this.handMesh.rotation.x += 0.025;
            
            // Animar retorno à posição original
            setTimeout(() => {
                const frames = 4; // Menos frames para pistola (recuperação mais rápida)
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
            }, 25); // Tempo menor para pistola
        }
    }

    playReloadEffect(onCompleteCallback) {
        if (!this.model.isPickedUp || !this.handMesh) {
            // Se a pistola não estiver em mãos, chamar o callback imediatamente
            if (onCompleteCallback) onCompleteCallback();
            return;
        }
        
        // Salvar a posição e rotação original da arma
        const originalPosition = this.handMesh.position.clone();
        const originalRotation = this.handMesh.rotation.clone();
        
        // Animação de movimento para simular recarga
        const frames = 15;
        let frame = 0;
        
        // Primeira fase: baixar a arma e rotacionar como se estivesse removendo o carregador
        const animateDown = () => {
            frame++;
            const progress = frame / frames;
            
            // Mover a arma para baixo e rotacionar
            this.handMesh.position.y = originalPosition.y - 0.2 * progress;
            this.handMesh.rotation.x = originalRotation.x - 0.3 * progress;
            
            if (frame < frames) {
                requestAnimationFrame(animateDown);
            } else {
                // Segunda fase: simular a inserção de um novo carregador
                setTimeout(() => {
                    frame = 0;
                    
                    // Efeito visual de "clique" ao inserir carregador
                    this.handMesh.position.z -= 0.05;
                    setTimeout(() => this.handMesh.position.z += 0.05, 100);
                    
                    const animateUp = () => {
                        frame++;
                        const progress = frame / frames;
                        
                        // Retornar a arma à posição original
                        this.handMesh.position.y = originalPosition.y - 0.2 * (1 - progress);
                        this.handMesh.rotation.x = originalRotation.x - 0.3 * (1 - progress);
                        
                        if (frame < frames) {
                            requestAnimationFrame(animateUp);
                        } else {
                            // Animação final: puxar o slide da pistola
                            setTimeout(() => {
                                // Simular o puxar do slide
                                this.handMesh.position.z -= 0.1;
                                
                                setTimeout(() => {
                                    // Simular o soltar do slide com um movimento rápido
                                    const slideFrames = 5;
                                    let slideFrame = 0;
                                    
                                    const animateSlide = () => {
                                        slideFrame++;
                                        const slideProgress = slideFrame / slideFrames;
                                        
                                        this.handMesh.position.z = originalPosition.z - 0.1 * (1 - slideProgress);
                                        
                                        if (slideFrame < slideFrames) {
                                            requestAnimationFrame(animateSlide);
                                        } else {
                                            // Aqui é onde a animação termina completamente
                                            // Chamar o callback para sincronizar com o modelo
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
        
        // Iniciar a animação
        animateDown();
    }
}

export default AssaultRifle;