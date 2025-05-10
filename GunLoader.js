import Gun from './objects/Gun.js';

class GunLoader {
    constructor(scene) {
        this.scene = scene;
        this.guns = [];
    }
    
    // Criar uma arma com base no caractere G do maze.txt
    createGunAtPosition(x, y, z, type = 'pistol') {
        const gun = new Gun(this.scene, type, x, y, z);
        
        // Criar meshes físicos para a arma
        gun.view.createPhysicalMeshes(this.scene);
           
        // Conectar sons à arma se o gerenciador de som existir
        if (this.scene.gameInstance && this.scene.gameInstance.soundManager) {
            this.connectGunSounds(gun);
        }
        // Adicionar à lista de armas
        this.guns.push(gun);
        
        return gun;
    }
    
    // Modificar o método connectGunSounds
    
    connectGunSounds(gun) {
        if (gun && gun.controller) {
            console.log(`🔊 Conectando sons à arma tipo: ${gun.model.type}`);
            
            // Configurar o callback de áudio
            gun.controller.setAudioCallback((action) => {
                const gunType = gun.model.type;
                
                // Se for pistol + shoot, usar método direto
                if (gunType === 'pistol' && action === 'shoot') {
                    console.log('🔊 Ativando som direto de tiro de pistola');
                    if (typeof window.playPistolSound === 'function') {
                        window.playPistolSound();
                    }
                }
                
                // Chamar o método normal também
                if (this.scene.gameInstance?.soundManager) {
                    this.scene.gameInstance.soundManager.playGunSound(gunType, action);
                } else {
                    console.warn("⚠️ SoundManager não disponível");
                }
            });
        }
    }
    // Processar o mapa e criar armas onde houver caractere G
    processMapData(mapData) {
        if (!mapData || !mapData.map) return;
        
        // Localizar caracteres 'G1' e 'G2' no mapa
        const map = mapData.map;
        const cellSize = mapData.cellSize || 2;
        
        for (let z = 0; z < map.length; z++) {
            for (let x = 0; x < map[z].length; x++) {
                const cell = map[z][x];
                
                // Converter coordenadas de grade para coordenadas 3D
                const worldX = x * cellSize + cellSize / 2;
                const worldZ = z * cellSize + cellSize / 2;
                const worldY = 0.5; // Altura do chão + pequena elevação
                
                // Criar o tipo apropriado de arma com base no caractere
                if (cell === 'G1') {
                    // G1 = Pistola
                    this.createGunAtPosition(worldX, worldY, worldZ, 'pistol');
                } 
                else if (cell === 'G2') {
                    // G2 = Rifle de assalto
                    this.createGunAtPosition(worldX, worldY, worldZ, 'assault_rifle');
                }
                else if (cell === 'H') {
                    // H = Martelo de reparo
                    this.createGunAtPosition(worldX, worldY, worldZ, 'hammer');
                }
            }
        }
    }
    
    // Verificar proximidade entre jogador e todas as armas (sem pegar automaticamente)
    checkPlayerProximity(playerPosition) {
        let nearbyGuns = [];
        
        for (const gun of this.guns) {
            if (gun.checkPlayerCollision(playerPosition)) {
                // Adicionar à lista de armas próximas, mas não coletar automaticamente
                nearbyGuns.push(gun);
            }
        }
        
        return nearbyGuns.length > 0 ? nearbyGuns : null;
    }
    
    // Obter todas as armas
    getGuns() {
        return this.guns;
    }
    
    // Obter a primeira arma que o jogador esteja carregando (se houver)
    getPlayerGun() {
        return this.guns.find(gun => gun.isPickedUp());
    }
    
    // Atualizar todas as armas
    update(playerPosition, playerDirection) {
        for (const gun of this.guns) {
            gun.update(playerPosition, playerDirection);
        }
    }
}

export default GunLoader;
