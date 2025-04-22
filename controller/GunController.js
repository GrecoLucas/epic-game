class GunController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.cooldown = false;
        this.reloading = false;
        
        // Referência para a função de disparo de áudio (será definida externamente)
        this.playSoundCallback = null;
    }

    update(playerPosition, playerDirection) {
        // Se a arma estiver na mão, atualizar posição relativa ao jogador
        if (this.model.isPickedUp && playerPosition) {
            // A posição da arma já é relativa à câmera, então não precisamos fazer mais nada aqui
        }
        
        // Atualizar a view
        this.view.update();
    }

    // Verificar se o jogador está perto o suficiente para pegar a arma
    checkPickupProximity(playerPosition, interactionDistance = 2) {
        if (this.model.isPickedUp) {
            return false; // Já está pega
        }
        
        // Calcular distância entre o jogador e a arma
        const dx = this.model.position.x - playerPosition.x;
        const dy = this.model.position.y - playerPosition.y;
        const dz = this.model.position.z - playerPosition.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        return distance <= interactionDistance;
    }

    // Pegar a arma do chão
    pickup() {
        if (!this.model.isPickedUp) {
            this.model.pickup();
            this.view.updateVisibility();
            
            // Tocar som de pegar arma se callback existir
            if (this.playSoundCallback) {
                this.playSoundCallback('pickup');
            }
            
            console.log("Arma pega com sucesso");
            return true;
        }
        return false;
    }

    // Largar a arma no chão
    drop(x, y, z) {
        if (this.model.isPickedUp) {
            // Se a posição não for especificada, usar a posição atual do jogador
            if (x !== null && y !== null && z !== null) {
                this.model.setPosition(x, y, z);
            }
            
            this.model.drop();
            this.view.updateVisibility();
            
            // Tocar som de soltar arma
            if (this.playSoundCallback) {
                this.playSoundCallback('drop');
            }
            
            console.log("Arma largada no chão");
            return true;
        }
        return false;
    }

    // Atirar com a arma
    shoot() {
        if (!this.model.isPickedUp || this.cooldown || this.reloading) {
            return false;
        }
        
        const success = this.model.shoot();
        if (success) {
            this.view.playShootEffect();
            this.setCooldown();
            
            // Tocar som de tiro
            if (this.playSoundCallback) {
                this.playSoundCallback('shoot');
            }
            
            console.log(`Tiro disparado. Munição restante: ${this.model.ammo}`);
            
            // Se acabou a munição, recarregar automaticamente
            if (this.model.ammo === 0) {
                this.reload();
            }
        } else {
            // Tocar som de "click" (sem munição)
            if (this.playSoundCallback) {
                this.playSoundCallback('empty');
            }
            
            console.log("Sem munição");
            this.reload();
        }
        
        return success;
    }

    // Definir cooldown entre tiros
    setCooldown() {
        this.cooldown = true;
        setTimeout(() => {
            this.cooldown = false;
        }, 200); // 200ms de cooldown entre tiros
    }

    // Recarregar a arma
    reload() {
        if (!this.model.isPickedUp || this.reloading || this.model.ammo === this.model.maxAmmo) {
            return false;
        }
        
        console.log("Recarregando...");
        this.reloading = true;
        this.view.playReloadEffect();
        
        // Tocar som de recarga
        if (this.playSoundCallback) {
            this.playSoundCallback('reload');
        }
        
        setTimeout(() => {
            this.model.reload();
            this.reloading = false;
            console.log(`Recarga completa. Munição: ${this.model.ammo}`);
        }, this.model.reloadTime * 1000);
        
        return true;
    }
    
    // Método para definir callback de sons
    setAudioCallback(callback) {
        this.playSoundCallback = callback;
    }
}

export default GunController;
