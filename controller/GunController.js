class GunController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.cooldown = false;
        this.reloading = false;
        this.playSoundCallback = null;
        
        // Configurar o callback de pickup para a view
        this.view.setPickupCallback(() => this.pickup());
    }

    update(playerPosition) {
        // Manter sincronizada a visualização da arma
        this.view.update();
    }

    // Verificar se o jogador está perto o suficiente para pegar a arma
    checkPickupProximity(playerPosition, interactionDistance = 2) {
        if (this.model.isPickedUp) return false;
        
        const distance = BABYLON.Vector3.Distance(
            this.model.position,
            playerPosition
        );
        
        return distance <= interactionDistance;
    }

    // Pegar a arma do chão
    pickup() {
        if (this.model.isPickedUp) return false;
        
        this.model.pickup();
        this.view.updateVisibility();
        
        if (this.playSoundCallback) {
            this.playSoundCallback('pickup');
        }
        
        return true;
    }

    // Largar a arma no chão
    drop(position) {
        if (!this.model.isPickedUp) return false;
        
        // Se a posição for fornecida, usar ela
        if (position) {
            this.model.setPosition(position.x, position.y, position.z);
        }
        
        this.model.drop();
        this.view.updateVisibility();
        
        if (this.playSoundCallback) {
            this.playSoundCallback('drop');
        }
        
        return true;
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
            
            if (this.playSoundCallback) {
                this.playSoundCallback('shoot');
            }
            
            // Auto-reload quando acabar a munição
            if (this.model.ammo === 0) {
                this.reload();
            }
        } else {
            // Som de "click" (sem munição)
            if (this.playSoundCallback) {
                this.playSoundCallback('empty');
            }
            
            this.reload();
        }
        
        return success;
    }

    // Definir cooldown entre tiros
    setCooldown() {
        this.cooldown = true;
        setTimeout(() => {
            this.cooldown = false;
        }, this.model.fireRate || 200);
    }

    // Recarregar a arma
    reload() {
        if (!this.model.isPickedUp || 
            this.reloading || 
            this.model.ammo === this.model.maxAmmo ||
            this.model.totalAmmo === 0) {
            return false;
        }
        
        this.reloading = true;
        
        const reloadMethod = typeof this.view.playReloadEffect === 'function' 
            ? this._reloadWithAnimation.bind(this)
            : this._reloadWithoutAnimation.bind(this);
            
        reloadMethod();
        
        if (this.playSoundCallback) {
            this.playSoundCallback('reload');
        }
        
        return true;
    }
    
    _reloadWithAnimation() {
        this.view.playReloadEffect(() => {
            this.model.reload();
            this.reloading = false;
        });
        
        // Safety timeout como fallback
        const duration = this.view.getReloadAnimationDuration?.() || 
                         this.model.reloadTime * 1000 + 100;
                         
        this._setReloadTimeout(duration);
    }
    
    _reloadWithoutAnimation() {
        setTimeout(() => {
            this.model.reload();
            this.reloading = false;
        }, this.model.reloadTime * 1000);
    }
    
    _setReloadTimeout(duration) {
        this.reloadTimeout = setTimeout(() => {
            if (this.reloading) {
                this.model.reload();
                this.reloading = false;
            }
        }, duration);
    }
    
    // Método para definir callback de sons
    setAudioCallback(callback) {
        this.playSoundCallback = callback;
    }
}

export default GunController;
