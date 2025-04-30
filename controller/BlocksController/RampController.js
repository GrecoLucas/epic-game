// Controller - Responsável pelo controle e lógica das rampas
class RampController {
    constructor(scene, camera, collisionSystem, mazeView, mazeModel) {
        this.scene = scene;
        this.camera = camera;
        this.collisionSystem = collisionSystem;
        this.mazeView = mazeView;
        this.mazeModel = mazeModel;
        
        // Access dimensions from model
        this.cellSize = this.mazeModel?.cellSize || 4;
        this.wallHeight = this.mazeView?.wallMaterial?.wallHeight || 4;
        
        // Preview material for ramp placement
        this.previewMaterialValid = null;
        this.previewMaterialInvalid = null;
        this._createPreviewMaterials();
        
        // Current placement state
        this.buildPreviewMesh = null;
        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        this.currentPlacementRotation = 0;
        
        // Ramp direction (east or south)
        this.rampDirection = 'east'; // Default: east
        
        // Direction label for ramp preview
        this._rampDirectionLabel = null;
        
        console.log("RampController initialized successfully.");
    }
    
    _createPreviewMaterials() {
        this.previewMaterialValid = new BABYLON.StandardMaterial("rampPreviewMatValid", this.scene);
        this.previewMaterialValid.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        this.previewMaterialValid.alpha = 0.5;

        this.previewMaterialInvalid = new BABYLON.StandardMaterial("rampPreviewMatInvalid", this.scene);
        this.previewMaterialInvalid.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
        this.previewMaterialInvalid.alpha = 0.5;
    }
    
    // Create or update ramp preview mesh
    updatePreviewMesh(position, isValid) {
        const previewName = `preview_ramp_${this.rampDirection}`;
        
        // Create preview mesh if it doesn't exist or direction changed
        if (!this.buildPreviewMesh || this.buildPreviewMesh.name !== previewName) {
            if (this.buildPreviewMesh) this.buildPreviewMesh.dispose();
            
            // Create detailed preview based on ramp direction
            this.buildPreviewMesh = this._createRampPreviewMesh(this.rampDirection);
            
            this.buildPreviewMesh.isPickable = false;
            this.buildPreviewMesh.checkCollisions = false;
            
            // Add direction label
            this._addRampDirectionLabel();
        }
        
        // Update position and rotation
        this.buildPreviewMesh.position = position;
        this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
        this.buildPreviewMesh.material = isValid ? this.previewMaterialValid : this.previewMaterialInvalid;
        this.buildPreviewMesh.setEnabled(true);
        
        // Update direction label position
        if (this._rampDirectionLabel) {
            this._rampDirectionLabel.position = new BABYLON.Vector3(
                position.x, 
                position.y + this.wallHeight / 2 + 0.5, // Position above the ramp
                position.z
            );
        }
    }
    
    // Create detailed preview mesh for ramp
    _createRampPreviewMesh(direction) {
        const previewName = `preview_ramp_${direction}`;
        const rampWidth = this.cellSize;
        const rampHeight = this.wallHeight / 2;
        const rampDepth = this.cellSize;

        // Create custom mesh for ramp preview
        const positions = [];
        const indices = [];
        const normals = [];
        const colors = [];

        if (direction === 'south') {
            // South Ramp (sloping north to south)
            positions.push(
                // Base (rectangle)
                -rampWidth/2, 0, -rampDepth/2,  // 0: front left
                rampWidth/2, 0, -rampDepth/2,   // 1: front right
                rampWidth/2, 0, rampDepth/2,    // 2: back right
                -rampWidth/2, 0, rampDepth/2,   // 3: back left
                
                // Top (inclined)
                -rampWidth/2, rampHeight, -rampDepth/2,  // 4: front left high
                rampWidth/2, rampHeight, -rampDepth/2,   // 5: front right high
                rampWidth/2, 0, rampDepth/2,            // 6: back right (base)
                -rampWidth/2, 0, rampDepth/2            // 7: back left (base)
            );
            
            // Blue color for south ramp
            for (let i = 0; i < 8; i++) {
                colors.push(0.2, 0.2, 0.8, 0.7);
            }
        } else { // 'east'
            // East Ramp (sloping west to east)
            positions.push(
                // Base (rectangle)
                -rampDepth/2, 0, -rampWidth/2,  // 0: front left
                rampDepth/2, 0, -rampWidth/2,   // 1: front right
                rampDepth/2, 0, rampWidth/2,    // 2: back right
                -rampDepth/2, 0, rampWidth/2,   // 3: back left
                
                // Top (inclined)
                -rampDepth/2, 0, -rampWidth/2,          // 4: front left (base)
                rampDepth/2, rampHeight, -rampWidth/2,  // 5: front right high
                rampDepth/2, rampHeight, rampWidth/2,   // 6: back right high
                -rampDepth/2, 0, rampWidth/2           // 7: back left (base)
            );
            
            // Green color for east ramp
            for (let i = 0; i < 8; i++) {
                colors.push(0.2, 0.8, 0.2, 0.7);
            }
        }
        
        // Common indices for both directions
        indices.push(
            // Base
            0, 2, 1, 0, 3, 2,
            // Front
            0, 1, 5, 0, 5, 4,
            // Back
            3, 6, 2, 3, 7, 6,
            // Left
            0, 4, 7, 0, 7, 3,
            // Right
            1, 2, 6, 1, 6, 5,
            // Top
            4, 5, 6, 4, 6, 7
        );
        
        // Calculate normals for proper lighting
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        
        // Create custom mesh
        const mesh = new BABYLON.Mesh(previewName, this.scene);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.colors = colors;
        vertexData.applyToMesh(mesh);
        
        return mesh;
    }
    
    // Add 3D label showing ramp direction
    _addRampDirectionLabel() {
        // Remove existing label if present
        if (this._rampDirectionLabel) {
            this._rampDirectionLabel.dispose();
        }
        
        // Create descriptive text based on direction
        const labelText = this.rampDirection === 'east' ? "EAST ➜" : "SOUTH ⬇";
        
        // Create a text plane
        const labelPlane = BABYLON.MeshBuilder.CreatePlane("rampDirectionLabel", {
            width: 1.5, 
            height: 0.5
        }, this.scene);
        
        // Make label always face camera
        labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        // Create dynamic texture for text
        const labelTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(labelPlane);
        
        // Create text
        const text = new BABYLON.GUI.TextBlock();
        text.text = labelText;
        text.color = this.rampDirection === 'east' ? "lime" : "lightblue";
        text.fontSize = 24;
        text.outlineWidth = 2;
        text.outlineColor = "black";
        
        // Add text to texture
        labelTexture.addControl(text);
        
        // Store label reference
        this._rampDirectionLabel = labelPlane;
        
        // Initial position (will be updated in updatePreviewMesh)
        labelPlane.position = new BABYLON.Vector3(0, this.wallHeight/2 + 0.5, 0);
        
        // Make sure label isn't interactive
        labelPlane.isPickable = false;
    }
    
    // Rotate ramp preview
    rotatePreview(clockwise = true) {
        // Rotate in 90 degree increments
        const increment = Math.PI / 2;
        this.currentPlacementRotation += clockwise ? increment : -increment;
        
        // Normalize rotation to 0-2π range
        this.currentPlacementRotation = (this.currentPlacementRotation + 2 * Math.PI) % (2 * Math.PI);

        // Update preview visualization if visible
        if (this.buildPreviewMesh?.isEnabled()) {
            this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
        }
    }
    
    // Set ramp direction (east or south)
    setDirection(direction) {
        if (direction === 'east' || direction === 'south') {
            if (this.rampDirection !== direction) {
                this.rampDirection = direction;
                
                // Force preview mesh recreation on next update
                if (this.buildPreviewMesh) {
                    this.buildPreviewMesh.dispose();
                    this.buildPreviewMesh = null;
                }
            }
        }
    }
    
    // Check if placement position is valid for a ramp
    isValidPlacement(position) {
        if (!position) return false;
        
        console.log(`Verificando posição da rampa: ${position.x}, ${position.y}, ${position.z}`);
        
        // Create temporary collision box (thinner for ramp)
        const testBox = BABYLON.MeshBuilder.CreateBox(
            "rampPlacementTestBox", 
            {
                width: this.cellSize * 0.95,
                height: 0.2, // Much thinner than wall box
                depth: this.cellSize * 0.95
            },
            this.scene
        );
        testBox.position = position.clone();
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
            
            // Special case: Allow ramp placement on top of blocks
            if (dx < xzThreshold && dz < xzThreshold) {
                if (mesh.name.startsWith("playerWall_")) {
                    const meshHeight = mesh.getBoundingInfo().boundingBox.extendSizeWorld.y;
                    const meshTop = mesh.position.y + meshHeight;
                    
                    // If ramp base is approximately at block top, allow placement
                    const isOnTop = Math.abs(position.y - meshTop) < 0.2;
                    
                    if (isOnTop) {
                        console.log("Rampa colocada sobre bloco, permitindo colocação");
                        return false; // Not a collision, valid support
                    }
                }
                
                // For other cases, check Y-axis overlap
                const meshHeight = mesh.getBoundingInfo().boundingBox.extendSizeWorld.y;
                const testBoxHeight = testBox.getBoundingInfo().boundingBox.extendSizeWorld.y;
                
                const meshTop = mesh.position.y + meshHeight;
                const meshBottom = mesh.position.y - meshHeight;
                const testBoxTop = position.y + testBoxHeight;
                const testBoxBottom = position.y - testBoxHeight;
                
                // If no overlap in Y, there's no collision
                const overlapY = !(testBoxBottom >= meshTop || testBoxTop <= meshBottom);
                
                if (overlapY) {
                    console.log(`Colisão detectada com ${mesh.name} na mesma posição`);
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
        if (position.y > this.wallHeight / 4) {
            const rayStart = position.clone();
            rayStart.y -= 0.1; // Just a small distance down for ramps
            
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
                  mesh.name.startsWith("wall_")))
            );
            
            if (!hit.pickedMesh) {
                console.log("Posição inválida: Sem suporte abaixo");
                return false;
            }
        }
        
        // If all checks passed, placement is valid
        return true;
    }
    
    // Place a ramp at the current position
    placeRamp(position, initialHealth = 150) {
        console.log(`Attempting to place ${this.rampDirection} ramp at ${position}`);
        
        // Create new ramp through MazeView
        const newMesh = this.mazeView.createPlayerRamp(
            position, 
            this.currentPlacementRotation,
            this.cellSize,
            this.rampDirection,
            initialHealth
        );
        
        if (newMesh) {
            // Add to collision system
            this.collisionSystem.addMesh(newMesh);
            return true;
        } else {
            console.error("Failed to create ramp mesh");
            return false;
        }
    }
    
    // Calculate grid-snapped position for ramp placement based on camera view
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
            
            // Ramps sit directly on surface
            return new BABYLON.Vector3(gridX, groundY, gridZ);
        } else {
            // Fallback for when no surface is hit
            const rayDirection = cameraRay.direction.clone();
            const fixedDistance = 5;
            
            const rayOrigin = cameraRay.origin.clone();
            const rayTarget = rayOrigin.add(rayDirection.scale(fixedDistance));
            
            // Grid snapping for fallback
            const gridX = Math.round(rayTarget.x / this.cellSize) * this.cellSize;
            const gridZ = Math.round(rayTarget.z / this.cellSize) * this.cellSize;
            
            // For floating ramp
            let buildY = Math.max(0, Math.floor(rayTarget.y));
            
            return new BABYLON.Vector3(gridX, buildY, gridZ);
        }
    }
    
    // Clean up resources when the controller is no longer needed
    dispose() {
        if (this.buildPreviewMesh) {
            this.buildPreviewMesh.dispose();
            this.buildPreviewMesh = null;
        }
        
        if (this._rampDirectionLabel) {
            this._rampDirectionLabel.dispose();
            this._rampDirectionLabel = null;
        }
        
        if (this.previewMaterialValid) {
            this.previewMaterialValid.dispose();
        }
        
        if (this.previewMaterialInvalid) {
            this.previewMaterialInvalid.dispose();
        }
    }
}

export default RampController;