// 地图生成器 - 用于服务器端生成统一的地图
// 使用固定种子确保所有玩家看到相同的地图

function generateMaze(mazeSize, seed = null) {
    // 使用种子初始化随机数生成器
    let random = seed ? seededRandom(seed) : Math.random;
    
    const maze = [];
    for (let y = 0; y < mazeSize; y++) {
        maze[y] = [];
        for (let x = 0; x < mazeSize; x++) {
            maze[y][x] = { top: true, right: true, bottom: true, left: true, visited: false };
        }
    }

    const stack = [];
    const startX = 0;
    const startY = 0;
    maze[startY][startX].visited = true;
    stack.push({ x: startX, y: startY });

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = [];

        if (current.y > 0 && !maze[current.y - 1][current.x].visited) neighbors.push({ x: current.x, y: current.y - 1, dir: 'top' });
        if (current.x < mazeSize - 1 && !maze[current.y][current.x + 1].visited) neighbors.push({ x: current.x + 1, y: current.y, dir: 'right' });
        if (current.y < mazeSize - 1 && !maze[current.y + 1][current.x].visited) neighbors.push({ x: current.x, y: current.y + 1, dir: 'bottom' });
        if (current.x > 0 && !maze[current.y][current.x - 1].visited) neighbors.push({ x: current.x - 1, y: current.y, dir: 'left' });

        if (neighbors.length > 0) {
            const chosen = neighbors[Math.floor(random() * neighbors.length)];
            removeWall(maze, current.x, current.y, chosen.dir);
            maze[chosen.y][chosen.x].visited = true;
            stack.push({ x: chosen.x, y: chosen.y });
        } else {
            stack.pop();
        }
    }

    return maze;
}

function removeWall(maze, x, y, dir) {
    if (dir === 'top') { maze[y][x].top = false; maze[y - 1][x].bottom = false; }
    else if (dir === 'right') { maze[y][x].right = false; maze[y][x + 1].left = false; }
    else if (dir === 'bottom') { maze[y][x].bottom = false; maze[y + 1][x].top = false; }
    else if (dir === 'left') { maze[y][x].left = false; maze[y][x - 1].right = false; }
}

// 简单的种子随机数生成器
function seededRandom(seed) {
    let value = seed;
    return function() {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
}

// 生成所有关卡的地图
function generateAllMazes(levelConfigs, roomSeed) {
    const mazes = [];
    for (let i = 0; i < levelConfigs.length; i++) {
        const seed = roomSeed + i * 1000; // 每个关卡使用不同的种子
        mazes.push(generateMaze(levelConfigs[i].mazeSize, seed));
    }
    return mazes;
}

module.exports = { generateMaze, generateAllMazes };
