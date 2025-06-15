// Controller - Responsável pelo controle e lógica das cercas de arame
class Wired_FenceController {
    constructor(scene, camera, collisionSystem, mazeView, mazeModel) {
        this.scene = scene;
        this.camera = camera;
        this.collisionSystem = collisionSystem;
        this.mazeView = mazeView;
        this.mazeModel = mazeModel;
        
        // Access dimensions from model
        this.cellSize = this.mazeModel?.cellSize || 4;
        this.fenceHeight = (this.mazeView?.wallMaterial?.wallHeight || 4) * 0.8; // 80% of wall height
        
        // Preview material for fence placement
        this.previewMaterialValid = null;
        this.previewMaterialInvalid = null;
        this._createPreviewMaterials();
          // Current placement state
        this.buildPreviewMesh = null;
        this.previewModel = null; // Store the 3D model for preview
        this.previewRoot = null; // Store the root transform node
        this.isLoadingPreview = false; // Flag to prevent multiple loads
        this.currentPlacementValid = false;
        this.currentPlacementPosition = null;
        this.currentPlacementRotation = 0;
    }
    
    _createPreviewMaterials() {
        this.previewMaterialValid = new BABYLON.StandardMaterial("wiredFencePreviewMatValid", this.scene);
        this.previewMaterialValid.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        this.previewMaterialValid.alpha = 0.5;

        this.previewMaterialInvalid = new BABYLON.StandardMaterial("wiredFencePreviewMatInvalid", this.scene);
        this.previewMaterialInvalid.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
        this.previewMaterialInvalid.alpha = 0.5;
    }
      // Create or update wired fence preview mesh
    updatePreviewMesh(position, isValid) {
        // Load 3D model for preview if not already loaded
        if (!this.previewRoot && !this.isLoadingPreview) {
            this._loadPreviewModel();
        }
        
        // If we have a preview model, update it
        if (this.previewRoot) {
            this.previewRoot.position = position;
            this.previewRoot.rotation.y = this.currentPlacementRotation;
            this.previewRoot.setEnabled(true);
            
            // Apply preview material to all child meshes
            const material = isValid ? this.previewMaterialValid : this.previewMaterialInvalid;
            this._applyMaterialToPreview(material);
        }
        // Fallback to box preview while model is loading
        else if (!this.buildPreviewMesh) {
            const previewName = "preview_wired_fence_fallback";
            this.buildPreviewMesh = BABYLON.MeshBuilder.CreateBox(previewName, {
                width: this.cellSize, 
                height: this.fenceHeight, 
                depth: this.cellSize * 0.1
            }, this.scene);
            
            this.buildPreviewMesh.isPickable = false;
            this.buildPreviewMesh.checkCollisions = false;
            this.buildPreviewMesh.position = position;
            this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
            this.buildPreviewMesh.material = isValid ? this.previewMaterialValid : this.previewMaterialInvalid;
            this.buildPreviewMesh.setEnabled(true);
        } else if (this.buildPreviewMesh) {
            this.buildPreviewMesh.position = position;
            this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
            this.buildPreviewMesh.material = isValid ? this.previewMaterialValid : this.previewMaterialInvalid;
            this.buildPreviewMesh.setEnabled(true);
        }
    }

    // Load the 3D model for preview
    _loadPreviewModel() {
        if (this.isLoadingPreview) return;
        this.isLoadingPreview = true;
        
        BABYLON.SceneLoader.ImportMeshAsync("", "models/Barricade/", "scene.gltf", this.scene).then((result) => {
            const fenceModel = result.meshes[0];
            
            if (fenceModel) {
                // Create a root transform node for the preview
                this.previewRoot = new BABYLON.TransformNode("preview_wired_fence_3d", this.scene);
                
                // Parent the model to the preview root
                fenceModel.parent = this.previewRoot;
                
                // Scale the model appropriately
                const fenceWidth = this.cellSize;
                const fenceHeight = this.fenceHeight;
                
                fenceModel.scaling = new BABYLON.Vector3(
                    fenceWidth / 5,
                    fenceHeight / 2,
                    1.5
                );
                
                fenceModel.position = new BABYLON.Vector3(0, 0, 0);
                
                // Configure all child meshes for preview
                result.meshes.forEach(mesh => {
                    mesh.checkCollisions = false;
                    mesh.isPickable = false;
                });
                
                // Store reference to the model
                this.previewModel = fenceModel;
                
                // Initially disable the preview
                this.previewRoot.setEnabled(false);
                
                // Dispose fallback box if it exists
                if (this.buildPreviewMesh) {
                    this.buildPreviewMesh.dispose();
                    this.buildPreviewMesh = null;
                }
                
                console.log("Wired fence 3D preview model loaded successfully");
            }
            this.isLoadingPreview = false;
        }).catch((error) => {
            console.error("Failed to load wired fence preview model:", error);
            this.isLoadingPreview = false;
        });
    }

    // Apply material to all meshes in the preview model
    _applyMaterialToPreview(material) {
        if (this.previewModel && this.previewModel.getChildMeshes) {
            const childMeshes = this.previewModel.getChildMeshes();
            childMeshes.forEach(mesh => {
                if (mesh.material) {
                    mesh.material = material;
                }
            });
            
            // Also apply to the root model mesh
            if (this.previewModel.material) {
                this.previewModel.material = material;
            }
        }
    }    // Rotate wired fence preview
    rotatePreview(clockwise = true) {
        // Rotate in 90 degree increments
        const increment = Math.PI / 2;
        this.currentPlacementRotation += clockwise ? increment : -increment;
        
        // Normalize rotation to 0-2π range
        this.currentPlacementRotation = (this.currentPlacementRotation + 2 * Math.PI) % (2 * Math.PI);

        // Update preview visualization if visible (3D model or fallback)
        if (this.previewRoot?.isEnabled()) {
            this.previewRoot.rotation.y = this.currentPlacementRotation;
        } else if (this.buildPreviewMesh?.isEnabled()) {
            this.buildPreviewMesh.rotation.y = this.currentPlacementRotation;
        }
    }
    
    // Check if placement position is valid for a wired fence
    isValidPlacement(position) {
        if (!position) return false;
        
        // Create temporary collision box (very thin since fence has no hitbox)
        const testBox = BABYLON.MeshBuilder.CreateBox(
            "wiredFencePlacementTestBox", 
            {
                width: this.cellSize * 0.95,
                height: this.fenceHeight * 0.95,
                depth: (this.cellSize * 0.1) * 0.95 // Very thin
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
        if (position.y > this.fenceHeight / 4) {
            const rayStart = position.clone();
            rayStart.y -= this.fenceHeight / 2;
            
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
                  mesh.name.startsWith("playerWiredFence_") ||
                  mesh.name.startsWith("wall_")))
            );
            
            if (!hit.pickedMesh) {
                return false;
            }
        }
        
        // If all checks passed, placement is valid
        return true;
    }
    
    // Place a wired fence at the current position
    placeWiredFence(position, initialHealth = 100) {
        
        // Create new wired fence through MazeView
        const newMesh = this.mazeView.createPlayerWiredFence(
            position, 
            this.cellSize,
            this.currentPlacementRotation,
            initialHealth
        );
        
        if (newMesh) {
            // Note: Don't add to collision system since fence has no hitbox
            console.log("Wired fence placed successfully (no collision)");
            return true;
        } else {
            console.error("Failed to create wired fence mesh");
            return false;
        }
    }
    
    // Calculate grid-snapped position for wired fence placement based on camera view
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
            
            // Center fence vertically
            const buildY = groundY + (this.fenceHeight / 2);
            
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
            
            // For floating fence
            let buildY = rayTarget.y;
            buildY = Math.max(0, Math.round(buildY - (this.fenceHeight / 2)) + (this.fenceHeight / 2));
            
            return new BABYLON.Vector3(gridX, buildY, gridZ);
        }
    }
      // Hide preview mesh
    hidePreview() {
        if (this.previewRoot) {
            this.previewRoot.setEnabled(false);
        }
        if (this.buildPreviewMesh) {
            this.buildPreviewMesh.setEnabled(false);
        }
    }
      // Dispose resources
    dispose() {
        if (this.buildPreviewMesh) {
            this.buildPreviewMesh.dispose();
            this.buildPreviewMesh = null;
        }
        
        if (this.previewRoot) {
            this.previewRoot.dispose();
            this.previewRoot = null;
        }
        
        if (this.previewModel) {
            this.previewModel = null;
        }
        
        if (this.previewMaterialValid) {
            this.previewMaterialValid.dispose();
            this.previewMaterialValid = null;
        }
        
        if (this.previewMaterialInvalid) {
            this.previewMaterialInvalid.dispose();
            this.previewMaterialInvalid = null;
        }
    }
}

export default Wired_FenceController;