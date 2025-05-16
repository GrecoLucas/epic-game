    const WebSocket = require('ws');
    const http = require('http');
    const express = require('express');
    const path = require('path');
    
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });
    
    // Servir arquivos estáticos
    app.use(express.static('./'));
    
    // Armazenar informações das salas
    const rooms = {};
    
    wss.on('connection', (ws) => {
      let clientId = null;
      let roomId = null;
    
      // Processar mensagens do cliente
      ws.on('message', (message) => {
        const data = JSON.parse(message);
    
        switch (data.type) {
          case 'createRoom':
            roomId = Math.random().toString(36).substring(2, 8).toUpperCase(); // Código da sala
            clientId = data.clientId;
            rooms[roomId] = {
              host: {
                id: clientId,
                ws: ws
              },
              clients: {},
              gameState: {
                monsters: [],
                buttons: [],
                doors: []
              }
            };
            ws.send(JSON.stringify({
              type: 'roomCreated',
              roomId: roomId,
              clientId: clientId
            }));
            console.log(`Sala criada: ${roomId}, Host: ${clientId}`);
            break;
    
          case 'joinRoom':
            roomId = data.roomId;
            clientId = data.clientId;
            
            if (rooms[roomId]) {
              // Adicionar cliente à sala
              rooms[roomId].clients[clientId] = {
                ws: ws,
                id: clientId,
                position: data.position || { x: 0, y: 1, z: 0 },
                rotation: data.rotation || { x: 0, y: 0, z: 0 }
              };
              
              // Informar o host sobre o novo jogador
              rooms[roomId].host.ws.send(JSON.stringify({
                type: 'playerJoined',
                clientId: clientId,
                position: data.position,
                rotation: data.rotation
              }));
              
              // Enviar o estado atual do jogo para o cliente que acabou de entrar
              ws.send(JSON.stringify({
                type: 'roomJoined',
                roomId: roomId,
                gameState: rooms[roomId].gameState
              }));
              
              console.log(`Cliente ${clientId} entrou na sala ${roomId}`);
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Sala não encontrada'
              }));
            }
            break;
    
          case 'updatePosition':
            if (roomId && rooms[roomId]) {
              // Se for o host atualizando
              if (clientId === rooms[roomId].host.id) {
                // Propagar posição do host para todos os clientes
                Object.values(rooms[roomId].clients).forEach(client => {
                  client.ws.send(JSON.stringify({
                    type: 'hostPosition',
                    position: data.position,
                    rotation: data.rotation
                  }));
                });
              } 
              // Se for um cliente atualizando
              else if (rooms[roomId].clients[clientId]) {
                // Atualizar posição do cliente
                rooms[roomId].clients[clientId].position = data.position;
                rooms[roomId].clients[clientId].rotation = data.rotation;
                
                // Informar o host sobre a nova posição
                rooms[roomId].host.ws.send(JSON.stringify({
                  type: 'playerPosition',
                  clientId: clientId,
                  position: data.position,
                  rotation: data.rotation
                }));
                
                // Propagar para outros clientes
                Object.values(rooms[roomId].clients).forEach(client => {
                  if (client.id !== clientId) {
                    client.ws.send(JSON.stringify({
                      type: 'playerPosition',
                      clientId: clientId,
                      position: data.position,
                      rotation: data.rotation
                    }));
                  }
                });
              }
            }
            break;
            
          case 'updateGameState':
            // Apenas o host pode atualizar o estado do jogo
            if (roomId && rooms[roomId] && clientId === rooms[roomId].host.id) {
              rooms[roomId].gameState = data.gameState;
              
              // Propagar estado do jogo para todos os clientes
              Object.values(rooms[roomId].clients).forEach(client => {
                client.ws.send(JSON.stringify({
                  type: 'gameState',
                  gameState: data.gameState
                }));
              });
            }
            break;
            
          case 'playerAction':
            // Um cliente executou uma ação (atirou, construiu, etc.)
            if (roomId && rooms[roomId]) {
              // Informar o host sobre a ação
              if (rooms[roomId].host) {
                rooms[roomId].host.ws.send(JSON.stringify({
                  type: 'playerAction',
                  clientId: clientId,
                  action: data.action,
                  data: data.data
                }));
              }
            }
            break;
        }
      });
    
      // Lidar com desconexão
      ws.on('close', () => {
        if (roomId && rooms[roomId]) {
          // Se o host desconectar, fechar a sala
          if (clientId === rooms[roomId].host.id) {
            Object.values(rooms[roomId].clients).forEach(client => {
              client.ws.send(JSON.stringify({
                type: 'hostLeft',
                message: 'O host saiu da sala'
              }));
            });
            delete rooms[roomId];
            console.log(`Sala ${roomId} fechada: host desconectado`);
          } 
          // Se um cliente desconectar
          else if (rooms[roomId].clients[clientId]) {
            // Informar o host
            rooms[roomId].host.ws.send(JSON.stringify({
              type: 'playerLeft',
              clientId: clientId
            }));
            
            // Remover cliente
            delete rooms[roomId].clients[clientId];
            console.log(`Cliente ${clientId} saiu da sala ${roomId}`);
            
            // Informar outros clientes
            Object.values(rooms[roomId].clients).forEach(client => {
              client.ws.send(JSON.stringify({
                type: 'playerLeft',
                clientId: clientId
              }));
            });
          }
        }
      });
    });
    
    // Iniciar servidor
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });