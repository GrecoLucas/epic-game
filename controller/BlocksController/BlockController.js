// Controller - Responsável pelo controle e lógica dos blocos
class BlockController {
    constructor(scene, camera, collisionSystem, mazeView, mazeModel) {
        this.scene = scene;
        this.camera = camera;
        this.collisionSystem = collisionSystem;
        this.mazeView = mazeView;
        this.mazeModel = mazeModel;
        
        // Access dimensions from the model
        this.cellSize = this.mazeModel?.cellSize || 4;
        this.wallHeight = this.mazeView?.wallMaterial?.wallHeight || 4;
        
        // Preview material for block placement
        this.previewMaterialValid = null;
        this.previewMaterialInvalid = null;
        this._createPreviewMaterials();
        
        // Current placement state
        this.buildPreviewMesh = null;
        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        
    }
    
    _createPreviewMaterials() {
        this.previewMaterialValid = new BABYLON.StandardMaterial("blockPreviewMatValid", this.scene);
        this.previewMaterialValid.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        this.previewMaterialValid.alpha = 0.5;

        this.previewMaterialInvalid = new BABYLON.StandardMaterial("blockPreviewMatInvalid", this.scene);
        this.previewMaterialInvalid.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
        this.previewMaterialInvalid.alpha = 0.5;
    }
    
    // Create or update block preview mesh
    updatePreviewMesh(position, isValid) {
        const previewName = "preview_wall";
        
        // Create preview mesh if it doesn't exist
        if (!this.buildPreviewMesh) {
            this.buildPreviewMesh = BABYLON.MeshBuilder.CreateBox(previewName, {
                width: this.cellSize, 
                height: this.wallHeight, 
                depth: this.cellSize
            }, this.scene);
            
            this.buildPreviewMesh.isPickable = false;
            this.buildPreviewMesh.checkCollisions = false;
        }
        
        // Update position and material
        this.buildPreviewMesh.position = position;
        this.buildPreviewMesh.material = isValid ? this.previewMaterialValid : this.previewMaterialInvalid;
        this.buildPreviewMesh.setEnabled(true);
    }
    
    // Check if placement position is valid for a block
    isValidPlacement(position) {
        if (!position) return false;
        // Create temporary collision box
        const testBox = BABYLON.MeshBuilder.CreateBox(
            "blockPlacementTestBox", 
            {
                width: this.cellSize * 0.95,
                height: this.wallHeight * 0.95,
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
        if (position.y > this.wallHeight / 4) {
            const rayStart = position.clone();
            rayStart.y -= this.wallHeight / 2;
            
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
                return false;
            }
        }
        
        // If all checks passed, placement is valid
        return true;
    }
    
    // Place a block at the current position
    placeBlock(position, initialHealth = 300) {
        
        // Create new block through MazeView
        const newMesh = this.mazeView.createPlayerWall(
            position, 
            this.cellSize,
            initialHealth
        );
        
        if (newMesh) {
            // Add to collision system
            this.collisionSystem.addMesh(newMesh);
            return true;
        } else {
            console.error("Failed to create block mesh");
            return false;
        }
    }
    
    // Calculate grid-snapped position for block placement based on camera view
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
            
            // Center block vertically
            const buildY = groundY + (this.wallHeight / 2);
            
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
            
            // For floating block
            let buildY = rayTarget.y;
            buildY = Math.max(0, Math.round(buildY - (this.wallHeight / 2)) + (this.wallHeight / 2));
            
            return new BABYLON.Vector3(gridX, buildY, gridZ);
        }
    }
    
    // Clean up resources when the controller is no longer needed
    dispose() {
        if (this.buildPreviewMesh) {
            this.buildPreviewMesh.dispose();
            this.buildPreviewMesh = null;
        }
        
        if (this.previewMaterialValid) {
            this.previewMaterialValid.dispose();
        }
        
        if (this.previewMaterialInvalid) {
            this.previewMaterialInvalid.dispose();
        }
    }
}

export default BlockController;