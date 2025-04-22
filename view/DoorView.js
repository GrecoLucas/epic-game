class DoorView {
    constructor() {
        this.doorMesh = null;
        this.frameMesh = null;
        this.frameComponents = []; // Array para armazenar as partes do frame (topo, laterais)
    }

    createMeshes(scene, model) {
        const position = model.getPosition();
        const width = model.getWidth();
        const height = model.getHeight();
        const depth = model.getDepth();

        // Criar porta
        this.doorMesh = BABYLON.MeshBuilder.CreateBox("door", { width, height, depth }, scene);
        this.doorMesh.position = new BABYLON.Vector3(position.x, position.y + height / 2, position.z);
        this.doorMesh.material = new BABYLON.StandardMaterial("doorMaterial", scene);
        this.doorMesh.material.diffuseTexture = new BABYLON.Texture("./textures/door.png", scene);
        this.doorMesh.checkCollisions = true;
        this.doorMesh.id = "doorMainMesh";

        // Criar armação da porta
        this.frameMesh = this.createDoorFrame(scene, position, width, height, depth);

        return [this.doorMesh, this.frameMesh];
    }
    
    createDoorFrame(scene, position, width, height, depth) {
        const frameWidth = 0.5;
        const frame = new BABYLON.Mesh("doorFrame", scene);

        // Dados das partes: [nome, largura, altura, profundidade, posição]
        const parts = [
            ["topFrame", width + frameWidth * 2, frameWidth, depth + frameWidth * 2,
                new BABYLON.Vector3(position.x, position.y + height + frameWidth / 2, position.z)],
            ["leftFrame", frameWidth, height, depth + frameWidth * 2,
                new BABYLON.Vector3(position.x - width / 2 - frameWidth / 2, position.y + height / 2, position.z)],
            ["rightFrame", frameWidth, height, depth + frameWidth * 2,
                new BABYLON.Vector3(position.x + width / 2 + frameWidth / 2, position.y + height / 2, position.z)]
        ];

        const frameMaterial = new BABYLON.StandardMaterial("frameMaterial", scene);
        frameMaterial.diffuseTexture = new BABYLON.Texture("./textures/doorframe.png", scene);

        this.frameComponents = parts.map(([name, w, h, d, pos], idx) => {
            const mesh = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
            mesh.position = pos;
            mesh.material = frameMaterial;
            mesh.parent = frame;
            mesh.id = ["doorTopFrame", "doorLeftFrame", "doorRightFrame"][idx];
            mesh.checkCollisions = true;
            return mesh;
        });

        return frame;
    }
    
    updateView(model, scene) {
        if (this.doorMesh && model.isOpened()) {
            this.doorMesh.dispose();
            this.doorMesh = null;

            // Aplica a textura original da moldura e desativa colisão das laterais
            const highlightMaterial = new BABYLON.StandardMaterial("frameMaterial", scene);
            highlightMaterial.diffuseTexture = new BABYLON.Texture("./textures/doorframe.png", scene);

            // Lateral esquerda
            if (this.frameComponents[1]) {
                this.frameComponents[1].material = highlightMaterial;
                this.frameComponents[1].checkCollisions = false;
            }
            // Lateral direita
            if (this.frameComponents[2]) {
                this.frameComponents[2].material = highlightMaterial;
                this.frameComponents[2].checkCollisions = false;
            }
            // Topo
            if (this.frameComponents[0]) {
                this.frameComponents[0].material = highlightMaterial;
            }
        }
    }
    
    getMeshes() {
        const meshes = [];
        
        // Adicionar apenas meshes que ainda existem
        if (this.doorMesh) {
            meshes.push(this.doorMesh);
        }
        
        if (this.frameMesh) {
            meshes.push(this.frameMesh);
        }
        
        return meshes;
    }
}

export default DoorView;