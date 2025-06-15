class Wired_Fence {
    constructor(scene, materials) {
        this.scene = scene;
        this.wallMaterial = materials.wallMaterial;
          // CONFIGURAÇÃO: Quantos zumbis podem passar pela cerca antes dela ser destruída
        this.maxZombieContacts = 3; // Valor padrão: 3 zumbis
    }    // Método para configurar quantos zumbis podem passar pela cerca
    setMaxZombieContacts(maxContacts) {
        this.maxZombieContacts = Math.max(1, maxContacts); // Mínimo de 1 zumbi
        console.log(`Wired fence max zombie contacts set to: ${this.maxZombieContacts}`);
        return this; // Para permitir method chaining
    }

    // Método para obter a configuração atual
    getMaxZombieContacts() {
        return this.maxZombieContacts;
    }

    // Método para criar uma cerca com configuração personalizada
    createCustomWiredFence(position, cellSize, rotation = 0, initialHealth = 100, maxZombieContacts = null) {
        // Se um valor personalizado for fornecido, usar ele temporariamente
        const originalMax = this.maxZombieContacts;
        if (maxZombieContacts !== null) {
            this.maxZombieContacts = Math.max(1, maxZombieContacts);
        }
        
        // Criar a cerca normalmente
        const fence = this.createPlayerWiredFence(position, cellSize, rotation, initialHealth);
        
        // Restaurar valor original
        this.maxZombieContacts = originalMax;
        
        return fence;
    }

    createPlayerWiredFence(position, cellSize, rotation = 0, initialHealth = 100) {
        // Create a container for the entire wired fence
        const fenceRoot = new BABYLON.TransformNode(`playerWiredFence_${Date.now()}`, this.scene);
        fenceRoot.position = position;
        fenceRoot.rotation.y = rotation;
        
        // Load the 3D model (using Barricade model as specified)
        BABYLON.SceneLoader.ImportMeshAsync("", "models/Barricade/", "scene.gltf", this.scene).then((result) => {
            const fenceModel = result.meshes[0]; // Root of imported model
            
            if (fenceModel) {
                // Parent the model to our fence root
                fenceModel.parent = fenceRoot;
                
                // Adjust scale to fit fence dimensions
                const fenceWidth = cellSize || 4;
                const fenceHeight = (this.wallMaterial?.wallHeight || 4) * 0.8; // 80% of wall height
                
                // Scale the model appropriately
                fenceModel.scaling = new BABYLON.Vector3(
                    fenceWidth / 5,  // Adjust width
                    fenceHeight / 2, // Adjust height
                    1.5              // Make it very thin (fence-like)
                );
                
                // Position adjustment if needed
                fenceModel.position = new BABYLON.Vector3(0, 0, 0);
                // Make all child meshes non-collidable (no hitbox requirement)
                result.meshes.forEach(mesh => {
                    mesh.checkCollisions = false; // No collision as specified
                    mesh.isPickable = false; // MUDANÇA: Tornar não selecionável para que o hitbox seja usado
                });
                
                console.log(`Wired fence 3D model loaded successfully at ${position}`);
            }
        }).catch((error) => {
            console.error("Failed to load wired fence 3D model:", error);
        });
          // NOVO: Criar hitbox invisível para detecção de coleta (separado da damage zone)
        const collectionHitbox = BABYLON.MeshBuilder.CreateBox(`${fenceRoot.name}_collectionHitbox`, {
            width: cellSize || 4,
            height: (this.wallMaterial?.wallHeight || 4) * 0.8,
            depth: (cellSize || 4) * 0.2 // Slightly thicker than fence for easier detection
        }, this.scene);
          // Position and configure collection hitbox
        collectionHitbox.parent = fenceRoot;
        collectionHitbox.position = new BABYLON.Vector3(0, 0, 0); // Posição relativa ao parent (center)
        collectionHitbox.visibility = 0; // Invisible
        collectionHitbox.checkCollisions = false; // No physical collision with player
        collectionHitbox.isPickable = true; // IMPORTANTE: Deve ser pickable para detecção F
        
        // CORREÇÃO: Garantir que seja realmente pickable
        setTimeout(() => {
            collectionHitbox.isPickable = true;
            console.log(`FORCED hitbox pickable: ${collectionHitbox.isPickable} for ${collectionHitbox.name}`);
        }, 100);
        
        // Add metadata to identify as collection hitbox
        collectionHitbox.metadata = {
            isWiredFenceCollectionHitbox: true,
            parentFence: fenceRoot.name,
            isPlayerBuilt: true,
            isWiredFence: true
        };
          // Create invisible zombie damage zone (larger than the fence)
        const damageZoneSize = cellSize * 1.5; // Make damage zone bigger than the fence
        const damageZone = BABYLON.MeshBuilder.CreateBox(`${fenceRoot.name}_damageZone`, {
            width: damageZoneSize,
            height: (this.wallMaterial?.wallHeight || 4) * 0.8,
            depth: damageZoneSize
        }, this.scene);
        
        // Position and configure damage zone
        damageZone.parent = fenceRoot;
        damageZone.position = new BABYLON.Vector3(0, 0, 0); // Posição relativa ao parent
        damageZone.visibility = 0; // Invisible
        damageZone.checkCollisions = false; // No physical collision
        damageZone.isPickable = false; // Don't interfere with player interactions        // Add metadata to identify as damage zone
        damageZone.metadata = {
            isWiredFenceDamageZone: true,
            parentFence: fenceRoot.name,
            damageAmount: 2, // Damage per contact
            slowdownFactor: 0.3 // Reduce zombie speed by 70%
        };
        
        // Set up metadata for the fence
        fenceRoot.metadata = fenceRoot.metadata || {};
        fenceRoot.metadata.isBuildableSurface = false; // Fence is not buildable surface
        fenceRoot.metadata.isPlayerBuilt = true;
        fenceRoot.metadata.isWiredFence = true;
        fenceRoot.metadata.initialHealth = initialHealth || 100;
        fenceRoot.metadata.health = initialHealth || 100;
        fenceRoot.metadata.hasCollision = false; // Mark as no collision
        fenceRoot.metadata.collectionHitbox = collectionHitbox; // NOVO: Referência para o hitbox
        
        // NOVO: Metadata para controle de contatos de zumbis
        fenceRoot.metadata.maxZombieContacts = this.maxZombieContacts; // Quantos zumbis podem passar
        fenceRoot.metadata.zombieContactCount = 0; // Contador de zumbis que já passaram
        fenceRoot.metadata.zombiesInContact = new Set(); // Zumbis atualmente em contato
        
        // Add metadata for dependency tracking
        fenceRoot.metadata.supportingBlock = null;
        fenceRoot.metadata.dependentBlocks = [];
        
        // Check if there's a block below to register dependencies
        const supportCheckPosition = position.clone();
        supportCheckPosition.y -= 1; // Check below
        
        const ray = new BABYLON.Ray(
            supportCheckPosition,
            new BABYLON.Vector3(0, -1, 0),
            0.5
        );
        
        const hit = this.scene.pickWithRay(ray, mesh => 
            mesh.isPickable && 
            (mesh.name.startsWith("playerWall_") || 
             mesh.name.startsWith("playerRamp_") || 
             mesh.name.startsWith("playerBarricade_") ||
             mesh.name === "floor")
        );
        
        if (hit && hit.pickedMesh && hit.pickedMesh.name !== "floor") {
            // Register the block below as support
            fenceRoot.metadata.supportingBlock = hit.pickedMesh.name;
            
            // Register this fence as dependent on the block below
            if (hit.pickedMesh.metadata && Array.isArray(hit.pickedMesh.metadata.dependentBlocks)) {
                hit.pickedMesh.metadata.dependentBlocks.push(fenceRoot.name);
                console.log(`${fenceRoot.name} is supported by ${hit.pickedMesh.name}`);
            }
        }
        
        // Add tag for identification and grid snapping
        BABYLON.Tags.AddTagsTo(fenceRoot, `cell_${position.x}_${position.z}`);
        BABYLON.Tags.AddTagsTo(collectionHitbox, `cell_${position.x}_${position.z} collectionHitbox`);        // Make the root pickable for interaction (backup)
        fenceRoot.isPickable = true;
        fenceRoot.checkCollisions = false; // No collision as specified
          // Debug: Log created components
        console.log(`Created wired fence components:
        - Main fence: ${fenceRoot.name} (pickable: ${fenceRoot.isPickable})
        - Collection hitbox: ${collectionHitbox.name} (pickable: ${collectionHitbox.isPickable})
        - Damage zone: ${damageZone.name} (slowdown: ${damageZone.metadata.slowdownFactor})`);
        
        console.log(`Created player wired fence at ${position} with health ${initialHealth} (no collision, with collection hitbox)`);
        return fenceRoot;
    }
      destroyWiredFenceVisual(fenceName, position, onDestroy, destroyDependentBlock) {
        const fenceMesh = this.scene.getMeshByName(fenceName) || this.scene.getTransformNodeByName(fenceName);
    
        if (fenceMesh) {
            if (fenceMesh.metadata && fenceMesh.metadata.isBeingDestroyed) {
                return true; // Already being destroyed
            }
            if (fenceMesh.metadata) {
                fenceMesh.metadata.isBeingDestroyed = true;
            }
            
            console.log(`Starting destruction of wired fence: ${fenceName}`);
    
            // NOVO: Destruir o collection hitbox se existir
            if (fenceMesh.metadata && fenceMesh.metadata.collectionHitbox) {
                const collectionHitbox = fenceMesh.metadata.collectionHitbox;
                if (collectionHitbox && !collectionHitbox.isDisposed()) {
                    collectionHitbox.dispose();
                    console.log(`Destroyed collection hitbox for ${fenceName}`);
                }
            }
            
            // Find and destroy all related components in the scene
            const relatedMeshes = this.scene.meshes.filter(mesh => 
                mesh.name.includes(fenceName) || 
                (mesh.metadata && mesh.metadata.parentFence === fenceName)
            );
            
            for (const relatedMesh of relatedMeshes) {
                if (relatedMesh && !relatedMesh.isDisposed()) {
                    console.log(`Disposing related mesh: ${relatedMesh.name}`);
                    relatedMesh.dispose();
                }
            }
    
            // Check if there are dependent blocks that need to be destroyed first
            if (fenceMesh.metadata && fenceMesh.metadata.dependentBlocks && fenceMesh.metadata.dependentBlocks.length > 0) {
                console.log(`${fenceName} has ${fenceMesh.metadata.dependentBlocks.length} dependent blocks that will be destroyed in cascade`);
                
                const dependentBlocks = [...fenceMesh.metadata.dependentBlocks];
                
                for (const dependentBlockName of dependentBlocks) {
                    const dependentMesh = this.scene.getMeshByName(dependentBlockName);
                    if (dependentMesh) {
                        if (dependentBlockName.startsWith("playerWall_")) {
                            destroyDependentBlock(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerRamp_")) {
                            destroyDependentBlock(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerBarricade_")) {
                            destroyDependentBlock(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerWiredFence_")) {
                            this.destroyWiredFenceVisual(dependentBlockName, dependentMesh.position, onDestroy, destroyDependentBlock);
                        }
                    }
                }
            }
            
            // Remove reference from supporting block
            if (fenceMesh.metadata && fenceMesh.metadata.supportingBlock) {
                const supportingMesh = this.scene.getMeshByName(fenceMesh.metadata.supportingBlock);
                if (supportingMesh && supportingMesh.metadata && supportingMesh.metadata.dependentBlocks) {
                    const index = supportingMesh.metadata.dependentBlocks.indexOf(fenceName);
                    if (index !== -1) {
                        supportingMesh.metadata.dependentBlocks.splice(index, 1);
                        console.log(`Removed reference of ${fenceName} from dependents list of ${fenceMesh.metadata.supportingBlock}`);
                    }
                }
            }
    
            // Visual destruction effect
            if (onDestroy) {
                onDestroy(position);
            }
    
            // Dispose all child meshes and the root
            if (fenceMesh.getChildren) {
                fenceMesh.getChildren().forEach(child => {
                    if (child.dispose && !child.isDisposed()) {
                        child.dispose();
                    }
                });
            }
            
            // Remove the mesh from the scene
            if (!fenceMesh.isDisposed()) {
                fenceMesh.dispose();
            }
            
            console.log(`Successfully destroyed wired fence: ${fenceName}`);
            return true;
        } else {
            console.warn(`Wired fence not found for destruction: ${fenceName}`);
            return false;
        }
    }



}

export default Wired_Fence;