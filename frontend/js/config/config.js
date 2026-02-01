// ==================== 配置模块 ====================

// 关卡配置
const LIFE_LEVELS = [
    {
        stageName: "蒙昧初始期",
        ageRange: "0-6岁",
        quote: "世界是一个巨大的游乐场。",
        wallColor: 0xffb3ba,
        groundColor: 0xffdfba,
        fogColor: 0xffb3ba,
        fogDensity: 0.01,
        lightIntensity: 0.7,
        mazeSize: 20,
        wallHeight: 1.2,
        wallMaterial: "toy",
        groundMaterial: "carpet"
    },
    {
        stageName: "求学成长期",
        ageRange: "7-18岁",
        quote: "我在规则中寻找方向。",
        wallColor: 0x90caf9,
        groundColor: 0xe3f2fd,
        fogColor: 0x90caf9,
        fogDensity: 0.02,
        lightIntensity: 0.6,
        mazeSize: 28,
        wallHeight: 1.2,
        wallMaterial: "school",
        groundMaterial: "tile"
    },
    {
        stageName: "迷茫探索期",
        ageRange: "19-24岁",
        quote: "自由是迷人的，也是可怕的。",
        wallColor: 0x666666,
        groundColor: 0x333333,
        fogColor: 0x666666,
        fogDensity: 0.15,
        lightIntensity: 0.6,
        mazeSize: 36,
        wallHeight: 1.2,
        wallMaterial: "concrete",
        groundMaterial: "asphalt"
    },
    {
        stageName: "奋斗冲刺期",
        ageRange: "25-30岁",
        quote: "在钢铁丛林中扎根。",
        wallColor: 0x546e7a,
        groundColor: 0x263238,
        fogColor: 0x546e7a,
        fogDensity: 0.08,
        lightIntensity: 0.5,
        mazeSize: 44,
        wallHeight: 1.2,
        wallMaterial: "metal",
        groundMaterial: "concrete"
    },
    {
        stageName: "成家立业期",
        ageRange: "31-40岁",
        quote: "责任是甜蜜的负担。",
        wallColor: 0xffb74d,
        groundColor: 0xfff3e0,
        fogColor: 0xffb74d,
        fogDensity: 0.05,
        lightIntensity: 0.6,
        mazeSize: 40,
        wallHeight: 1.2,
        wallMaterial: "brick",
        groundMaterial: "wood"
    },
    {
        stageName: "负重前行期",
        ageRange: "41-50岁",
        quote: "上有老下有小，不敢停歇。",
        wallColor: 0x8d6e63,
        groundColor: 0x5d4037,
        fogColor: 0x8d6e63,
        fogDensity: 0.2,
        lightIntensity: 0.4,
        mazeSize: 48,
        wallHeight: 1.2,
        wallMaterial: "stone",
        groundMaterial: "stone"
    },
    {
        stageName: "知命释怀期",
        ageRange: "51-60岁",
        quote: "接受平凡，也是一种伟大。",
        wallColor: 0xffa726,
        groundColor: 0xffe0b2,
        fogColor: 0xffa726,
        fogDensity: 0.03,
        lightIntensity: 0.65,
        mazeSize: 32,
        wallHeight: 1.2,
        wallMaterial: "wood",
        groundMaterial: "grass"
    },
    {
        stageName: "自由回归期",
        ageRange: "61-70岁",
        quote: "终于，我只属于我自己。",
        wallColor: 0x66bb6a,
        groundColor: 0xc8e6c9,
        fogColor: 0x66bb6a,
        fogDensity: 0.02,
        lightIntensity: 0.7,
        mazeSize: 28,
        wallHeight: 1.2,
        wallMaterial: "nature",
        groundMaterial: "grass"
    },
    {
        stageName: "衰老共存期",
        ageRange: "71-80岁",
        quote: "回忆比未来更清晰。",
        wallColor: 0x8d6e63,
        groundColor: 0xd7ccc8,
        fogColor: 0x8d6e63,
        fogDensity: 0.1,
        lightIntensity: 0.7,
        mazeSize: 24,
        wallHeight: 1.2,
        wallMaterial: "aged",
        groundMaterial: "old_wood"
    },
    {
        stageName: "归途告别期",
        ageRange: "80+岁",
        quote: "回归本源，一切即是一。",
        wallColor: 0xffffff,
        groundColor: 0xf5f5f5,
        fogColor: 0xffffff,
        fogDensity: 0.0,
        lightIntensity: 0.8,
        mazeSize: 12,
        wallHeight: 1.2,
        wallMaterial: "ethereal",
        groundMaterial: "cloud"
    }
];

// 游戏配置
const CONFIG = {
    cellSize: 2,
    cameraOffset: { x: 8, y: 12, z: 8 },
    cameraLerp: 0.08,
    cameraLerpAntiShake: 1.0
};

// 角色配置
const CHARACTERS = {
    1: { name: '王哥', avatar: 'assets/images/1.jpg', color: '0x4fc3f7' },
    2: { name: '涛子', avatar: 'assets/images/2.jpg', color: '0xe57373' },
    3: { name: '高天', avatar: 'assets/images/3.jpg', color: '0x81c784' },
    4: { name: '胡姐', avatar: 'assets/images/4.jpg', color: '0xffb74d' },
    5: { name: '苟哥', avatar: 'assets/images/5.jpg', color: '0xba68c8' }
};

// 玩家颜色映射
const PLAYER_COLORS = {
    '0x4fc3f7': { name: '蓝色', body: 0x4fc3f7 },
    '0xe57373': { name: '红色', body: 0xe57373 },
    '0x81c784': { name: '绿色', body: 0x81c784 },
    '0xffb74d': { name: '橙色', body: 0xffb74d },
    '0xba68c8': { name: '紫色', body: 0xba68c8 }
};

// 默认 WebSocket 服务器地址
const WS_SERVER = 'ws://localhost:8080';
