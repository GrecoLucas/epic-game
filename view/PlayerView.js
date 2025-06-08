// View - Responsável pela representação visual do player
class PlayerView {
    constructor(scene) {
        this.scene = scene;
        this.camera = null;
        this.crosshairUI = null;        
        // Configurações padrão para sensibilidade e FOV
        this.sensitivity = 5000; // Sensibilidade da câmera (valores maiores = movimento mais lento)
        this.fieldOfView = 1.2; // FOV em radianos (aproximadamente 45 graus)
        this.cameraHeight = 2; // Altura da câmera em relação ao jogador 
    }

    initialize(playerMesh) {
        // Configurar câmera usando a altura configurável
        this.camera = new BABYLON.UniversalCamera("playerCamera", new BABYLON.Vector3(0, this.cameraHeight, 0), this.scene);
        this.camera.parent = playerMesh; // Parenting com o mesh do jogador para mover junto
        this.camera.minZ = 0.1; // Para evitar clipping
        
        // Aplicar configurações de sensibilidade e FOV
        this.camera.angularSensibility = this.sensitivity;
        this.camera.fov = this.fieldOfView;
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
            // Manter a posição Y da câmera relativa ao jogador fixa (usando a altura configurável)
            if (this.camera && playerMesh) {
                // A câmera já tem o playerMesh como pai, então suas coordenadas são relativas
                // Apenas garantimos que ela esteja na altura correta
                this.camera.position.y = this.cameraHeight;
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
    
    setCameraHeight(height) {
        this.cameraHeight = height;
        if (this.camera) {
            this.camera.position.y = this.cameraHeight;
        }
    }

    // Métodos para manipular o FOV (Field of View)
    setFieldOfView(fovRadians) {
        if (!this.camera) return;
        this.fieldOfView = fovRadians;
        this.camera.fov = fovRadians;
    }
    
    getFieldOfView() {
        return this.camera ? this.camera.fov : this.fieldOfView;
    }
    
    // Métodos para manipular a sensibilidade da câmera
    setSensitivity(value) {
        if (!this.camera) return;
        this.sensitivity = value;
        this.camera.angularSensibility = value;
    }
    
    getSensitivity() {
        return this.camera ? this.camera.angularSensibility : this.sensitivity;
    }
}

export default PlayerView;