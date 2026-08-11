/**
 * ============================================================
 *  捕鱼游戏 - 全局配置（所有可调参数都在这里，改这里即可）
 * ============================================================
 *  素材路径、鱼种属性、炮台、子弹、技能、生成参数、UI 等
 */
window.GameConfig = {

  /* ---------- 画布与主循环 ---------- */
  canvas: {
    width: 1280,        // 逻辑宽度（会自动等比缩放适配窗口）
    height: 720,        // 逻辑高度
    fpsCap: 60,         // 目标帧率（requestAnimationFrame + 时间步进）
  },

  /* ---------- 素材路径配置（一键替换素材只需改这里） ---------- */
  assets: {
    base:        "assets/",                    // 素材根目录（相对 index.html，末尾带 /）
    fishDir:     "fish/",                      // 鱼类素材子目录
    fishList:    "assets/fish/fishlist.js",    // 鱼类清单脚本（自动生成，见 README）
    cannonDir:   "cannon/",                    // 炮台素材子目录
    effectsDir:  "effects/",                   // 特效素材子目录
    bgDir:       "bg/",                        // 背景素材子目录
    /* 具体文件名（不存在时自动回退为程序化绘制） */
    bg:             { file: "" },
    cannonSingle:   { file: "cannon.png" },            // 单图模式炮台（无多角度帧时使用）
    coin:           { file: "coin.png" },              // 金币贴图（可选，无则程序化绘制）
    // 特效贴图（可选，缺省全部用粒子模拟）
    effectExplosion:{ file: "explosion_%d.png" },      // %d = 帧序号，如 explosion_0.png
    effectSplash:   { file: "splash.png" },
  },

  /* ---------- 鱼类配置 ----------
   * fishSpecies 为空数组时 = 自动模式：
   *   从 fishlist.js 的清单中把全部素材按比例随机分配进 tiers 档位；
   * 手动模式：按下面格式逐条配置（可只列一部分，其余走自动）：
   *   { image: "fish_001.png", frames: 1, tier: 0 }
   *   image  = 素材文件名（单图）或序列帧前缀（frames>1 时自动找 _0.png _1.png...）
   *   frames = 帧数，1=单图模式，>1=序列帧动画模式
   *   tier   = 引用 fishTiers 的下标（决定速度/血量/金币/大小）
   */
  fish: {
    fishSpecies: [],          // [] = 自动模式（推荐，见上）
    tiers: [
      //  [name]    speed    hp   gold    scale   weight(权重,越大越常见)  frames(默认帧数)
      { name:"小鱼",   speed: 90,  hp: 1,  gold:  2,  scale: 1.0, weight: 40, frames: 1 },
      { name:"中鱼",   speed: 70,  hp: 3,  gold:  5,  scale: 1.4, weight: 28, frames: 1 },
      { name:"大鱼",   speed: 55,  hp: 6,  gold: 10,  scale: 1.9, weight: 18, frames: 1 },
      { name:"金鱼",   speed: 45,  hp: 10, gold: 20,  scale: 2.4, weight:  9, frames: 1 },
      { name:"紫鱼",   speed: 38,  hp: 16, gold: 40,  scale: 3.0, weight:  4, frames: 1 },
      { name:"龙王",   speed: 30,  hp: 25, gold: 80,  scale: 3.6, weight:  1, frames: 1 },
    ],
    // 可选覆盖：每档使用素材数量（自动模式下按权重分配的份数，留空=全部素材按权重分配）
    spawnInterval: 0.18,           // 基础生成间隔(秒)，鱼越多间隔自动变长（爽游：鱼持续供给，不空窗）
    maxFish: 120,                  // 同屏鱼上限（鱼多更爽，网范围收益更高）
    minSizeFactor: 0.7,        // 每档大小随机浮动下限
    maxSizeFactor: 1.3,        // 每档大小随机浮动上限
  },

  /* ---------- 炮台 ---------- */
  cannon: {
    xRatio: 0.5,               // 炮台水平位置比例（0=最左，1=最右）
    yRatio: 0.86,              // 炮台垂直位置比例
    size: 96,                  // 炮台基准尺寸(px)
    angleFrames: 0,            // 多角度序列帧数量；0 = 单图模式（单图 + 旋转）
                               // 若 >0：按 cannon_0.png ~ cannon_{N-1}.png 加载，
                               // 每帧覆盖 360/N 度，角度变化自动切换帧
    rotationSpeed: 360,        // 跟随鼠标最大旋转速度(度/秒)（爽游：快速跟手）
    fireInterval: 0.06,        // 开火间隔(秒)——爽游模式：即点即射，快速连点不吞子弹（狂暴时 * 0.5）
    maxSpeedLevel: 10,         // 滚轮最大倍率
    speedLevels: [1, 2, 5, 10],// 滚轮可选的倍率档位（写在上面，切换按此循环）
    bulletSpeed: 620,          // 子弹飞行速度(px/秒)
    bulletRadius: 9,           // 子弹碰撞半径（加大提高命中率）
    bulletDamage: 1,           // 网内每条鱼受到的伤害
    autoFireAngle: 8,          // 自动开火的瞄准角度误差(度)，误差内即发射
  },

  /* ---------- 命中网（范围捕获） ----------
   * 子弹命中鱼后扩散成一张固定大小的网，网内所有鱼独立判定捕获概率
   * 网范围固定（不随倍率变化），倍率只影响捕获概率与金币收益
   */
  net: {
    radius: 72,            // 网半径(px)——固定值，倍率不改变范围
    duration: 0.3,         // 网扩散动画时长(秒)
    meshCount: 3,          // 同心圆环数量
    rayCount: 8,           // 放射线数量
  },

  /* ---------- 技能面板 ---------- */
  skills: {
    freeze: { name:"冰冻",  key:"Q",  cd:20, duration: 3.0,  desc:"全场鱼减速 75%，边缘蓝色涟漪" },
    frenzy: { name:"狂暴",  key:"W",  cd:30, duration: 5.0,  desc:"射速翻倍 + 子弹加速，边缘红光" },
    lock:   { name:"锁定",  key:"E",  cd:25, duration: 5.0,  desc:"只攻击鼠标指向的那条鱼" },
  },

  /* ---------- 捕获概率（概率制捕鱼） ----------
   * 命中鱼后按概率捕获（捕到才给金币、鱼才消失），概率随鱼价降低；倍率越高概率越大
   * chance = base / (1 + gold * priceFactor) × (0.6 + mult × multFactor)
   */
  catch: {
    base: 0.45,            // 基础概率系数（调低：打中 ≠ 捕到，捕获才有成就感）
    priceFactor: 0.12,     // 鱼价对概率的衰减系数（鱼越贵越难捕）
    multFactor: 0.15,      // 倍率加成系数（10× = ×2.1）
    minChance: 0.03,       // 最低概率（龙王也有一点机会）
    maxChance: 0.95,       // 最高概率（小鱼基本必中）
  },

  /* ---------- 金币系统 ---------- */
  coin: {
    speed: 420,                // 金币飞向炮台的速度(px/秒)
    life: 0.9,                 // 金币最大存活(秒)，防止飞太久
    value: 1,                  // 基础面值（乘以鱼的 gold 字段）
    startGold: 500,            // 初始金币（爽游：够爽射一波）
  },

  /* ---------- 粒子特效（内置，无需素材） ---------- */
  particles: {
    explosionCount: 18,        // 爆炸粒子数
    splashCount: 8,            // 水花粒子数
    sparkCount: 10,            // 命中火花数
  },

  /* ---------- UI ---------- */
  ui: {
    // 顶部信息栏位置（百分比定位）
    fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
  },
};
