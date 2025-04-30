// Ramp.js - Class for handling ramps in the game

class Ramp {
    constructor(scene, materials) {
        this.scene = scene;
        this.rampMaterial = materials.rampMaterial;
    }

    /**
     * Creates a single ramp instance built by the player.
     * @param {BABYLON.Vector3} position Position of the ramp base.
     * @param {number} rotationY Rotation in radians on Y axis.
     * @param {number} cellSize Size of the grid cell.
     * @param {string} direction Direction of the ramp ('east' or 'south').
     * @param {number} initialHealth Initial health points of the ramp.
     * @returns {BABYLON.Mesh} The ramp mesh.
     */
    createPlayerRamp(position, rotationY, cellSize, direction = 'east', initialHealth = 150) {
        // Use cellSize if provided, otherwise fallback
        const rampWidth = cellSize || 4;
        const rampHeight = 4; // Default height if not available from materials
        const rampDepth = rampWidth; // Use same width for depth

        // Create the ramp shape - more elaborate version
        // Direction determines how the ramp is oriented
        const rampName = `playerRamp_${direction}_${Date.now()}`;

        // Define vertices for the solid right-angled triangle (similar to existing logic in createRamps)
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];
        
        // Configure geometry based on direction
        if (direction === 'south') { // Slope from south to north
            positions.push(
                // Bottom face (rectangle)
                -rampWidth/2, 0, -rampDepth/2,  // 0: left front bottom
                rampWidth/2, 0, -rampDepth/2,   // 1: right front bottom
                rampWidth/2, 0, rampDepth/2,    // 2: right back bottom
                -rampWidth/2, 0, rampDepth/2,   // 3: left back bottom
                
                // Top face (inclined triangle)
                -rampWidth/2, rampHeight, -rampDepth/2,  // 4: left front top
                rampWidth/2, rampHeight, -rampDepth/2,   // 5: right front top
                rampWidth/2, 0, rampDepth/2,    // 6: right back bottom (same as 2)
                -rampWidth/2, 0, rampDepth/2    // 7: left back bottom (same as 3)
            );
            
            // Indices to define faces (triangles) of the mesh
            indices.push(
                // Base (bottom face) - normal downward
                0, 2, 1,
                0, 3, 2,
                
                // Front face (vertical rectangle) - normal forward
                0, 1, 5,
                0, 5, 4,
                
                // Back face (horizontal rectangle) - normal backward
                3, 6, 2,
                3, 7, 6,
                
                // Left face (triangle) - normal leftward
                0, 4, 7,
                0, 7, 3,
                
                // Right face (triangle) - normal rightward
                1, 2, 6,
                1, 6, 5,
                
                // Top face (ramp) - normal upward/diagonal
                4, 5, 6,
                4, 6, 7
            );
        } else { // Default: 'east' - Slope from east to west
            positions.push(
                // Bottom face (rectangle)
                -rampDepth/2, 0, -rampWidth/2,  // 0: front left bottom
                rampDepth/2, 0, -rampWidth/2,   // 1: front right bottom
                rampDepth/2, 0, rampWidth/2,    // 2: back right bottom
                -rampDepth/2, 0, rampWidth/2,   // 3: back left bottom
                
                // Top face (inclined triangle)
                -rampDepth/2, 0, -rampWidth/2,      // 4: front left bottom (same as 0)
                rampDepth/2, rampHeight, -rampWidth/2,  // 5: front right top
                rampDepth/2, rampHeight, rampWidth/2,   // 6: back right top
                -rampDepth/2, 0, rampWidth/2        // 7: back left bottom (same as 3)
            );
            
            // Indices to define faces (triangles) of the mesh
            indices.push(
                // Base (bottom face) - normal downward
                0, 2, 1,
                0, 3, 2,
                
                // Front face (inclined rectangle) - normal forward
                0, 1, 5,
                0, 5, 4,
                
                // Back face (inclined rectangle) - normal backward
                3, 6, 2,
                3, 7, 6,
                
                // Left face (flat rectangle) - normal leftward
                0, 4, 7,
                0, 7, 3,
                
                // Right face (inclined) - normal rightward
                1, 2, 6,
                1, 6, 5,
                
                // Top face (inclined) - normal upward
                4, 5, 6,
                4, 6, 7
            );
        }

        // Calculate normals for correct lighting
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        
        // Generate simple UVs
        for (let i = 0; i < positions.length / 3; i++) {
            // Map UVs based on position for better texture mapping
            const vertexIndex = i * 3;
            const y = positions[vertexIndex + 1]; // Y component
            
            // Normalize height for UV mapping
            const v = y / rampHeight;
            
            // For U component, use a combination of X and Z to avoid distortions
            const x = positions[vertexIndex];
            const z = positions[vertexIndex + 2];
            
            // Normalize to UV coordinates (0-1)
            const u = (x / rampWidth + 0.5 + z / rampDepth + 0.5) / 2;
            
            uvs.push(u, v);
        }

        // Create vertexData and apply to mesh
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.uvs = uvs;

        // Create the ramp mesh
        const ramp = new BABYLON.Mesh(rampName, this.scene);
        
        // Apply vertexData to mesh
        vertexData.applyToMesh(ramp);
        
        // Initialize metadata as an empty object
        ramp.metadata = {};

        // Add properties to metadata
        ramp.metadata.isBuildableSurface = true;
        ramp.metadata.isPlayerBuilt = true;
        ramp.metadata.isRamp = true;
        ramp.metadata.rampDirection = direction;
        ramp.metadata.initialHealth = initialHealth || 150; // Ensure default value
        ramp.metadata.health = initialHealth || 150; // Ensure default value
        
        // Add metadata for dependency tracking
        ramp.metadata.supportingBlock = null; // Block below (support)
        ramp.metadata.dependentBlocks = []; // Blocks above (dependents)
        
        // Check if there's a block below to register dependencies
        const supportCheckPosition = position.clone();
        supportCheckPosition.y -= 0.1; // Small distance down from ramp base
        
        // Check if there's anything below to register as support
        const ray = new BABYLON.Ray(
            supportCheckPosition,
            new BABYLON.Vector3(0, -1, 0), // Direction downward
            0.5 // Increased detection distance to catch blocks below
        );
        
        const hit = this.scene.pickWithRay(ray, mesh => 
            mesh.isPickable && 
            (mesh.name.startsWith("playerWall_") || mesh.name.startsWith("playerRamp_") || mesh.name === "floor")
        );
        
        if (hit && hit.pickedMesh) {
            // Register the block below as support (except if it's the floor)
            if (hit.pickedMesh.name !== "floor") {
                ramp.metadata.supportingBlock = hit.pickedMesh.name;
                
                // Register this ramp as dependent on the block below
                if (hit.pickedMesh.metadata && Array.isArray(hit.pickedMesh.metadata.dependentBlocks)) {
                    hit.pickedMesh.metadata.dependentBlocks.push(ramp.name);
                    console.log(`${ramp.name} is supported by ${hit.pickedMesh.name}`);
                }
            }
        }
        
        console.log(`Created player ramp with metadata:`, ramp.metadata);
        
        // Position the ramp at the exact passed position
        ramp.position = position.clone();
        
        // Apply rotation (allows fine-tuning beyond direction geometry)
        ramp.rotation.y = rotationY;

        // Apply material
        const rampMaterial = this.rampMaterial ? 
                          this.rampMaterial.clone(`playerRampMat_${ramp.uniqueId}`) : 
                          new BABYLON.StandardMaterial(`playerRampMat_${ramp.uniqueId}`, this.scene);
        
        // For better rendering of ramp faces
        rampMaterial.backFaceCulling = false;
        rampMaterial.twoSidedLighting = true;
        
        ramp.material = rampMaterial;
        
        // Enable collisions
        ramp.checkCollisions = true;
        ramp.isPickable = true;

        // Add tag for identification and grid snapping
        BABYLON.Tags.AddTagsTo(ramp, `cell_${position.x}_${position.z}`);
        
        // Add physics if available
        if (this.scene.getPhysicsEngine()?.getPhysicsPlugin()) {
            ramp.physicsImpostor = new BABYLON.PhysicsImpostor(
                ramp, 
                BABYLON.PhysicsImpostor.MeshImpostor, // Using MeshImpostor for custom shape
                { mass: 0, restitution: 0.1 }, 
                this.scene
            );
        } else {
            console.warn("Physics not enabled, skipping impostor for player ramp.");
        }

        console.log(`Created player ramp (${direction}) at ${position} with health ${initialHealth}`);
        return ramp;
    }

    /**
     * Destroys the visual representation of a ramp.
     * @param {string} rampName Name of the ramp mesh to destroy.
     * @param {BABYLON.Vector3} position Position of the ramp.
     * @param {Function} onDestroy Callback to handle destruction effects.
     * @param {Function} destroyDependentWall Callback to destroy dependent walls.
     * @returns {boolean} Whether the ramp was successfully destroyed.
     */
    destroyRampVisual(rampName, position, onDestroy, destroyDependentWall) {
        const rampMesh = this.scene.getMeshByName(rampName);

        if (rampMesh) {
            if (rampMesh.metadata && rampMesh.metadata.isBeingDestroyed) {
                return true; // Already being destroyed, avoid recursive loop
            }
            
            // Mark this mesh as "being destroyed"
            if (rampMesh.metadata) {
                rampMesh.metadata.isBeingDestroyed = true;
            }
            // Check if there are dependent blocks that need to be destroyed first
            if (rampMesh.metadata && rampMesh.metadata.dependentBlocks && rampMesh.metadata.dependentBlocks.length > 0) {
                console.log(`${rampName} has ${rampMesh.metadata.dependentBlocks.length} dependent blocks that will be destroyed in cascade`);
                
                // Create a copy of the dependents list to avoid problems during iteration
                const dependentBlocks = [...rampMesh.metadata.dependentBlocks];
                
                // Destroy each dependent block
                for (const dependentBlockName of dependentBlocks) {
                    const dependentMesh = this.scene.getMeshByName(dependentBlockName);
                    if (dependentMesh) {
                        // Determine the type of structure to call the correct method
                        if (dependentBlockName.startsWith("playerWall_")) {
                            destroyDependentWall(dependentBlockName, dependentMesh.position);
                        } else if (dependentBlockName.startsWith("playerRamp_")) {
                            this.destroyRampVisual(dependentBlockName, dependentMesh.position, onDestroy, destroyDependentWall);
                        }
                    }
                }
            }
            
            // Remove the reference from its supporting block
            if (rampMesh.metadata && rampMesh.metadata.supportingBlock) {
                const supportingMesh = this.scene.getMeshByName(rampMesh.metadata.supportingBlock);
                if (supportingMesh && supportingMesh.metadata && supportingMesh.metadata.dependentBlocks) {
                    // Remove this ramp from the supporting block's dependents list
                    const index = supportingMesh.metadata.dependentBlocks.indexOf(rampName);
                    if (index !== -1) {
                        supportingMesh.metadata.dependentBlocks.splice(index, 1);
                        console.log(`Removed reference of ${rampName} from dependents list of ${rampMesh.metadata.supportingBlock}`);
                    }
                }
            }

            // Visual destruction effect (can be similar to the wall one)
            if (onDestroy) {
                onDestroy(position);
            }

            // Remove the mesh from the scene
            rampMesh.dispose();

            return true;
        } else {
            return false;
        }
    }

    /**
     * Applies visual damage effect to a ramp.
     * @param {string} rampName Name of the ramp mesh.
     * @param {number} remainingHealth Current health points.
     * @param {number} initialHealth Initial health points.
     * @param {Function} onDamage Callback to handle damage effects.
     */
    applyRampDamageVisual(rampName, remainingHealth, initialHealth, onDamage) {
        const rampMesh = this.scene.getMeshByName(rampName);
        if (!rampMesh || !rampMesh.material) return;

        const damageRatio = 1 - (remainingHealth / initialHealth);

        // Change color to indicate damage (similar to wall)
        const baseColor = this.rampMaterial.diffuseColor || new BABYLON.Color3(0.8, 0.7, 0.6);
        if (rampMesh.material instanceof BABYLON.StandardMaterial) {
            rampMesh.material.diffuseColor = BABYLON.Color3.Lerp(baseColor, new BABYLON.Color3(0.5, 0.2, 0.2), damageRatio);
            rampMesh.material.emissiveColor = new BABYLON.Color3(damageRatio * 0.3, 0, 0);
        }

        // Create impact effect (reuse wall one)
        if (onDamage) {
            onDamage(rampMesh.position);
        }
    }
}

export default Ramp;