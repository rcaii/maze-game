// ==================== 多人游戏模块 ====================
// 版本标识：v2.4 - 2026-02-01

const Multiplayer = {
    // WebSocket 连接
    ws: null,
    playerId: null,
    roomId: null,
    
    // 玩家信息
    selectedColor: '0x4fc3f7',
    selectedCharacter: 1,
    playerName: 'Player' + Math.floor(Math.random() * 1000),
    
    // 游戏状态
    isOnlineMode: false,
    isGameStarted: false,
    isPlayerReady: false,
    gameStartTime: null,
    
    // 房间信息
    roomPlayers: [],
    currentView: 'room-list',
    selectedRoomId: null,
    
    // 其他玩家
    otherPlayers: {},
    
    // 服务器配置
    serverBaseUrl: 'https://localhost:8081',
    serverMazes: null,
    
    // 位置更新节流
    lastPositionUpdate: 0,
    
    // 版本信息
    VERSION: 'v2.4-20260201',
    
    // ==================== 服务器配置 ====================
    
    // 生产环境服务器配置
    RENDER_SERVER: {
        baseUrl: 'https://maze-game-server-ut3f.onrender.com',
        wsUrl: 'wss://maze-game-server-ut3f.onrender.com'
    },
    
    // 本地开发服务器配置
    LOCAL_SERVER: {
        baseUrl: 'https://localhost:8081',
        wsUrl: 'ws://localhost:8080'
    },
    
    // 连接超时配置（毫秒）
    CONNECTION_TIMEOUT: {
        RENDER: 35000,
        LOCAL: 5000
    },
    
    // 位置更新节流间隔（毫秒）
    POSITION_UPDATE_INTERVAL: 200,
    
    // 判断是否为本地环境
    isLocalEnvironment() {
        // 强制使用 Render 服务器（所有环境）
        return false;
    },

    // 获取服务器配置
    getServerConfig() {
        if (this.isLocalEnvironment()) {
            return {
                serverBaseUrl: this.LOCAL_SERVER.baseUrl,
                wsAddress: this.LOCAL_SERVER.wsUrl,
                isRenderServer: false
            };
        }
        return {
            serverBaseUrl: this.RENDER_SERVER.baseUrl,
            wsAddress: this.RENDER_SERVER.wsUrl,
            isRenderServer: true
        };
    },

    // 清理 URL，移除端口号（生产环境）
    cleanUrl(url) {
        if (!url) return url;
        if (!this.isLocalEnvironment()) {
            // 移除 HTTP/HTTPS 端口号
            url = url.replace(/(https?:\/\/[^\/:]+):\d+(\/|$)/g, '$1$2');
            // 移除 WebSocket 端口号
            url = url.replace(/(wss?:\/\/[^\/:]+):\d+(\/|$)/g, '$1$2');
        }
        return url;
    },

    // 获取 API URL
    getApiUrl() {
        if (this.isLocalEnvironment()) {
            return this.LOCAL_SERVER.baseUrl;
        }
        let url = this.RENDER_SERVER.baseUrl;
        if (!url.startsWith('https://')) {
            url = url.replace(/^http:\/\//, 'https://');
        }
        return this.cleanUrl(url);
    },

    // 获取 WebSocket URL
    getWebSocketUrl() {
        if (this.isLocalEnvironment()) {
            return this.LOCAL_SERVER.wsUrl;
        }
        return this.cleanUrl(this.RENDER_SERVER.wsUrl);
    },

    // 验证和修复 WebSocket 地址
    validateAndFixWebSocketAddress(address) {
        if (!this.isLocalEnvironment()) {
            return this.cleanUrl(this.RENDER_SERVER.wsUrl);
        }
        
        if (!address || (!address.startsWith('ws://') && !address.startsWith('wss://'))) {
            return this.LOCAL_SERVER.wsUrl;
        }
        
        if (address.startsWith('wss://')) {
            return address.replace('wss://', 'ws://');
        }
        
        return address;
    },

    // 更新服务器输入框的值
    updateServerInputs(wsAddress) {
        const serverInput = document.getElementById('serverInput');
        const configInput = document.getElementById('serverConfigInput');
        if (serverInput) serverInput.value = wsAddress;
        if (configInput) configInput.value = wsAddress;
    },

    // 确保 serverBaseUrl 正确设置
    ensureServerBaseUrl() {
        if (!this.isLocalEnvironment()) {
            let correctUrl = this.RENDER_SERVER.baseUrl;
            if (!correctUrl.startsWith('https://')) {
                correctUrl = correctUrl.replace(/^http:\/\//, 'https://');
            }
            correctUrl = this.cleanUrl(correctUrl);
            
            if (this.serverBaseUrl !== correctUrl) {
                console.warn('%c⚠️ 修正 serverBaseUrl:', 'color: #ffb74d; font-weight: bold;', 
                    this.serverBaseUrl, '→', correctUrl);
                this.serverBaseUrl = correctUrl;
            }
            
            if (this.serverBaseUrl.startsWith('http://') && !this.serverBaseUrl.startsWith('https://')) {
                console.warn('%c⚠️ 强制修复 HTTP 为 HTTPS:', 'color: #ffb74d; font-weight: bold;', 
                    this.serverBaseUrl, '→', this.serverBaseUrl.replace(/^http:\/\//, 'https://'));
                this.serverBaseUrl = this.serverBaseUrl.replace(/^http:\/\//, 'https://');
            }
            
            this.serverBaseUrl = this.cleanUrl(this.serverBaseUrl);
        } else {
            if (!this.serverBaseUrl.includes('localhost')) {
                this.serverBaseUrl = this.LOCAL_SERVER.baseUrl;
            }
        }
    },

    // 配置服务器地址
    configureServerAddress() {
        const config = this.getServerConfig();
        this.serverBaseUrl = config.serverBaseUrl;
        this.updateServerInputs(config.wsAddress);
        this.ensureServerBaseUrl();
        return config;
    },

    // 初始化
    init() {
        const versionInfo = document.getElementById('version-info');
        if (versionInfo) {
            versionInfo.textContent = this.VERSION;
        }
        
        console.log('%c=== LIFE 多人游戏模块初始化 ===', 'color: #4fc3f7; font-size: 16px; font-weight: bold;');
        console.log('%c版本:', 'color: #81c784; font-weight: bold;', this.VERSION);
        console.log('%c当前页面信息:', 'color: #81c784; font-weight: bold;', {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            href: window.location.href
        });
        
        this.configureServerAddress();
        this.detectServerAddress();
        this.showRenderNotification();
        this.updateAvatarImages();
        this.refreshRoomList();
    },

    // 检测并显示服务器地址
    detectServerAddress() {
        const config = this.configureServerAddress();
        const statusInfo = document.getElementById('server-status-info');
        const statusText = document.getElementById('server-status-text');
        
        if (config.isRenderServer) {
            if (statusInfo) statusInfo.style.display = 'block';
            if (statusText) {
                statusText.innerHTML = '✅ 已自动连接到服务器: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">' + config.wsAddress + '</code>';
            }
        } else {
            if (statusInfo) statusInfo.style.display = 'none';
        }
        
        console.log('%c服务器地址已设置:', 'color: #4fc3f7; font-weight: bold;', {
            hostname: window.location.hostname,
            isLocal: this.isLocalEnvironment(),
            serverBaseUrl: this.serverBaseUrl,
            wsAddress: config.wsAddress,
            version: this.VERSION
        });
    },

    // 显示 Render 免费版提示
    showRenderNotification() {
        if (this.isLocalEnvironment()) return;
        
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
        
        // 10秒后自动隐藏
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
        }, 10000);
    },

    // 更新头像图片
    updateAvatarImages() {
        for (let i = 1; i <= 5; i++) {
            const img = document.getElementById(`avatar-${i}`);
            if (img) {
                img.src = `assets/images/${i}.jpg`;
            }
        }
    },

    // 刷新房间列表
    refreshRoomList() {
        const roomListEl = document.getElementById('room-list');
        if (!roomListEl) return;
        
        const config = this.configureServerAddress();
        this.detectServerAddress();
        
        roomListEl.innerHTML = '<p>正在加载房间列表...</p>';
        
        let apiUrl = this.getApiUrl();
        if (!this.isLocalEnvironment() && window.location.protocol === 'https:') {
            apiUrl = apiUrl.replace(/^http:\/\//, 'https://');
        }
        apiUrl = this.cleanUrl(apiUrl);
        
        console.log('刷新房间列表，使用API地址:', apiUrl + '/rooms', '当前环境:', this.isLocalEnvironment() ? '本地' : '生产', '页面协议:', window.location.protocol);
        
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
                if (config.isRenderServer) {
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
        
        const roomListView = document.getElementById('room-list-view');
        const roomSection = document.getElementById('room-section');
        if (roomListView) roomListView.style.display = 'none';
        if (roomSection) {
            roomSection.style.display = 'block';
            const roomNameEl = document.getElementById('current-room-name');
            if (roomNameEl) roomNameEl.textContent = `房间: ${roomId}`;
        }
        
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
        
        this.configureServerAddress();
        const wsAddress = this.getWebSocketUrl();
        this.updateServerInputs(wsAddress);
        this.connectToRoom(roomId, wsAddress);
    },

    // 创建新房间
    createNewRoom() {
        const newRoomId = 'room_' + Math.random().toString(36).substr(2, 9);
        this.enterRoom(newRoomId);
    },

    // 选择角色
    selectCharacter(characterId) {
        this.selectedCharacter = characterId;
        const character = CHARACTERS[characterId];
        if (character) {
            this.playerName = character.name;
            this.selectedColor = character.color;
        }
        
        document.querySelectorAll('.character-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-character="${characterId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    },

    // 连接到房间
    connectToRoom(roomId, serverAddress = null) {
        const statusEl = document.getElementById('connection-status');
        const joinBtn = document.getElementById('join-btn');
        
        this.roomId = roomId;
        const wsUrl = this.getWebSocketUrl();
        serverAddress = wsUrl;
        
        const config = this.getServerConfig();
        const isRenderServer = config.isRenderServer;
        
        console.log('%c连接到房间:', 'color: #4fc3f7; font-weight: bold;', {
            roomId: roomId,
            wsUrl: wsUrl,
            isRenderServer: isRenderServer
        });
        
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
        
        const timeoutDuration = isRenderServer ? this.CONNECTION_TIMEOUT.RENDER : this.CONNECTION_TIMEOUT.LOCAL;
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
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        const roomListView = document.getElementById('room-list-view');
        const roomSection = document.getElementById('room-section');
        if (roomListView) roomListView.style.display = 'block';
        if (roomSection) roomSection.style.display = 'none';
        
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
        if (now - this.lastPositionUpdate > this.POSITION_UPDATE_INTERVAL) {
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
        
        this.updateGameStatus(players);
    },
    
    // 更新游戏状态
    updateGameStatus(players) {
        const statusEl = document.getElementById('game-status');
        if (!statusEl) return;
        
        statusEl.innerHTML = '';
        
        if (players.length < 2) {
            statusEl.innerHTML = `<p style="color: #ffb74d;">等待更多玩家加入... (${players.length}/2)</p>`;
            return;
        }
        
        const allReady = players.every(p => p.ready);
        const readyCount = players.filter(p => p.ready).length;
        
        if (!this.isPlayerReady) {
            statusEl.innerHTML = `<button onclick="Multiplayer.setReady()" style="padding: 15px 30px; font-size: 18px; background: #81c784; color: #000; border: none; border-radius: 5px; cursor: pointer; margin: 10px;">准备 (${readyCount}/${players.length})</button>`;
        } else if (!allReady) {
            statusEl.innerHTML = `<p style="color: #ffb74d;">等待其他玩家准备... (${readyCount}/${players.length})</p>`;
        } else {
            statusEl.innerHTML = `<p style="color: #81c784; font-size: 18px; font-weight: bold;">所有人已准备！游戏即将开始...</p>`;
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
        Game.currentLevel = startLevel || 0;
        Game.init();
        
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
        
        this.createNameLabel(humanoid, name);
        
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
    
    // 创建名字标签
    createNameLabel(humanoid, name) {
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
    },

    // 更新其他玩家
    updateOtherPlayer(playerId, position, level, name, color, characterId = null) {
        if (!this.otherPlayers[playerId]) {
            this.createOtherPlayer(playerId, name, color, characterId);
        }
        
        const otherPlayer = this.otherPlayers[playerId];
        if (!otherPlayer) return;
        
        otherPlayer.pos = position;
        otherPlayer.level = level;
        
        // 只显示同一关卡的玩家
        if (level === Game.currentLevel) {
            if (otherPlayer.humanoid && !Game.scene.children.includes(otherPlayer.humanoid)) {
                Game.scene.add(otherPlayer.humanoid);
            }
            
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
            
            // 如果该玩家现在和当前玩家在同一关卡，确保其可见
            if (level === Game.currentLevel && this.otherPlayers[playerId].humanoid) {
                // 确保humanoid在场景中
                if (!Game.scene.children.includes(this.otherPlayers[playerId].humanoid)) {
                    Game.scene.add(this.otherPlayers[playerId].humanoid);
                }
                
                // 更新位置并显示
                const levelConfig = LIFE_LEVELS[Game.currentLevel];
                const mazeSize = levelConfig.mazeSize;
                const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
                const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;
                
                const otherPlayer = this.otherPlayers[playerId];
                const targetX = otherPlayer.pos.x * CONFIG.cellSize + offsetX;
                const targetZ = otherPlayer.pos.z * CONFIG.cellSize + offsetZ;
                
                otherPlayer.humanoid.position.set(targetX, 0, targetZ);
                otherPlayer.humanoid.visible = true;
                
                otherPlayer.humanoid.traverse((child) => {
                    if (child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                    }
                });
            } else if (this.otherPlayers[playerId].humanoid) {
                // 如果不在同一关卡，隐藏
                this.otherPlayers[playerId].humanoid.visible = false;
            }
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
