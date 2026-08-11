/**
 * 逻辑层（GameLogic）
 * - 鱼群生成（定时 + 上限）
 * - 子弹碰撞检测（圆形）
 * - 技能状态管理（冰冻/狂暴/锁定）
 * - 金币结算与数据统计
 */
window.GameLogic = class GameLogic {
  constructor(game) {
    this.game = game;
    this.cfg = game.cfg;

    this.fishes = [];
    this.bullets = [];
    this.coins = [];
    this.effects = [];

    this.spawnTimer = 0;
    this.elapsed = 0;

    // 技能状态
    this.skills = {
      freeze: { active: 0, cd: 0 },   // active=剩余生效时间, cd=剩余冷却
      frenzy: { active: 0, cd: 0 },
      lock:   { active: 0, cd: 0 },
    };

    // 数据统计
    this.stats = { kills: 0, score: 0, shots: 0 };
    this.gold = this.cfg.coin.startGold;

    this.lockTarget = null;   // 锁定技能的目标鱼

    this._buildFishTemplates();
  }

  /** 构建鱼种模板表（自动模式：清单图片按权重分配到各档位） */
  _buildFishTemplates() {
    const cfg = this.cfg.fish;
    this.templates = [];

    const list = window.FISH_IMAGES || [];
    const manual = cfg.fishSpecies || [];
    const manualByTier = {};
    for (const m of manual) {
      (manualByTier[m.tier] = manualByTier[m.tier] || []).push(m);
    }

    for (let t = 0; t < cfg.tiers.length; t++) {
      const tier = cfg.tiers[t];
      const images = [];
      // 手动配置优先
      for (const m of manualByTier[t] || []) images.push(m);
      // 自动：从清单中按权重分配（简单做法：均分剩余）
      const totalImages = Math.max(0, Math.floor((list.length - manual.length) / cfg.tiers.length));
      const start = t * totalImages;
      for (let i = 0; i < totalImages; i++) {
        const idx = start + i;
        if (list[idx]) images.push({ image: list[idx], frames: tier.frames, tier });
      }
      this.templates.push({ tier, images });
    }
  }

  /** 随机生成一条鱼 */
  spawnFish() {
    if (this.fishes.length >= this.cfg.fish.maxFish) return null;

    // 按权重选择档位
    const weights = this.cfg.fish.tiers.map(t => t.weight);
    const tierIdx = Utils.pickWeighted(weights);
    const tpl = this.templates[tierIdx];
    if (!tpl || tpl.images.length === 0) return null;

    const pickInfo = Utils.pick(tpl.images);
    const asset = this.game.assetForFish(pickInfo);

    // 随机出生点：左/右/上 边缘
    const side = Utils.randInt(0, 2); // 0=左 1=右 2=上
    const W = this.game.width, H = this.game.height;
    let x0, y0, dir = 1;
    if (side === 0) { x0 = -60; y0 = Utils.rand(40, H * 0.8); dir = 1; }
    else if (side === 1) { x0 = W + 60; y0 = Utils.rand(40, H * 0.8); dir = -1; }
    else { x0 = Utils.rand(W * 0.1, W * 0.9); y0 = -60; dir = 1; }

    // 随机贝塞尔控制点（朝对侧弯折）
    const midY = Utils.rand(H * 0.15, H * 0.85);
    const ex = Utils.rand(-80, 80), ey = Utils.rand(-80, 80);
    let p1, p2, p3;
    if (side === 0) {
      p1 = { x: x0 + W * 0.25 + ex, y: midY + ey };
      p2 = { x: x0 + W * 0.6 + ex, y: midY - ey * 0.6 };
      p3 = { x: W + 60, y: Utils.rand(40, H * 0.8) };
    } else if (side === 1) {
      p1 = { x: x0 - W * 0.25 + ex, y: midY + ey };
      p2 = { x: x0 - W * 0.6 + ex, y: midY - ey * 0.6 };
      p3 = { x: -60, y: Utils.rand(40, H * 0.8) };
    } else {
      p1 = { x: x0 + ex * 0.5, y: y0 + H * 0.3 + ey };
      p2 = { x: x0 - ex * 0.5, y: y0 + H * 0.6 - ey };
      p3 = { x: Utils.rand(W * 0.2, W * 0.8), y: H + 60 };
    }

    const p0 = { x: x0, y: y0 };
    const path = Utils.bezierPath(p0, p1, p2, p3, 90);

    // 档位随机缩放
    const tier = Object.assign({}, tpl.tier);
    tier.scale = tier.scale * Utils.rand(this.cfg.fish.minSizeFactor, this.cfg.fish.maxSizeFactor);

    const fish = new window.Fish({
      asset, tier, path, x0, y0, dir,
    });
    this.fishes.push(fish);
    return fish;
  }

  /** 每帧逻辑更新 */
  update(dt) {
    this.elapsed += dt;

    this._updateSkills(dt);
    this._updateSpawning(dt);
    this._updateFishes(dt);
    this._updateBullets(dt);
    this._updateCoins(dt);
    this._updateEffects(dt);
    this._checkCollisions();
  }

  _updateSkills(dt) {
    for (const k in this.skills) {
      const s = this.skills[k];
      if (s.active > 0) s.active -= dt;
      if (s.cd > 0) s.cd -= dt;
    }
  }

  _updateSpawning(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnFish();
      // 基础间隔 + 随当前鱼数变长
      const busy = this.fishes.length / this.cfg.fish.maxFish;
      this.spawnTimer = this.cfg.fish.spawnInterval * (1 + busy * 2.5);
    }
  }

  _updateFishes(dt) {
    const freezeActive = this.skills.freeze.active > 0;
    for (const f of this.fishes) {
      if (f.entering) {
        f.alpha = Math.min(1, f.alpha + dt * 3);
        if (f.alpha >= 1) f.entering = false;
      }
      if (freezeActive && f.frozen <= 0) {
        f.frozen = this.skills.freeze.active; // 减速整段剩余时长
      }
      // 锁定技能：标记目标鱼
      f.locked = (this.skills.lock.active > 0 && f === this.lockTarget);
      f.update(dt);
    }
    this.fishes = this.fishes.filter(f => !f.dead);
    // 目标鱼死亡则清除锁定
    if (this.lockTarget && this.lockTarget.dead) this.lockTarget = null;
  }

  /** 锁定技能：按鼠标位置选目标鱼（鼠标圈住的那条） */
  setLockTarget(mx, my) {
    if (this.skills.lock.active <= 0) { this.lockTarget = null; return; }
    let best = null, bestD = Infinity;
    for (const f of this.fishes) {
      if (f.dead) continue;
      const d = Utils.dist(mx, my, f.x, f.y);
      // 选鼠标附近的鱼（半径 60 内最近的一条）
      if (d < bestD && d < 60) { bestD = d; best = f; }
    }
    this.lockTarget = best;
  }

  _updateBullets(dt) {
    const lockActive = this.skills.lock.active > 0;
    for (const b of this.bullets) {
      // 锁定技能：子弹只追踪选中的那条鱼（越过其他鱼群）
      if (lockActive) {
        b.lockMode = true;
        b.lockTarget = this.lockTarget;
      } else {
        b.lockMode = false;
        b.lockTarget = null;
      }
      b.setWorld(this.game.width, this.game.height);
      b.update(dt, this.fishes);
    }
    this.bullets = this.bullets.filter(b => !b.dead);
  }

  _updateCoins(dt) {
    for (const c of this.coins) {
      c.update(dt);
      if (c.dead && c.arrived) {
        // 金币已在击杀时入账，这里只播放音效（飞行纯视觉）
        this.game.audio.play("coin");
      }
    }
    this.coins = this.coins.filter(c => !c.dead);
  }

  _updateEffects(dt) {
    for (const e of this.effects) e.update(dt);
    this.effects = this.effects.filter(e => !e.dead);
  }

  /** 子弹 vs 鱼 圆形碰撞：命中即触发"网"范围捕获判定 */
  _checkCollisions() {
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const f of this.fishes) {
        if (f.dead) continue;
        // 锁定技能：子弹只对选中的目标鱼生效（越过其他鱼群）
        if (b.lockTarget) {
          if (f !== b.lockTarget) continue;
        }
        const d = Utils.dist(b.x, b.y, f.x, f.y);
        if (d <= b.radius + f.radius) {
          b.dead = true;
          this._onNetHit(b.x, b.y, f, b.lockTarget || null);
          break;
        }
      }
    }
    // 去除已死子弹
    this.bullets = this.bullets.filter(b => !b.dead);
  }

  /**
   * 网命中：以命中点为中心，网内每条鱼独立判定捕获概率
   * 概率制：概率 = base/(1+gold×priceFactor) × (0.6+mult×multFactor)
   * @param {number} x,y 命中点
   * @param {Fish} hitFish 直接被子弹命中的鱼
   * @param {Fish} onlyTarget 锁定技能：只对这条鱼生效（null=全部）
   */
  _onNetHit(x, y, hitFish, onlyTarget) {
    const mult = this.game.cannon.multiplier;
    const radius = this.netRadius(mult);

    let hitAny = false;
    let hitCount = 0;
    for (const f of this.fishes) {
      if (f.dead) continue;
      if (onlyTarget && f !== onlyTarget) continue; // 锁定：跳过其他鱼群
      if (Utils.dist(x, y, f.x, f.y) <= radius + f.radius) {
        hitAny = true;
        hitCount++;
        if (this._tryCatch(f, mult)) {
          this._onFishKilled(f, mult);
        } else {
          f.escaped(); // 未捕获：鱼闪一下以示"差点抓住"
        }
      }
    }
    this.debug = this.debug || { nets: 0, fishInNet: 0 };
    this.debug.nets++;
    this.debug.fishInNet += hitCount;

    // 网扩散特效 + 音效
    this.spawnEffect('net', x, y, this.cfg.net.duration, {
      netRadius: radius,
      netMesh: this.cfg.net.meshCount,
      netRays: this.cfg.net.rayCount,
    });
    if (hitAny) this.game.audio.play("hit");
    else this.game.audio.play("splash");
  }

  /** 捕获概率判定 */
  _tryCatch(fish, mult) {
    const c = this.cfg.catch;
    let p = c.base / (1 + fish.tier.gold * c.priceFactor) * (0.6 + mult * c.multFactor);
    p = Math.max(c.minChance, Math.min(c.maxChance, p));
    return Math.random() < p;
  }

  /** 网半径：固定值（倍率不影响范围，只影响概率与金币） */
  netRadius(mult) {
    return this.cfg.net.radius;
  }

  /** 鱼捕获：金币（×当前倍率）立即入账 + 鱼消失 + 特效 + 统计 */
  _onFishKilled(f, mult) {
    f.dead = true; // 捕到鱼：贴图消失（下一帧从鱼群移除）
    this.stats.kills++;
    this.stats.score += f.tier.gold * (mult || 1);

    const value = Math.round(f.tier.gold * (mult || 1));
    this.gold += value; // 捕到才给金币（金币飞行纯视觉，不再等飞回炮台）
    this.spawnCoin(f.x, f.y, value);

    // 爆炸特效（有贴图用贴图，否则粒子）
    const expAssets = this.game.assets.get("effect_explosion");
    this.spawnEffect('explosion', f.x, f.y, 0.35, { frameImages: expAssets, scale: f.scale, count: 18, speed: 220, colors: ['#ffb347', '#ff6a00', '#ffd700', '#fff'] });
  }

  /** 生成金币 */
  spawnCoin(x, y, value) {
    this.coins.push(new window.Coin({
      x, y,
      targetX: this.game.cannon.x,
      targetY: this.game.cannon.y,
      value,
      speed: this.cfg.coin.speed,
      life: this.cfg.coin.life,
    }));
  }

  /** 生成特效 */
  spawnEffect(type, x, y, life, opts) {
    opts = opts || {};
    this.effects.push(new window.Effect({
      type, x, y, life,
      frameImages: opts.frameImages,
      scale: opts.scale || 1,
      count: opts.count,
      speed: opts.speed,
      colors: opts.colors,
    }));
  }

  /** 炮台开火（单发子弹，命中后扩散成网） */
  fireFromCannon(cannon) {
    const result = cannon.tryFire(this.gold, performance.now());
    if (!result) return false;
    this.gold -= result.cost;
    this.stats.shots++;

    // 狂暴：子弹加速
    const frenzyActive = this.skills.frenzy.active > 0;
    this.bullets.push(new window.Bullet({
      x: cannon.muzzleX,
      y: cannon.muzzleY,
      angle: result.angle,
      speed: this.cfg.cannon.bulletSpeed * (frenzyActive ? 1.6 : 1),
      radius: this.cfg.cannon.bulletRadius,
      damage: this.cfg.cannon.bulletDamage,
      mult: cannon.multiplier,   // 倍率（子弹颜色辨识）
    }));
    return true;
  }

  /** 金币飞入炮台后回调（在 Coin.update 中触发，这里做结算） */
  collectCoin(coin) {
    this.gold += coin.value;
  }

  /** 触发技能 */
  useSkill(name) {
    const cfgSkill = this.cfg.skills[name];
    const s = this.skills[name];
    if (!cfgSkill || !s || s.active > 0 || s.cd > 0) return false;
    s.active = cfgSkill.duration;
    s.cd = cfgSkill.cd;
    return true;
  }

  /** 技能剩余冷却比例 0~1（1=可用） */
  skillCooldownRatio(name) {
    const s = this.skills[name];
    const cfg = this.cfg.skills[name];
    if (!s || !cfg) return 1;
    if (s.active > 0) return s.active / cfg.duration; // 显示为激活中
    return 1 - Math.min(1, s.cd / cfg.cd);
  }

  isSkillActive(name) {
    return this.skills[name].active > 0;
  }
};
