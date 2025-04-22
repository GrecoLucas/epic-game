// View - Responsável pela representação visual do player
class PlayerView {
    constructor(scene) {
        this.scene = scene;
        this.camera = null;
        this.crosshairUI = null;
    }

    initialize(playerMesh) {
        // Configurar câmera
        this.camera = new BABYLON.UniversalCamera("playerCamera", new BABYLON.Vector3(0, 1.7, 0), this.scene);
        this.camera.parent = playerMesh;
        this.camera.minZ = 0.1; // Para evitar clipping
        
        // Reduzir a sensibilidade da câmera
        this.camera.angularSensibility = 3000; 
        this.camera.inertia = 0.6; 
        
        // Configurar colisões da câmera
        this.camera.checkCollisions = true;
        this.camera.applyGravity = true;
        this.camera.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5);
        this.camera.ellipsoidOffset = new BABYLON.Vector3(0, 0.9, 0);
        
        // Criar a mira (crosshair)
        this.createCrosshair();
    }
    
    getCamera() {
        return this.camera;
    }
    
    createCrosshair() {
        // Criar uma GUI texture para adicionar elementos 2D
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("crosshairUI");
        
        // Criar o elemento de mira
        const crosshair = new BABYLON.GUI.Container("crosshairContainer");
        
        // Linha horizontal
        const horizontalLine = new BABYLON.GUI.Rectangle("horizontalLine");
        horizontalLine.width = "20px";
        horizontalLine.height = "2px";
        horizontalLine.background = "white";
        
        // Linha vertical
        const verticalLine = new BABYLON.GUI.Rectangle("verticalLine");
        verticalLine.width = "2px";
        verticalLine.height = "20px";
        verticalLine.background = "white";
        
        // Ponto central
        const centerDot = new BABYLON.GUI.Ellipse("centerDot");
        centerDot.width = "4px";
        centerDot.height = "4px";
        centerDot.background = "white";
        
        // Adicionar à interface
        crosshair.addControl(horizontalLine);
        crosshair.addControl(verticalLine);
        crosshair.addControl(centerDot);
        advancedTexture.addControl(crosshair);
        
        // Guardar referência para poder modificar depois se necessário
        this.crosshairUI = crosshair;
    }
    
    attachCameraControl(canvas) {
        this.camera.attachControl(canvas);
    }
}

export default PlayerView;