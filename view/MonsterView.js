// View - Responsável pela representação visual do monstro
class MonsterView {
    constructor(scene) {
        this.mesh = null;
        this.attackAnimation = null;
        this.scene = scene;
        this.healthBar = null;
        this.healthBarBackground = null;
        this.healthContainer = null;
        this.textPlane = null;
        this.textTexture = null;
        this.floatHeight = 0.1;
    }
    
    initialize(mesh) {
        this.mesh = mesh;

        if (this.mesh) {
            const currentPosition = this.mesh.position;
            this.mesh.position.y = Math.max(currentPosition.y, this.floatHeight);
            
            this.createHealthDisplay();
        }
        
        return this.mesh;
    }
    
    // Criar a exibição de vida do monstro apenas com barra (sem texto)
    createHealthDisplay() {
        if (!this.mesh) return;
        
        // Criar plano para o elemento de UI
        this.textPlane = BABYLON.MeshBuilder.CreatePlane("healthDisplayPlane", {
            width: 1,
            height: 1.3
        }, this.scene);
        this.textPlane.parent = this.mesh;
        this.textPlane.position = new BABYLON.Vector3(0, 1.0, 0); // Posicionado acima do monstro
        this.textPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // Sempre virado para a câmera
        this.textPlane.isPickable = false;
        
        // Criar a textura dinâmica para a UI
        this.textTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.textPlane);
        
        // Criar um container para organizar os elementos
        this.healthContainer = new BABYLON.GUI.StackPanel();
        this.healthContainer.isVertical = true;
        this.healthContainer.height = "100%";
        this.textTexture.addControl(this.healthContainer);
        
        // Adicionar fundo da barra de vida
        this.healthBarBackground = new BABYLON.GUI.Rectangle();
        this.healthBarBackground.width = "80%";
        this.healthBarBackground.height = "25px";
        this.healthBarBackground.background = "black";
        this.healthBarBackground.thickness = 1;
        this.healthBarBackground.cornerRadius = 3;
        this.healthContainer.addControl(this.healthBarBackground);
        
        // Adicionar barra de vida
        this.healthBar = new BABYLON.GUI.Rectangle();
        this.healthBar.width = "100%";
        this.healthBar.height = "100%";
        this.healthBar.background = "#30FF30"; // Verde por padrão
        this.healthBar.thickness = 0;
        this.healthBar.cornerRadius = 3;
        this.healthBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.healthBarBackground.addControl(this.healthBar);
    }
    
    // Atualizar a exibição da vida (apenas a barra)
    updateHealthText(currentHealth) {
        if (!this.healthBar) return;
        
        // Calcular valor e porcentagem da vida
        const healthValue = Math.max(0, Math.round(currentHealth));
        const healthPercent = (healthValue / 100);
        
        // Atualizar largura da barra
        this.healthBar.width = `${healthPercent * 100}%`;
        
        // Mudar cor baseado na quantidade de vida
        if (healthPercent <= 0.25) {
            this.healthBar.background = "#FF3030"; // Vermelho intenso para vida baixa
        } else if (healthPercent <= 0.5) {
            this.healthBar.background = "#FF7700"; // Laranja para vida média
        } else {
            this.healthBar.background = "#30FF30"; // Verde para vida alta
        }
    }
    
    // Atualizar visual baseado no estado (perseguindo ou patrulhando)
    updateVisualState(isChasing) {
        if (!this.mesh) return;

        const body = this.mesh.getChildMeshes(false, (node) => node.name === "monsterBody")[0];
        const head = this.mesh.getChildMeshes(false, (node) => node.name === "monsterHead")[0];
        const material = body ? body.material : (head ? head.material : null);

        if (!material) return;

        // Luz do monstro
        const light = this.mesh.getChildMeshes(false, (node) => node.name === "monsterLight")[0];
        
        if (isChasing) {
            // Vermelho vivo quando perseguindo, mas com emissão reduzida
            material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            material.emissiveColor = new BABYLON.Color3(0.3, 0, 0); // Reduzido de 0.5 para 0.3

            // Reduzir intensidade da luz
            if (light && light instanceof BABYLON.PointLight) {
                light.intensity = 0.5; // Reduzido de 1.2 para 0.5
            }
        } else {
            // Cor original quando patrulhando, com emissão ainda mais reduzida
            material.diffuseColor = new BABYLON.Color3(0.5, 0.1, 0.1);
            material.emissiveColor = new BABYLON.Color3(0.2, 0.03, 0.03); // Reduzido de 0.3/0.05 para 0.2/0.03
        }
    }

}

export default MonsterView;