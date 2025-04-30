// BiomeManager.js - Gerencia a distribuição de biomas no mundo

class BiomeManager {
    constructor(scene, seed) {
        this.scene = scene;
        this.seed = seed || Math.floor(Math.random() * 1000000);
        
        // Biomas disponíveis
        this.biomeTypes = [
            'plains',    // Planícies
            'forest',    // Floresta
            'mountains', // Montanhas
            'desert',    // Deserto
            'snow',      // Neve
            'swamp'      // Pântano
        ];
        
        // Configurações de distribuição de biomas
        this.biomeScale = 0.005; // Escala do mapa de biomas (menor = biomas maiores)
        this.temperatureScale = 0.001; // Escala da mapa de temperatura
        this.humidityScale = 0.001; // Escala do mapa de umidade
        this.biomeBlendDistance = 4; // Distância de mistura entre biomas
        
        // Cache de biomas para não recalcular constantemente
        this.biomeCache = new Map();
        
        // Inicializar sistema de ruído
        this._initializeNoiseGenerator();
    }
    
    // Inicializar funções de ruído para geração de biomas
    _initializeNoiseGenerator() {
        // Função de hash simples baseada na semente
        this.hashFunction = function(x, y) {
            const seedValue = ((x * 73856093) ^ (y * 19349663)) ^ this.seed;
            return this._frac(Math.sin(seedValue) * 43758.5453);
        };
    }
    
    // Função de ruído Simplex simplificada para temperatura/umidade
    _simplexNoise(x, y) {
        // Grid cell coords
        const X = Math.floor(x);
        const Y = Math.floor(y);
        
        // Relative position within grid cell
        const xf = x - X;
        const yf = y - Y;
        
        // Get values for corners
        const v00 = this.hashFunction(X, Y);
        const v01 = this.hashFunction(X, Y + 1);
        const v10 = this.hashFunction(X + 1, Y);
        const v11 = this.hashFunction(X + 1, Y + 1);
        
        // Cubic Hermine curve for smooth interpolation
        const sx = this._smoothstep(xf);
        const sy = this._smoothstep(yf);
        
        // Bilinear interpolation for final value
        const vx0 = this._lerp(v00, v10, sx);
        const vx1 = this._lerp(v01, v11, sx);
        const v = this._lerp(vx0, vx1, sy);
        
        // Map to [-1, 1] range
        return v * 2 - 1;
    }
    
    // Função de ruído com várias oitavas
    _getNoise(x, z, scale, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
        let noiseSum = 0;
        let amplitude = 1;
        let frequency = scale;
        let normalization = 0;
        
        // Adicionar várias camadas de ruído
        for (let i = 0; i < octaves; i++) {
            // Obter valor de ruído neste ponto ajustado pela frequência
            const nx = x * frequency;
            const nz = z * frequency;
            
            const noiseValue = this._simplexNoise(nx, nz);
            
            // Adicionar ao valor total ponderado pela amplitude
            noiseSum += noiseValue * amplitude;
            
            // Ponderação para normalização
            normalization += amplitude;
            
            // Aumentar detalhes (frequência) e diminuir amplitude para próxima camada
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        // Normalizar para intervalo [0, 1]
        noiseSum = noiseSum / normalization;
        return (noiseSum + 1) * 0.5;
    }
    
    // Função auxiliar: fração de um número
    _frac(n) {
        return n - Math.floor(n);
    }
    
    // Função auxiliar: interpolação linear
    _lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    // Função auxiliar: curva de suavização cúbica (smoothstep)
    _smoothstep(t) {
        return t * t * (3 - 2 * t);
    }
    
    // Método principal para determinar bioma em uma coordenada específica
    getBiomeAt(x, z) {
        // Verificar cache primeiro
        const key = `${Math.floor(x)},${Math.floor(z)}`;
        if (this.biomeCache.has(key)) {
            return this.biomeCache.get(key);
        }
        
        // Calcular temperatura e umidade para determinar bioma
        const temperature = this._getTemperature(x, z);
        const humidity = this._getHumidity(x, z);
        
        // Determinar bioma baseado em temperatura e umidade
        const biome = this._determineBiome(temperature, humidity, x, z);
        
        // Armazenar em cache
        this.biomeCache.set(key, biome);
        
        return biome;
    }
    
    // Gerar valor de temperatura para um ponto
    _getTemperature(x, z) {
        // Gerar mapa de temperatura com algumas camadas de ruído
        // Temperatura: 0 = frio, 1 = quente
        const baseTemp = this._getNoise(x, z, this.temperatureScale, 3, 0.5, 2.0);
        
        // Adicionar gradiente de latitude (mais frio nos polos, mais quente no equador)
        const normalizedZ = z * 0.0001;
        const latitudeFactor = 1.0 - Math.abs(normalizedZ) * 2.0;
        
        // Combinar base e latitude
        let temperature = baseTemp * 0.7 + latitudeFactor * 0.3;
        
        // Garantir que está no intervalo [0, 1]
        temperature = Math.max(0, Math.min(1, temperature));
        
        return temperature;
    }
    
    // Gerar valor de umidade para um ponto
    _getHumidity(x, z) {
        // Gerar mapa de umidade com algumas camadas de ruído
        // Umidade: 0 = seco, 1 = úmido
        const baseHumidity = this._getNoise(x, z, this.humidityScale, 4, 0.4, 2.0);
        
        // Adicionar influência da temperatura (áreas mais frias tendem a ser mais secas)
        const temperature = this._getTemperature(x, z);
        const tempInfluence = temperature * 0.3; // Quanto maior a temperatura, mais úmido pode ser
        
        // Combinar base e influência de temperatura
        let humidity = baseHumidity * 0.8 + tempInfluence * 0.2;
        
        // Garantir que está no intervalo [0, 1]
        humidity = Math.max(0, Math.min(1, humidity));
        
        return humidity;
    }
    
    // Determinar bioma baseado em temperatura e umidade
    _determineBiome(temperature, humidity, x, z) {
        // Mapa de Whittaker - distribui biomas com base em temperatura e umidade
        
        // Implementação simplificada:
        if (temperature < 0.2) {
            // Regiões frias
            return 'snow';
        } else if (temperature < 0.4) {
            // Regiões temperadas frias
            return humidity > 0.5 ? 'forest' : 'plains';
        } else if (temperature < 0.7) {
            // Regiões temperadas quentes
            if (humidity < 0.3) return 'plains';
            if (humidity < 0.6) return 'forest';
            return 'swamp';
        } else {
            // Regiões quentes
            if (humidity < 0.3) return 'desert';
            if (humidity < 0.6) return 'plains';
            return 'swamp';
        }
        
        // Adicionar influência de elevação para montanhas
        // Usar uma função de ruído separada para determinar elevação
        const mountainousness = this._getNoise(x, z, this.biomeScale * 2, 2, 0.5, 2.0);
        
        // Se o valor de "montanhoso" for alto o suficiente, sobrescrever o bioma para montanhas
        if (mountainousness > 0.7) {
            return 'mountains';
        }
        
        // Bioma padrão se algo der errado
        return 'plains';
    }
    
    // Limpar cache de biomas
    clearCache() {
        this.biomeCache.clear();
    }
    
    // Obter lista de todos os biomas disponíveis
    getAllBiomeTypes() {
        return [...this.biomeTypes];
    }
    
    // Obter detalhes sobre um bioma específico
    getBiomeDetails(biomeType) {
        const details = {
            name: '',
            description: '',
            color: '',
            temperature: 0,
            humidity: 0,
            resources: []
        };
        
        switch(biomeType) {
            case 'plains':
                details.name = 'Planícies';
                details.description = 'Vastas áreas gramadas com pouca vegetação.';
                details.color = '#8BC34A';
                details.temperature = 22;
                details.humidity = 0.4;
                details.resources = ['Comida', 'Madeira (Pouca)'];
                break;
            case 'forest':
                details.name = 'Floresta';
                details.description = 'Densa vegetação com muitas árvores e vida selvagem.';
                details.color = '#4CAF50';
                details.temperature = 18;
                details.humidity = 0.7;
                details.resources = ['Madeira', 'Animais', 'Frutas'];
                break;
            case 'mountains':
                details.name = 'Montanhas';
                details.description = 'Regiões elevadas com terreno rochoso e íngreme.';
                details.color = '#9E9E9E';
                details.temperature = 5;
                details.humidity = 0.3;
                details.resources = ['Pedra', 'Minérios', 'Cristais'];
                break;
            case 'desert':
                details.name = 'Deserto';
                details.description = 'Extensões áridas com pouca vegetação e muita areia.';
                details.color = '#FFC107';
                details.temperature = 35;
                details.humidity = 0.1;
                details.resources = ['Areia', 'Minerais Raros'];
                break;
            case 'snow':
                details.name = 'Neve';
                details.description = 'Terras congeladas cobertas de neve e gelo.';
                details.color = '#E0F7FA';
                details.temperature = -10;
                details.humidity = 0.2;
                details.resources = ['Gelo', 'Cristais'];
                break;
            case 'swamp':
                details.name = 'Pântano';
                details.description = 'Áreas úmidas e lamacentas com vegetação densa.';
                details.color = '#795548';
                details.temperature = 24;
                details.humidity = 0.9;
                details.resources = ['Plantas Raras', 'Materiais Orgânicos'];
                break;
            default:
                details.name = 'Desconhecido';
                details.description = 'Bioma não identificado.';
                details.color = '#FFFFFF';
        }
        
        return details;
    }
}

export default BiomeManager;