class SoundManager {
    constructor(scene) {
        this.scene = scene;
        
        // Volume global do jogo (0.0 a 1.0)
        this.masterVolume = this.loadVolumeFromStorage();
          // Mapeamento de sons para caminhos de arquivos
        this.soundPaths = {
            "pistol_shot": "sounds/pistol_shot.mp3",
            "assault_rifle_shot": "sounds/assault_rifle_shot.mp3", 
            "empty": "sounds/empty_gun_click.mp3",
            "pickup": "sounds/weapon_pickup.mp3",
            "pistol_reload": "sounds/pistol_reload.mp3",
            "assault_rifle_reload": "sounds/assault_rifle_reload.mp3",
            "hammer_hit": "sounds/hammer_hit.mp3",
            "granade_throw": "sounds/weapon_pickup.mp3", // Usando som de pickup temporariamente
            "granade_explosion": "sounds/assault_rifle_shot.mp3", // Som temporário para explosão
            "footstep1": "sounds/footstep1.mp3",
            "footstep2": "sounds/footstep2.mp3",
            "put_block": "sounds/put_block.mp3",
            "zombie_sound1": "sounds/Zombie_sound1.mp3",
            "zombie_sound2": "sounds/Zombie_sound2.mp3",
            "zombie_sound3": "sounds/Zombie_sound3.mp3",
            "horde_music": "sounds/horde_music.mp3",
        };

        this.footstepToggle = false;
        
        // Música de fundo da horda
        this.hordeMusic = null;
        this.isHordeMusicPlaying = false;        // Método global para teste de sons
        window.playSound = (soundName) => {
            if (this.soundPaths[soundName]) {
                this.playDirectSound(this.soundPaths[soundName]);
            }
        };
        
        // Método global para testar música da horda
        window.testHordeMusic = () => {
            this.testHordeMusic();
        };
    }    // Método que reproduz um som diretamente usando a API nativa
    playDirectSound(soundPath, volume = 0.1) {
        const audio = new Audio(soundPath);
        audio.volume = volume * this.masterVolume; // Aplicar volume global
        audio.play()
            .catch(e => console.error(`Erro ao reproduzir áudio: ${e.message}`));
    }

    // Reproduz um som pelo nome
    play(soundName, volume = 0.1) {
        if (this.soundPaths[soundName]) {
            this.playDirectSound(this.soundPaths[soundName], volume);
            return true;
        }
        return false;
    }    // Configurar volume global (0.0 a 1.0)
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.saveVolumeToStorage();
        
        // Atualizar volume da música da horda se estiver tocando
        this.updateHordeMusicVolume();
    }

    // Obter volume global atual
    getMasterVolume() {
        return this.masterVolume;
    }

    // Carregar volume do localStorage
    loadVolumeFromStorage() {
        try {
            const savedVolume = localStorage.getItem('gameVolume');
            return savedVolume ? parseFloat(savedVolume) : 0.5; // Volume padrão: 50%
        } catch (e) {
            return 0.5;
        }
    }

    // Salvar volume no localStorage
    saveVolumeToStorage() {
        try {
            localStorage.setItem('gameVolume', this.masterVolume.toString());
        } catch (e) {
            console.warn('Não foi possível salvar o volume');
        }
    }    // Método específico para sons de armas
    playGunSound(gunType, action) {
        switch (action) {
            case 'shoot':
                if (gunType === 'pistol') {
                    this.play('pistol_shot');
                } else if (gunType === 'assault_rifle') {
                    this.play('assault_rifle_shot');
                } else if (gunType === 'hammer') {
                    this.play('hammer_hit');
                } else if (gunType === 'granade') {
                    this.play('granade_throw');
                }
                break;
            case 'empty':
                this.play('empty');
                break;            case 'reload':
                if (gunType === 'pistol') {
                    this.play('pistol_reload');
                } else if (gunType === 'assault_rifle') {
                    this.play('assault_rifle_reload');
                } else if (gunType === 'granade') {
                    this.play('pickup'); // Som temporário para reload de granada
                }
                break;
            case 'pickup':
                this.play('pickup');
                break;
        }
    }

    playMonsterSound(soundType, volume = 0.1) {
        const random = Math.floor(Math.random() * 3) + 1;
        switch (soundType) {
            case 'zombie':
                this.play(`zombie_sound${random}`, volume);
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

    // Métodos para controlar a música da horda
    startHordeMusic() {
        if (this.isHordeMusicPlaying) {
            return; // Já está tocando
        }

        try {
            // Parar música anterior se existir
            this.stopHordeMusic();

            // Criar novo objeto de áudio
            this.hordeMusic = new Audio(this.soundPaths["horde_music"]);
            this.hordeMusic.volume = 0.3 * this.masterVolume; // Volume mais baixo para música de fundo
            this.hordeMusic.loop = true; // Tocar em loop
            
            // Configurar eventos
            this.hordeMusic.onloadeddata = () => {
                console.log("Música da horda carregada com sucesso");
            };
            
            this.hordeMusic.onerror = (e) => {
                console.error("Erro ao carregar música da horda:", e);
                this.isHordeMusicPlaying = false;
            };

            // Tocar a música
            this.hordeMusic.play()
                .then(() => {
                    this.isHordeMusicPlaying = true;
                    console.log("Música da horda iniciada");
                })
                .catch(e => {
                    console.error("Erro ao reproduzir música da horda:", e);
                    this.isHordeMusicPlaying = false;
                });

        } catch (error) {
            console.error("Erro ao iniciar música da horda:", error);
            this.isHordeMusicPlaying = false;
        }
    }

    stopHordeMusic() {
        if (this.hordeMusic) {
            try {
                this.hordeMusic.pause();
                this.hordeMusic.currentTime = 0;
                this.hordeMusic = null;
                this.isHordeMusicPlaying = false;
                console.log("Música da horda parada");
            } catch (error) {
                console.error("Erro ao parar música da horda:", error);
            }
        }
    }

    // Método para ajustar volume da música da horda quando o volume global muda
    updateHordeMusicVolume() {
        if (this.hordeMusic && this.isHordeMusicPlaying) {
            this.hordeMusic.volume = 0.3 * this.masterVolume;
        }
    }

    // Verificar se a música da horda está tocando
    isHordeMusicCurrentlyPlaying() {
        return this.isHordeMusicPlaying;
    }

    // Método para testar a música da horda (debug)
    testHordeMusic() {
        console.log("Testando música da horda...");
        if (this.isHordeMusicPlaying) {
            this.stopHordeMusic();
        } else {
            this.startHordeMusic();
        }
    }
}

export default SoundManager;