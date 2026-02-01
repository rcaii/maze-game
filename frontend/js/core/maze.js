// ==================== 迷宫生成模块 ====================

const MazeGenerator = {
    maze: [],
    walls: [],
    floor: null,
    floorMaterial: null,
    gridHelper: null,

    // 生成迷宫
    generateMaze(levelIndex, serverMaze = null, scene = null) {
        const levelConfig = LIFE_LEVELS[levelIndex];
        const mazeSize = levelConfig.mazeSize;
        
        // 如果有多人模式且服务器提供了地图，使用服务器地图
        if (serverMaze) {
            this.maze = JSON.parse(JSON.stringify(serverMaze)); // 深拷贝
            if (scene) {
                this.createMazeWalls(levelIndex, scene);
            }
            return;
        }
        
        // 否则本地生成（离线模式）
        this.maze = [];
        for (let y = 0; y < mazeSize; y++) {
            this.maze[y] = [];
            for (let x = 0; x < mazeSize; x++) {
                this.maze[y][x] = { top: true, right: true, bottom: true, left: true, visited: false };
            }
        }

        const stack = [];
        const startX = 0;
        const startY = 0;
        this.maze[startY][startX].visited = true;
        stack.push({ x: startX, y: startY });

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];

            if (current.y > 0 && !this.maze[current.y - 1][current.x].visited) neighbors.push({ x: current.x, y: current.y - 1, dir: 'top' });
            if (current.x < mazeSize - 1 && !this.maze[current.y][current.x + 1].visited) neighbors.push({ x: current.x + 1, y: current.y, dir: 'right' });
            if (current.y < mazeSize - 1 && !this.maze[current.y + 1][current.x].visited) neighbors.push({ x: current.x, y: current.y + 1, dir: 'bottom' });
            if (current.x > 0 && !this.maze[current.y][current.x - 1].visited) neighbors.push({ x: current.x - 1, y: current.y, dir: 'left' });

            if (neighbors.length > 0) {
                const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.removeWall(current.x, current.y, chosen.dir);
                this.maze[chosen.y][chosen.x].visited = true;
                stack.push({ x: chosen.x, y: chosen.y });
            } else {
                stack.pop();
            }
        }

        if (scene) {
            this.createMazeWalls(levelIndex, scene);
        }
    },

    // 移除墙壁
    removeWall(x, y, dir) {
        if (dir === 'top') { this.maze[y][x].top = false; this.maze[y - 1][x].bottom = false; }
        else if (dir === 'right') { this.maze[y][x].right = false; this.maze[y][x + 1].left = false; }
        else if (dir === 'bottom') { this.maze[y][x].bottom = false; this.maze[y + 1][x].top = false; }
        else if (dir === 'left') { this.maze[y][x].left = false; this.maze[y][x - 1].right = false; }
    },

    // 获取墙壁材质
    getWallMaterial(materialType, levelConfig) {
        switch(materialType) {
            case 'toy':
                return new THREE.MeshStandardMaterial({
                    color: 0xffb3ba,
                    roughness: 0.9,
                    metalness: 0.1
                });
            case 'school':
                return new THREE.MeshStandardMaterial({
                    color: 0xf5f5f5,
                    roughness: 0.8,
                    metalness: 0.0
                });
            case 'concrete':
                return new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    roughness: 0.95,
                    metalness: 0.0
                });
            case 'metal':
                return new THREE.MeshStandardMaterial({
                    color: 0x546e7a,
                    roughness: 0.3,
                    metalness: 0.8
                });
            case 'brick':
                return new THREE.MeshStandardMaterial({
                    color: 0xb85c38,
                    roughness: 0.9,
                    metalness: 0.0
                });
            case 'stone':
                return new THREE.MeshStandardMaterial({
                    color: 0x6d5d4f,
                    roughness: 0.95,
                    metalness: 0.0
                });
            case 'wood':
                return new THREE.MeshStandardMaterial({
                    color: 0x8b6f47,
                    roughness: 0.7,
                    metalness: 0.1
                });
            case 'nature':
                return new THREE.MeshStandardMaterial({
                    color: 0x4a7c59,
                    roughness: 0.9,
                    metalness: 0.0
                });
            case 'aged':
                return new THREE.MeshStandardMaterial({
                    color: 0x8d6e63,
                    roughness: 0.95,
                    metalness: 0.0
                });
            case 'ethereal':
                return new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.1,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.3
                });
            default:
                return new THREE.MeshStandardMaterial({
                    color: levelConfig.wallColor,
                    roughness: 0.8,
                    metalness: 0.2
                });
        }
    },

    // 获取地面材质
    getGroundMaterial(materialType, levelConfig) {
        switch(materialType) {
            case 'carpet':
                return new THREE.MeshStandardMaterial({
                    color: 0xffdfba,
                    roughness: 0.95,
                    metalness: 0.0
                });
            case 'tile':
                return new THREE.MeshStandardMaterial({
                    color: 0xe3f2fd,
                    roughness: 0.3,
                    metalness: 0.1
                });
            case 'asphalt':
                return new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    roughness: 0.9,
                    metalness: 0.0
                });
            case 'concrete':
                return new THREE.MeshStandardMaterial({
                    color: 0x666666,
                    roughness: 0.95,
                    metalness: 0.0
                });
            case 'wood':
                return new THREE.MeshStandardMaterial({
                    color: 0xd4a574,
                    roughness: 0.6,
                    metalness: 0.0
                });
            case 'stone':
                return new THREE.MeshStandardMaterial({
                    color: 0x5d4037,
                    roughness: 0.9,
                    metalness: 0.0
                });
            case 'grass':
                return new THREE.MeshStandardMaterial({
                    color: 0x7cb342,
                    roughness: 0.95,
                    metalness: 0.0
                });
            case 'old_wood':
                return new THREE.MeshStandardMaterial({
                    color: 0x8d6e63,
                    roughness: 0.8,
                    metalness: 0.0
                });
            case 'cloud':
                return new THREE.MeshStandardMaterial({
                    color: 0xf5f5f5,
                    roughness: 0.1,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.8
                });
            default:
                return new THREE.MeshStandardMaterial({
                    color: levelConfig.groundColor,
                    roughness: 0.8,
                    metalness: 0.2
                });
        }
    },

    // 创建地面
    createFloor(levelIndex, scene) {
        if (this.floor) {
            scene.remove(this.floor);
        }
        if (this.gridHelper) {
            scene.remove(this.gridHelper);
        }
        const levelConfig = LIFE_LEVELS[levelIndex];
        const floorSize = levelConfig.mazeSize * CONFIG.cellSize * 2;
        
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        this.floorMaterial = this.getGroundMaterial(levelConfig.groundMaterial, levelConfig);
        this.floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = 0;
        this.floor.receiveShadow = true;
        scene.add(this.floor);

        // 只在某些关卡显示网格
        if (levelConfig.groundMaterial === 'tile' || levelConfig.groundMaterial === 'wood') {
            this.gridHelper = new THREE.GridHelper(floorSize, Math.floor(floorSize / 2), 
                new THREE.Color(levelConfig.groundColor).multiplyScalar(0.2).getHex(), 
                new THREE.Color(levelConfig.groundColor).multiplyScalar(0.05).getHex());
            this.gridHelper.position.y = 0.01;
            scene.add(this.gridHelper);
        }
    },

    // 创建迷宫墙壁
    createMazeWalls(levelIndex, scene) {
        this.walls.forEach(wall => scene.remove(wall));
        this.walls = [];

        const levelConfig = LIFE_LEVELS[levelIndex];
        const mazeSize = levelConfig.mazeSize;
        const wallHeight = levelConfig.wallHeight;

        const wallMaterial = this.getWallMaterial(levelConfig.wallMaterial, levelConfig);

        const offsetX = -(mazeSize - 1) * CONFIG.cellSize / 2;
        const offsetZ = -(mazeSize - 1) * CONFIG.cellSize / 2;

        for (let y = 0; y < mazeSize; y++) {
            for (let x = 0; x < mazeSize; x++) {
                const cell = this.maze[y][x];
                const px = x * CONFIG.cellSize + offsetX;
                const pz = y * CONFIG.cellSize + offsetZ;

                if (cell.top) {
                    const wall = this.createWall(px, pz - CONFIG.cellSize / 2, CONFIG.cellSize, wallHeight, 0.1, wallMaterial, scene);
                    this.walls.push(wall);
                }
                if (cell.right) {
                    const wall = this.createWall(px + CONFIG.cellSize / 2, pz, 0.1, wallHeight, CONFIG.cellSize, wallMaterial, scene);
                    this.walls.push(wall);
                }
            }
        }

        // 四周封边：迷宫外圈围墙
        const totalSize = mazeSize * CONFIG.cellSize;
        const topZ = offsetZ - CONFIG.cellSize / 2;
        const bottomZ = offsetZ + (mazeSize - 1) * CONFIG.cellSize + CONFIG.cellSize / 2;
        const leftX = offsetX - CONFIG.cellSize / 2;
        const rightX = offsetX + (mazeSize - 1) * CONFIG.cellSize + CONFIG.cellSize / 2;
        const centerX = offsetX + (mazeSize - 1) * CONFIG.cellSize / 2;
        const centerZ = offsetZ + (mazeSize - 1) * CONFIG.cellSize / 2;

        const topWall = this.createWall(centerX, topZ, totalSize, wallHeight, 0.1, wallMaterial, scene);
        const bottomWall = this.createWall(centerX, bottomZ, totalSize, wallHeight, 0.1, wallMaterial, scene);
        const leftWall = this.createWall(leftX, centerZ, 0.1, wallHeight, totalSize, wallMaterial, scene);
        const rightWall = this.createWall(rightX, centerZ, 0.1, wallHeight, totalSize, wallMaterial, scene);
        this.walls.push(topWall, bottomWall, leftWall, rightWall);
    },

    // 创建单个墙壁
    createWall(x, z, width, height, depth, wallMaterial, scene) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, height / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        return wall;
    },

    // 查找从起点到终点的路径（用于放置NPC）
    findPathToGoal(levelIndex) {
        const mazeSize = LIFE_LEVELS[levelIndex].mazeSize;
        const start = { x: 0, y: 0 };
        const goal = { x: mazeSize - 1, y: mazeSize - 1 };
        
        // 使用BFS找到最短路径
        const queue = [{ x: start.x, y: start.y, path: [{ x: start.x, y: start.y }] }];
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.x === goal.x && current.y === goal.y) {
                return current.path; // 返回路径
            }
            
            // 检查四个方向
            const directions = [
                { x: 0, y: -1, dir: 'top' },
                { x: 1, y: 0, dir: 'right' },
                { x: 0, y: 1, dir: 'bottom' },
                { x: -1, y: 0, dir: 'left' }
            ];
            
            for (const dir of directions) {
                const newX = current.x + dir.x;
                const newY = current.y + dir.y;
                const key = `${newX},${newY}`;
                
                if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize && !visited.has(key)) {
                    if (!this.maze[current.y] || !this.maze[current.y][current.x]) continue;
                    const cell = this.maze[current.y][current.x];
                    // 检查是否有墙阻挡
                    let canMove = false;
                    if (dir.dir === 'top' && !cell.top) canMove = true;
                    if (dir.dir === 'right' && !cell.right) canMove = true;
                    if (dir.dir === 'bottom' && !cell.bottom) canMove = true;
                    if (dir.dir === 'left' && !cell.left) canMove = true;
                    
                    if (canMove) {
                        visited.add(key);
                        queue.push({
                            x: newX,
                            y: newY,
                            path: [...current.path, { x: newX, y: newY }]
                        });
                    }
                }
            }
        }
        
        return []; // 如果找不到路径，返回空数组
    }
};
