// ==================== 多人游戏模块 ====================

const Multiplayer = {
    ws: null,
    playerId: null,
    roomId: null,
    selectedColor: '0x4fc3f7',
    otherPlayers: {},
    isOnlineMode: false,
    gameStartTime: null,
    playerName: 'Player' + Math.floor(Math.random() * 1000),
    isGameStarted: false,
    isPlayerReady: false,
    roomPlayers: [],
    serverMazes: null,
    lastPositionUpdate: 0,
    currentView: 'room-list',
    selectedRoomId: null,
    serverBaseUrl: 'http://localhost:8081',
    selectedCharacter: 1,
    defaultServerAddress: 'wss://maze-game-server-ut3f.onrender.com', // 生产环境服务器地址

    // 初始化
    init() {
        this.detectServerAddress();
        this.showRenderNotification();
        this.refreshRoomList();
        this.updateAvatarImages();
    },

    // 自动检测服务器地址
    detectServerAddress() {
        const hostname = window.location.hostname;
        const serverInput = document.getElementById('serverInput');
        const configInput = document.getElementById('serverConfigInput');
        const statusInfo = document.getElementById('server-status-info');
        const statusText = document.getElementById('server-status-text');
        
        // 判断是否为本地开发环境
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || hostname === 'file';
        
        if (isLocal) {
            // 本地开发环境
            this.serverBaseUrl = 'http://localhost:8081';
            const wsAddress = 'ws://localhost:8080';
            if (serverInput) serverInput.value = wsAddress;
            if (configInput) configInput.value = wsAddress;
            if (statusInfo) statusInfo.style.display = 'none';
        } else {
            // 生产环境 - 自动使用Render服务器
            // 注意：Render的HTTP API也使用HTTPS
            this.serverBaseUrl = 'https://maze-game-server-ut3f.onrender.com';
            const wsAddress = this.defaultServerAddress;
            if (serverInput) serverInput.value = wsAddress;
            if (configInput) configInput.value = wsAddress;
            
            // 显示服务器状态信息
            if (statusInfo) statusInfo.style.display = 'block';
            if (statusText) {
                statusText.innerHTML = '✅ 已自动连接到服务器: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">' + wsAddress + '</code>';
            }
        }
        
        this.updateAvatarImages();
    },

    // 显示Render免费版提示
    showRenderNotification() {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || hostname === 'file';
        
        // 只在生产环境显示提示
        if (!isLocal) {
            const notification = document.createElement('div');
            notification.id = 'render-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 183, 77, 0.95);
                color: #000;
                padding: 15px 20px;
                border-radius: 10px;
                border: 2px solid #ffb74d;
                max-width: 350px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                font-size: 14px;
                line-height: 1.5;
            `;
            notification.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px; display: flex; align-items: center;">
                    <span style="font-size: 18px; margin-right: 8px;">⏰</span>
                    <span>服务器提示</span>
                    <button onclick="document.getElementById('render-notification').style.display='none'" 
                            style="margin-left: auto; background: transparent; border: none; font-size: 20px; cursor: pointer; color: #000; padding: 0 5px;">×</button>
                </div>
                <div>
                    使用免费版服务器，15分钟无活动会休眠。<br>
                    <strong>首次连接或休眠后需要等待约30秒唤醒服务器</strong>，请耐心等待。
                </div>
            `;
            document.body.appendChild(notification);
            
            // 5秒后自动隐藏（可选）
            setTimeout(() => {
                const notif = document.getElementById('render-notification');
                if (notif) {
                    notif.style.opacity = '0';
                    notif.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        if (notif.parentNode) {
                            notif.parentNode.removeChild(notif);
                        }
                    }, 500);
                }
            }, 10000); // 10秒后自动隐藏
        }
    },

    // 更新头像图片
    updateAvatarImages() {
        const isFileProtocol = window.location.protocol === 'file:';
        const useServerPath = !isFileProtocol || this.isOnlineMode;
        
        for (let i = 1; i <= 5; i++) {
            const img = document.getElementById(`avatar-${i}`);
            if (img) {
                if (useServerPath && this.serverBaseUrl) {
                    // Render服务器：直接使用baseUrl（已经是HTTPS）
                    if (this.serverBaseUrl.includes('onrender.com')) {
                        img.src = `${this.serverBaseUrl}/assets/images/${i}.jpg`;
                    } else {
                        // 本地服务器：根据页面协议选择
                        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
                        const serverHost = this.serverBaseUrl.replace('http://', '').replace('https://', '').replace(':8081', '');
                        img.src = `${protocol}//${serverHost}:8081/assets/images/${i}.jpg`;
                    }
                } else {
                    img.src = `assets/images/${i}.jpg`;
                }
            }
        }
    },

    // 刷新房间列表
    refreshRoomList() {
        const roomListEl = document.getElementById('room-list');
        if (!roomListEl) return;
        
        roomListEl.innerHTML = '<p>正在加载房间列表...</p>';
        
        // 检查是否为生产环境
        const isRenderServer = this.serverBaseUrl.includes('onrender.com');
        
        // 确保使用HTTPS（如果页面是HTTPS）
        let apiUrl = this.serverBaseUrl;
        if (window.location.protocol === 'https:' && apiUrl.startsWith('http://')) {
            apiUrl = apiUrl.replace('http://', 'https://');
        }
        
        fetch(apiUrl + '/rooms')
            .then(response => {
                if (!response.ok) {
                    throw new Error('服务器响应错误');
                }
                return response.json();
            })
            .then(data => {
                this.displayRoomList(data.rooms || []);
            })
            .catch(error => {
                console.error('获取房间列表失败:', error);
                if (isRenderServer) {
                    roomListEl.innerHTML = '<p style="color: #ffb74d;">⚠️ 服务器可能正在唤醒中...<br><small>免费版服务器15分钟无活动会休眠，首次访问需要约30秒唤醒</small><br><button onclick="Multiplayer.refreshRoomList()" style="margin-top: 10px; padding: 8px 15px; background: #4fc3f7; color: #000; border: none; border-radius: 5px; cursor: pointer;">重试</button></p>';
                } else {
                    roomListEl.innerHTML = '<p style="color: #e57373;">无法连接到服务器<br>请确保服务器正在运行</p>';
                }
            });
    },

    // 显示房间列表
    displayRoomList(rooms) {
        const roomListEl = document.getElementById('room-list');
        if (!roomListEl) return;
        
        if (rooms.length === 0) {
            roomListEl.innerHTML = '<p>暂无在线房间，点击"创建新房间"开始游戏</p>';
            return;
        }
        
        roomListEl.innerHTML = '';
        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item' + (room.playerCount >= room.maxPlayers ? ' full' : '') + (room.gameStarted ? ' started' : '');
            
            const playerNames = room.players.map(p => p.name).join(', ') || '暂无玩家';
            
            roomItem.innerHTML = `
                <div class="room-header">
                    <span class="room-name">${room.roomId}</span>
                    <span class="room-status">${room.gameStarted ? '游戏中' : '等待中'} | ${room.playerCount}/${room.maxPlayers}人</span>
                </div>
                <div class="room-players">玩家: ${playerNames}</div>
            `;
            
            if (room.playerCount < room.maxPlayers && !room.gameStarted) {
                roomItem.onclick = () => this.enterRoom(room.roomId);
            }
            
            roomListEl.appendChild(roomItem);
        });
    },

    // 进入房间
    enterRoom(roomId) {
        this.selectedRoomId = roomId;
        this.currentView = 'room-detail';
        
        // 切换到房间详情视图
        const roomListView = document.getElementById('room-list-view');
        const roomSection = document.getElementById('room-section');
        if (roomListView) roomListView.style.display = 'none';
        if (roomSection) {
            roomSection.style.display = 'block';
            const roomNameEl = document.getElementById('current-room-name');
            if (roomNameEl) roomNameEl.textContent = `房间: ${roomId}`;
        }
        
        // 显示角色选择
        const characterSelection = document.getElementById('character-selection');
        if (characterSelection) {
            characterSelection.style.display = 'flex';
            setTimeout(() => {
                if (this.selectedCharacter && CHARACTERS[this.selectedCharacter]) {
                    this.selectCharacter(this.selectedCharacter);
                } else {
                    this.selectCharacter(1);
                }
            }, 100);
        }
        
        // 自动配置服务器地址
        const serverInput = document.getElementById('serverInput');
        const configInput = document.getElementById('serverConfigInput');
        let wsAddress = (serverInput ? serverInput.value.trim() : '') || (configInput ? configInput.value.trim() : '');
        
        // 如果没有配置或配置无效，使用自动检测的地址
        if (!wsAddress || wsAddress === '' || (!wsAddress.startsWith('ws://') && !wsAddress.startsWith('wss://'))) {
            // 重新检测服务器地址（确保使用正确的地址）
            const hostname = window.location.hostname;
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || hostname === 'file';
            
            if (isLocal) {
                wsAddress = 'ws://localhost:8080';
                this.serverBaseUrl = 'http://localhost:8081';
            } else {
                // 生产环境必须使用 wss:// 和 Render 服务器
                wsAddress = this.defaultServerAddress;
                this.serverBaseUrl = 'https://maze-game-server-ut3f.onrender.com';
            }
            if (serverInput) serverInput.value = wsAddress;
            if (configInput) configInput.value = wsAddress;
        }
        
        // 确保HTTPS页面使用wss://
        if (window.location.protocol === 'https:' && wsAddress.startsWith('ws://')) {
            wsAddress = wsAddress.replace('ws://', 'wss://');
            if (serverInput) serverInput.value = wsAddress;
            if (configInput) configInput.value = wsAddress;
        }
        
        // 确保 serverBaseUrl 也正确设置
        if (wsAddress.includes('onrender.com')) {
            this.serverBaseUrl = 'https://maze-game-server-ut3f.onrender.com';
        } else if (wsAddress.includes('localhost')) {
            this.serverBaseUrl = 'http://localhost:8081';
        }
        
        // 直接连接
        this.connectToRoom(roomId, wsAddress);
    },

    // 创建新房间
    createNewRoom() {
        const serverInput = document.getElementById('serverInput');
        const configInput = document.getElementById('serverConfigInput');
        
        let wsAddress = (serverInput ? serverInput.value.trim() : '') || (configInput ? configInput.value.trim() : '');
        
        if (!wsAddress || wsAddress === '' || (!wsAddress.startsWith('ws://') && !wsAddress.startsWith('wss://'))) {
            // 重新检测服务器地址（确保使用正确的地址）
            const hostname = window.location.hostname;
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || hostname === 'file';
            
            if (isLocal) {
                wsAddress = 'ws://localhost:8080';
                this.serverBaseUrl = 'http://localhost:8081';
            } else {
                // 生产环境必须使用 wss:// 和 Render 服务器
                wsAddress = this.defaultServerAddress;
                this.serverBaseUrl = 'https://maze-game-server-ut3f.onrender.com';
            }
            if (serverInput) serverInput.value = wsAddress;
            if (configInput) configInput.value = wsAddress;
        } else {
            if (serverInput) serverInput.value = wsAddress;
            if (configInput) configInput.value = wsAddress;
        }
        
        // 确保HTTPS页面使用wss://
        if (window.location.protocol === 'https:' && wsAddress.startsWith('ws://')) {
            wsAddress = wsAddress.replace('ws://', 'wss://');
            if (serverInput) serverInput.value = wsAddress;
            if (configInput) configInput.value = wsAddress;
        }
        
        // 确保 serverBaseUrl 也正确设置
        if (wsAddress.includes('onrender.com')) {
            this.serverBaseUrl = 'https://maze-game-server-ut3f.onrender.com';
        } else if (wsAddress.includes('localhost')) {
            this.serverBaseUrl = 'http://localhost:8081';
        }
        
        const newRoomId = 'room_' + Math.random().toString(36).substr(2, 9);
        this.enterRoom(newRoomId);
    },

    // 保存服务器配置
    saveServerConfig() {
        const configInput = document.getElementById('serverConfigInput');
        const serverAddress = configInput ? configInput.value.trim() : '';
        
        if (!serverAddress) {
            alert('请输入服务器地址！');
            return;
        }
        
        if (!serverAddress.startsWith('ws://') && !serverAddress.startsWith('wss://')) {
            alert('服务器地址格式错误！应以 ws:// 或 wss:// 开头');
            return;
        }
        
        const serverInput = document.getElementById('serverInput');
        if (serverInput) serverInput.value = serverAddress;
        
        // 更新 serverBaseUrl
        const wsMatch = serverAddress.match(/ws:\/\/([^:]+):(\d+)/);
        if (wsMatch) {
            const host = wsMatch[1];
            const port = wsMatch[2];
            this.serverBaseUrl = `http://${host}:${parseInt(port) + 1}`;
        }
        
        alert('服务器配置已保存！');
    },

    // 选择角色
    selectCharacter(characterId) {
        this.selectedCharacter = characterId;
        const character = CHARACTERS[characterId];
        if (character) {
            this.playerName = character.name;
            this.selectedColor = character.color;
        }
        
        // 移除所有选中状态
        document.querySelectorAll('.character-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // 添加选中状态
        const selectedOption = document.querySelector(`[data-character="${characterId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
    },

    // 连接到房间
    connectToRoom(roomId, serverAddress) {
        const statusEl = document.getElementById('connection-status');
        const joinBtn = document.getElementById('join-btn');
        
        this.roomId = roomId;
        
        // 检查是否为生产环境（Render服务器）
        const isRenderServer = serverAddress && serverAddress.includes('onrender.com');
        
        if (statusEl) {
            if (isRenderServer) {
                statusEl.innerHTML = '<span style="color: #ffb74d;">🔄 正在连接服务器...<br><small style="opacity: 0.8;">（免费版服务器可能需要30秒唤醒，请耐心等待）</small></span>';
            } else {
                statusEl.innerHTML = '<span style="color: #ffb74d;">🔄 正在连接服务器...</span>';
            }
        }
        if (joinBtn) {
            joinBtn.disabled = true;
            joinBtn.textContent = '连接中...';
        }
        
        // Render服务器需要更长的超时时间（35秒）
        const timeoutDuration = isRenderServer ? 35000 : 5000;
        const connectionTimeout = setTimeout(() => {
            if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                this.ws.close();
                if (statusEl) {
                    if (isRenderServer) {
                        statusEl.innerHTML = '<span style="color: #e57373;">❌ 连接超时！<br><small>服务器可能正在唤醒中，请稍后重试</small></span>';
                    } else {
                        statusEl.innerHTML = '<span style="color: #e57373;">❌ 连接超时！请检查服务器是否运行</span>';
                    }
                }
                if (joinBtn) {
                    joinBtn.disabled = false;
                    joinBtn.textContent = '重试连接';
                }
            }
        }, timeoutDuration);
        
        try {
            this.ws = new WebSocket(serverAddress);
            
            this.ws.onopen = () => {
                clearTimeout(connectionTimeout);
                if (statusEl) {
                    statusEl.innerHTML = '<span style="color: #81c784;">✅ 连接成功！请选择角色并加入房间</span>';
                }
                this.isOnlineMode = true;
                this.updateAvatarImages();
                if (joinBtn) {
                    joinBtn.disabled = false;
                    joinBtn.textContent = '加入房间';
                }
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (e) {
                    console.error('解析消息失败:', e);
                }
            };
            
            this.ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('WebSocket连接错误:', error);
                if (statusEl) {
                    statusEl.innerHTML = '<span style="color: #e57373;">❌ 连接失败！请检查服务器地址</span>';
                }
                if (joinBtn) {
                    joinBtn.disabled = false;
                    joinBtn.textContent = '加入房间';
                }
            };
            
            this.ws.onclose = (event) => {
                clearTimeout(connectionTimeout);
                if (event.code !== 1000 && !this.isGameStarted) {
                    if (statusEl) {
                        statusEl.innerHTML = '<span style="color: #e57373;">❌ 连接已断开 (代码: ' + event.code + ')</span>';
                    }
                    if (joinBtn) {
                        joinBtn.disabled = false;
                        joinBtn.textContent = '加入房间';
                    }
                }
            };
        } catch (error) {
            clearTimeout(connectionTimeout);
            console.error('WebSocket创建失败:', error);
            if (statusEl) {
                statusEl.innerHTML = '<span style="color: #e57373;">❌ 无法创建连接: ' + error.message + '</span>';
            }
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.textContent = '加入房间';
            }
        }
    },

    // 加入房间
    joinRoom() {
        const statusEl = document.getElementById('connection-status');
        const joinBtn = document.getElementById('join-btn');
        
        // 验证并确保角色已选择
        if (!this.selectedCharacter || !CHARACTERS[this.selectedCharacter]) {
            this.selectedCharacter = 1;
            this.selectCharacter(1);
        }
        
        // 验证连接
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (statusEl) {
                statusEl.innerHTML = '<span style="color: #e57373;">⚠️ 请先连接到服务器！</span>';
            }
            return;
        }
        
        // 保存玩家信息
        const character = CHARACTERS[this.selectedCharacter];
        this.playerName = character.name;
        this.selectedColor = character.color;
        
        // 同步到 Player 模块
        if (typeof Player !== 'undefined') {
            Player.selectedCharacter = this.selectedCharacter;
            Player.selectedColor = this.selectedColor;
        }
        
        // 发送加入房间消息
        this.sendMessage({
            type: 'join',
            roomId: this.selectedRoomId || this.roomId,
            playerId: this.playerId,
            playerName: this.playerName,
            characterId: this.selectedCharacter,
            color: this.selectedColor
        });
        
        if (statusEl) {
            statusEl.innerHTML = '<span style="color: #ffb74d;">🔄 正在加入房间...</span>';
        }
    },

    // 返回房间列表
    backToRoomList() {
        this.currentView = 'room-list';
        this.selectedRoomId = null;
        
        // 断开连接
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        // 切换到房间列表视图
        const roomListView = document.getElementById('room-list-view');
        const roomSection = document.getElementById('room-section');
        if (roomListView) roomListView.style.display = 'block';
        if (roomSection) roomSection.style.display = 'none';
        
        // 刷新房间列表
        this.refreshRoomList();
    },

    // 发送消息
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    },

    // 发送位置更新
    sendPositionUpdate(position, level) {
        const now = Date.now();
        if (now - this.lastPositionUpdate > 200) {
            this.lastPositionUpdate = now;
            this.sendMessage({
                type: 'playerUpdate',
                roomId: this.roomId,
                playerId: this.playerId,
                position: position,
                level: level
            });
        }
    },

    // 处理 WebSocket 消息
    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'joined':
                this.playerId = data.playerId;
                this.roomPlayers = data.players;
                this.updatePlayersList(data.players);
                break;
            case 'playerJoined':
                this.roomPlayers = data.players;
                this.updatePlayersList(data.players);
                break;
            case 'playerLeft':
                this.removePlayer(data.playerId);
                this.roomPlayers = data.players;
                this.updatePlayersList(data.players);
                break;
            case 'playerReady':
                this.roomPlayers = data.players;
                this.updatePlayersList(data.players);
                break;
            case 'gameStart':
                if (data.mazes) {
                    this.serverMazes = data.mazes;
                }
                this.startMultiplayerGame(data.players, 0);
                break;
            case 'error':
                alert('错误: ' + data.message);
                break;
            case 'playerUpdate':
                this.updateOtherPlayer(data.playerId, data.position, data.level, data.name, data.color, data.characterId);
                break;
            case 'playerLevelUp':
                this.updatePlayerLevel(data.playerId, data.level);
                break;
            case 'playerFinished':
                if (typeof UI !== 'undefined' && UI.updateLeaderboard) {
                    UI.updateLeaderboard(data.leaderboard);
                }
                break;
        }
    },

    // 更新玩家列表
    updatePlayersList(players) {
        const listEl = document.getElementById('players-list');
        if (!listEl) return;
        
        listEl.innerHTML = '';
        
        if (players.length === 0) {
            listEl.innerHTML = '<p>等待其他玩家加入...</p>';
            return;
        }
        
        players.forEach(p => {
            const item = document.createElement('div');
            item.className = 'player-item' + (p.ready ? ' ready' : '');
            item.style.borderLeftColor = p.color;
            item.style.borderLeftWidth = '4px';
            item.style.borderLeftStyle = 'solid';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${p.name} (${PLAYER_COLORS[p.color]?.name || '未知'})`;
            if (p.playerId === this.playerId) {
                nameSpan.textContent += ' [你]';
                nameSpan.style.fontWeight = 'bold';
            }
            
            const statusSpan = document.createElement('span');
            statusSpan.className = p.ready ? 'ready-status' : 'not-ready-status';
            statusSpan.textContent = p.ready ? '✓ 已准备' : '○ 未准备';
            
            item.appendChild(nameSpan);
            item.appendChild(statusSpan);
            listEl.appendChild(item);
        });
        
        // 更新游戏状态按钮
        const statusEl = document.getElementById('game-status');
        if (!statusEl) return;
        
        statusEl.innerHTML = '';
        
        if (players.length < 2) {
            statusEl.innerHTML = `<p style="color: #ffb74d;">等待更多玩家加入... (${players.length}/2)</p>`;
        } else {
            const allReady = players.every(p => p.ready);
            const readyCount = players.filter(p => p.ready).length;
            
            if (!this.isPlayerReady) {
                statusEl.innerHTML = `<button onclick="Multiplayer.setReady()" style="padding: 15px 30px; font-size: 18px; background: #81c784; color: #000; border: none; border-radius: 5px; cursor: pointer; margin: 10px;">准备 (${readyCount}/${players.length})</button>`;
            } else if (!allReady) {
                statusEl.innerHTML = `<p style="color: #ffb74d;">等待其他玩家准备... (${readyCount}/${players.length})</p>`;
            } else {
                statusEl.innerHTML = `<p style="color: #81c784; font-size: 18px; font-weight: bold;">所有人已准备！游戏即将开始...</p>`;
            }
        }
    },

    // 设置准备状态
    setReady() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isPlayerReady) {
            this.isPlayerReady = true;
            this.sendMessage({ 
                type: 'playerReady', 
                roomId: this.roomId,
                playerId: this.playerId
            });
        }
    },

    // 开始多人游戏
    startMultiplayerGame(players, startLevel = 0) {
        this.isGameStarted = true;
        this.isPlayerReady = false;
        const lobby = document.getElementById('lobby');
        const leaderboard = document.getElementById('leaderboard');
        if (lobby) lobby.classList.add('hidden');
        if (leaderboard) leaderboard.style.display = 'block';
        
        Game.gameStartTime = Date.now();
        this.gameStartTime = Date.now();
        
        // 确保从同一关卡开始
        Game.currentLevel = startLevel || 0;
        Game.init();
        
        // 创建其他玩家
        players.forEach(p => {
            if (p.playerId !== this.playerId) {
                this.createOtherPlayer(p.playerId, p.name, p.color, p.characterId);
            }
        });
    },

    // 创建其他玩家
    createOtherPlayer(playerId, name, color, characterId = null) {
        if (typeof Player === 'undefined' || !Player.createHumanoid) return;
        
        const humanoid = Player.createHumanoid(0xffdbac, 0.8, characterId);
        const colorData = PLAYER_COLORS[color];
        if (colorData) {
            const body = humanoid.children.find(child => child.geometry && child.geometry.type === 'CylinderGeometry');
            if (body) {
                body.material.color.setHex(colorData.body);
            }
        }
        
        // 添加名字标签
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.85)';
        context.fillRect(0, 0, 512, 128);
        
        context.strokeStyle = '#4fc3f7';
        context.lineWidth = 3;
        context.strokeRect(2, 2, 508, 124);
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.strokeStyle = '#000000';
        context.lineWidth = 4;
        context.strokeText(name, 256, 64);
        context.fillText(name, 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.y = 1.8;
        sprite.scale.set(2.5, 0.6, 1);
        humanoid.add(sprite);
        
        humanoid.position.set(0, 0, 0);
        humanoid.userData = { playerId, name, level: 0 };
        Game.scene.add(humanoid);
        
        this.otherPlayers[playerId] = {
            humanoid: humanoid,
            pos: { x: 0, z: 0 },
            level: 0,
            name: name
        };
    },

    // 更新其他玩家
    updateOtherPlayer(playerId, position, level, name, color, characterId = null) {
        if (!this.otherPlayers[playerId]) {
            this.createOtherPlayer(playerId, name, color, characterId);
        }
        
        const otherPlayer = this.otherPlayers[playerId];
        if (otherPlayer) {
            // 只显示同一关卡的玩家
            if (level === Game.currentLevel) {
                const levelConfig = LIFE_LEVELS[Game.currentLevel];
                const mazeSize = levelConfig.mazeSize;
                const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
                const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;
                
                const targetX = position.x * CONFIG.cellSize + offsetX;
                const targetZ = position.z * CONFIG.cellSize + offsetZ;
                
                const lerpFactor = 0.5;
                otherPlayer.humanoid.position.x += (targetX - otherPlayer.humanoid.position.x) * lerpFactor;
                otherPlayer.humanoid.position.z += (targetZ - otherPlayer.humanoid.position.z) * lerpFactor;
                otherPlayer.humanoid.position.y = 0;
                otherPlayer.humanoid.visible = true;
                
                otherPlayer.humanoid.traverse((child) => {
                    if (child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                    }
                });
            } else {
                otherPlayer.humanoid.visible = false;
            }
            
            otherPlayer.pos = position;
            otherPlayer.level = level;
        }
    },

    // 移除玩家
    removePlayer(playerId) {
        if (this.otherPlayers[playerId]) {
            Game.scene.remove(this.otherPlayers[playerId].humanoid);
            delete this.otherPlayers[playerId];
        }
    },

    // 更新玩家关卡
    updatePlayerLevel(playerId, level) {
        if (this.otherPlayers[playerId]) {
            this.otherPlayers[playerId].level = level;
        }
        if (typeof UI !== 'undefined' && UI.updateLeaderboard) {
            UI.updateLeaderboard();
        }
    },

    // 更新其他玩家头像
    updateOtherPlayerAvatars(camera) {
        Object.values(this.otherPlayers).forEach(otherPlayer => {
            if (otherPlayer.humanoid) {
                otherPlayer.humanoid.traverse((child) => {
                    if (child.userData && child.userData.isAvatar) {
                        child.lookAt(camera.position);
                    }
                });
            }
        });
    }
};
