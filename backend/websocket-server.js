// 简单的WebSocket服务器用于LIFE多人竞速游戏
// 需要安装: npm install ws
// 运行: node websocket-server.js

const WebSocket = require('ws');
const { generateAllMazes } = require('./maze-generator');

// 关卡配置（与客户端保持一致）
const LIFE_LEVELS = [
    { mazeSize: 20 },
    { mazeSize: 28 },
    { mazeSize: 36 },
    { mazeSize: 44 },
    { mazeSize: 40 },
    { mazeSize: 48 },
    { mazeSize: 32 },
    { mazeSize: 28 },
    { mazeSize: 24 },
    { mazeSize: 12 }
];

// 支持云服务环境变量端口
const PORT = process.env.PORT || 8080;

const fs = require('fs');
const path = require('path');

const rooms = {}; // {roomId: {players: [{playerId, name, color, level, time}], gameStarted: false}}
const http = require('http');

// HTTP服务器用于获取房间列表和提供静态文件（头像图片）
// 同时处理 WebSocket 升级请求
const httpServer = http.createServer((req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'GET' && req.url === '/rooms') {
        res.setHeader('Content-Type', 'application/json');
        
        const roomList = Object.keys(rooms).map(roomId => ({
            roomId: roomId,
            playerCount: rooms[roomId].players.length,
            maxPlayers: 5,
            gameStarted: rooms[roomId].gameStarted,
            players: rooms[roomId].players.map(p => ({
                name: p.name,
                color: p.color
            }))
        }));
        
        res.end(JSON.stringify({ rooms: roomList }));
    } else if (req.method === 'GET' && req.url.match(/^\/assets\/images\/(1|2|3|4|5)\.jpg$/)) {
        // 提供头像图片文件（从前端目录）
        const fileName = path.basename(req.url); // 例如 "1.jpg"
        const filePath = path.join(__dirname, '..', 'frontend', 'assets', 'images', fileName);
        
        // 检查文件是否存在
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                res.statusCode = 404;
                res.end('File not found');
                return;
            }
            
            // 读取文件并发送
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.statusCode = 500;
                    res.end('Error reading file');
                    return;
                }
                
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
                res.end(data);
            });
        });
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
});

// WebSocket 服务器附加到 HTTP 服务器上，使用同一个端口
const wss = new WebSocket.Server({ server: httpServer });

// 启动 HTTP 服务器（同时处理 WebSocket 升级）
httpServer.listen(PORT, () => {
    console.log(`HTTP服务器运行在 http://localhost:${PORT} (用于房间列表查询)`);
    console.log(`WebSocket服务器运行在 ws://0.0.0.0:${PORT}`);
    console.log('监听所有网络接口，可以通过以下地址连接:');
    console.log(`  - ws://localhost:${PORT} (本机)`);
    console.log(`  - ws://127.0.0.1:${PORT} (本机)`);
    console.log('等待玩家连接...');
});

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`新客户端连接: ${clientIp}`);
    
    let playerId = null;
    let roomId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'join':
                    playerId = data.playerId || 'player_' + Math.random().toString(36).substr(2, 9);
                    roomId = data.roomId;
                    console.log(`玩家 ${data.playerName || playerId} 尝试加入房间 ${roomId}`);
                    
                    if (!rooms[roomId]) {
                        // 为房间生成唯一种子
                        const roomSeed = Math.floor(Math.random() * 1000000);
                        // 生成所有关卡的地图
                        const mazes = generateAllMazes(LIFE_LEVELS, roomSeed);
                        
                        rooms[roomId] = {
                            players: [],
                            gameStarted: false,
                            mazes: mazes,  // 所有关卡的地图数据
                            roomSeed: roomSeed
                        };
                    }
                    
                    // 检查房间是否已满（最多5人）
                    if (rooms[roomId].players.length >= 5) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: '房间已满（最多5人）'
                        }));
                        return;
                    }
                    
                    // 检查颜色是否已被占用
                    const colorTaken = rooms[roomId].players.some(p => p.color === data.color);
                    if (colorTaken) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: '该颜色已被选择'
                        }));
                        return;
                    }
                    
                    // 添加玩家
                    const player = {
                        playerId: playerId,
                        name: data.playerName || 'Player',
                        characterId: data.characterId || 1,
                        color: data.color,
                        level: 0,
                        time: 0,
                        ready: false,
                        ws: ws
                    };
                    
                    rooms[roomId].players.push(player);
                    
                    // 通知所有玩家
                    broadcastToRoom(roomId, {
                        type: 'joined',
                        playerId: playerId,
                        players: rooms[roomId].players.map(p => ({
                            playerId: p.playerId,
                            name: p.name,
                            characterId: p.characterId,
                            color: p.color,
                            ready: p.ready
                        }))
                    });
                    
                    break;
                    
                case 'playerReady':
                    if (rooms[roomId]) {
                        const player = rooms[roomId].players.find(p => p.playerId === playerId);
                        if (player) {
                            player.ready = true;
                            // 通知所有玩家更新准备状态
                            broadcastToRoom(roomId, {
                                type: 'playerReady',
                                playerId: playerId,
                                players: rooms[roomId].players.map(p => ({
                                    playerId: p.playerId,
                                    name: p.name,
                                    characterId: p.characterId,
                                    color: p.color,
                                    ready: p.ready
                                }))
                            });
                            
                            // 检查是否所有人都准备好了
                            const allReady = rooms[roomId].players.length >= 2 && 
                                           rooms[roomId].players.every(p => p.ready);
                            if (allReady) {
                                // 自动开始游戏
                                setTimeout(() => {
                                    if (rooms[roomId] && !rooms[roomId].gameStarted) {
                                        rooms[roomId].gameStarted = true;
                                        // 发送所有地图数据给所有玩家
                                        broadcastToRoom(roomId, {
                                            type: 'gameStart',
                                            players: rooms[roomId].players.map(p => ({
                                                playerId: p.playerId,
                                                name: p.name,
                                                characterId: p.characterId,
                                                color: p.color
                                            })),
                                            mazes: rooms[roomId].mazes,  // 所有关卡的地图
                                            roomSeed: rooms[roomId].roomSeed
                                        });
                                    }
                                }, 500);
                            }
                        }
                    }
                    break;
                    
                case 'startGame':
                    if (rooms[roomId] && rooms[roomId].players.length >= 2) {
                        // 检查是否所有人都准备好了
                        const allReady = rooms[roomId].players.every(p => p.ready);
                        if (allReady && !rooms[roomId].gameStarted) {
                            rooms[roomId].gameStarted = true;
                            broadcastToRoom(roomId, {
                                type: 'gameStart',
                                players: rooms[roomId].players.map(p => ({
                                    playerId: p.playerId,
                                    name: p.name,
                                    characterId: p.characterId,
                                    color: p.color
                                })),
                                mazes: rooms[roomId].mazes,  // 所有关卡的地图
                                roomSeed: rooms[roomId].roomSeed
                            });
                        }
                    }
                    break;
                    
                case 'playerUpdate':
                    if (rooms[roomId]) {
                        const player = rooms[roomId].players.find(p => p.playerId === playerId);
                        if (player) {
                            // 实时广播位置给所有其他玩家（包括不同关卡的玩家）
                            broadcastToRoom(roomId, {
                                type: 'playerUpdate',
                                playerId: playerId,
                                position: data.position,
                                level: data.level,
                                name: player.name,
                                characterId: player.characterId,
                                color: player.color
                            }, playerId);
                        }
                    }
                    break;
                    
                case 'playerLevelUp':
                    if (rooms[roomId]) {
                        const player = rooms[roomId].players.find(p => p.playerId === playerId);
                        if (player) {
                            player.level = data.level;
                            // 只通知其他玩家这个玩家的关卡更新（不强制同步）
                            broadcastToRoom(roomId, {
                                type: 'playerLevelUp',
                                playerId: playerId,
                                level: data.level
                            });
                        }
                    }
                    break;
                    
                case 'playerFinished':
                    if (rooms[roomId]) {
                        const player = rooms[roomId].players.find(p => p.playerId === playerId);
                        if (player) {
                            player.time = data.time;
                            
                            // 计算排行榜
                            const leaderboard = rooms[roomId].players
                                .map(p => ({
                                    playerId: p.playerId,
                                    name: p.name,
                                    level: p.level,
                                    time: p.time
                                }))
                                .sort((a, b) => {
                                    if (b.level !== a.level) return b.level - a.level;
                                    return a.time - b.time;
                                });
                            
                            broadcastToRoom(roomId, {
                                type: 'playerFinished',
                                leaderboard: leaderboard
                            });
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`客户端断开连接: ${clientIp}, 玩家ID: ${playerId}`);
        if (roomId && rooms[roomId]) {
            // 移除玩家
            rooms[roomId].players = rooms[roomId].players.filter(p => p.playerId !== playerId);
            
            // 通知其他玩家
            broadcastToRoom(roomId, {
                type: 'playerLeft',
                playerId: playerId,
                players: rooms[roomId].players.map(p => ({
                    playerId: p.playerId,
                    name: p.name,
                    characterId: p.characterId,
                    color: p.color,
                    ready: p.ready
                }))
            });
            
            // 如果房间为空，删除房间
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

function broadcastToRoom(roomId, message, excludePlayerId = null) {
    if (rooms[roomId]) {
        rooms[roomId].players.forEach(player => {
            if (player.playerId !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        });
    }
}

// 日志已在 httpServer.listen 中输出
