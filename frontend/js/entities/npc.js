// ==================== NPC 和道具模块 ====================

const NPC = {
    npcs: [],
    npcPositions: [],
    healthPacks: [],
    jumpPacks: [],

    // 创建 NPC
    createNPCs(scene, levelIndex) {
        this.npcs.forEach(npc => scene.remove(npc));
        this.npcs = [];
        this.npcPositions = [];
        
        const levelConfig = LIFE_LEVELS[levelIndex];
        const mazeSize = levelConfig.mazeSize;
        
        // 根据关卡决定NPC数量（越往后越多）
        let npcCount = 0;
        if (levelIndex <= 1) {
            npcCount = Math.floor(mazeSize * 0.2);
        } else if (levelIndex <= 3) {
            npcCount = Math.floor(mazeSize * 0.3);
        } else if (levelIndex <= 5) {
            npcCount = Math.floor(mazeSize * 0.4);
        } else if (levelIndex <= 7) {
            npcCount = Math.floor(mazeSize * 0.5);
        } else {
            npcCount = Math.floor(mazeSize * 0.6);
        }
        
        if (npcCount === 0) return;
        
        const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
        const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;
        
        // 找到从起点到终点的路径
        const pathToGoal = MazeGenerator.findPathToGoal(levelIndex);
        const pathCells = new Set();
        pathToGoal.forEach(cell => {
            pathCells.add(`${cell.x},${cell.y}`);
        });
        
        // 在路径上放置最多4个怪物
        let pathMonsterCount = 0;
        const maxPathMonsters = 4;
        const npcTypes = ['monster', 'dinosaur', 'ghost'];
        
        // 先放置路径上的怪物
        if (pathToGoal.length > 2) {
            const pathWithoutEnds = pathToGoal.slice(1, pathToGoal.length - 1);
            const shuffledPath = [...pathWithoutEnds].sort(() => Math.random() - 0.5);
            const pathMonsterPositions = shuffledPath.slice(0, Math.min(maxPathMonsters, shuffledPath.length));
            
            for (const pos of pathMonsterPositions) {
                const npcTypeName = npcTypes[Math.floor(Math.random() * npcTypes.length)];
                let npc;
                
                if (npcTypeName === 'monster') {
                    npc = this.createMonster(0.8);
                } else if (npcTypeName === 'dinosaur') {
                    npc = this.createDinosaur(0.8);
                } else {
                    npc = this.createGhost(0.8);
                }
                
                npc.position.set(
                    pos.x * CONFIG.cellSize + offsetX,
                    0,
                    pos.y * CONFIG.cellSize + offsetZ
                );
                npc.rotation.y = Math.random() * Math.PI * 2;
                scene.add(npc);
                this.npcs.push(npc);
                this.npcPositions.push({ x: pos.x, z: pos.y });
                pathMonsterCount++;
            }
        }
        
        // 然后在非路径位置放置剩余的NPC
        const remainingCount = npcCount - pathMonsterCount;
        const maze = MazeGenerator.maze;
        
        for (let i = 0; i < remainingCount; i++) {
            const npcTypeName = npcTypes[Math.floor(Math.random() * npcTypes.length)];
            let npc;
            
            if (npcTypeName === 'monster') {
                npc = this.createMonster(0.8);
            } else if (npcTypeName === 'dinosaur') {
                npc = this.createDinosaur(0.8);
            } else {
                npc = this.createGhost(0.8);
            }
            
            // 随机放置在非路径的通路中
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 100) {
                const x = Math.floor(Math.random() * mazeSize);
                const z = Math.floor(Math.random() * mazeSize);
                const cellKey = `${x},${z}`;
                
                if (maze[z] && maze[z][x] && 
                    (x !== 0 || z !== 0) && 
                    (x !== mazeSize - 1 || z !== mazeSize - 1) &&
                    !pathCells.has(cellKey)) {
                    npc.position.set(
                        x * CONFIG.cellSize + offsetX,
                        0,
                        z * CONFIG.cellSize + offsetZ
                    );
                    npc.rotation.y = Math.random() * Math.PI * 2;
                    placed = true;
                    this.npcPositions.push({ x: x, z: z });
                }
                attempts++;
            }
            
            if (placed) {
                scene.add(npc);
                this.npcs.push(npc);
            }
        }
    },

    // 创建怪兽
    createMonster(scale = 1) {
        const monster = new THREE.Group();
        const bodyColor = 0x8b4513;
        
        // 身体
        const bodyGeometry = new THREE.BoxGeometry(0.4 * scale, 0.6 * scale, 0.4 * scale);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3 * scale;
        body.castShadow = true;
        monster.add(body);
        
        // 头部
        const headGeometry = new THREE.BoxGeometry(0.35 * scale, 0.35 * scale, 0.35 * scale);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.8,
            metalness: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.75 * scale;
        head.castShadow = true;
        monster.add(head);
        
        // 眼睛
        const eyeGeometry = new THREE.SphereGeometry(0.05 * scale, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1 * scale, 0.8 * scale, 0.15 * scale);
        monster.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeometry.clone(), eyeMaterial);
        rightEye.position.set(0.1 * scale, 0.8 * scale, 0.15 * scale);
        monster.add(rightEye);
        
        // 角
        const hornGeometry = new THREE.ConeGeometry(0.05 * scale, 0.2 * scale, 6);
        const hornMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        leftHorn.position.set(-0.12 * scale, 0.95 * scale, 0);
        leftHorn.rotation.z = -0.3;
        monster.add(leftHorn);
        const rightHorn = new THREE.Mesh(hornGeometry.clone(), hornMaterial);
        rightHorn.position.set(0.12 * scale, 0.95 * scale, 0);
        rightHorn.rotation.z = 0.3;
        monster.add(rightHorn);
        
        // 手臂
        const armGeometry = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.4 * scale, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.25 * scale, 0.3 * scale, 0);
        leftArm.rotation.z = Math.PI / 6;
        leftArm.castShadow = true;
        monster.add(leftArm);
        const rightArm = new THREE.Mesh(armGeometry.clone(), armMaterial);
        rightArm.position.set(0.25 * scale, 0.3 * scale, 0);
        rightArm.rotation.z = -Math.PI / 6;
        rightArm.castShadow = true;
        monster.add(rightArm);
        
        // 腿
        const legGeometry = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.3 * scale, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.1 * scale, -0.15 * scale, 0);
        leftLeg.castShadow = true;
        monster.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeometry.clone(), legMaterial);
        rightLeg.position.set(0.1 * scale, -0.15 * scale, 0);
        rightLeg.castShadow = true;
        monster.add(rightLeg);
        
        return monster;
    },
    
    // 创建恐龙
    createDinosaur(scale = 1) {
        const dinosaur = new THREE.Group();
        const bodyColor = 0x228b22;
        
        // 身体
        const bodyGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.25 * scale, 0.8 * scale, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.7,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4 * scale;
        body.rotation.z = Math.PI / 2;
        body.castShadow = true;
        dinosaur.add(body);
        
        // 头部
        const neckGeometry = new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.4 * scale, 8);
        const neck = new THREE.Mesh(neckGeometry, bodyMaterial);
        neck.position.set(0, 0.6 * scale, 0.2 * scale);
        neck.rotation.x = -Math.PI / 4;
        neck.castShadow = true;
        dinosaur.add(neck);
        
        const headGeometry = new THREE.BoxGeometry(0.15 * scale, 0.2 * scale, 0.3 * scale);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 0.85 * scale, 0.35 * scale);
        head.castShadow = true;
        dinosaur.add(head);
        
        // 眼睛
        const eyeGeometry = new THREE.SphereGeometry(0.03 * scale, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(0.05 * scale, 0.9 * scale, 0.4 * scale);
        dinosaur.add(eye);
        
        // 尾巴
        const tailGeometry = new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 0.5 * scale, 8);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(0, 0.3 * scale, -0.4 * scale);
        tail.rotation.x = Math.PI / 6;
        tail.castShadow = true;
        dinosaur.add(tail);
        
        // 前腿
        const frontLegGeometry = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.3 * scale, 8);
        const frontLeg = new THREE.Mesh(frontLegGeometry, bodyMaterial);
        frontLeg.position.set(0.15 * scale, 0.15 * scale, 0.2 * scale);
        frontLeg.castShadow = true;
        dinosaur.add(frontLeg);
        const frontLeg2 = new THREE.Mesh(frontLegGeometry.clone(), bodyMaterial);
        frontLeg2.position.set(-0.15 * scale, 0.15 * scale, 0.2 * scale);
        frontLeg2.castShadow = true;
        dinosaur.add(frontLeg2);
        
        // 后腿
        const backLeg = new THREE.Mesh(frontLegGeometry.clone(), bodyMaterial);
        backLeg.position.set(0.15 * scale, 0.15 * scale, -0.2 * scale);
        backLeg.castShadow = true;
        dinosaur.add(backLeg);
        const backLeg2 = new THREE.Mesh(frontLegGeometry.clone(), bodyMaterial);
        backLeg2.position.set(-0.15 * scale, 0.15 * scale, -0.2 * scale);
        backLeg2.castShadow = true;
        dinosaur.add(backLeg2);
        
        return dinosaur;
    },
    
    // 创建女鬼
    createGhost(scale = 1) {
        const ghost = new THREE.Group();
        
        // 身体
        const bodyGeometry = new THREE.ConeGeometry(0.2 * scale, 0.8 * scale, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            emissive: 0xffffff,
            emissiveIntensity: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4 * scale;
        body.castShadow = false;
        ghost.add(body);
        
        // 头部
        const headGeometry = new THREE.SphereGeometry(0.15 * scale, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            emissive: 0xffffff,
            emissiveIntensity: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.9 * scale;
        ghost.add(head);
        
        // 眼睛
        const eyeGeometry = new THREE.SphereGeometry(0.04 * scale, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.05 * scale, 0.9 * scale, 0.12 * scale);
        ghost.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeometry.clone(), eyeMaterial);
        rightEye.position.set(0.05 * scale, 0.9 * scale, 0.12 * scale);
        ghost.add(rightEye);
        
        // 嘴巴
        const mouthGeometry = new THREE.TorusGeometry(0.03 * scale, 0.01 * scale, 8, 16);
        const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, 0.85 * scale, 0.12 * scale);
        mouth.rotation.x = Math.PI / 2;
        ghost.add(mouth);
        
        // 手臂
        const armGeometry = new THREE.CylinderGeometry(0.03 * scale, 0.05 * scale, 0.4 * scale, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.2 * scale, 0.5 * scale, 0);
        leftArm.rotation.z = Math.PI / 4;
        ghost.add(leftArm);
        const rightArm = new THREE.Mesh(armGeometry.clone(), armMaterial);
        rightArm.position.set(0.2 * scale, 0.5 * scale, 0);
        rightArm.rotation.z = -Math.PI / 4;
        ghost.add(rightArm);
        
        // 添加发光效果
        const glowLight = new THREE.PointLight(0xffffff, 0.5, 3);
        glowLight.position.y = 0.7 * scale;
        ghost.add(glowLight);
        
        return ghost;
    },

    // 检测 NPC 碰撞
    checkNPCCollision() {
        if (Game.playerHealth <= 0) return;
        
        const playerCellX = Math.round(Player.playerPos.x);
        const playerCellZ = Math.round(Player.playerPos.z);
        
        for (let i = 0; i < this.npcPositions.length; i++) {
            const npcPos = this.npcPositions[i];
            if (npcPos && Math.round(npcPos.x) === playerCellX && Math.round(npcPos.z) === playerCellZ) {
                // 碰撞！扣血
                Game.playerHealth = Math.max(0, Game.playerHealth - 10);
                if (typeof UI !== 'undefined' && UI.updateHealthDisplay) {
                    UI.updateHealthDisplay();
                }
                
                // 显示伤害提示
                if (typeof UI !== 'undefined' && UI.showDamageEffect) {
                    UI.showDamageEffect();
                }
                
                // 如果血量归零，游戏结束
                if (Game.playerHealth <= 0) {
                    alert('游戏结束！你的血量归零了。');
                    Game.loadLevel(0);
                    Game.playerHealth = 100;
                    if (typeof UI !== 'undefined' && UI.updateHealthDisplay) {
                        UI.updateHealthDisplay();
                    }
                }
                
                // 移除这个NPC（避免重复扣血）
                this.npcPositions.splice(i, 1);
                break;
            }
        }
    },

    // 创建血包和弹跳包
    createHealthAndJumpPacks(scene, levelIndex) {
        // 清除旧的包
        this.healthPacks.forEach(pack => scene.remove(pack.mesh));
        this.jumpPacks.forEach(pack => scene.remove(pack.mesh));
        this.healthPacks = [];
        this.jumpPacks = [];
        
        const levelConfig = LIFE_LEVELS[levelIndex];
        const mazeSize = levelConfig.mazeSize;
        const numPacks = Math.floor(mazeSize * 0.1);
        
        for (let i = 0; i < numPacks; i++) {
            const isHealthPack = Math.random() < 0.5;
            
            // 随机位置（避开起点和终点）
            let x, z;
            let attempts = 0;
            do {
                x = Math.floor(Math.random() * (mazeSize - 2)) + 1;
                z = Math.floor(Math.random() * (mazeSize - 2)) + 1;
                attempts++;
            } while ((x === 0 && z === 0) || (x === mazeSize - 1 && z === mazeSize - 1) || attempts < 10);
            
            // 创建包
            let packMesh;
            if (isHealthPack) {
                // 血包（红色球体）
                const geometry = new THREE.SphereGeometry(0.3, 16, 16);
                const material = new THREE.MeshStandardMaterial({
                    color: 0xff0000,
                    emissive: 0xff0000,
                    emissiveIntensity: 0.5
                });
                packMesh = new THREE.Mesh(geometry, material);
                packMesh.userData.type = 'health';
                packMesh.userData.value = 10;
                this.healthPacks.push({ mesh: packMesh, x, z });
            } else {
                // 弹跳包（黄色八面体）
                const geometry = new THREE.OctahedronGeometry(0.3, 0);
                const material = new THREE.MeshStandardMaterial({
                    color: 0xffff00,
                    emissive: 0xffff00,
                    emissiveIntensity: 0.5
                });
                packMesh = new THREE.Mesh(geometry, material);
                packMesh.userData.type = 'jump';
                packMesh.userData.value = 1;
                this.jumpPacks.push({ mesh: packMesh, x, z });
            }
            
            // 设置位置
            const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
            const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;
            packMesh.position.set(
                x * CONFIG.cellSize + offsetX,
                0.3,
                z * CONFIG.cellSize + offsetZ
            );
            packMesh.castShadow = true;
            scene.add(packMesh);
        }
    },

    // 检测道具碰撞
    checkPackCollision() {
        const playerCellX = Math.round(Player.playerPos.x);
        const playerCellZ = Math.round(Player.playerPos.z);
        
        // 检查血包
        for (let i = this.healthPacks.length - 1; i >= 0; i--) {
            const pack = this.healthPacks[i];
            if (Math.round(pack.x) === playerCellX && Math.round(pack.z) === playerCellZ) {
                // 拾取血包
                Game.playerHealth = Math.min(100, Game.playerHealth + pack.mesh.userData.value);
                if (typeof UI !== 'undefined' && UI.updateHealthDisplay) {
                    UI.updateHealthDisplay();
                }
                Game.scene.remove(pack.mesh);
                this.healthPacks.splice(i, 1);
                if (typeof UI !== 'undefined' && UI.showPackEffect) {
                    UI.showPackEffect('+10 ❤️', 0xff0000);
                }
            }
        }
        
        // 检查弹跳包
        for (let i = this.jumpPacks.length - 1; i >= 0; i--) {
            const pack = this.jumpPacks[i];
            if (Math.round(pack.x) === playerCellX && Math.round(pack.z) === playerCellZ) {
                // 拾取弹跳包
                Game.jumpCount = Math.max(0, Game.jumpCount - pack.mesh.userData.value);
                if (typeof UI !== 'undefined' && UI.updateJumpsDisplay) {
                    UI.updateJumpsDisplay();
                }
                Game.scene.remove(pack.mesh);
                this.jumpPacks.splice(i, 1);
                if (typeof UI !== 'undefined' && UI.showPackEffect) {
                    UI.showPackEffect('+1 跳跃', 0xffff00);
                }
            }
        }
    },

    // 更新 NPC 动画
    updateAnimations() {
        const time = Date.now() * 0.001;
        this.npcs.forEach((npc, index) => {
            // 女鬼飘浮效果
            if (npc.children.some(child => child.material && child.material.transparent && child.material.opacity < 1)) {
                npc.position.y = Math.sin(time * 2 + index) * 0.2;
                npc.rotation.y += 0.01;
            }
            // 怪兽和恐龙的轻微摆动
            else {
                npc.rotation.y += 0.002;
                npc.position.y = Math.sin(time * 1.5 + index) * 0.1;
            }
        });
    }
};
