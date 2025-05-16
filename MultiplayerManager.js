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
        if (this.gameStateInterval) {
          clearInterval(this.gameStateInterval);
          this.gameStateInterval = null;
        }
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
  
  // Iniciar atualização periódica de posição e estado do jogo
  startUpdates() {
    // Enviar posição a cada 50ms (20 vezes por segundo)
    this.updateInterval = setInterval(() => {
      this._sendPosition();
    }, 50);
    
    // Se for o host, enviar estado do jogo a cada 500ms
    if (this.isHost) {
      this.gameStateInterval = setInterval(() => {
        this.sendGameStateUpdates();
      }, 500);
    }
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
  
    // Adicionar um novo método para inicialização
    initializeGameState() {
      if (!this.isHost || !this.connected) return;
      
      // Garantir que o sistema de hordas esteja ativo para o host
      const zombieSpawner = this.game.zombieSpawner;
      if (zombieSpawner) {
        // Ativar o sistema de hordas se ainda não estiver ativo
        if (!zombieSpawner.model.hordeActive) {
          zombieSpawner.startHordeSystem();
        }
        
        // Enviar estado inicial completo do jogo para os clientes
        this.sendGameStateUpdates();
        
        // Se o sistema de hordas estiver ativo, garantir que seja sincronizado
        if (zombieSpawner.model.hordeActive) {
          const hordeState = {
            hordeNumber: zombieSpawner.model.currentHorde
          };
          
          this.socket.send(JSON.stringify({
            type: 'playerAction',
            clientId: this.clientId,
            action: zombieSpawner.waitingForKeyPress ? 'activateHordeSystem' : 'startHorde',
            data: hordeState
          }));
        }
      }
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
        // Se for o host, enviar estado inicial completo após um curto delay
        if (this.isHost) {
          setTimeout(() => this.initializeGameState(), 500);
        }
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
  
_applyGameState(gameState) {
  console.log("Sincronizando estado do jogo do host", gameState);
  
  // Sincronizar monstros
  if (gameState.monsters && !this.isHost) {
    // Se é primeira sincronização, limpar monstros existentes
    if (!this._initialMonsterSync) {
      // Remover todos os monstros locais antes da primeira sincronização
      this.game.monsters.forEach(monster => {
        const controller = monster.getController();
        if (controller) controller.die();
      });
      this.game.monsters = [];
      this._initialMonsterSync = true;
    }
    gameState.monsters.forEach(monsterData => {
      // Verificar se o monstro já existe (por ID)
      const existingMonster = this.game.monsters.find(m => m.getController()?.model?.id === monsterData.id);
      
      if (existingMonster) {
        // Atualizar posição e estado do monstro existente
        const controller = existingMonster.getController();
        if (controller && controller.model) {
          // Atualizar posição
          if (monsterData.position) {
            controller.model.setPosition(new BABYLON.Vector3(
              monsterData.position.x,
              monsterData.position.y,
              monsterData.position.z
            ));
          }
          
          // Atualizar saúde
          if (monsterData.health !== undefined) {
            // Manter registro de dano local apenas se a diferença for pequena
            // Isso evita sobrescrever totalmente, mas permite correções de sincronização maiores
            const localHealth = controller.model.health;
            const serverHealth = monsterData.health;
                    
            // Se o dano local é maior que o do servidor (monstro tem menos vida localmente)
            // e a diferença é pequena (menos de 30% da saúde total), manter o dano local
            if (localHealth < serverHealth && (serverHealth - localHealth) < 50) {
              console.log(`Mantendo dano local para monstro ${monsterData.id}: ${localHealth} vs ${serverHealth}`);
              // Não atualiza a saúde, mantém o dano local
            } else {
              // Em outros casos, usa a saúde do servidor
              controller.model.health = monsterData.health;
              controller.updateHealthText();
            }
          }
          
          // Se o monstro morreu no host, mata também no cliente
          if (monsterData.isDead && !controller.isDisposed) {
            controller.die();
          }
        }
      } else {
        // Criar novo monstro se não existe
        if (!monsterData.isDead) {
          const position = new BABYLON.Vector3(
            monsterData.position.x,
            monsterData.position.y,
            monsterData.position.z
          );
          
          // Adicionar o monstro com o mesmo ID, saúde e velocidade
          this.game.addMonster(position, monsterData.health, monsterData.speed)
            .then(monster => {
              if (monster && monster.getController() && monster.getController().model) {
                monster.getController().model.id = monsterData.id;
              }
            });
        }
      }
    });
    
    // Remover monstros que existem no cliente mas não no estado do host
    this.game.monsters = this.game.monsters.filter(monster => {
      const controllerId = monster.getController()?.model?.id;
      if (!controllerId) return true; // Mantém monstros sem ID
      
      const existsInGameState = gameState.monsters.some(m => m.id === controllerId);
      
      if (!existsInGameState) {
        // Remover o monstro que não existe mais no host
        monster.getController()?.die();
        return false;
      }
      return true;
    });
  }
  
  // Sincronizar sistema de hordas
  if (gameState.hordeSystem && !this.isHost && this.game.zombieSpawner) {
      const zombieSpawner = this.game.zombieSpawner;
      const hordeSystem = gameState.hordeSystem;
      
      // Garantir que zombieSpawner.model existe
      if (!zombieSpawner.model) {
        console.warn("Criando modelo do sistema de hordas que estava ausente");
        if (typeof ZombieSModel !== 'undefined') {
          zombieSpawner.model = new ZombieSModel();
        } else {
          zombieSpawner.model = {
            hordeActive: false,
            currentHorde: 0,
            timeToNextHorde: 0,
            currentMonsterCount: 0
          };
        }
      }
      
      // Atualizar modelo do sistema de hordas com verificações de segurança
      if (zombieSpawner.model) {
        zombieSpawner.model.hordeActive = hordeSystem.active !== undefined ? hordeSystem.active : false;
        zombieSpawner.model.currentHorde = hordeSystem.currentHorde !== undefined ? hordeSystem.currentHorde : 0;
        zombieSpawner.model.timeToNextHorde = hordeSystem.nextHordeTime !== undefined ? hordeSystem.nextHordeTime : 0;
        zombieSpawner.model.currentMonsterCount = hordeSystem.monsterCount !== undefined ? hordeSystem.monsterCount : 0;
      }
      
      // Atualizar estado de espera por tecla
      zombieSpawner.waitingForKeyPress = hordeSystem.waitingForKeyPress !== undefined ? hordeSystem.waitingForKeyPress : false;
      
      // Atualizar interface visual
      if (zombieSpawner.view) {
        // Resto do código para atualizar a interface visual
        // ...
      }
    }

  // Sincronização de outros elementos do jogo
  if (gameState.buttons && this.game.buttonsManager) {
    // Implementar sincronização de botões quando necessário
  }
}
  
    // Novo método para o host enviar estado dos monstros periodicamente
    sendGameStateUpdates() {
      if (!this.isHost || !this.connected) return;
      
      try {
        // Preparar dados serializados dos monstros
        const monsters = this.game.monsters.map(monster => {
          try {
            const controller = monster.getController();
            if (!controller || !controller.model) return null;
            
            const position = controller.model.getPosition();
            return {
              id: controller.model.id,
              position: {
                x: position.x,
                y: position.y,
                z: position.z
              },
              health: controller.model.health,
              speed: controller.model.speed,
              isDead: controller.isDisposed
            };
          } catch (err) {
            console.warn("Erro ao processar monstro:", err);
            return null;
          }
        }).filter(m => m !== null);
        
        // Adicionar dados do sistema de hordas com verificações de segurança
        const hordeSystem = {};
      
        if (this.game.zombieSpawner) {
          const zombieSpawner = this.game.zombieSpawner;
          
          if (zombieSpawner.model) {
            const model = zombieSpawner.model;
            hordeSystem.active = model.hordeActive || false;
            hordeSystem.currentHorde = model.currentHorde || 0;
            hordeSystem.nextHordeTime = model.timeToNextHorde || 0;
            hordeSystem.monsterCount = model.currentMonsterCount || 0;
            
            // Métodos seguros - verificar se existem antes de chamar
            hordeSystem.monsterHealth = typeof model.calculateMonsterHealth === 'function' ? 
              model.calculateMonsterHealth() : 100;
            hordeSystem.monsterSpeed = typeof model.calculateMonsterSpeed === 'function' ? 
              model.calculateMonsterSpeed() : 0.08;
          } else {
            console.warn("zombieSpawner.model não está definido");
            // Valores padrão se o modelo não existir
            hordeSystem.active = false;
            hordeSystem.currentHorde = 0;
            hordeSystem.nextHordeTime = 0;
            hordeSystem.monsterCount = 0;
            hordeSystem.monsterHealth = 100;
            hordeSystem.monsterSpeed = 0.08;
          }
          
          // Definir waitingForKeyPress com verificação de segurança
          hordeSystem.waitingForKeyPress = zombieSpawner.waitingForKeyPress || false;
        }
    
        // Enviar para os clientes
        this.updateGameState({ monsters, hordeSystem });
      } catch (err) {
        console.error("Erro na sincronização do estado do jogo:", err);
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

_simulatePlayerShoot(clientId, data) {
  console.log(`Simulando tiro do jogador ${clientId}`);
  
  // Verificar se o cliente já processou o dano e enviou o ID do monstro
  if (data.targetMonsterId) {
    // Cliente já identificou qual monstro foi atingido
    const targetMonster = this.game.monsters.find(m => 
      m.getController()?.model?.id === data.targetMonsterId
    );
    
    if (targetMonster) {
      const controller = targetMonster.getController();
      if (controller && !controller.isDisposed) {
        // Se o cliente já aplicou dano (o controlador tem saúde específica),
        // aplicar uma adaptação para evitar dessincronização
        
        // Verificar se a saúde atual é maior que a nova saúde reportada pelo cliente
        // Isso indicaria que o monstro "regenerou" pela sobrescrita de estado
        if (controller.model.health > data.newHealth) {
          console.log(`Corrigindo saúde do monstro ${data.targetMonsterId} de ${controller.model.health} para ${data.newHealth}`);
          controller.model.health = data.newHealth;
          controller.updateHealthText();
        } else {
          // Caso contrário, aplica o dano normalmente
          controller.takeDamage(data.gunDamage);
        }
        
        return; // Processamento completo, não precisa simular o raio
      }
    }
  }
  
  // Se não tiver informações específicas do monstro ou não encontrar o monstro,
  // proceder com a simulação do tiro usando o raio (comportamento original)
  const remotePlayer = this.remotePlayers[clientId];
  if (!remotePlayer) return;
  
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
    return mesh.name && (mesh.name.includes("monster") || mesh.metadata?.isMonsterPart);
  });
  
  if (hit && hit.pickedMesh) {
    console.log(`Jogador ${clientId} acertou ${hit.pickedMesh.name}`);
    
    // Encontrar o monstro baseado no mesh atingido
    const monster = this._findMonsterFromMesh(hit.pickedMesh);
    
    if (monster) {
      const monsterController = monster.getController();
      if (monsterController && !monsterController.isDisposed) {
        // Aplicar dano ao monstro
        monsterController.takeDamage(data.gunDamage);
      }
    }
  }
}

_findMonsterFromMesh(hitMesh) {
  // Buscar na lista global de monstros
  for (const monster of this.game.monsters) {
    const rootMesh = monster.getMesh();
    if (!rootMesh) continue;
    
    // Verificar se o mesh atingido é o próprio monstro ou um de seus filhos
    if (hitMesh === rootMesh || hitMesh.isDescendantOf(rootMesh)) {
      return monster;
    }
  }
  
  return null;
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
    element.style.top = '40px';
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