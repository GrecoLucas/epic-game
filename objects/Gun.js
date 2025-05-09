import GunModel from '../model/GunModel.js';
import Pistol from '../view/Guns/Pistol.js';
import AssaultRifle from '../view/Guns/Assalt_rifle.js';
import GunController from '../controller/GunController.js';
import Hammer from '../view/Guns/Hammer.js';

class Gun {
    constructor(scene, type = 'pistol', x = 0, y = 0, z = 0) {
        // Inicializar o modelo com posição
        this.model = new GunModel(type,);
        this.model.setPosition(x, y, z);
        
        // Inicializar a view com o modelo
        if(type === 'pistol') {
            this.view = new Pistol(scene, this.model);
        } else if(type === 'assault_rifle') {
            this.view = new AssaultRifle(scene, this.model);
        } else if (type === 'hammer') {
            this.view = new Hammer(scene, this.model);
        } 
              
        // Inicializar o controlador
        this.controller = new GunController(this.model, this.view);
        
        // Armazenar referência à cena
        this.scene = scene;
    }

    update(playerPosition, playerDirection) {
        // Atualizar o controlador, que por sua vez atualiza modelo e view
        this.controller.update(playerPosition, playerDirection);
    }

    // Verificar se o jogador está perto da arma e pode pegá-la
    checkPickupProximity(playerPosition, interactionDistance = 2) {
        return this.controller.checkPickupProximity(playerPosition, interactionDistance);
    }

    repair(target) {
        if (this.model.isRepairTool) {
            const success = this.model.repair(target);
            if (success) {
                this.view.playRepairAnimation();
            }
            return success;
        }
        return false;
    }

    pickup() {
        const result = this.controller.pickup();
        if (result) {
            this.model.addToInventory(); // Garantir que está no inventário
        }
        return result;
    }

    drop(x, y, z) {
        return this.controller.drop(x, y, z);
    }

    shoot() {
        return this.controller.shoot();
    }

    reload() {
        return this.controller.reload();
    }
    
    // Novos métodos para integração com o Maze
    getPosition() {
        return this.model.position;
    }
    
    getMesh() {
        return this.model.isPickedUp ? this.view.meshInHand : this.view.meshOnGround;
    }
    
    isPickedUp() {
        return this.model.isPickedUp;
    }
    
    // Método para criar mesh físico para a arma no chão
    createPhysicalMesh() {
        return this.view.createPhysicalMeshes(this.scene);
    }
    
    // Verificar colisão direta com o jogador - não pega automaticamente, apenas verifica proximidade
    checkPlayerCollision(playerPosition, pickupRadius = 1.5) {
        if (this.model.isPickedUp) return false;
        
        const dx = this.model.position.x - playerPosition.x;
        const dz = this.model.position.z - playerPosition.z;
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        // Apenas retornar se está próximo ou não, sem pegar automaticamente
        return distance <= pickupRadius;
    }
}

export default Gun;
