/**
 * 鱼实体（Fish）
 * - 沿预计算的三次贝塞尔曲线游动
 * - 圆形碰撞体（radius 取渲染尺寸的一半）
 * - 支持单图 / 序列帧
 * - 可被冰冻（frozen 计时）、被锁定（locked 标记）
 */
window.Fish = class Fish {
  /**
   * @param {object} opts
   *  opts.asset   - {image: HTMLImageElement, frames: HTMLImageElement[]|null, frameMs:number}
   *  opts.tier    - 档位配置 {speed, hp, gold, scale, ...}
   *  opts.path    - bezierPath 返回的点数组
   *  opts.x0,y0   - 初始位置（path[0]）
   *  opts.dir     - 1 朝右 / -1 朝左（决定贴图水平翻转）
   */
  constructor(opts) {
    this.asset = opts.asset;
    this.tier = opts.tier;
    this.path = opts.path;
    this.dir = opts.dir;

    this.x = opts.x0;
    this.y = opts.y0;

    this.scale = this.tier.scale;
    this.radius = (this.renderSize() / 2) * 0.8; // 碰撞半径
    this.hp = this.tier.hp;
    this.maxHp = this.tier.hp;

    this.progress = 0;          // 路径进度 0~1
    this.speed = this.tier.speed;   // px/s（沿路径前进速度）

    this.frozen = 0;            // 冰冻剩余时间(秒)
    this.dead = false;
    this.animT = 0;             // 动画时间

    this.alpha = 0;             // 入场淡入
    this.entering = true;
  }

  /** 渲染尺寸 = 素材原始尺寸 * 档位缩放（若素材缺失则用内置形状尺寸） */
  renderSize() {
    const img = this.firstImage();
    if (img) {
      return Math.max(img.width, img.height) * this.scale;
    }
    return 44 * this.scale; // 无素材兜底
  }

  firstImage() {
    if (!this.asset) return null;
    if (Array.isArray(this.asset.image)) return this.asset.image[0] || null;
    return this.asset.image || null;
  }

  frames() {
    return this.asset && Array.isArray(this.asset.image) ? this.asset.image : null;
  }

  /** 扣血；返回是否死亡 */
  damage(d) {
    this.hp -= d;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      return true;
    }
    return false;
  }

  /** 未捕获：闪白提示"差点抓住" */
  escaped() {
    this.escapedFlash = 0.15; // 秒
  }

  /**
   * 每帧更新
   * @param {number} dt  秒
   * @param {number} elapsed 全局时间
   */
  update(dt) {
    this.animT += dt;
    // 未捕获闪烁计时
    if (this.escapedFlash > 0) this.escapedFlash -= dt;
    // 冰冻：减速 75%（不再完全停住）
    let spd = this.speed;
    if (this.frozen > 0) {
      this.frozen -= dt;
      spd *= 0.25;
    }
    // 贝塞尔曲线速度控制：进度按 速度/路径总长 增长
    const totalLen = this.pathLen || this._calcLen();
    const ds = spd * dt;
    this.progress += ds / totalLen;

    const pt = Utils.pointAt(this.path, this.progress);
    this.x = pt.x;
    this.y = pt.y;
    this.dir = pt.angle > 90 || pt.angle < -90 ? -1 : 1;

    if (this.progress >= 1) {
      this.dead = true; // 游出屏外，销毁
    }
  }

  _calcLen() {
    // 简化：按点对距离累加
    let len = 0;
    for (let i = 1; i < this.path.length; i++) {
      len += Utils.dist(this.path[i - 1].x, this.path[i - 1].y, this.path[i].x, this.path[i].y);
    }
    this.pathLen = len || 1;
    return this.pathLen;
  }
};
