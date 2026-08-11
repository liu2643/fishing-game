/**
 * 主游戏类（main）
 * - 组装所有模块
 * - 预加载（进度条）→ 初始化 → 主循环
 * - requestAnimationFrame + dt 时间步进，稳定 60 帧
 */
window.Game = class Game {
  constructor() {
    this.cfg = window.GameConfig;
    this.fps = this.cfg.canvas.fpsCap;
    this.paused = false;
    this.showFps = true;
    this.autoPause = true;
    this.running = false;

    this.assets = null;   // Map
    this.logic = null;
    this.cannon = null;

    this.fpsAvg = 0;
    this._frame = 0;
  }

  /* ============ 生命周期 ============ */

  async boot() {
    // 1. 加载脚本
    this._prepareCanvas();

    // 2. 预加载素材（进度条）
    await this._preloadAssets();

    // 3. 初始化各模块 + 事件（主循环等玩家点"开始游戏"）
    this._initModules();
    this._bindEvents();
    this._showStartScreen();
  }

  _showStartScreen() {
    document.getElementById("start-screen").classList.remove("hidden");
    this.setPaused(true);
    const btn = document.getElementById("btn-start");
    btn.addEventListener("click", () => {
      document.getElementById("start-screen").classList.add("hidden");
      this.audio.unlock();
      this.setPaused(false);
      if (!this.running) {
        this.running = true;
        this._loop();
      }
    });
  }

  /* ============ 暂停（ESC） ============ */
  _bindPause() {
    const pauseScreen = document.getElementById("pause-screen");
    const show = (v) => {
      pauseScreen.classList.toggle("hidden", !v);
      this.setPaused(v);
    };
    document.getElementById("btn-resume").addEventListener("click", () => show(false));
    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        if (this.running) show(!this.paused);
      }
    });
  }

  _prepareCanvas() {
    const canvas = document.getElementById("game-canvas");
    canvas.width = this.cfg.canvas.width;
    canvas.height = this.cfg.canvas.height;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;

    // 画布缩放适配窗口（保持比例）
    const fit = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const r = Math.min(vw / this.width, vh / this.height);
      canvas.style.width = Math.floor(this.width * r) + "px";
      canvas.style.height = Math.floor(this.height * r) + "px";
    };
    window.addEventListener("resize", fit);
    fit();
  }

  _preloadAssets() {
    const loader = document.getElementById("loading-bar");
    const pct = document.getElementById("loading-pct");
    const tip = document.getElementById("loading-tip");

    const texts = [
      "正在唤醒海洋深处…",
      "鱼群正在集结…",
      "炮台校准中…",
      "金币准备就绪…",
    ];
    let li = 0;

    return AssetLoader.loadAll(this.cfg, (done, total) => {
      const p = total > 0 ? Math.floor(done / total * 100) : 100;
      loader.style.width = p + "%";
      pct.textContent = p + "%";
      const idx = Math.floor(p / 100 * texts.length);
      if (idx !== li) { li = idx; }
      tip.textContent = texts[Math.min(li, texts.length - 1)];
    }).then(map => {
      this.assets = map;
      // 隐藏加载界面
      document.getElementById("loading").style.display = "none";
    }).catch(err => {
      console.error(err);
      document.getElementById("loading-tip").textContent = "加载失败，请用本地服务器或直接双击 index.html 打开";
    });
  }

  _initModules() {
    this.logic = new GameLogic(this);
    this.cannon = new window.Cannon({
      cfg: this.cfg.cannon,
      worldW: this.width,
      worldH: this.height,
      asset: { image: this.assets.get("cannon_single"), frames: this.assets.get("cannon_frames") },
    });

    // 先渲染一帧拿到 muzzle 位置（渲染器里会算）
    this._render(0);

    UIManager.init(this);
    this.audio = window.GameAudio;
  }

  _bindEvents() {
    EventManager.initInput(this.canvas, this);
    this._bindPause();

    // 鼠标移动：控制炮台角度 + 锁定技能选鱼
    EventManager.on("mousemove", (m) => {
      this._targetAngle = Math.atan2(m.y - this.cannon.y, m.x - this.cannon.x) * 180 / Math.PI;
      if (this.logic) this.logic.setLockTarget(m.x, m.y);
    });

    // 左键发射
    EventManager.on("mousedown", (e) => {
      this.audio.unlock();
      if (e.button === 0) {
        this._fire();
      }
    });

    // 右键切换自动开火
    EventManager.on("mousedown", (e) => {
      if (e.button === 2) {
        this.cannon.autoFire = !this.cannon.autoFire;
        UIManager.flashHint(this.cannon.autoFire ? "🔴 自动开火已开启" : "自动开火已关闭");
      }
    });

    // 滚轮切倍率
    EventManager.on("wheel", (e) => {
      const mult = this.cannon.cycleSpeed(e.delta < 0 ? 1 : -1);
      UIManager.flashHint("倍率 " + mult + "×");
    });

    // 键盘技能
    EventManager.on("keydown", (e) => {
      const map = { KeyQ: "freeze", KeyW: "frenzy", KeyE: "lock" };
      const skill = map[e.code];
      if (skill && this.logic.useSkill(skill)) {
        this.audio.play("skill");
        // 触发按钮动画
        const btn = document.querySelector(`.skill-btn[data-skill="${skill}"]`);
        if (btn) btn.classList.add("pulse"), setTimeout(() => btn.classList.remove("pulse"), 300);
      }
    });
  }

  /* ============ 游戏控制 ============ */

  _fire() {
    const ok = this.logic.fireFromCannon(this.cannon);
    if (ok) this.audio.play("fire");
  }

  setPaused(v) {
    this.paused = v;
  }

  /* ============ 主循环 ============ */

  _loop() {
    if (!this.running) return;
    const loop = (ts) => {
      if (!this.running) return;
      if (!this._lastTs) this._lastTs = ts;
      let dt = (ts - this._lastTs) / 1000;
      this._lastTs = ts;
      if (dt > 0.1) dt = 0.1; // 防切后台跳帧

      // 失焦自动暂停
      if (this.autoPause && document.hidden && !this.paused) {
        this.setPaused(true);
      }

      if (!this.paused) {
        this._update(dt);
      }
      this._render(dt);

      // FPS 统计
      this._frame++;
      const inst = 1 / Math.max(dt, 0.001);
      this.fpsAvg = this.fpsAvg ? this.fpsAvg * 0.95 + inst * 0.05 : inst;

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _update(dt) {
    // 自动开火（带自动瞄准：对准最近且已进屏的鱼，直线弹+提前量预测命中点）
    if (this.cannon.autoFire) {
      const fishes = this.logic.fishes;
      const W = this.width, H = this.height;
      let target = null, best = Infinity;
      for (const f of fishes) {
        if (f.dead) continue;
        if (f.x < -20 || f.x > W + 20 || f.y < -20 || f.y > H + 20) continue; // 跳过屏幕外（刚出生的）
        const d = Utils.dist(this.cannon.x, this.cannon.y, f.x, f.y);
        if (d < best) { best = d; target = f; }
      }
      if (target) {
        // 预测鱼在子弹飞行时间后的位置（直线弹提前量）
        const pathLen = target.pathLen || (target._calcLen && target._calcLen());
        const lead = Utils.dist(this.cannon.x, this.cannon.y, target.x, target.y) / this.cfg.cannon.bulletSpeed;
        const tgt = Utils.pointAt(target.path, Math.min(1, target.progress + target.speed * lead / pathLen));
        const want = Math.atan2(tgt.y - this.cannon.y, tgt.x - this.cannon.x) * 180 / Math.PI;
        this.cannon.angle = want;
      }
      // 无目标时不发射（省金币，不空打）
      if (target) this._fire();
    } else if (this._targetAngle !== undefined) {
      // 手动模式：指哪打哪（瞬间锁定鼠标方向，不做平滑旋转——甩鼠标不滞后）
      this.cannon.angle = this._targetAngle;
    }

    this.logic.update(dt);
  }

  /* ============ 渲染 ============ */

  _render(dt) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    Renderer.drawBackground(ctx, this.assets, this.width, this.height);

    // 鱼
    for (const f of this.logic.fishes) {
      Renderer.drawFish(ctx, f, this.assets);
    }

    // 子弹
    for (const b of this.logic.bullets) {
      Renderer.drawBullet(ctx, b);
    }

    // 金币
    for (const c of this.logic.coins) {
      Renderer.drawCoin(ctx, c, this.assets);
    }

    // 特效
    for (const e of this.logic.effects) {
      Renderer.drawEffect(ctx, e);
    }

    // 技能全屏特效（冰冻蓝涟漪 / 狂暴红脉冲）
    Renderer.drawSkillAura(ctx, this.logic.skills, this.width, this.height, this.logic.elapsed);

    // 炮台（最后画，置顶）
    Renderer.drawCannon(ctx, this.cannon, this.assets, this.width, this.height);

    // FPS
    if (this.showFps && this.logic) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px " + this.cfg.ui.fontFamily;
      ctx.fillText("FPS: " + Math.round(this.fpsAvg), 10, this.height - 10);
    }

    // 自动开火状态灯
    if (this.cannon && this.cannon.autoFire) {
      ctx.fillStyle = "rgba(255,80,80,0.9)";
      ctx.beginPath();
      ctx.arc(this.width - 18, 18, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "11px " + this.cfg.ui.fontFamily;
      ctx.fillText("AUTO", this.width - 32, 22);
    }

    // 狂暴状态条
    if (this.logic && this.logic.skills.frenzy.active > 0) {
      const t = this.logic.skills.frenzy.active / this.cfg.skills.frenzy.duration;
      ctx.fillStyle = "rgba(255,120,0,0.25)";
      ctx.fillRect(0, 0, this.width * t, 4);
    }

    UIManager.render(dt);
  }

  /** 素材查询：根据鱼种条目取图片 */
  assetForFish(pickInfo) {
    const stem = (pickInfo.image || "").replace(/\.png$/i, "");
    const asset = this.assets.get("fish_" + stem);
    let image = asset;
    let frameMs = 120;
    // asset 可能是数组（序列帧）或单图或 null
    if (Array.isArray(asset)) {
      // 过滤 null 帧
      const valid = asset.filter(Boolean);
      image = valid.length > 1 ? valid : (valid[0] || null);
    }
    return { image, frameMs };
  }
};
