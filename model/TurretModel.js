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
        
        // IMPORTANTE: Sempre usar munição ilimitada para as torretas
        this.unlimitedAmmo = true;
        this.ammo = Infinity;
        
        // Cache para performance
        this.lastTargetUpdateTime = 0;
        this.targetUpdateInterval = 200; // Atualizar alvo a cada 200ms
    }

    // Verificar se a torreta pode disparar com base no cooldown
    canFire(currentTime) {
        return this.isActive && (currentTime - this.lastFireTime >= this.cooldownTime);
    }

    // Registrar um disparo e atualizar o timestamp
    recordFire(currentTime) {
        this.lastFireTime = currentTime;
        // As torres sempre têm munição infinita, então não decrementamos
        return true;
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
        
        // As torretas SEMPRE usam munição infinita
        this.unlimitedAmmo = true;
        this.ammo = Infinity;
    }
}

export default TurretModel;