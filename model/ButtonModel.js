// Model - Responsável pelos dados e estado dos botões
class ButtonModel {
    constructor(id, position, color) {
        this.id = id;
        this.position = position;
        this.color = color;
        this.originalColor = color;
        this.pressed = false;
        this.mesh = null;
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
        if (!this.pressed) {
            this.pressed = true;
            // Adicionar animação de pressionar (mover para baixo)
            this.mesh.position.y -= 0.2;
            return true; // Indica que o estado mudou
        }
        return false; // Estado não mudou
    }

    reset() {
        this.pressed = false;
        // Restaurar posição original quando resetar
        if (this.mesh) {
            this.mesh.position.y = this.position.y;
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
}

export default ButtonModel;