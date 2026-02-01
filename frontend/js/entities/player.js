// ==================== 玩家控制模块 ====================

const Player = {
    player: null,
    playerLight: null,
    playerTrail: [],
    keys: {},
    lastDirection: null,
    playerPos: { x: 0, z: 0 },
    targetPos: { x: 0, z: 0 },
    isMoving: false,
    isJumping: false,
    selectedCharacter: 1,
    selectedColor: '0x4fc3f7',
    trailUpdateCounter: 0,

    // 设置控制
    setupControls() {
        // 跟踪按键状态
        document.addEventListener('keydown', (e) => { 
            this.keys[e.code] = true;
            
            // 方向键处理
            if (this.isMoving || this.isJumping) return;
            
            let moveDir = null;
            if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') {
                moveDir = 'up';
            } else if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') {
                moveDir = 'down';
            } else if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') {
                moveDir = 'left';
            } else if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') {
                moveDir = 'right';
            }

            if (moveDir) {
                this.lastDirection = moveDir;
                // 如果空格已经按下，执行跳跃；否则执行普通移动
                if (this.keys['Space']) {
                    this.executeJump(moveDir);
                } else {
                    this.executeMove(moveDir);
                }
            }
            
            // 空格键处理（如果方向键已按下，执行跳跃）
            if (e.code === 'Space' && this.lastDirection && !this.isMoving && !this.isJumping) {
                this.executeJump(this.lastDirection);
            }
        });
        
        document.addEventListener('keyup', (e) => { 
            this.keys[e.code] = false;
            if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp' || 
                e.key.toLowerCase() === 's' || e.key === 'ArrowDown' ||
                e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft' ||
                e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') {
                this.lastDirection = null;
            }
        });
    },

    // 执行移动
    executeMove(moveDir) {
        const cellX = Math.round(this.playerPos.x);
        const cellZ = Math.round(this.playerPos.z);
        
        let targetCellX = cellX;
        let targetCellZ = cellZ;

        if (moveDir === 'up') {
            targetCellZ = cellZ - 1;
        } else if (moveDir === 'down') {
            targetCellZ = cellZ + 1;
        } else if (moveDir === 'left') {
            targetCellX = cellX - 1;
        } else if (moveDir === 'right') {
            targetCellX = cellX + 1;
        }

        // 检查墙体
        const maze = MazeGenerator.maze;
        if (!maze || !maze[cellZ] || !maze[cellZ][cellX]) return;
        const cell = maze[cellZ][cellX];
        if (moveDir === 'up'    && cell.top)    return;
        if (moveDir === 'down'  && cell.bottom) return;
        if (moveDir === 'left'  && cell.left)   return;
        if (moveDir === 'right' && cell.right)  return;

        const mazeSize = LIFE_LEVELS[Game.currentLevel].mazeSize;
        if (targetCellX < 0 || targetCellX >= mazeSize || targetCellZ < 0 || targetCellZ >= mazeSize) return;

        this.isMoving = true;
        this.targetPos = { x: targetCellX, z: targetCellZ };

        const startX = this.playerPos.x;
        const startZ = this.playerPos.z;
        const endX = targetCellX;
        const endZ = targetCellZ;

        const duration = 150;
        const startTime = Date.now();

        const animateMove = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            this.playerPos.x = startX + (endX - startX) * easeProgress;
            this.playerPos.z = startZ + (endZ - startZ) * easeProgress;

            const mazeSize = LIFE_LEVELS[Game.currentLevel].mazeSize;
            const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
            const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;

            this.player.position.x = this.playerPos.x * CONFIG.cellSize + offsetX;
            this.player.position.z = this.playerPos.z * CONFIG.cellSize + offsetZ;
            this.player.position.y = 0;

            // 在移动过程中实时发送位置更新（每30ms）
            const now = Date.now();
            if (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode && 
                Multiplayer.ws && Multiplayer.ws.readyState === WebSocket.OPEN && 
                now - Multiplayer.lastPositionUpdate > 30) {
                Multiplayer.lastPositionUpdate = now;
                Multiplayer.sendMessage({
                    type: 'playerUpdate',
                    roomId: Multiplayer.roomId,
                    playerId: Multiplayer.playerId,
                    position: { x: this.playerPos.x, z: this.playerPos.z },
                    level: Game.currentLevel
                });
            }

            if (progress < 1) {
                requestAnimationFrame(animateMove);
            } else {
                this.isMoving = false;
                this.playerPos.x = endX;
                this.playerPos.z = endZ;
                this.lastDirection = null;
                
                // 移动完成后发送最终位置
                if (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode && 
                    Multiplayer.ws && Multiplayer.ws.readyState === WebSocket.OPEN) {
                    Multiplayer.sendMessage({
                        type: 'playerUpdate',
                        roomId: Multiplayer.roomId,
                        playerId: Multiplayer.playerId,
                        position: { x: this.playerPos.x, z: this.playerPos.z },
                        level: Game.currentLevel
                    });
                }
            }
        };

        animateMove();
    },

    // 执行跳跃
    executeJump(moveDir) {
        // 检查跳跃次数限制
        if (Game.jumpCount >= Game.maxJumpsPerLevel) {
            // 显示屏幕上方提示（1秒）
            if (typeof UI !== 'undefined' && UI.showJumpLimitMessage) {
                UI.showJumpLimitMessage();
            }
            this.lastDirection = null;
            return;
        }
        
        const cellX = Math.round(this.playerPos.x);
        const cellZ = Math.round(this.playerPos.z);
        
        let jumpTargetX = cellX;
        let jumpTargetZ = cellZ;

        if (moveDir === 'up') {
            jumpTargetZ = cellZ - 2;
        } else if (moveDir === 'down') {
            jumpTargetZ = cellZ + 2;
        } else if (moveDir === 'left') {
            jumpTargetX = cellX - 2;
        } else if (moveDir === 'right') {
            jumpTargetX = cellX + 2;
        }

        const mazeSize = LIFE_LEVELS[Game.currentLevel].mazeSize;
        if (jumpTargetX < 0 || jumpTargetX >= mazeSize || jumpTargetZ < 0 || jumpTargetZ >= mazeSize) {
            this.lastDirection = null;
            return;
        }
        
        // 增加跳跃次数
        Game.jumpCount++;
        if (typeof UI !== 'undefined' && UI.updateJumpsDisplay) {
            UI.updateJumpsDisplay();
        }

        this.isJumping = true;
        this.targetPos = { x: jumpTargetX, z: jumpTargetZ };

        const startX = this.playerPos.x;
        const startZ = this.playerPos.z;
        const endX = jumpTargetX;
        const endZ = jumpTargetZ;

        const duration = 300;
        const startTime = Date.now();

        const animateMove = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            this.playerPos.x = startX + (endX - startX) * easeProgress;
            this.playerPos.z = startZ + (endZ - startZ) * easeProgress;

            let yOffset = Math.sin(progress * Math.PI) * 2;

            const mazeSize = LIFE_LEVELS[Game.currentLevel].mazeSize;
            const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
            const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;

            this.player.position.x = this.playerPos.x * CONFIG.cellSize + offsetX;
            this.player.position.z = this.playerPos.z * CONFIG.cellSize + offsetZ;
            this.player.position.y = yOffset;

            // 在跳跃过程中实时发送位置更新（每30ms）
            const now = Date.now();
            if (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode && 
                Multiplayer.ws && Multiplayer.ws.readyState === WebSocket.OPEN && 
                now - Multiplayer.lastPositionUpdate > 30) {
                Multiplayer.lastPositionUpdate = now;
                Multiplayer.sendMessage({
                    type: 'playerUpdate',
                    roomId: Multiplayer.roomId,
                    playerId: Multiplayer.playerId,
                    position: { x: this.playerPos.x, z: this.playerPos.z },
                    level: Game.currentLevel
                });
            }

            if (progress < 1) {
                requestAnimationFrame(animateMove);
            } else {
                this.isJumping = false;
                this.playerPos.x = endX;
                this.playerPos.z = endZ;
                this.player.position.y = 0;
                this.lastDirection = null;
                
                // 跳跃完成后发送最终位置
                if (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode && 
                    Multiplayer.ws && Multiplayer.ws.readyState === WebSocket.OPEN) {
                    Multiplayer.sendMessage({
                        type: 'playerUpdate',
                        roomId: Multiplayer.roomId,
                        playerId: Multiplayer.playerId,
                        position: { x: this.playerPos.x, z: this.playerPos.z },
                        level: Game.currentLevel
                    });
                }
            }
        };

        animateMove();
    },

    // 创建玩家
    createPlayer(scene, levelIndex) {
        if (this.player) {
            this.playerTrail.forEach(trail => scene.remove(trail));
            this.playerTrail = [];
            scene.remove(this.player);
        }

        const levelConfig = LIFE_LEVELS[levelIndex];
        
        // 创建人形（使用选择的角色和颜色）
        this.player = this.createHumanoid(0xffdbac, 1, this.selectedCharacter);
        const colorData = PLAYER_COLORS[this.selectedColor];
        if (colorData) {
            // 找到身体（通常是第二个子对象）
            const body = this.player.children.find(child => child.geometry && child.geometry.type === 'CylinderGeometry');
            if (body) {
                body.material.color.setHex(colorData.body);
            }
        }
        
        // 添加发光效果
        const playerColorHex = colorData ? colorData.body : 0x4fc3f7;
        this.playerLight = new THREE.PointLight(playerColorHex, 1.0, 8);
        this.playerLight.position.set(0, 1, 0);
        this.player.add(this.playerLight);

        const mazeSize = levelConfig.mazeSize;
        const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
        const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;

        this.player.position.set(offsetX, 0, offsetZ);

        this.playerPos = { x: 0, z: 0 };
        this.targetPos = { x: 0, z: 0 };

        // 创建拖尾效果
        for (let i = 0; i < 10; i++) {
            const trailGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: playerColorHex,
                transparent: true,
                opacity: 0.3 - i * 0.03
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.position.copy(this.player.position);
            scene.add(trail);
            this.playerTrail.push(trail);
        }

        // 创建旋转粒子环
        for (let i = 0; i < 8; i++) {
            const ringGeometry = new THREE.SphereGeometry(0.05, 6, 6);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 1
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            scene.add(ring);
            this.playerTrail.push(ring);
        }

        scene.add(this.player);
    },

    // 创建人形模型
    createHumanoid(color, scale = 1, characterId = null, avatarUrl = null) {
        const humanoid = new THREE.Group();
        const skinColor = color || 0xffdbac; // 肤色
        
        // 头部
        const headGeometry = new THREE.SphereGeometry(0.15 * scale, 16, 16);
        let headMaterial;
        
        // 如果有头像，使用头像纹理
        if (avatarUrl || characterId) {
            const textureLoader = new THREE.TextureLoader();
            let avatarPath = avatarUrl || CHARACTERS[characterId]?.avatar || 'assets/images/1.jpg';
            // 如果不是完整URL，尝试构建路径
            if (!avatarPath.startsWith('http://') && !avatarPath.startsWith('https://')) {
                // 检测页面协议：如果是 file:// 协议，使用相对路径；如果是 http:// 或 https://，使用服务器地址
                const isFileProtocol = window.location.protocol === 'file:';
                const useServerPath = !isFileProtocol || (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode);
                
                if (useServerPath && typeof Multiplayer !== 'undefined' && Multiplayer.serverBaseUrl) {
                    const serverHost = Multiplayer.serverBaseUrl.replace('http://', '').replace(':8081', '');
                    avatarPath = `http://${serverHost}:8081/${avatarPath}`;
                }
                // 否则使用相对路径（仅限本地文件访问）
            }
            const texture = textureLoader.load(avatarPath, 
                (tex) => { tex.needsUpdate = true; },
                undefined,
                (err) => { 
                    console.error('加载头像失败:', err, '路径:', avatarPath);
                }
            );
            headMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.8,
                metalness: 0.1
            });
        } else {
            headMaterial = new THREE.MeshStandardMaterial({
                color: skinColor,
                roughness: 0.8,
                metalness: 0.1
            });
        }
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.7 * scale;
        head.castShadow = true;
        humanoid.add(head);
        
        // 在身体前面添加大头像（面向玩家）
        if (avatarUrl || characterId) {
            let avatarPath = avatarUrl || (characterId && CHARACTERS[characterId]?.avatar) || 'assets/images/1.jpg';
            // 如果不是完整URL，尝试构建路径
            if (!avatarPath.startsWith('http://') && !avatarPath.startsWith('https://')) {
                const isFileProtocol = window.location.protocol === 'file:';
                const useServerPath = !isFileProtocol || (typeof Multiplayer !== 'undefined' && Multiplayer.isOnlineMode);
                
                if (useServerPath && typeof Multiplayer !== 'undefined' && Multiplayer.serverBaseUrl) {
                    const serverHost = Multiplayer.serverBaseUrl.replace('http://', '').replace(':8081', '');
                    avatarPath = `http://${serverHost}:8081/${avatarPath}`;
                }
            }
            
            const textureLoader = new THREE.TextureLoader();
            const avatarTexture = textureLoader.load(avatarPath,
                (tex) => { 
                    tex.needsUpdate = true;
                },
                undefined,
                (err) => { 
                    console.error('加载头像失败:', err, '路径:', avatarPath);
                }
            );
            
            // 创建平面显示头像（更大，放在头上）
            const avatarSize = 1.5 * scale;
            const avatarGeometry = new THREE.PlaneGeometry(avatarSize, avatarSize);
            const avatarMaterial = new THREE.MeshStandardMaterial({
                map: avatarTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            const avatarPlane = new THREE.Mesh(avatarGeometry, avatarMaterial);
            avatarPlane.position.set(0, 0.85 * scale, 0);
            avatarPlane.userData.isAvatar = true;
            avatarPlane.userData.avatarMaterial = avatarMaterial;
            humanoid.add(avatarPlane);
        }
        
        // 身体
        const bodyGeometry = new THREE.CylinderGeometry(0.12 * scale, 0.15 * scale, 0.5 * scale, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4fc3f7,
            roughness: 0.7,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.25 * scale;
        body.castShadow = true;
        humanoid.add(body);
        
        // 左臂
        const leftArmGeometry = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.3 * scale, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.8,
            metalness: 0.1
        });
        const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
        leftArm.position.set(-0.2 * scale, 0.3 * scale, 0);
        leftArm.rotation.z = Math.PI / 6;
        leftArm.castShadow = true;
        humanoid.add(leftArm);
        
        // 右臂
        const rightArm = new THREE.Mesh(leftArmGeometry.clone(), armMaterial);
        rightArm.position.set(0.2 * scale, 0.3 * scale, 0);
        rightArm.rotation.z = -Math.PI / 6;
        rightArm.castShadow = true;
        humanoid.add(rightArm);
        
        // 左腿
        const leftLegGeometry = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.4 * scale, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            roughness: 0.8,
            metalness: 0.1
        });
        const leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
        leftLeg.position.set(-0.08 * scale, -0.1 * scale, 0);
        leftLeg.castShadow = true;
        humanoid.add(leftLeg);
        
        // 右腿
        const rightLeg = new THREE.Mesh(leftLegGeometry.clone(), legMaterial);
        rightLeg.position.set(0.08 * scale, -0.1 * scale, 0);
        rightLeg.castShadow = true;
        humanoid.add(rightLeg);
        
        return humanoid;
    },

    // 更新拖尾效果
    updateTrail() {
        if (!this.player) return;
        
        this.trailUpdateCounter++;
        if (this.trailUpdateCounter % 2 === 0) {
            for (let i = this.playerTrail.length - 1; i > 0; i--) {
                if (i < 10) {
                    // 拖尾粒子
                    const prevPos = i > 0 ? this.playerTrail[i - 1].position : this.player.position;
                    this.playerTrail[i].position.lerp(prevPos, 0.3);
                } else {
                    // 旋转粒子环
                    const angle = (i - 10) * (Math.PI * 2 / 8) + Date.now() * 0.002;
                    const radius = 0.5;
                    this.playerTrail[i].position.set(
                        this.player.position.x + Math.cos(angle) * radius,
                        this.player.position.y + 0.7 + Math.sin(angle * 2) * 0.2,
                        this.player.position.z + Math.sin(angle) * radius
                    );
                }
            }
            if (this.playerTrail.length > 0) {
                this.playerTrail[0].position.copy(this.player.position);
                this.playerTrail[0].position.y += 0.7;
            }
        }
    }
};
