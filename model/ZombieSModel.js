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
        this.monsterIncrement = 1; // Aumento na quantidade de monstros a cada horda
        this.maxMonstersPerHorde = 10; // Máximo de monstros por horda
        
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
        this.currentMonsterCount = Math.min(
            this.initialMonsterCount + (this.currentHorde * this.monsterIncrement),
            this.maxMonstersPerHorde
        );
        return this.currentMonsterCount;
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