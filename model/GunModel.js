class GunModel {
    constructor(type = 'pistol', name = "pistol", damage = 50, ammo = 15, maxAmmo = 15, reloadTime = 2) { // Changed default damage to 50
        this.type = type;
        this.damage = damage;
        this.ammo = ammo;
        this.maxAmmo = maxAmmo;
        this.totalAmmo = maxAmmo; // Quantidade de munição total 
        this.reloadTime = reloadTime;
        this.isPickedUp = false;
        this.isInInventory = false;
        this.isAutomatic = false; // Nova propriedade para controlar o disparo automático
        this.position = { x: 0, y: 0, z: 0 };
        
        // Propriedades específicas por tipo de arma
        this.configureGunType(type);
    }
      // Configurar propriedades específicas baseadas no tipo de arma
    configureGunType(type) {
        switch(type.toLowerCase()) {
            case 'hammer':
                this.damage = 10; 
                this.ammo = Infinity; 
                this.maxAmmo = Infinity;
                this.reloadTime = 0; 
                this.isAutomatic = false;
                this.isRepairTool = true; 
                this.repairAmount = 20; 
                this.name = "Hammer";
                break;
            case 'assault_rifle':
                this.damage = 15;
                this.ammo = 20;
                this.maxAmmo = 20;
                this.reloadTime = 1.8;
                this.isAutomatic = true;
                this.name = "Assault Rifle";
                break;              case 'granade':
                this.damage = 100;
                this.ammo = 0; 
                this.maxAmmo = null; 
                this.totalAmmo = 3; 
                this.reloadTime = 0; 
                this.isAutomatic = false;
                this.isExplosive = true;
                this.explosionRadius = 12; 
                this.fuseTime = 3000; 
                this.name = "Grenade";
                break;
            case 'pistol':
            default:
                this.damage = 20;
                this.ammo = 15;
                this.maxAmmo = 15;
                this.reloadTime = 2;
                this.isAutomatic = false;
                this.name = "Pistol"; 
                break;
        }
    }

    setPosition(x, y, z) {
        this.position = { x, y, z };
        return this;
    }

    pickup() {
        this.isPickedUp = true;
        return this;
    }

    drop() {
        this.isPickedUp = false;
        return this;
    }    shoot() {
        if (this.isRepairTool) {
            return true; 
        }
        if (this.isExplosive) {
            // Granada usa diretamente a munição total
            if (this.totalAmmo > 0) {
                this.totalAmmo--;
                return true;
            }
            return false;
        }
        if (this.ammo > 0) {
            this.ammo--;
            return true;
        }
        return false;
    }

    repair(target) {
        if (this.isRepairTool && target && typeof target.receiveRepair === 'function') {
            return target.receiveRepair(this.repairAmount);
        }
        return false;
    }    reload() {
        // Granada não pode ser recarregada
        if (this.isExplosive) {
            console.log("Grenades cannot be reloaded");
            return this;
        }
        
        // Verificar se há munição total disponível
        if (this.totalAmmo <= 0 && this.ammo <= 0) {
            console.log("No ammo available to reload");
            return this; // Não é possível recarregar
        }
        
        // Calcular quantas balas precisamos para preencher o pente
        const bulletsNeeded = this.maxAmmo - this.ammo;
        
        if (bulletsNeeded <= 0) {
            console.log("Full magazine, no need to reload");
            return this; // Pente já está cheio
        }
        
        // Verificar se temos munição suficiente na reserva
        if (this.totalAmmo >= bulletsNeeded) {
            // Temos munição suficiente para preencher o pente completamente
            this.totalAmmo -= bulletsNeeded;
            this.ammo = this.maxAmmo;
        } else {
            // Não temos munição suficiente, usar o que resta
            this.ammo += this.totalAmmo;
            this.totalAmmo = 0;
        }
        
        return this;
    }
    
    // Método para adicionar munição à reserva
    addAmmo(amount) {
        this.totalAmmo += amount;
        return this;
    }
      // Método para obter o dano atual da arma
    getDamage() {
        return this.damage;
    }

    // Para granadas, a munição atual é o totalAmmo
    getCurrentAmmo() {
        if (this.isExplosive) {
            return this.totalAmmo;
        }
        return this.ammo;
    }

    getTotalAmmo() {
        return this.totalAmmo;
    }
    addToInventory() {
        this.isInInventory = true;
        this.isPickedUp = false; 
        return this;
    }

    removeFromInventory() {
        this.isInInventory = false;
        return this;
    }
}

export default GunModel;
