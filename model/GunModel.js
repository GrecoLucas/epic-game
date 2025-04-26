class GunModel {
    constructor(type = 'pistol', damage = 50, ammo = 15, maxAmmo = 15, reloadTime = 2) { // Changed default damage to 50
        this.type = type;
        this.damage = damage;
        this.ammo = ammo;
        this.maxAmmo = maxAmmo;
        this.totalAmmo = maxAmmo * 4; // Quantidade de munição total (4 pentes extras por padrão)
        this.reloadTime = reloadTime;
        this.isPickedUp = false;
        this.position = { x: 0, y: 0, z: 0 };
        
        // Propriedades específicas por tipo de arma
        this.configureGunType(type);
    }
    
    // Configurar propriedades específicas baseadas no tipo de arma
    configureGunType(type) {
        switch(type.toLowerCase()) {
            case 'shotgun':
                this.damage = 80; // Ensure shotgun also does 50 base damage
                this.ammo = 8;
                this.maxAmmo = 8;
                this.reloadTime = 2.5;
                break;
            case 'rifle':
                this.damage = 50; // Ensure rifle also does 50 base damage
                this.ammo = 20;
                this.maxAmmo = 20;
                this.reloadTime = 1.8;
                break;
            case 'pistol':
            default:
                this.damage = 25; 
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
    }

    shoot() {
        if (this.ammo > 0) {
            this.ammo--;
            return true;
        }
        return false;
    }

    reload() {
        // Verificar se há munição total disponível
        if (this.totalAmmo <= 0 && this.ammo <= 0) {
            console.log("Sem munição disponível para recarga");
            return this; // Não é possível recarregar
        }
        
        // Calcular quantas balas precisamos para preencher o pente
        const bulletsNeeded = this.maxAmmo - this.ammo;
        
        if (bulletsNeeded <= 0) {
            console.log("Pente já está cheio");
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
        console.log(`Adicionado ${amount} munições. Total agora: ${this.totalAmmo}`);
        return this;
    }
    
    // Método para obter o dano atual da arma
    getDamage() {
        return this.damage;
    }

    getTotalAmmo() {
        return this.totalAmmo;
    }''
}

export default GunModel;
