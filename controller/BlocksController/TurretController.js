// TurretController.js - Responsible for turret logic and placement
import Turret from '../../view/Blocks/Turret.js';

class TurretController {
    constructor(scene, camera, collisionSystem, mazeView, mazeModel) {
        this.scene = scene;
        this.camera = camera;
        this.collisionSystem = collisionSystem;
        this.mazeView = mazeView;
        this.mazeModel = mazeModel;
        
        // Access dimensions from model
        this.cellSize = this.mazeModel?.cellSize || 4;
        this.wallHeight = (this.mazeView?.wallMaterial?.wallHeight || 4);
        
        // Preview material for turret placement
        this.previewMaterialValid = null;
        this.previewMaterialInvalid = null;
        this._createPreviewMaterials();
        
        // Current placement state
        this.buildPreviewMesh = null;
        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        this.currentPlacementRotation = 0;
        
        // Create turret handler
        this.turretHandler = new Turret(scene, {
            wallMaterial: this.mazeView?.wallMaterial
        });
        
        // Last update time for periodic updates
        this.lastUpdateTime = 0;
        
        // Setup update loop for turrets
        scene.registerBeforeRender(() => {
            const now = performance.now();
            const deltaTime = now - this.lastUpdateTime;
            
            // Update turrets every 16ms (approximately 60fps)
            if (deltaTime > 16) {
                this.lastUpdateTime = now;
                this.updateTurrets(deltaTime);
            }
        });
    }
    
    // Inicializar o controlador de torretas
    initialize() {
        
        // Se o controlador precisa acessar monstros para atualização das torretas
        if (this.scene && this.scene.gameInstance) {
            // Registrar atualização periódica de torretas
            this.scene.registerBeforeRender(() => {
                this.updateTurrets(0.016); // Aproximadamente 60 fps (1/60 = 0.016)
            });
        }
        
        return true;
    }
    
    _createPreviewMaterials() {
        // Create valid placement material (green)
        this.previewMaterialValid = new BABYLON.StandardMaterial("turretPreviewValid", this.scene);
        this.previewMaterialValid.diffuseColor = new BABYLON.Color3(0, 1, 0);
        this.previewMaterialValid.alpha = 0.5;
        
        // Create invalid placement material (red)
        this.previewMaterialInvalid = new BABYLON.StandardMaterial("turretPreviewInvalid", this.scene);
        this.previewMaterialInvalid.diffuseColor = new BABYLON.Color3(1, 0, 0);
        this.previewMaterialInvalid.alpha = 0.5;
    }
    
    // Create or update turret preview mesh
    updatePreviewMesh(position, isValid) {
        const previewName = "preview_turret";
        
        // Create preview mesh if it doesn't exist
        if (!this.buildPreviewMesh) {
            // Create a simplified turret for preview
            const baseWidth = this.cellSize * 0.8;
            const baseHeight = 0.5;
            const baseDepth = this.cellSize * 0.8;
            
            // Base platform
            const base = BABYLON.MeshBuilder.CreateBox(previewName, {
                width: baseWidth,
                height: baseHeight,
                depth: baseDepth
            }, this.scene);
            
            // Turret body (cylinder)
            const body = BABYLON.MeshBuilder.CreateCylinder(`${previewName}_body`, {
                height: this.cellSize * 0.4,
                diameter: this.cellSize * 0.6,
                tessellation: 16
            }, this.scene);
            body.parent = base;
            body.position.y = baseHeight/2;
            
            // Gun barrel (cylinder)
            const barrel = BABYLON.MeshBuilder.CreateCylinder(`${previewName}_barrel`, {
                height: this.cellSize * 0.8,
                diameter: this.cellSize * 0.15,
                tessellation: 12
            }, this.scene);
            barrel.parent = body;
            barrel.rotation.x = Math.PI / 2; // Horizontal
            barrel.position.z = this.cellSize * 0.4;
            barrel.position.y = this.cellSize * 0.1;
            
            // Set as preview mesh
            this.buildPreviewMesh = base;
            this.buildPreviewMesh.isPickable = false;
            this.buildPreviewMesh.checkCollisions = false;
        }
        
        // Update position and material
        this.buildPreviewMesh.position = position;
        this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
        this.buildPreviewMesh.material = isValid ? this.previewMaterialValid : this.previewMaterialInvalid;
        this.buildPreviewMesh.setEnabled(true);
    }
    
    // Rotate turret preview
    rotatePreview(clockwise = true) {
        // Rotate in 45 degree increments for more precise placement
        const increment = Math.PI / 4;
        this.currentPlacementRotation += clockwise ? increment : -increment;
        
        // Normalize rotation to 0-2π range
        this.currentPlacementRotation = (this.currentPlacementRotation + 2 * Math.PI) % (2 * Math.PI);
        
        // Update preview visualization if visible
        if (this.buildPreviewMesh?.isEnabled()) {
            this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
        }
    }
    
    // Check if placement position is valid for a turret
    isValidPlacement(position) {
        if (!position) return false;
        
       
        // Create temporary collision box
        const baseWidth = this.cellSize * 0.8;
        const baseHeight = 0.5;
        const baseDepth = this.cellSize * 0.8;
        
        const testBox = BABYLON.MeshBuilder.CreateBox(
            "turretPlacementTestBox", 
            {
                width: baseWidth,
                height: baseHeight,
                depth: baseDepth
            },
            this.scene
        );
        testBox.position = position.clone();
        testBox.rotation.y = this.currentPlacementRotation;
        testBox.isVisible = false;
        testBox.isPickable = false;
        
        // Check collisions with existing meshes
        const collisions = this.scene.meshes.filter(mesh => {
            // Ignore test box, floor and previews
            if (mesh === testBox || 
                mesh.name === "floor" || 
                mesh.name.startsWith("preview_") || 
                !mesh.checkCollisions) {
                return false;
            }
            
            // Check if object is at same position
            const dx = Math.abs(mesh.position.x - position.x);
            const dz = Math.abs(mesh.position.z - position.z);
            
            // Tolerance for side-by-side placement
            const xzThreshold = this.cellSize * 0.1;
            
            // For blocks at same X,Z but different heights (stacking)
            if (dx < xzThreshold && dz < xzThreshold) {
                // Check Y-axis overlap
                const meshHeight = mesh.getBoundingInfo().boundingBox.extendSizeWorld.y;
                const testBoxHeight = testBox.getBoundingInfo().boundingBox.extendSizeWorld.y;
                
                const meshTop = mesh.position.y + meshHeight;
                const meshBottom = mesh.position.y - meshHeight;
                const testBoxTop = position.y + testBoxHeight;
                const testBoxBottom = position.y - testBoxHeight;
                
                // If no overlap in Y, there's no collision
                const overlapY = !(testBoxBottom >= meshTop || testBoxTop <= meshBottom);
                
                if (overlapY) {
                    return true;
                }
            }
            
            return false;
        });
        
        // Clean up test mesh
        testBox.dispose();
        
        // If there are collisions, placement is invalid
        if (collisions.length > 0) {
            return false;
        }
        
        // Check for support below (except if close to ground)
        if (position.y > baseHeight / 2) {
            const rayStart = position.clone();
            rayStart.y -= baseHeight / 2;
            
            const ray = new BABYLON.Ray(
                rayStart, 
                new BABYLON.Vector3(0, -1, 0), // Downward direction
                this.cellSize / 2 // Max ray distance
            );
            
            const hit = this.scene.pickWithRay(ray, mesh => 
                mesh.name === "floor" || 
                (mesh.checkCollisions && 
                 !mesh.name.startsWith("preview_") && 
                 (mesh.name.startsWith("playerWall_") || 
                  mesh.name.startsWith("playerRamp_") || 
                  mesh.name.startsWith("playerBarricade_") || 
                  mesh.name.startsWith("wall_")))
            );
            
            if (!hit.pickedMesh) {
                console.log("Invalid position: No support below");
                return false;
            }
        }
        
        // If all checks passed, placement is valid
        return true;
    }
    
    // Place a turret at the current position
    placeTurret(position, initialHealth = 150) {
        
        // Create new turret through handler
        const newMesh = this.turretHandler.createPlayerTurret(
            position,
            this.cellSize,
            this.currentPlacementRotation,
            initialHealth
        );
        
        if (newMesh) {
            // Add to collision system
            this.collisionSystem.addMesh(newMesh);
            return true;
        } else {
            console.error("Failed to create turret mesh");
            return false;
        }
    }
    
    // Calculate grid-snapped position for turret placement based on camera view
    getPlacementPosition(cameraRay) {
        if (!cameraRay) return null;
        
        const predicate = (mesh) => {
            return mesh.isPickable && 
                  !mesh.name.startsWith("preview_") && 
                  (mesh.name === "floor" || mesh.metadata?.isBuildableSurface);
        };
        
        const hit = this.scene.pickWithRay(cameraRay, predicate);
        
        if (hit && hit.pickedPoint) {
            // Grid snapping
            const gridX = Math.round(hit.pickedPoint.x / this.cellSize) * this.cellSize;
            const gridZ = Math.round(hit.pickedPoint.z / this.cellSize) * this.cellSize;
            
            // Adjust Y position based on surface
            const hitMeshBB = hit.pickedMesh.getBoundingInfo().boundingBox;
            const groundY = hit.pickedMesh.name === "floor" ? 0 : hit.pickedMesh.position.y + hitMeshBB.extendSizeWorld.y;
            
            // Center turret vertically
            const buildY = groundY + 0.5/2; // Half of the base height
            
            return new BABYLON.Vector3(gridX, buildY, gridZ);
        } else {
            // Fallback for when no surface is hit
            const rayDirection = cameraRay.direction.clone();
            const fixedDistance = 5;
            const rayOrigin = cameraRay.origin.clone();
            const rayTarget = rayOrigin.add(rayDirection.scale(fixedDistance));
            
            // Grid snapping for fallback
            const gridX = Math.round(rayTarget.x / this.cellSize) * this.cellSize;
            const gridZ = Math.round(rayTarget.z / this.cellSize) * this.cellSize;
            
            // For floating turret
            let buildY = rayTarget.y;
            buildY = Math.max(0, Math.round(buildY - (0.5 / 2)) + (0.5 / 2));
            
            return new BABYLON.Vector3(gridX, buildY, gridZ);
        }
    }
    
    // Update all active turrets
    updateTurrets(deltaTime) {
        // Get all monsters if available
        let getMonsters = () => {
            // Try multiple ways to access monsters in the game world
            if (this.scene.gameInstance) {
                // From game instance (primary method)
                return this.scene.gameInstance.getMonsters ? 
                       this.scene.gameInstance.getMonsters() : [];
            } else if (this.scene.monsterController) {
                // Directly from monster controller if available
                return this.scene.monsterController.getActiveMonsters ? 
                       this.scene.monsterController.getActiveMonsters() : [];
            } else if (window.gameInstance) {
                // From global game instance
                return window.gameInstance.getMonsters ?
                       window.gameInstance.getMonsters() : [];
            } else {
                // Fallback: try to find monster meshes directly in scene
                const monsterMeshes = this.scene.meshes
                    .filter(mesh => mesh.name.includes('monster') || 
                                  (mesh.metadata && mesh.metadata.isMonster));
                
                // Map para objetos compatíveis com a interface esperada
                return monsterMeshes.map(mesh => {
                    // Se já tiver controller no metadata, usar
                    if (mesh.metadata && mesh.metadata.controller) {
                        return {
                            getMesh: () => mesh,
                            getController: () => mesh.metadata.controller
                        };
                    }
                    
                    // Caso contrário, criar um substituto funcional
                    return {
                        getMesh: () => mesh,
                        getController: () => ({
                            takeDamage: (amount) => {
                                console.log(`Monster hit with ${amount} damage`);
                                
                                // Inicializar metadata se necessário
                                if (!mesh.metadata) mesh.metadata = { health: 100 };
                                if (typeof mesh.metadata.health !== 'number') mesh.metadata.health = 100;
                                
                                // Aplicar dano
                                mesh.metadata.health -= amount;
                                console.log(`Monster health: ${mesh.metadata.health}`);
                                
                                // Retornar se o monstro morreu
                                const isDead = mesh.metadata.health <= 0;
                                
                                // Se morreu, remover após um curto delay
                                if (isDead && !mesh.metadata.isBeingRemoved) {
                                    mesh.metadata.isBeingRemoved = true;
                                    console.log(`Monster ${mesh.name} killed by turret!`);
                                    
                                    // Efeito visual simples
                                    mesh.scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
                                    
                                    // Remover após um delay
                                    setTimeout(() => {
                                        if (mesh && !mesh.isDisposed()) {
                                            mesh.dispose();
                                        }
                                    }, 1000);
                                }
                                
                                return isDead;
                            },
                            health: mesh.metadata?.health || 100,
                            isDisposed: mesh.isDisposed?.() || false
                        })
                    };
                });
            }
        };
        
        // Update all turrets through the turret handler
        this.turretHandler.updateTurrets(deltaTime, getMonsters);
    }

    // Método para comprar munição para uma torreta específica
    buyAmmoForSpecificTurret(turretMesh, amountToBuy, playerResources, updatePlayerResources) {
        // Verificar se o objeto é uma torreta válida
        if (!turretMesh || !turretMesh.metadata || !turretMesh.metadata.isTurret) {
            console.warn("Objeto selecionado não é uma torreta válida");
            return {
                success: false,
                message: "Selecione uma torreta válida para comprar munição."
            };
        }
        
        // Definir custo fixo por pacote de munição (100 por 40 unidades)
        const costPerPack = 100;
        const ammoPerPack = 40;
        
        // Delegamos para o método na classe Turret com os novos valores
        return this.turretHandler.buyAmmoForTurret(
            turretMesh,
            ammoPerPack,
            costPerPack,
            playerResources,
            updatePlayerResources
        );
    }
  
    // Método para obter informações sobre a munição da torreta
    getTurretAmmoInfo(turretMesh) {
        if (!turretMesh || !turretMesh.metadata || !turretMesh.metadata.isTurret) {
            return null;
        }
        
        // Verificar primeiro se temos o modelo nos metadados
        if (turretMesh.metadata.turretModel) {
            const model = turretMesh.metadata.turretModel;
            return {
                currentAmmo: model.ammo,
                maxAmmo: model.maxAmmo,
                unlimitedAmmo: model.unlimitedAmmo,
                needsReload: !model.unlimitedAmmo && model.ammo < model.maxAmmo
            };
        }
        
        // Tentar encontrar na lista de torretas rastreadas
        const turretData = this.turretHandler.turrets.find(
            t => t.mesh && t.mesh.name === turretMesh.name
        );
        
        if (!turretData || !turretData.model) {
            // Verificação através dos componentes
            if (turretMesh.metadata.components && turretMesh.metadata.components.ammoIndicator) {
                const turretModel = turretMesh.metadata.components.ammoIndicator.turretModel;
                if (turretModel) {
                    return {
                        currentAmmo: turretModel.ammo,
                        maxAmmo: turretModel.maxAmmo,
                        unlimitedAmmo: turretModel.unlimitedAmmo,
                        needsReload: !turretModel.unlimitedAmmo && turretModel.ammo < turretModel.maxAmmo
                    };
                }
            }
            
            // Retornar valores padrão se não conseguir encontrar o modelo
            return {
                currentAmmo: 0,
                maxAmmo: 100,
                unlimitedAmmo: false,
                needsReload: true
            };
        }
        
        return {
            currentAmmo: turretData.model.ammo,
            maxAmmo: turretData.model.maxAmmo,
            unlimitedAmmo: turretData.model.unlimitedAmmo,
            needsReload: !turretData.model.unlimitedAmmo && turretData.model.ammo < turretData.model.maxAmmo
        };
    }
    
    // Método para limpar recursos quando não está mais em uso
    dispose() {
        // Esconder o preview se existir
        if (this.buildPreviewMesh) {
            this.buildPreviewMesh.setEnabled(false);
        }
        
        // Resetar estado de posicionamento
        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        
        console.log("TurretController: recursos de preview removidos");
    }
}

export default TurretController;