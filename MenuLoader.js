// MenuLoader.js - Ponto de entrada do jogo que carrega o menu

import Menu from './Menu.js';

// Quando o DOM estiver completamente carregado
window.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando carregamento do menu...");
    
    // Pré-carregar recursos comuns para o menu e o jogo
    loadAssets().then(() => {
        console.log("Recursos carregados com sucesso!");
        
        // Inicializar o menu principal
        const menu = new Menu();
        menu.initialize();
        
        // Esconder a tela de carregamento
        hideLoadingScreen();
    }).catch(error => {
        console.error("Erro ao carregar recursos:", error);
        
        // Exibir mensagem de erro na tela de carregamento
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.innerText = "Erro ao carregar o jogo. Por favor, recarregue a página.";
            loadingText.style.color = "red";
        }
    });
});

// Função para pré-carregar recursos necessários
async function loadAssets() {
    const resourcesList = [
        // Texturas principais
        { type: 'texture', path: 'textures/wall.png' },
        { type: 'texture', path: 'textures/floor.png' },
        { type: 'texture', path: 'textures/sky.png' },
        { type: 'texture', path: 'textures/grass.png' },
        { type: 'texture', path: 'textures/sand.png' },
        { type: 'texture', path: 'textures/snow.png' },
        { type: 'texture', path: 'textures/rock.png' },
        
        // Sons principais
        { type: 'sound', path: 'sounds/menu_music.mp3' },
        { type: 'sound', path: 'sounds/click.mp3' },
        { type: 'sound', path: 'sounds/hover.mp3' }
    ];
    
    let loadedCount = 0;
    const totalResources = resourcesList.length;
    
    // Função para atualizar a barra de progresso
    const updateLoadingProgress = (progress) => {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    };
    
    // Carregar cada recurso sequencialmente
    for (const resource of resourcesList) {
        try {
            await loadResource(resource);
            
            // Atualizar contagem e progresso
            loadedCount++;
            const progress = Math.floor((loadedCount / totalResources) * 100);
            updateLoadingProgress(progress);
            
        } catch (error) {
            console.warn(`Falha ao carregar: ${resource.path}`, error);
        }
    }
    
    // Atualizar para 100% no final
    updateLoadingProgress(100);
    
    return Promise.resolve();
}

// Função auxiliar para carregar um recurso específico
function loadResource(resource) {
    return new Promise((resolve, reject) => {
        if (resource.type === 'texture') {
            // Criar um elemento de imagem para carregar a textura
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Falha ao carregar textura: ${resource.path}`));
            img.src = resource.path;
        } 
        else if (resource.type === 'sound') {
            // Usar um elemento de áudio para pré-carregar sons
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve();
            audio.onerror = () => reject(new Error(`Falha ao carregar som: ${resource.path}`));
            audio.src = resource.path;
            audio.load();
        }
        else {
            // Tipo desconhecido
            resolve();
        }
    });
}

// Função para ocultar a tela de carregamento
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 1s ease';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 1000);
    }
}