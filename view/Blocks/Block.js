// Block.js - Class for handling wall blocks in the game

class Block {
    constructor(scene, materials) {
        this.scene = scene;
        this.wallMaterial = materials.wallMaterial;
    }

    /**
     * Creates a single wall block instance built by the player.
     * @param {BABYLON.Vector3} position Central position of the wall.
     * @param {number} cellSize Size of the grid cell.
     * @param {number} initialHealth Initial health points of the wall.
     * @returns {BABYLON.Mesh} The wall mesh.
     */
    createPlayerBlock(position, cellSize, initialHealth = 100) {
        // Use cellSize if provided, otherwise use default
        const wallWidth = cellSize || 4;
        const wallHeight = this.wallMaterial?.wallHeight || 4;
        
        const wall = BABYLON.MeshBuilder.CreateBox(`playerWall_${Date.now()}`, {
            width: wallWidth,
            height: wallHeight,
            depth: wallWidth
        }, this.scene);
    
        wall.position = position;
        // Clone material safely
        wall.material = this.wallMaterial ? 
                        this.wallMaterial.clone(`playerWallMat_${wall.uniqueId}`) : 
                        new BABYLON.StandardMaterial(`playerWallMat_${wall.uniqueId}`, this.scene);
        wall.checkCollisions = true;
        wall.isPickable = true;
    
        // Add tag for identification and grid snapping
        BABYLON.Tags.AddTagsTo(wall, `cell_${position.x}_${position.z}`);
        
        // Initialize metadata as an empty object if it doesn't exist
        wall.metadata = wall.metadata || {};
        
        // Add metadata to indicate it's a buildable surface
        wall.metadata.isBuildableSurface = true;
        wall.metadata.isPlayerBuilt = true;
        wall.metadata.initialHealth = initialHealth || 100; // Ensure default value
        wall.metadata.health = initialHealth || 100; // Ensure default value
        
        // Add metadata for dependency tracking
        wall.metadata.supportingBlock = null; // Block below (support)
        wall.metadata.dependentBlocks = []; // Blocks above (dependents)
        
        // Check if there's a block below to register dependencies
        const supportCheckPosition = position.clone();
        supportCheckPosition.y -= wallHeight / 2; // Half the height down
        
        // Check if there's anything below to register as support
        const ray = new BABYLON.Ray(
            supportCheckPosition,
            new BABYLON.Vector3(0, -1, 0), // Direction downward
            0.1 // Small distance
        );
        
        const hit = this.scene.pickWithRay(ray, mesh => 
            mesh.isPickable && 
            (mesh.name.startsWith("playerWall_") || mesh.name.startsWith("playerRamp_"))
        );
        
        if (hit && hit.pickedMesh) {
            // Register the block below as support
            wall.metadata.supportingBlock = hit.pickedMesh.name;
            
            // Register this block as dependent on the block below
            if (hit.pickedMesh.metadata && Array.isArray(hit.pickedMesh.metadata.dependentBlocks)) {
                hit.pickedMesh.metadata.dependentBlocks.push(wall.name);
                console.log(`${wall.name} is supported by ${hit.pickedMesh.name}`);
            }
        }
        
        console.log(`Created player wall with metadata:`, wall.metadata);
    
        // Add physics if necessary (basic example)
        if (this.scene.getPhysicsEngine()?.getPhysicsPlugin()) {
            wall.physicsImpostor = new BABYLON.PhysicsImpostor(wall, BABYLON.PhysicsImpostor.BoxImpostor, 
                                { mass: 0, restitution: 0.1 }, this.scene);
        } else {
             console.warn("Physics not enabled, skipping impostor for player wall.");
        }
    
        console.log(`Created player wall at ${position} with health ${initialHealth}`);
        return wall;
    }

    /**
     * Destroys the visual representation of a wall.
     * @param {string} wallName Name of the wall mesh to destroy.
     * @param {BABYLON.Vector3} position Position of the wall.
     * @param {Function} onDestroy Callback to handle destruction effects.
     * @param {Function} destroyDependentRamp Callback to destroy dependent ramps.
     * @returns {boolean} Whether the wall was successfully destroyed.
     */
    destroyWallVisual(wallName, position, onDestroy, destroyDependentRamp) {
        const wallMesh = this.scene.getMeshByName(wallName);

        if (wallMesh) {
            if (wallMesh.metadata && wallMesh.metadata.isBeingDestroyed) {
                return true; // Already being destroyed, avoid recursive loop
            }
            if (wallMesh.metadata) {
                wallMesh.metadata.isBeingDestroyed = true;
            }
            // Check if there are dependent blocks that need to be destroyed first
            if (wallMesh.metadata && wallMesh.metadata.dependentBlocks && wallMesh.metadata.dependentBlocks.length > 0) {
                console.log(`${wallName} has ${wallMesh.metadata.dependentBlocks.length} dependent blocks that will be destroyed in cascade`);
                
                // Create a copy of the dependents list to avoid problems during iteration
                const dependentBlocks = [...wallMesh.metadata.dependentBlocks];
                
                // Destroy each dependent block
                for (const dependentBlockName of dependentBlocks) {
                    const dependentMesh = this.scene.getMeshByName(dependentBlockName);
                    if (dependentMesh) {
                        // Determine the type of structure to call the correct method
                        if (dependentBlockName.startsWith("playerWall_")) {
                            this.destroyWallVisual(dependentBlockName, dependentMesh.position, onDestroy, destroyDependentRamp);
                        } else if (dependentBlockName.startsWith("playerRamp_")) {
                            destroyDependentRamp(dependentBlockName, dependentMesh.position);
                        }
                    }
                }
            }
            
            // Remove the reference from its supporting block
            if (wallMesh.metadata && wallMesh.metadata.supportingBlock) {
                const supportingMesh = this.scene.getMeshByName(wallMesh.metadata.supportingBlock);
                if (supportingMesh && supportingMesh.metadata && supportingMesh.metadata.dependentBlocks) {
                    // Remove this block from the supporting block's dependents list
                    const index = supportingMesh.metadata.dependentBlocks.indexOf(wallName);
                    if (index !== -1) {
                        supportingMesh.metadata.dependentBlocks.splice(index, 1);
                        console.log(`Removed reference of ${wallName} from dependents list of ${wallMesh.metadata.supportingBlock}`);
                    }
                }
            }

            // Visual destruction effect
            if (onDestroy) {
                onDestroy(position);
            }

            // Remove the mesh from the scene
            wallMesh.dispose();

            return true;
        } else {
            return false;
        }
    }

    /**
     * Applies visual damage effect to a wall.
     * @param {string} wallName Name of the wall mesh.
     * @param {number} remainingHealth Current health points.
     * @param {number} initialHealth Initial health points.
     * @param {Function} onDamage Callback to handle damage effects.
     */
    applyWallDamageVisual(wallName, remainingHealth, initialHealth, onDamage) {
        const wallMesh = this.scene.getMeshByName(wallName);
        if (!wallMesh || !wallMesh.material) return;

        const damageRatio = 1 - (remainingHealth / initialHealth); // 0 = no damage, 1 = destroyed

        // Change color to indicate damage (darker/reddish)
        const baseColor = this.wallMaterial.diffuseColor || new BABYLON.Color3(1, 1, 1); // Base color of original material
        // Make sure wallMesh.material exists before accessing its properties
        if (wallMesh.material instanceof BABYLON.StandardMaterial) {
            wallMesh.material.diffuseColor = BABYLON.Color3.Lerp(baseColor, new BABYLON.Color3(0.5, 0.2, 0.2), damageRatio);
            // Add a slight red glow
            wallMesh.material.emissiveColor = new BABYLON.Color3(damageRatio * 0.3, 0, 0);
        }

        // Create a small particle effect (optional)
        if (onDamage) {
            onDamage(wallMesh.position);
        }
    }
}

export default Block;