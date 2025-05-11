// filepath: c:\Users\gluca\OneDrive\Ambiente de Trabalho\game\view\Blocks\Barricade.js
// Barricade.js - Class for handling barricades in the game (half-height, half-depth walls)

class Barricade {
    constructor(scene, materials) {
        this.scene = scene;
        this.wallMaterial = materials.wallMaterial;
    }

    /**
     * Creates a single barricade instance built by the player.
     * @param {BABYLON.Vector3} position Central position of the barricade.
     * @param {number} cellSize Size of the grid cell.
     * @param {number} rotation Rotation in radians on Y axis.
     * @param {number} initialHealth Initial health points of the barricade.
     * @returns {BABYLON.Mesh} The barricade mesh.
     */
    createPlayerBarricade(position, cellSize, rotation = 0, initialHealth = 200) {
        // Use cellSize if provided, otherwise use default
        const barricadeWidth = cellSize || 4;
        const barricadeHeight = (this.wallMaterial?.wallHeight || 4); // Quarter height (was half height)
        const barricadeDepth = (cellSize || 4) / 5; // Half depth
        
        // Adjust position to align with ground properly with the new lower height
        const adjustedPosition = position.clone();
        adjustedPosition.y = position.y - (this.wallMaterial?.wallHeight || 4) / 10; // Adjust Y position to compensate for lower height
        
        const barricade = BABYLON.MeshBuilder.CreateBox(`playerBarricade_${Date.now()}`, {
            width: barricadeWidth,
            height: barricadeHeight,
            depth: barricadeDepth
        }, this.scene);
    
        barricade.position = adjustedPosition; // Use adjusted position
        barricade.rotation.y = rotation; // Apply rotation
        
        // Clone material safely
        barricade.material = this.wallMaterial ? 
                            this.wallMaterial.clone(`playerBarricadeMat_${barricade.uniqueId}`) : 
                            new BABYLON.StandardMaterial(`playerBarricadeMat_${barricade.uniqueId}`, this.scene);
        barricade.checkCollisions = true;
        barricade.isPickable = true;
    
        // Add tag for identification and grid snapping
        BABYLON.Tags.AddTagsTo(barricade, `cell_${position.x}_${position.z}`);
        
        // Initialize metadata as an empty object if it doesn't exist
        barricade.metadata = barricade.metadata || {};
        
        // Add metadata to indicate it's a buildable surface
        barricade.metadata.isBuildableSurface = true;
        barricade.metadata.isPlayerBuilt = true;
        barricade.metadata.initialHealth = initialHealth || 200; // Ensure default value
        barricade.metadata.health = initialHealth || 200; // Ensure default value
        
        // Add metadata for dependency tracking
        barricade.metadata.supportingBlock = null; // Block below (support)
        barricade.metadata.dependentBlocks = []; // Blocks above (dependents)
        
        // Check if there's a block below to register dependencies
        const supportCheckPosition = position.clone();
        supportCheckPosition.y -= barricadeHeight / 2; // Half the height down
        
        // Check if there's anything below to register as support
        const ray = new BABYLON.Ray(
            supportCheckPosition,
            new BABYLON.Vector3(0, -1, 0), // Direction downward
            0.1 // Small distance
        );
        
        const hit = this.scene.pickWithRay(ray, mesh => 
            mesh.isPickable && 
            (mesh.name.startsWith("playerWall_") || 
             mesh.name.startsWith("playerRamp_") || 
             mesh.name.startsWith("playerBarricade_"))
        );
        
        if (hit && hit.pickedMesh) {
            // Register the block below as support
            barricade.metadata.supportingBlock = hit.pickedMesh.name;
            
            // Register this block as dependent on the block below
            if (hit.pickedMesh.metadata && Array.isArray(hit.pickedMesh.metadata.dependentBlocks)) {
                hit.pickedMesh.metadata.dependentBlocks.push(barricade.name);
                console.log(`${barricade.name} is supported by ${hit.pickedMesh.name}`);
            }
        }
        
        console.log(`Created player barricade with metadata:`, barricade.metadata);
    
        // Add physics if necessary (basic example)
        if (this.scene.getPhysicsEngine()?.getPhysicsPlugin()) {
            barricade.physicsImpostor = new BABYLON.PhysicsImpostor(barricade, BABYLON.PhysicsImpostor.BoxImpostor, 
                                { mass: 0, restitution: 0.1 }, this.scene);
        } else {
             console.warn("Physics not enabled, skipping impostor for player barricade.");
        }
    
        console.log(`Created player barricade at ${position} with health ${initialHealth}`);
        return barricade;
    }

    /**
     * Destroys the visual representation of a barricade.
     * @param {string} barricadeName Name of the barricade mesh to destroy.
     * @param {BABYLON.Vector3} position Position of the barricade.
     * @param {Function} onDestroy Callback to handle destruction effects.
     * @param {Function} destroyDependentBlock Callback to destroy dependent blocks.
     * @returns {boolean} Whether the barricade was successfully destroyed.
     */
    destroyBarricadeVisual(barricadeName, position, onDestroy, destroyDependentBlock) {
        const barricadeMesh = this.scene.getMeshByName(barricadeName);

        if (barricadeMesh) {
            if (barricadeMesh.metadata && barricadeMesh.metadata.isBeingDestroyed) {
                return true; // Already being destroyed, avoid recursive loop
            }
            if (barricadeMesh.metadata) {
                barricadeMesh.metadata.isBeingDestroyed = true;
            }
            // Check if there are dependent blocks that need to be destroyed first
            if (barricadeMesh.metadata && barricadeMesh.metadata.dependentBlocks && barricadeMesh.metadata.dependentBlocks.length > 0) {
                console.log(`${barricadeName} has ${barricadeMesh.metadata.dependentBlocks.length} dependent blocks that will be destroyed in cascade`);
                
                // Create a copy of the dependents list to avoid problems during iteration
                const dependentBlocks = [...barricadeMesh.metadata.dependentBlocks];
                
                // Destroy each dependent block
                for (const dependentBlockName of dependentBlocks) {
                    const dependentMesh = this.scene.getMeshByName(dependentBlockName);
                    if (dependentMesh) {
                        // Determine the type of structure to call the correct method
                        if (dependentBlockName.startsWith("playerWall_")) {
                            destroyDependentBlock(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerRamp_")) {
                            destroyDependentBlock(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerBarricade_")) {
                            this.destroyBarricadeVisual(dependentBlockName, dependentMesh.position, onDestroy, destroyDependentBlock);
                        }
                    }
                }
            }
            
            // Remove the reference from its supporting block
            if (barricadeMesh.metadata && barricadeMesh.metadata.supportingBlock) {
                const supportingMesh = this.scene.getMeshByName(barricadeMesh.metadata.supportingBlock);
                if (supportingMesh && supportingMesh.metadata && supportingMesh.metadata.dependentBlocks) {
                    // Remove this block from the supporting block's dependents list
                    const index = supportingMesh.metadata.dependentBlocks.indexOf(barricadeName);
                    if (index !== -1) {
                        supportingMesh.metadata.dependentBlocks.splice(index, 1);
                        console.log(`Removed reference of ${barricadeName} from dependents list of ${barricadeMesh.metadata.supportingBlock}`);
                    }
                }
            }

            // Visual destruction effect
            if (onDestroy) {
                onDestroy(position);
            }

            // Remove the mesh from the scene
            barricadeMesh.dispose();

            return true;
        } else {
            return false;
        }
    }

    /**
     * Applies visual damage effect to a barricade.
     * @param {string} barricadeName Name of the barricade mesh.
     * @param {number} remainingHealth Current health points.
     * @param {number} initialHealth Initial health points.
     * @param {Function} onDamage Callback to handle damage effects.
     */
    applyBarricadeDamageVisual(barricadeName, remainingHealth, initialHealth, onDamage) {
        const barricadeMesh = this.scene.getMeshByName(barricadeName);
        if (!barricadeMesh || !barricadeMesh.material) return;

        const damageRatio = 1 - (remainingHealth / initialHealth); // 0 = no damage, 1 = destroyed

        // Change color to indicate damage (darker/reddish)
        const baseColor = this.wallMaterial.diffuseColor || new BABYLON.Color3(1, 1, 1); // Base color of original material
        // Make sure barricadeMesh.material exists before accessing its properties
        if (barricadeMesh.material instanceof BABYLON.StandardMaterial) {
            barricadeMesh.material.diffuseColor = BABYLON.Color3.Lerp(baseColor, new BABYLON.Color3(0.5, 0.2, 0.2), damageRatio);
            // Add a slight red glow
            barricadeMesh.material.emissiveColor = new BABYLON.Color3(damageRatio * 0.3, 0, 0);
        }

        // Create a small particle effect (optional)
        if (onDamage) {
            onDamage(barricadeMesh.position);
        }
    }
}

export default Barricade;