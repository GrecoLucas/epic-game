// View - Responsável pela representação visual do monstro
class MonsterView {
    constructor(scene) {
        this.mesh = null;
        this.detectionVisual = null;
        this.attackAnimation = null;
        this.scene = scene; // Armazenar referência à cena
        this.healthText = null; // Referência para o texto da vida
        this.textPlane = null; // Plano para a textura do texto
        this.textTexture = null; // Textura dinâmica para o texto
        this.floatHeight = 0.1;
    }
    
    initialize(mesh) {
        this.mesh = mesh;

        if (this.mesh) {
            const currentPosition = this.mesh.position;
            this.mesh.position.y = Math.max(currentPosition.y, this.floatHeight);
        }
        // Criar animação para quando o monstro atacar
        this.setupAttackAnimation();
        
        // Criar o texto da vida
        this.createHealthText();
        
        return this.mesh;
    }
    
    // Criar o texto da vida do monstro
    createHealthText() {
        if (!this.mesh) return;
        
        // Criar um plano para a textura do texto
        this.textPlane = BABYLON.MeshBuilder.CreatePlane("healthTextPlane", {
            width: 5.5, // Largura ajustada para o texto
            height: 4.5 // Altura ajustada para o texto
        }, this.scene);
        this.textPlane.parent = this.mesh;
        this.textPlane.position = new BABYLON.Vector3(0, 3.0, 0); // Posicionar acima do monstro
        this.textPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // Sempre voltado para a câmera
        this.textPlane.isPickable = false; // Não pode ser clicado
        
        // Criar uma textura dinâmica para o texto
        this.textTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.textPlane);
        
        // Adicionar o texto
        this.healthText = new BABYLON.GUI.TextBlock("healthText");
        // Usar uma string padrão inicialmente, o valor correto será definido pelo controller
        this.healthText.text = "100"; // Valor padrão que será atualizado pelo updateHealthText
        this.healthText.color = "white";
        this.healthText.fontSize = 100; // Aumentado de 40 para 100
        this.healthText.fontFamily = "Arial";
        this.healthText.fontWeight = "bold";
        this.healthText.outlineWidth = 4; // Aumentado contorno
        this.healthText.outlineColor = "black";
        
        // Centralizar o texto
        this.healthText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.healthText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        
        // Adicionar o texto à textura
        this.textTexture.addControl(this.healthText);
    }
    
    // Atualizar o texto da vida
    updateHealthText(currentHealth) {
        if (!this.healthText) return;
        
        // Atualizar o texto com a vida atual arredondada
        this.healthText.text = `${Math.max(0, Math.round(currentHealth))}`;
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

        // Find the body and head meshes which have the main material
        const body = this.mesh.getChildMeshes(false, (node) => node.name === "monsterBody")[0];
        const head = this.mesh.getChildMeshes(false, (node) => node.name === "monsterHead")[0];

        // Get the material (assuming body and head share the same material instance)
        const material = body ? body.material : (head ? head.material : null);

        if (!material) {
            console.warn("MonsterView: Could not find material on body or head mesh.");
            return; // Exit if no material found
        }

        // Mudar cor baseado no estado
        if (isChasing) {
            // Vermelho vivo quando perseguindo
            material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            material.emissiveColor = new BABYLON.Color3(0.5, 0, 0); // Brighter emissive when chasing

            // Aumentar intensidade da luz
            const light = this.mesh.getChildMeshes(false, (node) => node.name === "monsterLight")[0];
            if (light && light instanceof BABYLON.PointLight) { // Check type
                light.intensity = 1.2; // Increase intensity more noticeably
            }
        } else {
            // Cor original (Lava) quando patrulhando
            // Revert to the original lava material colors defined in MonsterModel
            material.diffuseColor = new BABYLON.Color3(0.5, 0.1, 0.1);
            material.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05); // Original emissive

            // Diminuir intensidade da luz
            const light = this.mesh.getChildMeshes(false, (node) => node.name === "monsterLight")[0];
            if (light && light instanceof BABYLON.PointLight) { // Check type
                // Keep the pulsing animation base intensity (defined in MonsterModel)
                // We don't need to set it manually here unless overriding the animation
                // light.intensity = 0.8; // Or whatever the base intensity should be
            }
        }
    }
    
    // Criar efeito visual quando o monstro toma dano
    showDamageEffect() {
        if (!this.mesh) return;

        // Find the body and head meshes
        const body = this.mesh.getChildMeshes(false, (node) => node.name === "monsterBody")[0];
        const head = this.mesh.getChildMeshes(false, (node) => node.name === "monsterHead")[0];
        const meshesToFlash = [body, head].filter(m => m && m.material); // Filter out nulls

        if (meshesToFlash.length === 0) return;

        // Store original colors for each mesh
        const originalColors = meshesToFlash.map(m => ({
            mesh: m,
            diffuse: m.material.diffuseColor.clone(),
            emissive: m.material.emissiveColor.clone()
        }));


        // Mudar para branco
        meshesToFlash.forEach(m => {
            m.material.diffuseColor = new BABYLON.Color3(1, 1, 1);
            m.material.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8); // Brighter flash
        });


        // Voltar para a cor original após um curto período
        setTimeout(() => {
            originalColors.forEach(data => {
                // Check if mesh and material still exist before restoring
                if (data.mesh && data.mesh.material && !data.mesh.isDisposed()) {
                    data.mesh.material.diffuseColor = data.diffuse;
                    data.mesh.material.emissiveColor = data.emissive;
                }
            });
        }, 150); // Slightly longer flash
    }
    
    // Mostrar efeito quando o monstro está morrendo
    showDeathEffect() {
        if (!this.mesh) return;
    
        // Esconder o texto da vida
        if (this.textPlane) {
            this.textPlane.dispose();
            this.textPlane = null;
        }
        if (this.textTexture) {
            this.textTexture.dispose();
            this.textTexture = null;
        }
        this.healthText = null; // Limpar referência
        
        // Remover o mesh imediatamente
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
        
    }
}

export default MonsterView;