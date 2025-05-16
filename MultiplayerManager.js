class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.isHost = false;
    this.roomId = null;
    this.clientId = this._generateId();
    this.remotePlayers = {};
    this.updateInterval = null;
    this.connected = false;
    
    // URL do servidor WebSocket
    this.serverUrl = window.location.hostname === 'localhost' 
      ? 'ws://localhost:3000'
      : `wss://${window.location.hostname}`;
  }
  
  // Gerar ID único para o cliente
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  // Conectar ao servidor WebSocket
  connect() {
    try {
      this.socket = new WebSocket(this.serverUrl);
      
      this.socket.onopen = () => {
        console.log("Conectado ao servidor WebSocket");
        this.connected = true;
      };
      
      this.socket.onmessage = (event) => {
        this._handleMessage(JSON.parse(event.data));
      };
      
      this.socket.onerror = (error) => {
        console.error("Erro na conexão WebSocket:", error);
      };
      
      this.socket.onclose = () => {
        console.log("Conexão WebSocket fechada");
        this.connected = false;
        clearInterval(this.updateInterval);
      };
      
    } catch (error) {
      console.error("Falha ao conectar ao servidor WebSocket:", error);
    }
  }
  
  // Criar uma nova sala (se tornar host)
  createRoom() {
    if (!this.connected) return;
    
    this.isHost = true;
    this.socket.send(JSON.stringify({
      type: 'createRoom',
      clientId: this.clientId
    }));
  }
  
  // Entrar em uma sala existente
  joinRoom(roomId) {
    if (!this.connected) return;
    
    this.isHost = false;
    this.roomId = roomId;
    
    // Obter posição e rotação do jogador
    const playerPosition = this.game.player.getPosition();
    const camera = this.game.player.getCamera();
    
    this.socket.send(JSON.stringify({
      type: 'joinRoom',
      roomId: roomId,
      clientId: this.clientId,
      position: {
        x: playerPosition.x,
        y: playerPosition.y,
        z: playerPosition.z
      },
      rotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z
      }
    }));
  }
  
  // Iniciar atualização periódica de posição
  startUpdates() {
    // Enviar posição a cada 50ms (20 vezes por segundo)
    this.updateInterval = setInterval(() => {
      this._sendPosition();
    }, 50);
  }
  
  // Enviar posição atual para o servidor
  _sendPosition() {
    if (!this.connected || !this.roomId) return;
    
    const playerPosition = this.game.player.getPosition();
    const camera = this.game.player.getCamera();
    
    this.socket.send(JSON.stringify({
      type: 'updatePosition',
      position: {
        x: playerPosition.x,
        y: playerPosition.y,
        z: playerPosition.z
      },
      rotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z
      }
    }));
  }
  
  // Atualizar estado do jogo (apenas para o host)
  updateGameState(gameState) {
    if (!this.connected || !this.roomId || !this.isHost) return;
    
    this.socket.send(JSON.stringify({
      type: 'updateGameState',
      gameState: gameState
    }));
  }
  
  // Enviar ação do jogador para o servidor (apenas para clientes)
  sendPlayerAction(action, data) {
    if (!this.connected || !this.roomId || this.isHost) return;
    
    this.socket.send(JSON.stringify({
      type: 'playerAction',
      action: action,
      data: data
    }));
  }
  
  // Tratar mensagens recebidas do servidor
  _handleMessage(message) {
    switch (message.type) {
      case 'roomCreated':
        this.roomId = message.roomId;
        console.log(`Sala criada: ${this.roomId}`);
        // Iniciar atualização de posição
        this.startUpdates();
        // Mostrar código da sala na UI
        this._showRoomCode();
        break;
        
      case 'roomJoined':
        console.log(`Entrou na sala: ${message.roomId}`);
        // Sincronizar estado do jogo recebido do host
        this._applyGameState(message.gameState);
        // Iniciar atualização de posição
        this.startUpdates();
        break;
        
      case 'playerJoined':
        console.log(`Jogador entrou: ${message.clientId}`);
        // Criar representação visual do jogador remoto
        this._createRemotePlayer(message.clientId, message.position, message.rotation);
        break;
        
      case 'playerPosition':
        // Atualizar posição de jogador remoto
        this._updateRemotePlayerPosition(message.clientId, message.position, message.rotation);
        break;
        
      case 'hostPosition':
        if (!this.isHost) {
          // Atualizar posição visual do host (para clientes)
          this._updateHostPosition(message.position, message.rotation);
        }
        break;
        
      case 'gameState':
        // Aplicar estado do jogo recebido do host
        if (!this.isHost) {
          this._applyGameState(message.gameState);
        }
        break;
    
      case 'playerAction':
        if (message.action === 'startHorde' || message.action === 'activateHordeSystem') {
          // Aplicar comandos de horda diretamente no cliente
          if (this.game.zombieSpawner) {
            this.game.zombieSpawner.handleRemoteHordeCommand(message.action, message.data);
          }
        } else if (this.isHost) {
          // Processar outras ações no host como antes
          this._handlePlayerAction(message.clientId, message.action, message.data);
        }
        break;
      case 'playerAction':
        // Processar ação de um cliente (apenas para o host)
        if (this.isHost) {
          this._handlePlayerAction(message.clientId, message.action, message.data);
        }
        break;
        
      case 'playerLeft':
        console.log(`Jogador saiu: ${message.clientId}`);
        // Remover representação visual do jogador
        this._removeRemotePlayer(message.clientId);
        break;
        
      case 'hostLeft':
        console.log("O host saiu da sala");
        alert("O host saiu da sala. Você será redirecionado para o menu.");
        // Voltar para o menu principal
        window.location.reload();
        break;
        
      case 'error':
        console.error("Erro:", message.message);
        alert(`Erro: ${message.message}`);
        break;
    }
  }
  
  // Criar representação visual de jogador remoto
  _createRemotePlayer(clientId, position, rotation) {
    // Criar um mesh para representar o jogador remoto
    const playerMesh = BABYLON.MeshBuilder.CreateCapsule(
      `player_${clientId}`,
      { radius: 0.5, height: 1.8 },
      this.game.scene
    );
    
    // Posicionar o jogador remoto
    playerMesh.position = new BABYLON.Vector3(
      position.x, 
      position.y, 
      position.z
    );
    
    // Criar material para o jogador remoto
    const material = new BABYLON.StandardMaterial(`playerMaterial_${clientId}`, this.game.scene);
    const color = this._getPlayerColor(clientId);
    material.diffuseColor = new BABYLON.Color3.FromHexString(color);
    material.specularColor = new BABYLON.Color3.FromHexString(color);
    playerMesh.material = material;
    
    // Adicionar collision
    playerMesh.checkCollisions = true;
    
    // Adicionar nome do jogador como texto flutuante
    this._createPlayerLabel(playerMesh, `Jogador ${clientId.substring(0, 4)}`);
    
    // Armazenar referência ao jogador remoto
    this.remotePlayers[clientId] = {
      mesh: playerMesh,
      position: position,
      rotation: rotation
    };
  }
  
  // Criar texto flutuante com nome do jogador
  _createPlayerLabel(playerMesh, name) {
    const plane = BABYLON.MeshBuilder.CreatePlane("nameplate", {width: 1, height: 0.3}, this.game.scene);
    plane.position = new BABYLON.Vector3(0, 1.2, 0);
    plane.parent = playerMesh;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);
    const text = new BABYLON.GUI.TextBlock();
    text.text = name;
    text.color = "white";
    text.fontSize = 14;
    text.outlineWidth = 1;
    text.outlineColor = "black";
    advancedTexture.addControl(text);
  }
  
  // Atualizar posição de um jogador remoto
  _updateRemotePlayerPosition(clientId, position, rotation) {
    const remotePlayer = this.remotePlayers[clientId];
    if (!remotePlayer) return;
    
    // Atualizar posição com animação suave
    const targetPosition = new BABYLON.Vector3(
      position.x, 
      position.y, 
      position.z
    );
    
    // Animar movimento para suavizar
    BABYLON.Animation.CreateAndStartAnimation(
      "movePlayerAnimation", 
      remotePlayer.mesh, 
      "position", 
      30, // fps
      10, // frames
      remotePlayer.mesh.position, 
      targetPosition, 
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    // Atualizar rotação (apenas a direção horizontal)
    remotePlayer.mesh.rotation.y = rotation.y;
    
    // Atualizar posição armazenada
    remotePlayer.position = position;
    remotePlayer.rotation = rotation;
  }
  
  // Atualizar posição visual do host (para clientes)
  _updateHostPosition(position, rotation) {
    // Se não existir um jogador remoto para o host, criar um
    if (!this.remotePlayers['host']) {
      this._createRemotePlayer('host', position, rotation);
    } else {
      // Atualizar posição do host
      this._updateRemotePlayerPosition('host', position, rotation);
    }
  }
  
  // Aplicar estado do jogo recebido do host
  _applyGameState(gameState) {
    // Implementar lógica para sincronizar monstros, botões, etc.
    console.log("Sincronizando estado do jogo do host", gameState);
    
    // Exemplo: sincronizar monstros
    if (gameState.monsters && this.game.monsters) {
      // Atualizar posições dos monstros existentes
      // Adicionar/remover monstros conforme necessário
    }
    
    // Exemplo: sincronizar botões
    if (gameState.buttons && this.game.buttonsManager) {
      // Atualizar estado dos botões
    }
  }
  
  // Processar ação de um cliente (apenas para o host)
  _handlePlayerAction(clientId, action, data) {
    console.log(`Jogador ${clientId} executou ação: ${action}`, data);
    
    // Processar diferentes tipos de ações
    switch (action) {
      case 'shoot':
        // Simular tiro no lado do servidor (host)
        this._simulatePlayerShoot(clientId, data);
        break;
      
      case 'interact':
        // Processar interação com botão ou objeto
        this._simulatePlayerInteraction(clientId, data);
        break;
      
      case 'build':
        // Processar construção
        this._simulatePlayerBuild(clientId, data);
        break;
    
      case 'startHorde':
        this._handleRemoteHordeStart(clientId, data);
        break;
        
      case 'activateHordeSystem':
        this._handleRemoteHordeSystemActivation(clientId);
        break;
    }
  }
  
  _handleRemoteHordeStart(clientId, data) {
  console.log(`Jogador ${clientId} iniciou horda ${data.hordeNumber}`);
  
  // Propagar o comando para outros clientes
  if (this.isHost) {
    Object.values(this.remotePlayers).forEach(player => {
      // Não enviar de volta para quem iniciou
      if (player.id !== clientId) {
        this.socket.send(JSON.stringify({
          type: 'playerAction',
          clientId: this.clientId,
          action: 'startHorde',
          data: data
        }));
      }
    });
    
    // Se o host recebeu o comando, aplicá-lo também
    if (this.game.zombieSpawner) {
      this.game.zombieSpawner.handleRemoteHordeCommand('startHorde', data);
    }
  }
}

_handleRemoteHordeSystemActivation(clientId) {
  console.log(`Jogador ${clientId} ativou o sistema de hordas`);
  
  // Propagar o comando para outros clientes
  if (this.isHost) {
    Object.values(this.remotePlayers).forEach(player => {
      // Não enviar de volta para quem iniciou
      if (player.id !== clientId) {
        this.socket.send(JSON.stringify({
          type: 'playerAction',
          clientId: this.clientId,
          action: 'activateHordeSystem',
          data: {}
        }));
      }
    });
    
    // Se o host recebeu o comando, aplicá-lo também
    if (this.game.zombieSpawner) {
      this.game.zombieSpawner.handleRemoteHordeCommand('activateHordeSystem', {});
    }
  }
}
  // Simular tiro de um cliente no lado do host
  _simulatePlayerShoot(clientId, data) {
    // Implementar lógica de simulação de tiro
    console.log(`Simulando tiro do jogador ${clientId}`);
    
    // Criar efeito visual de tiro
    const remotePlayer = this.remotePlayers[clientId];
    if (remotePlayer) {
      const origin = remotePlayer.mesh.position.clone();
      origin.y += 1.5; // Altura aproximada da arma
      
      const direction = new BABYLON.Vector3(
        data.direction.x,
        data.direction.y,
        data.direction.z
      );
      
      // Criar raio para detectar colisões
      const ray = new BABYLON.Ray(origin, direction, 100);
      
      // Efeito visual do tiro
      const rayHelper = new BABYLON.RayHelper(ray);
      rayHelper.show(this.game.scene, new BABYLON.Color3(1, 0, 0));
      
      // Remover após 100ms
      setTimeout(() => {
        rayHelper.hide();
      }, 100);
      
      // Verificar colisão com monstros
      const hit = this.game.scene.pickWithRay(ray, (mesh) => {
        return mesh.name && mesh.name.includes("monster");
      });
      
      if (hit && hit.pickedMesh) {
        console.log(`Jogador ${clientId} acertou ${hit.pickedMesh.name}`);
        // Aplicar dano ao monstro
        // Obter a instância do monstro e chamar takeDamage
      }
    }
  }
  
  // Simular interação de um cliente
  _simulatePlayerInteraction(clientId, data) {
    // Implementar lógica para interações (botões, etc.)
  }
  
  // Simular construção de um cliente
  _simulatePlayerBuild(clientId, data) {
    // Implementar lógica para construção
  }
  
  // Remover jogador remoto
  _removeRemotePlayer(clientId) {
    const remotePlayer = this.remotePlayers[clientId];
    if (!remotePlayer) return;
    
    // Remover mesh
    remotePlayer.mesh.dispose();
    
    // Remover do registro
    delete this.remotePlayers[clientId];
  }
  
  // Mostrar código da sala na UI
  _showRoomCode() {
    if (!this.roomId) return;
    
    // Criar ou atualizar elemento da UI para mostrar o código da sala
    const roomCodeElement = document.getElementById('roomCode') || this._createRoomCodeElement();
    roomCodeElement.innerText = `Código da Sala: ${this.roomId}`;
    roomCodeElement.style.display = 'block';
  }
  
  // Criar elemento para mostrar código da sala
  _createRoomCodeElement() {
    const element = document.createElement('div');
    element.id = 'roomCode';
    element.style.position = 'absolute';
    element.style.top = '10px';
    element.style.left = '10px';
    element.style.backgroundColor = 'rgba(0,0,0,0.7)';
    element.style.color = 'white';
    element.style.padding = '10px';
    element.style.borderRadius = '5px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.zIndex = '1000';
    document.body.appendChild(element);
    return element;
  }
  
  // Cor única baseada no ID do cliente
  _getPlayerColor(clientId) {
    // Gerar cor baseada no ID do cliente
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FFFF33', 
      '#33FFFF', '#FF33FF', '#FF9933', '#9933FF'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }
}

export default MultiplayerManager;