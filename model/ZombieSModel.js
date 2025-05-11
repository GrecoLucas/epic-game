class ZombieSModel {
    constructor() {
        // Configurações das hordas        
        // Configurações de quantidade de monstros
        this.initialMonsterCount = 2; // Quantidade inicial de monstros por horda
        this.currentMonsterCount = this.initialMonsterCount;
        this.monsterIncrement = 3; // Aumento na quantidade de monstros a cada horda
        this.maxMonsterCount = 60; // Limite máximo de zumbis
        
        // Configurações de atributos dos monstros
        this.baseMonsterHealth = 100; // Vida base dos monstros
        this.healthIncrement = 20; // Aumento de vida a cada horda
        
        this.baseMonsterSpeed = 0.05; // Velocidade base dos monstros
        this.speedIncrement = 0.02; // Aumento de velocidade a cada horda
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
        const calculatedCount = this.initialMonsterCount + (this.currentHorde * this.monsterIncrement);
        return Math.min(calculatedCount, this.maxMonsterCount);
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