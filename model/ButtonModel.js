// Model - Responsável pelos dados e estado dos botões
class ButtonModel {
    constructor(id, position, color) {
        this.id = id;
        this.position = position;
        this.color = color;
        this.originalColor = color;
        this.pressed = false;
        this.mesh = null;
        
        // Texto informativo do botão baseado no ID
        switch(this.id) {
            case 2:
                this.infoText = "MedKit 20$";
                break;
            case 3:
                this.infoText = "50 Ammo 40$";
                break;
            case 4:
                this.infoText = "Barricade 60$";
                break;
            default:
                this.infoText = "Botão de ação";
        }
        
        // Propriedades para reset automático
        this.resetTimeout = null;
        this.resetDelay = 200; // 200ms delay para resetar
    }

    initialize(scene) {
        // Criar o mesh do botão com tamanho maior para facilitar interação
        this.mesh = BABYLON.MeshBuilder.CreateCylinder(
            `button${this.id}`, 
            { diameter: 0.7, height: 0.3 }, // Aumentando o tamanho do botão
            scene
        );
        this.mesh.position = this.position;
        
        // Criar e aplicar material
        const material = new BABYLON.StandardMaterial(`buttonMat${this.id}`, scene);
        material.diffuseColor = this.color;
        // Adicionando um pouco de brilho para destacar
        material.specularColor = new BABYLON.Color3(1, 1, 1);
        material.specularPower = 32;
        this.mesh.material = material;
        
        // Configurando colisão
        this.mesh.isPickable = true;
        this.mesh.checkCollisions = true;
    }

    press() {
        // Resetar qualquer timer existente para evitar conflitos
        if (this.resetTimeout) {
            clearTimeout(this.resetTimeout);
            this.resetTimeout = null;
        }
        
        this.pressed = true;
        
        // Não modifica mais a posição do botão, apenas o estado
        // Agora o visual será tratado pelo ButtonView, que mudará apenas a cor
        
        // Configurar o reset automático após o delay
        this.resetTimeout = setTimeout(() => {
            this.reset();
        }, this.resetDelay);
        
        return true; // Sempre retorna true para indicar que o botão foi pressionado
    }

    reset() {
        this.pressed = false;
        
        // Não precisa mais restaurar posição, apenas o estado
        
        // Limpar o timeout se existir
        if (this.resetTimeout) {
            clearTimeout(this.resetTimeout);
            this.resetTimeout = null;
        }
    }

    isPressed() {
        return this.pressed;
    }

    getId() {
        return this.id;
    }

    getMesh() {
        return this.mesh;
    }

    getInfoText() {
        return this.infoText;
    }
}

export default ButtonModel;