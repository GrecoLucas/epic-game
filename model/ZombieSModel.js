class ZombieSModel {
    constructor() {
        // Configurações das hordas
        this.initialSpawnInterval = 60; // Tempo inicial entre hordas (segundos)
        this.currentSpawnInterval = this.initialSpawnInterval;
        this.minSpawnInterval = 30; // Tempo mínimo entre hordas (segundos)
        this.intervalReduction = 5; // Redução do tempo a cada horda (segundos)
        
        // Configurações de quantidade de monstros
        this.initialMonsterCount = 2; // Quantidade inicial de monstros por horda
        this.currentMonsterCount = this.initialMonsterCount;
        this.monsterIncrement = 3; // Aumento na quantidade de monstros a cada horda
        
        // Configurações de atributos dos monstros
        this.baseMonsterHealth = 100; // Vida base dos monstros
        this.healthIncrement = 20; // Aumento de vida a cada horda
        this.baseMonsterSpeed = 0.2; // Velocidade base dos monstros
        this.speedIncrement = 0.04; // Aumento de velocidade a cada horda
        this.maxMonsterSpeed = 0.6; // Velocidade máxima permitida
        
        // Estado atual
        this.currentHorde = 0;
        this.timeToNextHorde = this.initialSpawnInterval;
        this.hordeActive = false;
        this.hordeTimer = null;
        this.countdownTimer = null;
    }

    // Calcula o número de monstros para a próxima horda
    calculateMonstersForNextHorde() {
        // Aumenta o número de monstros, mas não ultrapassa o máximo
        this.monsterIncrement += 1;
        return this.initialMonsterCount + (this.currentHorde * this.monsterIncrement);
    }

    // Calcula o intervalo para a próxima horda
    calculateNextInterval() {
        // Reduz o intervalo, mas não fica menor que o mínimo
        this.currentSpawnInterval = Math.max(
            this.initialSpawnInterval - (this.currentHorde * this.intervalReduction),
            this.minSpawnInterval
        );
        return this.currentSpawnInterval;
    }

    // Calcula a vida dos monstros para a horda atual
    calculateMonsterHealth() {
        return this.baseMonsterHealth + (this.currentHorde * this.healthIncrement);
    }

    // Calcula a velocidade dos monstros para a horda atual
    calculateMonsterSpeed() {
        // Aumenta a velocidade, mas não ultrapassa o máximo
        return Math.min(
            this.baseMonsterSpeed + (this.currentHorde * this.speedIncrement),
            this.maxMonsterSpeed
        );
    }

    // Reinicia os contadores
    resetCounters() {
        this.currentHorde = 0;
        this.timeToNextHorde = this.initialSpawnInterval;
        this.currentMonsterCount = this.initialMonsterCount;
        this.currentSpawnInterval = this.initialSpawnInterval;
    }

    // Getters
    getTimeToNextHorde() {
        return this.timeToNextHorde;
    }

    getCurrentHorde() {
        return this.currentHorde;
    }

    isHordeActive() {
        return this.hordeActive;
    }
}

export default ZombieSModel;