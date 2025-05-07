// TurretModel.js - Modelo para gerenciar as propriedades e estado da torreta

class TurretModel {
    constructor() {
        // Propriedades principais da torreta
        this.damage = 20; // Dano por tiro
        this.range = 500; // Alcance em unidades de mundo
        this.fireRate = 3; // Taxa base de disparo (tiros por segundo)
        this.cooldownTime = 1000 / this.fireRate; // Em milissegundos
        this.isActive = true; // Estado de ativação
        this.health = 150; // Vida da torreta
        this.initialHealth = 150; // Saúde inicial para cálculos de dano
        this.lastFireTime = 0; // Timestamp do último disparo
        
        // Configuração de munição - agora com valor padrão limitado
        this.unlimitedAmmo = false;
        this.ammo = 100; // Valor padrão de munição para cada torreta
        this.maxAmmo = 100; // Capacidade máxima de munição
        
        // Cache para performance
        this.lastTargetUpdateTime = 0;
        this.targetUpdateInterval = 200; // Atualizar alvo a cada 200ms
    }

    // Verificar se a torreta pode disparar com base no cooldown
    canFire(currentTime) {
        return this.isActive && (currentTime - this.lastFireTime >= this.cooldownTime) && (this.unlimitedAmmo || this.ammo > 0);
    }

    // Registrar um disparo e atualizar o timestamp
    recordFire(currentTime) {
        this.lastFireTime = currentTime;
        
        // Decrementar munição se não for infinita
        if (!this.unlimitedAmmo && this.ammo > 0) {
            // Não decrementar aqui, isso é feito na classe Turret agora
            return true;
        } else if (this.unlimitedAmmo) {
            return true;
        }
        
        return false; // Sem munição
    }

    // Tenta aplicar dano à torreta, retorna true se destruída
    takeDamage(amount) {
        if (!this.isActive) return false;
        
        this.health -= amount;
        if (this.health <= 0) {
            this.isActive = false;
            return true; // Destruída
        }
        return false; // Ainda ativa
    }

    // Calcular a taxa de disparo atual baseado na saúde
    getCurrentFireRate() {
        // Se a saúde estiver abaixo de 50%, diminuir um pouco a taxa de disparo
        const healthRatio = this.health / this.initialHealth;
        if (healthRatio < 0.5) {
            return this.fireRate * 0.75; // 75% da taxa normal quando danificada
        }
        return this.fireRate;
    }

    // Verificar se é hora de atualizar o alvo (para otimização)
    shouldUpdateTarget(currentTime) {
        return (currentTime - this.lastTargetUpdateTime) >= this.targetUpdateInterval;
    }

    // Marcar quando o alvo foi atualizado
    markTargetUpdated(currentTime) {
        this.lastTargetUpdateTime = currentTime;
    }

    // Adicionar munição à torreta
    addAmmo(amount) {
        if (!this.unlimitedAmmo) {
            this.ammo = Math.min(this.ammo + amount, this.maxAmmo);
        }
    }
    
    // Verificar se a torreta está sem munição
    isOutOfAmmo() {
        return !this.unlimitedAmmo && this.ammo <= 0;
    }

    // Atualizar as propriedades da torreta (pode ser usado para upgrades)
    updateProperties(properties) {
        if (properties.damage !== undefined) this.damage = properties.damage;
        if (properties.range !== undefined) this.range = properties.range;
        if (properties.fireRate !== undefined) {
            this.fireRate = properties.fireRate;
            this.cooldownTime = 1000 / this.fireRate; // Atualizar o cooldown quando a taxa de disparo mudar
        }
        if (properties.health !== undefined) {
            this.health = properties.health;
            if (properties.initialHealth === undefined) {
                this.initialHealth = properties.health; // Atualizar saúde inicial também se não for especificado
            }
        }
        if (properties.initialHealth !== undefined) this.initialHealth = properties.initialHealth;
        if (properties.isActive !== undefined) this.isActive = properties.isActive;
        
        // Atualizar configuração de munição
        if (properties.unlimitedAmmo !== undefined) this.unlimitedAmmo = properties.unlimitedAmmo;
        if (properties.ammo !== undefined) this.ammo = properties.ammo;
        if (properties.maxAmmo !== undefined) this.maxAmmo = properties.maxAmmo;
    }
}

export default TurretModel;