class GunModel {
    constructor(type = 'pistol', damage = 50, ammo = 15, maxAmmo = 15, reloadTime = 2) { // Changed default damage to 50
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
        this.ammo = this.maxAmmo;
        return this;
    }
    
    // Método para obter o dano atual da arma
    getDamage() {
        return this.damage;
    }
}

export default GunModel;
