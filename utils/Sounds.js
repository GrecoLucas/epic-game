class SoundManager {
    constructor(scene) {
        this.scene = scene;
        
        // Mapeamento de sons para caminhos de arquivos
        this.soundPaths = {
            "pistol_shot": "sounds/pistol_shot.mp3",
            "assault_rifle_shot": "sounds/assault_rifle_shot.mp3", 
            "empty": "sounds/empty_gun_click.mp3",
            "pickup": "sounds/weapon_pickup.mp3",
            "drop": "sounds/weapon_drop.mp3",
            "pistol_reload": "sounds/pistol_reload.mp3",
            "assault_rifle_reload": "sounds/assault_rifle_reload.mp3",
            "hammer_hit": "sounds/hammer_hit.mp3",
            "footstep1": "sounds/footstep1.mp3",
            "footstep2": "sounds/footstep2.mp3",
            "put_block": "sounds/put_block.mp3"
        };

        this.footstepToggle = false;

        // Método global para teste de sons
        window.playSound = (soundName) => {
            if (this.soundPaths[soundName]) {
                this.playDirectSound(this.soundPaths[soundName]);
            }
        };
    }

    // Método que reproduz um som diretamente usando a API nativa
    playDirectSound(soundPath) {
        const audio = new Audio(soundPath);
        audio.volume = 0.07;
        audio.play()
            .catch(e => console.error(`Erro ao reproduzir áudio: ${e.message}`));
    }

    // Reproduz um som pelo nome
    play(soundName) {
        if (this.soundPaths[soundName]) {
            this.playDirectSound(this.soundPaths[soundName]);
            return true;
        }
        return false;
    }

    // Método específico para sons de armas
    playGunSound(gunType, action) {
        switch (action) {
            case 'shoot':
                if (gunType === 'pistol') {
                    this.play('pistol_shot');
                } else if (gunType === 'assault_rifle') {
                    this.play('assault_rifle_shot');
                } else if (gunType === 'hammer') {
                    this.play('hammer_hit');
                }
                break;
            case 'empty':
                this.play('empty');
                break;
            case 'reload':
                if (gunType === 'pistol') {
                    this.play('pistol_reload');
                } else if (gunType === 'assault_rifle') {
                    this.play('assault_rifle_reload');
                }
                break;
            case 'pickup':
                this.play('pickup');
                break;
        }
    }
    
    playPlayerSound(action) {
        switch (action) {
            case 'pickup_block':
                this.play('pickup');
                break;
            case 'footstep':
                this.footstepToggle = !this.footstepToggle;
                this.play(this.footstepToggle ? 'footstep1' : 'footstep2');
                break;
            case 'place_block':
                this.play('put_block');
                break;
        }
    }

    // Método para testar todos os sons em sequência
    testSounds() {
        const soundNames = Object.keys(this.soundPaths);
        soundNames.forEach((name, index) => {
            setTimeout(() => this.play(name), index * 1000);
        });
    }
}

export default SoundManager;