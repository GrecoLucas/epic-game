class GunModel {
    constructor(type = 'pistol', damage = 10, ammo = 30, maxAmmo = 30, reloadTime = 2) {
        this.type = type;
        this.damage = damage;
        this.ammo = ammo;
        this.maxAmmo = maxAmmo;
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
                this.damage = 25;
                this.ammo = 8;
                this.maxAmmo = 8;
                this.reloadTime = 2.5;
                break;
            case 'rifle':
                this.damage = 15;
                this.ammo = 20;
                this.maxAmmo = 20;
                this.reloadTime = 1.8;
                break;
            case 'pistol':
            default:
                // Valores padrão já definidos no construtor
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
        this.ammo = this.maxAmmo;
        return this;
    }
    
    // Método para obter o dano atual da arma
    getDamage() {
        return this.damage;
    }
}

export default GunModel;
