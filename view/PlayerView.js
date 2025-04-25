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
        this.camera.parent = playerMesh; // Parenting com o mesh do jogador para mover junto
        this.camera.minZ = 0.1; // Para evitar clipping
        
        // Reduzir a sensibilidade da câmera
        this.camera.angularSensibility = 3000; 
        this.camera.inertia = 0.6; 
        
        // Desativar a gravidade da câmera para que ela não seja afetada pela física
        // Isso permite que ela se mova verticalmente junto com o mesh do jogador
        this.camera.applyGravity = false;
        
        // Configurar colisões da câmera
        this.camera.checkCollisions = true;
        this.camera.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5);
        this.camera.ellipsoidOffset = new BABYLON.Vector3(0, 0.9, 0);
        
        // Criar a mira (crosshair)
        this.createCrosshair();
        
        // Garantir que a câmera siga exatamente a posição do jogador
        // Registramos uma função para atualizar a posição relativa da câmera a cada frame
        this.scene.registerBeforeRender(() => {
            // Manter a posição Y da câmera relativa ao jogador fixa (1.7 unidades acima)
            if (this.camera && playerMesh) {
                // A câmera já tem o playerMesh como pai, então suas coordenadas são relativas
                // Apenas garantimos que ela esteja na altura correta
                this.camera.position.y = 1.7;
            }
        });
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