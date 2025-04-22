// View - Responsável pela representação visual do monstro
class MonsterView {
    constructor(scene) {
        this.mesh = null;
        this.detectionVisual = null;
        this.attackAnimation = null;
        this.scene = scene; // Armazenar referência à cena
    }
    
    initialize(mesh) {
        this.mesh = mesh;
        
        // Criar animação para quando o monstro atacar
        this.setupAttackAnimation();
        
        return this.mesh;
    }
    
    // Configurar animação de ataque
    setupAttackAnimation() {
        if (!this.mesh) return;
        
        // Criar animação de ataque - o monstro "pula" em direção ao jogador
        const frameRate = 10;
        
        // Animação para o tamanho
        this.attackAnimation = new BABYLON.Animation(
            "monsterAttackAnimation",
            "scaling",
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Keyframes da animação
        const keyFrames = [
            { frame: 0, value: this.mesh.scaling.clone() },
            { frame: 5, value: new BABYLON.Vector3(1.3, 0.8, 1.3) },
            { frame: 10, value: this.mesh.scaling.clone() }
        ];
        
        // Adicionar keyframes
        this.attackAnimation.setKeys(keyFrames);
        
        // Adicionar animação ao monstro
        this.mesh.animations = [this.attackAnimation];
    }
    
    // Executar a animação de ataque
    playAttackAnimation() {
        if (!this.mesh || !this.attackAnimation) return;
        
        // Começar a animação - usar this.scene em vez de this.mesh.scene
        if (this.scene) {
            this.scene.beginAnimation(this.mesh, 0, 10, false);
        }
    }
    
    // Atualizar visual baseado no estado (perseguindo ou patrulhando)
    updateVisualState(isChasing) {
        if (!this.mesh) return;
        
        const material = this.mesh.material;
        
        // Mudar cor baseado no estado
        if (isChasing) {
            // Vermelho vivo quando perseguindo
            material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            material.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
            
            // Aumentar intensidade da luz
            const light = this.mesh.getChildMeshes(false, (node) => node.name === "monsterLight")[0];
            if (light) {
                light.intensity = 0.8;
            }
        } else {
            // Vermelho escuro quando patrulhando
            material.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1);
            material.emissiveColor = new BABYLON.Color3(0, 0, 0);
            
            // Diminuir intensidade da luz
            const light = this.mesh.getChildMeshes(false, (node) => node.name === "monsterLight")[0];
            if (light) {
                light.intensity = 0.5;
            }
        }
    }
    
    // Criar efeito visual quando o monstro toma dano
    showDamageEffect() {
        if (!this.mesh) return;
        
        // Piscar brevemente em branco
        const originalDiffuse = this.mesh.material.diffuseColor.clone();
        const originalEmissive = this.mesh.material.emissiveColor.clone();
        
        // Mudar para branco
        this.mesh.material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        this.mesh.material.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        
        // Voltar para a cor original após um curto período
        setTimeout(() => {
            if (this.mesh && this.mesh.material) {
                this.mesh.material.diffuseColor = originalDiffuse;
                this.mesh.material.emissiveColor = originalEmissive;
            }
        }, 100);
    }
    
    // Mostrar efeito quando o monstro está morrendo
    showDeathEffect() {
        if (!this.mesh) return;
        
        // Animação de desaparecimento
        const frameRate = 30;
        const fadeAnimation = new BABYLON.Animation(
            "monsterDeathAnimation",
            "visibility",
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Keyframes de desaparecimento
        const keyFrames = [
            { frame: 0, value: 1 },
            { frame: 30, value: 0 }
        ];
        
        fadeAnimation.setKeys(keyFrames);
        
        // Adicionar e executar a animação
        this.mesh.animations = [fadeAnimation];
        
        // Usar this.scene em vez de this.mesh.scene
        let animationControl = null;
        if (this.scene) {
            animationControl = this.scene.beginAnimation(this.mesh, 0, 30, false);
            
            // Remover o mesh após a animação
            if (animationControl) {
                animationControl.onAnimationEnd = () => {
                    if (this.mesh) {
                        this.mesh.dispose();
                        this.mesh = null;
                    }
                };
            }
        }
    }
}

export default MonsterView;