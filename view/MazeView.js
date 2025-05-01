// MazeView.js - Handles visualization of maze elements

import Block from './Blocks/Block.js';
import Ramp from './Blocks/Ramp.js';
import Barricade from './Blocks/Barricade.js';

class MazeView {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        this.wallMaterial = null;
        this.floorMaterial = null;
        this.rampMaterial = null;
        this.barricadeMaterial = null;

        // Initialize materials
        this.initializeMaterials();
        
        // Initialize block and ramp handlers
        this.blockHandler = new Block(scene, { wallMaterial: this.wallMaterial });
        this.rampHandler = new Ramp(scene, { rampMaterial: this.rampMaterial });
        this.barricadeHandler = new Barricade(scene, { wallMaterial: this.wallMaterial });
    }
    
    // Initialize materials for walls, floor and ceiling
    initializeMaterials() {
        // Material for walls
        this.wallMaterial = new BABYLON.StandardMaterial("mazeMaterial", this.scene);
        const wallTexture = new BABYLON.Texture("textures/wall.png", this.scene);
        this.wallMaterial.diffuseTexture = wallTexture;
        this.wallMaterial.wallHeight = 4; // Store height for reference
        
        // Material for floor
        this.floorMaterial = new BABYLON.StandardMaterial("floorMaterial", this.scene);

        // Add texture for ramp
        this.rampMaterial = new BABYLON.StandardMaterial("rampMaterial", this.scene);
        const rampTexture = new BABYLON.Texture("textures/wall.png", this.scene);
        this.rampMaterial.diffuseTexture = rampTexture;
        this.rampMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.6); 
        
        // Material for barricade (can share wall texture but slightly different color)
        this.barricadeMaterial = new BABYLON.StandardMaterial("barricadeMaterial", this.scene);
        const barricadeTexture = new BABYLON.Texture("textures/wall.png", this.scene);
        this.barricadeMaterial.diffuseTexture = barricadeTexture;
        this.barricadeMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.6, 0.5); // Slightly different tone
    }
    
    // Render the maze based on the model
    renderMaze(mazeModel) {
        // Clear existing meshes
        this.clearMeshes();
        
        // Get maze dimensions
        const dimensions = mazeModel.getMazeDimensions();
        
        // Create floor
        this.createFloor(dimensions);
        
        // Create walls based on layout
        const layout = mazeModel.getLayout();
        if (layout && layout.length > 0) {
            this.createWalls(layout, dimensions);
        } else {
            console.error("Maze layout is not available");
        }

        const rampPositions = mazeModel.getRampPositions();
        if (rampPositions && rampPositions.length > 0) {
            this.createRamps(rampPositions, dimensions);
        }
    }
    
    // Clear existing meshes
    clearMeshes() {
        this.meshes.forEach(mesh => {
            if (mesh) {
                mesh.dispose();
            }
        });
        this.meshes = [];
    }
    
    // Create floor 
    createFloor(dimensions) {
        // Create floor exactly the size of the maze layout
        const floor = BABYLON.MeshBuilder.CreateGround(
            "floor", 
            { width: dimensions.width * 2, height: dimensions.height * 2 }, 
            this.scene
        );
    
        // Add texture to floor material
        const floorTexture = new BABYLON.Texture("textures/floor.png", this.scene);
        this.floorMaterial.diffuseTexture = floorTexture;
        
        // Adjust texture repetition to avoid distortion
        // The higher the number, the more times the texture will repeat
        this.floorMaterial.diffuseTexture.uScale = dimensions.width / 2;
        this.floorMaterial.diffuseTexture.vScale = dimensions.height / 2;
    
        // Center the floor at the origin
        floor.position = new BABYLON.Vector3(0, 0, 0);
        floor.material = this.floorMaterial;
        this.meshes.push(floor);
    }
    
    // Create maze walls
    createWalls(layout, dimensions) {
        const rows = layout.length;
        const cols = layout[0].length;
        const offsetX = (cols * dimensions.cellSize) / 2;
        const offsetZ = (rows * dimensions.cellSize) / 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Skip if not a wall (value 1)
                if (layout[row][col] !== 1) continue;

                // Calculate world position
                const x = (col * dimensions.cellSize) - offsetX + (dimensions.cellSize / 2);
                const z = (row * dimensions.cellSize) - offsetZ + (dimensions.cellSize / 2);
                const wallName = `wall_${row}_${col}`; // Unique name

                // Create the wall as an individual mesh
                const wall = BABYLON.MeshBuilder.CreateBox(
                    wallName, 
                    {
                        width: dimensions.cellSize,
                        height: dimensions.wallHeight,
                        depth: dimensions.cellSize
                    },
                    this.scene
                );
                wall.position = new BABYLON.Vector3(x, dimensions.wallHeight / 2, z);

                // Apply material and collisions directly to individual wall
                // Clone material to allow individual modifications (visual damage)
                wall.material = this.wallMaterial.clone(`${wallName}_material`); 

                // Add metadata to identify the grid position (optional, but useful)
                wall.metadata = { type: "wall", gridRow: row, gridCol: col };

                // Add the individual wall to the view's mesh list
                this.meshes.push(wall);
            }
        }
    }
    
    // Create ramps based on positions
    createRamps(rampPositions, dimensions) {
        for (const position of rampPositions) {
            // Determine final height (top of wall)
            const wallTopHeight = dimensions.wallHeight;
            
            // Calculate ramp length needed to reach wall height
            const rampLength = wallTopHeight / Math.sin(Math.PI / 6);            
            // Ramp dimensions
            const width = dimensions.cellSize;
            const height = wallTopHeight;
            const depth = rampLength;
            
            // Create a solid right-angled triangle using custom vertices
            // Use row, col and direction for a unique name
            const rampName = `ramp_${position.row}_${position.col}_${position.direction}`;
            
            // Define the vertices of the solid right-angled triangle
            const positions = [];
            const indices = [];
            const normals = [];
            const uvs = [];
            
            // Depending on direction, define vertices to form a solid right-angled triangle
            switch (position.direction) {
                case 'south': {
                    // Slope from south to north
                    positions.push(
                        // Bottom face (rectangle)
                        -width/2, 0, -depth/2,  // 0: left front bottom
                        width/2, 0, -depth/2,   // 1: right front bottom
                        width/2, 0, depth/2,    // 2: right back bottom
                        -width/2, 0, depth/2,   // 3: left back bottom
                        
                        // Top face (inclined triangle)
                        -width/2, height, -depth/2,  // 4: left front top
                        width/2, height, -depth/2,   // 5: right front top
                        width/2, 0, depth/2,    // 6: right back bottom (same as 2)
                        -width/2, 0, depth/2    // 7: left back bottom (same as 3)
                    );
                    
                    // Correcting face orientation for consistent counter-clockwise direction
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
                    break;
                }
                case 'east': {
                    // Slope from east to west
                    positions.push(
                        // Bottom face (rectangle)
                        -depth/2, 0, -width/2,  // 0: front left bottom
                        depth/2, 0, -width/2,   // 1: front right bottom
                        depth/2, 0, width/2,    // 2: back right bottom
                        -depth/2, 0, width/2,   // 3: back left bottom
                        
                        // Top face (inclined triangle)
                        -depth/2, 0, -width/2,      // 4: front left bottom (same as 0)
                        depth/2, height, -width/2,  // 5: front right top
                        depth/2, height, width/2,   // 6: back right top
                        -depth/2, 0, width/2        // 7: back left bottom (same as 3)
                    );
                    
                    // Correcting face orientation for consistent counter-clockwise direction
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
                    break;
                }
                default: {
                    // If an invalid direction is passed for some reason, do nothing
                    console.warn(`Unknown or removed ramp direction: ${position.direction}`);
                    continue; // Skip to next ramp position
                }
            }
            
            // Create the triangle ramp mesh
            const ramp = new BABYLON.Mesh(rampName, this.scene);
            
            // Define vertex data
            const vertexData = new BABYLON.VertexData();
            vertexData.positions = positions;
            vertexData.indices = indices;
            
            // Use BABYLON method to calculate normals (more accurate than manual calculation)
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);
            vertexData.normals = normals;
            
            // Create enhanced UV coordinates
            for (let i = 0; i < positions.length / 3; i++) {
                // Map UVs based on height for better texture mapping
                const vertexIndex = i * 3;
                const y = positions[vertexIndex + 1]; // Y component
                
                // Normalize height for UV mapping
                const v = y / height;
                
                // For U component, use a combination of X and Z to avoid distortions
                const x = positions[vertexIndex];
                const z = positions[vertexIndex + 2];
                
                // Normalize to UV coordinates (0-1)
                const u = (x / width + 0.5 + z / depth + 0.5) / 2;
                
                uvs.push(u, v);
            }
            vertexData.uvs = uvs;
            
            // Apply data to mesh
            vertexData.applyToMesh(ramp);
            
            // Add metadata to identify the ramp
            ramp.metadata = { type: "ramp", row: position.row, col: position.col, direction: position.direction };

            // Ensure normals are optimized for lighting
            ramp.forceSharedVertices();
            
            // Position the ramp
            let posX = position.x;
            let posZ = position.z;
            let offsetX = 0;
            let offsetZ = 0;
            
            // Calculate offset based on direction
            switch (position.direction) {
                case 'north':
                    offsetZ = depth / 2 - dimensions.cellSize / 2;
                    break;
                case 'south':
                    offsetZ = -depth / 2 + dimensions.cellSize / 2;
                    break;
                case 'east':
                    offsetX = depth / 2 - dimensions.cellSize / 2;
                    break;
                case 'west':
                    offsetX = -depth / 2 + dimensions.cellSize / 2;
                    break;
                default:
                    offsetZ = depth / 2 - dimensions.cellSize / 2;
            }
            
            // Position the ramp
            ramp.position = new BABYLON.Vector3(
                posX + offsetX,
                0,
                posZ + offsetZ
            );
            
            // Enable back-face culling to avoid rendering problems
            const rampMaterial = this.rampMaterial.clone(rampName + "_material");
            rampMaterial.backFaceCulling = false;  // Disable backface culling 
            rampMaterial.twoSidedLighting = true;  // Enable two-sided lighting
            ramp.material = rampMaterial;
            
            // Check if physics is enabled before creating the impostor
            if (this.scene.getPhysicsEngine()) {
                ramp.physicsImpostor = new BABYLON.PhysicsImpostor(
                    ramp, 
                    BABYLON.PhysicsImpostor.MeshImpostor,
                    { 
                        mass: 0, 
                        friction: 0.5, 
                        restitution: 0.1 
                    }, 
                    this.scene
                );
            } else {
                console.warn("Physics not enabled. Physical impostor not created for ramp:", rampName);
            }
            
            this.meshes.push(ramp);
        }
    }

    // Method to destroy the *visual representation* of the wall
    destroyWallVisual(wallName, position) {
        // Using the Block handler to destroy the wall
        const result = this.blockHandler.destroyWallVisual(
            wallName, 
            position, 
            // Callback for destruction effect
            (pos) => this.createWallDestructionEffect(pos),
            // Callback for dependent ramp destruction
            (rampName, rampPos) => this.destroyRampVisual(rampName, rampPos)
        );
        
        // If successful and it was in our meshes array, remove it
        if (result) {
            const wallMesh = this.scene.getMeshByName(wallName);
            const index = this.meshes.indexOf(wallMesh);
            if (index > -1) {
                this.meshes.splice(index, 1);
            }
        }
        
        return result;
    }

    // Method to destroy the *visual representation* of the ramp
    destroyRampVisual(rampName, position) {
        // Using the Ramp handler to destroy the ramp
        const result = this.rampHandler.destroyRampVisual(
            rampName, 
            position, 
            // Callback for destruction effect
            (pos) => this.createWallDestructionEffect(pos),
            // Callback for dependent wall destruction
            (wallName, wallPos) => this.destroyWallVisual(wallName, wallPos)
        );
        
        // If successful and it was in our meshes array, remove it
        if (result) {
            const rampMesh = this.scene.getMeshByName(rampName);
            const index = this.meshes.indexOf(rampMesh);
            if (index > -1) {
                this.meshes.splice(index, 1);
            }
        }
        
        return result;
    }

    // Method to destroy the *visual representation* of the barricade
    destroyBarricadeVisual(barricadeName, position) {
        // Using the Barricade handler to destroy the barricade
        const result = this.barricadeHandler.destroyBarricadeVisual(
            barricadeName, 
            position, 
            // Callback for destruction effect
            (pos) => this.createWallDestructionEffect(pos),
            // Callback for dependent block destruction
            (dependentName, dependentPos) => {
                if (dependentName.startsWith("playerWall_")) {
                    return this.destroyWallVisual(dependentName, dependentPos);
                } else if (dependentName.startsWith("playerRamp_")) {
                    return this.destroyRampVisual(dependentName, dependentPos);
                } else if (dependentName.startsWith("playerBarricade_")) {
                    return this.destroyBarricadeVisual(dependentName, dependentPos);
                }
            }
        );
        
        // If successful and it was in our meshes array, remove it
        if (result) {
            const barricadeMesh = this.scene.getMeshByName(barricadeName);
            const index = this.meshes.indexOf(barricadeMesh);
            if (index > -1) {
                this.meshes.splice(index, 1);
            }
        }
        
        return result;
    }

    // Method to apply visual damage effect to wall
    applyWallDamageVisual(wallName, remainingHealth, initialHealth) {
        this.blockHandler.applyWallDamageVisual(
            wallName,
            remainingHealth,
            initialHealth,
            (position) => this.createWallDamageImpactEffect(position)
        );
    }

    // Method to apply visual damage effect to ramp
    applyRampDamageVisual(rampName, remainingHealth, initialHealth) {
        this.rampHandler.applyRampDamageVisual(
            rampName,
            remainingHealth,
            initialHealth,
            (position) => this.createWallDamageImpactEffect(position)
        );
    }

    // Method to apply visual damage effect to barricade
    applyBarricadeDamageVisual(barricadeName, remainingHealth, initialHealth) {
        this.barricadeHandler.applyBarricadeDamageVisual(
            barricadeName,
            remainingHealth,
            initialHealth,
            (position) => this.createWallDamageImpactEffect(position)
        );
    }

    // Particle effect for damage impact (smaller than destruction)
    createWallDamageImpactEffect(position) {
        const impactSystem = new BABYLON.ParticleSystem("wallImpact", 50, this.scene);
        impactSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        impactSystem.emitter = position.clone();
        impactSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
        impactSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);

        impactSystem.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.8);
        impactSystem.color2 = new BABYLON.Color4(0.6, 0.6, 0.6, 0.5);
        impactSystem.colorDead = new BABYLON.Color4(0.4, 0.4, 0.4, 0.0);

        impactSystem.minSize = 0.05;
        impactSystem.maxSize = 0.15;
        impactSystem.minLifeTime = 0.2;
        impactSystem.maxLifeTime = 0.5;
        impactSystem.emitRate = 100;
        impactSystem.minEmitPower = 0.5;
        impactSystem.maxEmitPower = 1.5;
        impactSystem.gravity = new BABYLON.Vector3(0, -5, 0);
        impactSystem.disposeOnStop = true;

        impactSystem.start();
        setTimeout(() => impactSystem.stop(), 100); // Short duration
    }

    // Method to create visual debris effect
    createWallDestructionEffect(position) {
        console.log(`VIEW: Creating destruction effect at [${position.x}, ${position.z}]`);
        
        // 1. Particle system for debris
        const debrisSystem = new BABYLON.ParticleSystem("wallDebris", 200, this.scene);
        debrisSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        debrisSystem.emitter = new BABYLON.Vector3(position.x, 2, position.z);
        
        // Enhanced settings for particles
        debrisSystem.color1 = new BABYLON.Color4(0.7, 0.7, 0.7, 1.0);
        debrisSystem.color2 = new BABYLON.Color4(0.5, 0.5, 0.5, 1.0);
        debrisSystem.colorDead = new BABYLON.Color4(0.3, 0.3, 0.3, 0.0);
        
        debrisSystem.minSize = 0.2;
        debrisSystem.maxSize = 0.7;
        
        debrisSystem.minLifeTime = 1;
        debrisSystem.maxLifeTime = 3;
        
        debrisSystem.emitRate = 300;
        debrisSystem.minEmitPower = 3;
        debrisSystem.maxEmitPower = 7;
        
        debrisSystem.updateSpeed = 0.01;
        debrisSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
        
        // 2. Dust effect (smaller, slower particles)
        const dustSystem = new BABYLON.ParticleSystem("wallDust", 100, this.scene);
        dustSystem.particleTexture = new BABYLON.Texture("textures/flare.png", this.scene);
        dustSystem.emitter = new BABYLON.Vector3(position.x, 2, position.z);
        
        dustSystem.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.4);
        dustSystem.color2 = new BABYLON.Color4(0.7, 0.7, 0.7, 0.2);
        dustSystem.colorDead = new BABYLON.Color4(0.5, 0.5, 0.5, 0.0);
        
        dustSystem.minSize = 0.1;
        dustSystem.maxSize = 0.3;
        
        dustSystem.minLifeTime = 2;
        dustSystem.maxLifeTime = 5;
        
        dustSystem.emitRate = 50;
        dustSystem.minEmitPower = 0.5;
        dustSystem.maxEmitPower = 1.5;
        
        dustSystem.updateSpeed = 0.005;
        
        // 3. Shock effect (light flash)
        const explosionLight = new BABYLON.PointLight("wallExplosionLight", new BABYLON.Vector3(position.x, 2, position.z), this.scene);
        explosionLight.diffuse = new BABYLON.Color3(1, 0.7, 0.3);
        explosionLight.specular = new BABYLON.Color3(1, 0.8, 0.3);
        explosionLight.intensity = 20;
        explosionLight.range = 15;
        
        // Start particle systems
        debrisSystem.start();
        dustSystem.start();
        
        // Schedule resource cleanup
        setTimeout(() => {
            debrisSystem.stop();
            
            setTimeout(() => {
                if (debrisSystem) debrisSystem.dispose();
                if (explosionLight) explosionLight.dispose();
            }, 3000);
        }, 300);
        
        setTimeout(() => {
            dustSystem.stop();
            
            setTimeout(() => {
                if (dustSystem) dustSystem.dispose();
            }, 5000);
        }, 1000);
    }

    /**
     * Creates a single wall block instance built by the player.
     * @param {BABYLON.Vector3} position Central position of the wall.
     * @param {number} cellSize Size of the grid cell.
     * @param {number} initialHealth Initial health of the wall.
     * @returns {BABYLON.Mesh} The wall mesh.
     */
    createPlayerWall(position, cellSize, initialHealth = 300) {
        const wall = this.blockHandler.createPlayerWall(position, cellSize, initialHealth);
        this.meshes.push(wall);
        return wall;
    }

    /**
     * Creates a single ramp instance built by the player.
     * @param {BABYLON.Vector3} position Position of the ramp base.
     * @param {number} rotationY Rotation in radians on Y axis.
     * @param {number} cellSize Size of the grid cell.
     * @param {string} direction Direction of the ramp ('east' or 'south').
     * @param {number} initialHealth Initial health of the ramp.
     * @returns {BABYLON.Mesh} The ramp mesh.
     */
    createPlayerRamp(position, rotationY, cellSize, direction = 'east', initialHealth = 200) {
        const ramp = this.rampHandler.createPlayerRamp(position, rotationY, cellSize, direction, initialHealth);
        this.meshes.push(ramp);
        return ramp;
    }
    
    /**
     * Creates a single barricade instance built by the player (half height, half depth wall).
     * @param {BABYLON.Vector3} position Central position of the barricade.
     * @param {number} cellSize Size of the grid cell.
     * @param {number} rotation Rotation in radians on Y axis.
     * @param {number} initialHealth Initial health of the barricade.
     * @returns {BABYLON.Mesh} The barricade mesh.
     */
    createPlayerBarricade(position, cellSize, rotation = 0, initialHealth = 200) {
        const barricade = this.barricadeHandler.createPlayerBarricade(position, cellSize, rotation, initialHealth);
        this.meshes.push(barricade);
        return barricade;
    }
    
    // Return all meshes created by MazeView
    getMeshes() {
        return this.meshes;
    }
}

export default MazeView;