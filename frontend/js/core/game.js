// ==================== 游戏主逻辑模块 ====================

const Game = {
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    playerLight: null,
    goal: null,
    goalLight: null,
    goalParticles: [],
    floor: null,
    ambientLight: null,
    directionalLight: null,
    currentLevel: 0,
    isVictory: false,
    goalRotation: 0,
    trailUpdateCounter: 0,
    playerHealth: 100,
    jumpCount: 0,
    maxJumpsPerLevel: 10,
    antiShakeMode: false,
    isGameStarted: false,
    gameStartTime: null,

    // 初始化游戏
    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(CONFIG.cameraOffset.x, CONFIG.cameraOffset.y, CONFIG.cameraOffset.z);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // 设置控制
        if (typeof Player !== 'undefined' && Player.setupControls) {
            Player.setupControls();
        }
        
        // 同步玩家引用
        if (typeof Player !== 'undefined') {
            this.player = Player.player;
        }

        window.addEventListener('resize', () => this.onWindowResize());
        
        this.loadLevel(0);
        this.animate();
    },

    // 加载关卡
    loadLevel(levelIndex) {
        this.currentLevel = levelIndex;
        const levelConfig = LIFE_LEVELS[this.currentLevel];
        
        // 更新UI
        if (typeof UI !== 'undefined') {
            UI.updateLevelInfo(levelConfig);
        }
        
        // 清除旧场景（但保留其他玩家的humanoid对象）
        const otherPlayersHumanoids = [];
        if (typeof Multiplayer !== 'undefined' && Multiplayer.otherPlayers) {
            Object.values(Multiplayer.otherPlayers).forEach(otherPlayer => {
                if (otherPlayer.humanoid && this.scene.children.includes(otherPlayer.humanoid)) {
                    otherPlayersHumanoids.push(otherPlayer.humanoid);
                    this.scene.remove(otherPlayer.humanoid);
                }
            });
        }
        
        while(this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        // 设置场景背景和雾
        this.scene.background = new THREE.Color(levelConfig.groundColor);
        this.scene.fog = new THREE.Fog(levelConfig.fogColor, 10, 50 * (1 + levelConfig.fogDensity * 10));
        
        // 设置光照
        this.ambientLight = new THREE.AmbientLight(0xffffff, levelConfig.lightIntensity * 0.3);
        this.scene.add(this.ambientLight);
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, levelConfig.lightIntensity * 0.7);
        this.directionalLight.position.set(10, 10, 10);
        this.directionalLight.castShadow = true;
        this.scene.add(this.directionalLight);
        
        // 创建场景元素
        const serverMaze = (typeof Multiplayer !== 'undefined' && Multiplayer.serverMazes) 
            ? Multiplayer.serverMazes[levelIndex] : null;
        MazeGenerator.createFloor(levelIndex, this.scene);
        MazeGenerator.generateMaze(levelIndex, serverMaze, this.scene);
        
        // 创建玩家、目标、NPC等
        if (typeof Player !== 'undefined' && Player.createPlayer) {
            // 同步角色选择
            if (typeof Multiplayer !== 'undefined') {
                Player.selectedCharacter = Multiplayer.selectedCharacter || 1;
                Player.selectedColor = Multiplayer.selectedColor || '0x4fc3f7';
            }
            Player.createPlayer(this.scene, levelIndex);
            this.player = Player.player;
        }
        
        this.createGoal(levelIndex);
        
        if (typeof NPC !== 'undefined') {
            if (NPC.createNPCs) NPC.createNPCs(this.scene, levelIndex);
            if (NPC.createHealthAndJumpPacks) NPC.createHealthAndJumpPacks(this.scene, levelIndex);
        }
        
        // 重置玩家状态（同步到 Player 模块）
        if (typeof Player !== 'undefined') {
            Player.playerPos = { x: 0, z: 0 };
            Player.targetPos = { x: 0, z: 0 };
            Player.isMoving = false;
            Player.isJumping = false;
        }
        this.isVictory = false;
        
        // 重置跳跃次数（每个新关卡重置）
        this.jumpCount = 0;
        if (typeof UI !== 'undefined' && UI.updateJumpsDisplay) {
            UI.updateJumpsDisplay();
        }
        
        // 更新血量显示（血量是全程的，不重置）
        if (typeof UI !== 'undefined' && UI.updateHealthDisplay) {
            UI.updateHealthDisplay();
        }
        
        // 更新摄像机
        this.camera.position.set(CONFIG.cameraOffset.x, CONFIG.cameraOffset.y, CONFIG.cameraOffset.z);
        this.camera.lookAt(0, 0, 0);
        
        // 重新检查并显示所有在同一关卡的其他玩家
        if (typeof Multiplayer !== 'undefined' && Multiplayer.otherPlayers) {
            Object.entries(Multiplayer.otherPlayers).forEach(([playerId, otherPlayer]) => {
                if (otherPlayer.level === levelIndex && otherPlayer.humanoid) {
                    // 确保humanoid在场景中
                    if (!this.scene.children.includes(otherPlayer.humanoid)) {
                        this.scene.add(otherPlayer.humanoid);
                    }
                    // 更新位置并显示
                    const levelConfig = LIFE_LEVELS[levelIndex];
                    const mazeSize = levelConfig.mazeSize;
                    const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
                    const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;
                    
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
                }
            });
        }
        
        // 立即发送位置更新，通知其他玩家当前玩家已进入新关卡
        if (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode && 
            typeof Player !== 'undefined' && Multiplayer.sendPositionUpdate) {
            // 强制发送一次位置更新（忽略时间限制）
            const playerPos = Player.playerPos || { x: 0, z: 0 };
            Multiplayer.sendMessage({
                type: 'playerUpdate',
                roomId: Multiplayer.roomId,
                playerId: Multiplayer.playerId,
                position: playerPos,
                level: levelIndex
            });
        }
    },

    // 创建目标点
    createGoal(levelIndex) {
        if (this.goal) {
            this.scene.remove(this.goal);
        }

        const levelConfig = LIFE_LEVELS[levelIndex];
        const mazeSize = levelConfig.mazeSize;
        const goalX = mazeSize - 1;
        const goalY = mazeSize - 1;

        this.goal = new THREE.Group();

        const beamGeometry = new THREE.CylinderGeometry(0.1, 0.3, 4, 8);
        const beamMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffaa,
            emissive: 0xffffaa,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.y = 2;
        this.goal.add(beam);

        const ringGeometry = new THREE.TorusGeometry(1, 0.1, 8, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffaa,
            emissive: 0xffffaa,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.5
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.5;
        this.goal.add(ring);

        this.goalLight = new THREE.PointLight(0xffffaa, 1.5, 8);
        this.goalLight.position.y = 2;
        this.goal.add(this.goalLight);

        const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
        const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;

        this.goal.position.set(
            goalX * CONFIG.cellSize + offsetX,
            0,
            goalY * CONFIG.cellSize + offsetZ
        );

        this.goalParticles = [];
        for (let i = 0; i < 15; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffaa,
                emissive: 0xffffaa,
                emissiveIntensity: 0.4
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 3,
                (Math.random() - 0.5) * 2
            );
            particle.userData = {
                speed: Math.random() * 0.5 + 0.5,
                angle: Math.random() * Math.PI * 2,
                radius: Math.random() * 1 + 0.5
            };
            this.goal.add(particle);
            this.goalParticles.push(particle);
        }

        this.scene.add(this.goal);
    },

    // 更新目标动画
    updateGoalAnimation() {
        this.goalRotation += 0.02;
        if (this.goal && this.goal.children[1]) {
            this.goal.children[1].rotation.y = this.goalRotation;
            this.goal.children[1].position.y = 0.5 + Math.sin(this.goalRotation) * 0.2;
        }

        this.goalParticles.forEach(particle => {
            particle.userData.angle += particle.userData.speed * 0.02;
            particle.position.x = Math.sin(particle.userData.angle) * particle.userData.radius;
            particle.position.z = Math.cos(particle.userData.angle) * particle.userData.radius;
            particle.position.y += Math.sin(particle.userData.angle * 2) * 0.01;
            if (particle.position.y > 3) particle.position.y = 0.1;
        });
    },

    // 检查胜利
    checkVictory() {
        if (this.isVictory || (typeof Player !== 'undefined' && Player.isMoving)) return;

        const levelConfig = LIFE_LEVELS[this.currentLevel];
        const goalX = levelConfig.mazeSize - 1;
        const goalZ = levelConfig.mazeSize - 1;
        
        const playerPos = typeof Player !== 'undefined' ? Player.playerPos : { x: 0, z: 0 };

        if (Math.round(playerPos.x) === goalX && Math.round(playerPos.z) === goalZ) {
            this.isVictory = true;
            document.getElementById('victory').style.display = 'block';
            
            // 发送关卡完成消息
            if (typeof Multiplayer !== 'undefined' && Multiplayer.sendMessage) {
                Multiplayer.sendMessage({
                    type: 'playerLevelUp',
                    roomId: Multiplayer.roomId,
                    playerId: Multiplayer.playerId,
                    level: this.currentLevel + 1
                });
            }

            // 所有人独立进度，立即进入下一关
            setTimeout(() => {
                if (this.currentLevel < LIFE_LEVELS.length - 1) {
                    const transition = document.getElementById('transition');
                    transition.style.opacity = '1';
                    
                    setTimeout(() => {
                        this.loadLevel(this.currentLevel + 1);
                        transition.style.opacity = '0';
                        document.getElementById('victory').style.display = 'none';
                        if (typeof UI !== 'undefined' && UI.updateLeaderboard) {
                            UI.updateLeaderboard();
                        }
                    }, 1000);
                } else {
                    // 游戏完成
                    const finishTime = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0;
                    if (typeof Multiplayer !== 'undefined' && Multiplayer.sendMessage) {
                        Multiplayer.sendMessage({
                            type: 'playerFinished',
                            roomId: Multiplayer.roomId,
                            playerId: Multiplayer.playerId,
                            time: finishTime
                        });
                    }
                    alert(`恭喜！你完成了人生的旅程！\n用时: ${finishTime}秒\n\n"回归本源，一切即是一。"`);
                    this.loadLevel(0);
                    document.getElementById('victory').style.display = 'none';
                }
            }, 1500);
        }
    },

    // 更新相机
    updateCamera() {
        if (!this.player) return;
        
        const targetX = this.player.position.x + CONFIG.cameraOffset.x;
        const targetY = this.player.position.y + CONFIG.cameraOffset.y;
        const targetZ = this.player.position.z + CONFIG.cameraOffset.z;

        // 根据防抖模式选择插值系数
        const lerpFactor = this.antiShakeMode ? CONFIG.cameraLerpAntiShake : CONFIG.cameraLerp;
        
        this.camera.position.x += (targetX - this.camera.position.x) * lerpFactor;
        this.camera.position.y += (targetY - this.camera.position.y) * lerpFactor;
        this.camera.position.z += (targetZ - this.camera.position.z) * lerpFactor;

        this.camera.lookAt(this.player.position);
    },

    // 切换防抖模式
    toggleAntiShake() {
        this.antiShakeMode = !this.antiShakeMode;
        const btn = document.getElementById('antiShakeBtn');
        if (btn) {
            btn.textContent = `防抖: ${this.antiShakeMode ? '开启' : '关闭'}`;
            btn.style.background = this.antiShakeMode ? 'rgba(79, 195, 247, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        }
    },

    // 窗口大小改变
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    // 动画循环
    animate() {
        requestAnimationFrame(() => this.animate());

        // 更新玩家引用
        if (typeof Player !== 'undefined') {
            this.player = Player.player;
        }
        
        // 玩家轻微旋转动画
        if (this.player) {
            this.player.rotation.y += 0.005;
        }
        
        // NPC动画
        if (typeof NPC !== 'undefined' && NPC.updateAnimations) {
            NPC.updateAnimations();
        }

        // 更新拖尾效果
        if (typeof Player !== 'undefined' && Player.updateTrail) {
            Player.updateTrail();
        }

        this.checkVictory();
        
        // 碰撞检测
        if (typeof NPC !== 'undefined') {
            if (NPC.checkNPCCollision) NPC.checkNPCCollision();
            if (NPC.checkPackCollision) NPC.checkPackCollision();
        }
        
        this.updateCamera();
        this.updateGoalAnimation();
        
        // 更新所有头像平面，使其始终面向相机
        if (this.player) {
            this.player.traverse((child) => {
                if (child.userData && child.userData.isAvatar) {
                    child.lookAt(this.camera.position);
                }
            });
        }
        
        // 更新其他玩家的头像平面
        if (typeof Multiplayer !== 'undefined' && Multiplayer.updateOtherPlayerAvatars) {
            Multiplayer.updateOtherPlayerAvatars(this.camera);
        }
        
        // 更新排行榜
        if (typeof UI !== 'undefined' && UI.updateLeaderboard) {
            if (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode && this.gameStartTime && Math.floor(Date.now() / 1000) % 2 === 0) {
                UI.updateLeaderboard();
            }
        }
        
        // 定期发送位置更新
        if (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode && 
            typeof Player !== 'undefined' && !Player.isMoving && !Player.isJumping) {
            const playerPos = Player.playerPos || { x: 0, z: 0 };
            Multiplayer.sendPositionUpdate(playerPos, this.currentLevel);
        }

        this.renderer.render(this.scene, this.camera);
    },

    // 离线模式
    startOfflineMode() {
        if (typeof Multiplayer !== 'undefined') {
            Multiplayer.isOnlineMode = false;
        }
        this.isGameStarted = true;
        document.getElementById('lobby').classList.add('hidden');
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) leaderboard.style.display = 'none';
        this.gameStartTime = Date.now();
        this.init();
    }
};
