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
        gun.createPhysicalMesh();
        
        // Adicionar à lista de armas
        this.guns.push(gun);
        
        return gun;
    }
    
    // Processar o mapa e criar armas onde houver caractere G
    processMapData(mapData) {
        if (!mapData || !mapData.map) return;
        
        // Localizar caracteres 'G' no mapa
        const map = mapData.map;
        const cellSize = mapData.cellSize || 2;
        
        for (let z = 0; z < map.length; z++) {
            for (let x = 0; x < map[z].length; x++) {
                if (map[z][x] === 'G') {
                    // Converter coordenadas de grade para coordenadas 3D
                    const worldX = x * cellSize + cellSize / 2;
                    const worldZ = z * cellSize + cellSize / 2;
                    const worldY = 0.5; // Altura do chão + pequena elevação
                    
                    // Criar arma nesta posição
                    this.createGunAtPosition(worldX, worldY, worldZ);
                    console.log(`Arma criada na posição (${worldX}, ${worldY}, ${worldZ})`);
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
