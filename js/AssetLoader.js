/**
 * 素材预加载器
 * - 从配置读取所有素材路径
 * - 支持单图 / 序列帧（自动探测 _0.png _1.png ...）
 * - 加载失败自动回退为 null（游戏用程序化绘制兜底），不阻塞启动
 * - 返回进度回调
 */
window.AssetLoader = (function () {
  "use strict";

  /**
   * 预加载一批图片
   * @param {Array<{key:string, urls:string[]}>} items
   * @param {(done:number, total:number, key:string) => void} onProgress
   * @returns {Promise<Map<string, (HTMLImageElement|HTMLImageElement[])>>}
   */
  async function preload(items, onProgress) {
    const result = new Map();
    const total = items.reduce((n, it) => n + it.urls.length, 0);
    let done = 0;

    async function loadOne(key, url) {
      try {
        const img = await Utils.loadImage(url);
        return img;
      } catch (e) {
        console.warn("[AssetLoader]", e.message);
        return null;
      } finally {
        done++;
        if (onProgress) onProgress(done, total, key);
      }
    }

    // 顺序加载避免 file:// 并发过多，同时保持进度条平滑
    for (const item of items) {
      if (item.urls.length === 0) {
        result.set(item.key, null);
        continue;
      }
      if (item.urls.length === 1) {
        const img = await loadOne(item.key, item.urls[0]);
        result.set(item.key, img);
      } else {
        const frames = [];
        for (const u of item.urls) {
          frames.push(await loadOne(item.key, u));
        }
        result.set(item.key, frames);
      }
    }
    return result;
  }

  /**
   * 根据素材目录与命名探测序列帧
   * 若 assets/fish/fish_001_0.png 存在则视为序列帧（fish_001_0..fish_001_3）
   * 通过 fishlist.js 的清单构建
   */
  function buildItems(cfg) {
    const items = [];
    const base = cfg.assets.base;

    // 背景
    items.push({ key: "bg", urls: [base + cfg.assets.bgDir + cfg.assets.bg.file] });

    // 炮台单图
    items.push({ key: "cannon_single", urls: [base + cfg.assets.cannonDir + cfg.assets.cannonSingle.file] });

    // 炮台多角度序列帧
    const angleFrames = cfg.cannon.angleFrames;
    if (angleFrames > 0) {
      const urls = [];
      for (let i = 0; i < angleFrames; i++) {
        urls.push(base + cfg.assets.cannonDir + "cannon_" + i + ".png");
      }
      items.push({ key: "cannon_frames", urls });
    }

    // 金币贴图
    items.push({ key: "coin", urls: [base + cfg.assets.effectsDir + cfg.assets.coin.file] });

    // 特效：爆炸序列帧（explosion_0.png ~ explosion_5.png 探测）
    const explosionUrls = [];
    for (let i = 0; i < 8; i++) {
      explosionUrls.push(base + cfg.assets.effectsDir + cfg.assets.effectExplosion.file.replace("%d", i));
    }
    items.push({ key: "effect_explosion", urls: explosionUrls });

    items.push({ key: "effect_splash", urls: [base + cfg.assets.effectsDir + cfg.assets.effectSplash.file] });

    // 鱼类：加载单图；若单图缺失则尝试序列帧（fish_xxx_0.png 第一帧），见 fallbackFish
    const fishList = window.FISH_IMAGES || [];
    for (const name of fishList) {
      items.push({ key: "fish_" + name.replace(/\.png$/i, ""), urls: [base + cfg.assets.fishDir + name] });
    }

    return items;
  }

  /**
   * 序列帧探测回退：若某鱼单图不存在 → 尝试加载序列帧第一帧 fish_xxx_0.png 覆盖
   */
  async function fallbackFish(loader, result, cfg) {
    const base = cfg.assets.base;
    const fishList = window.FISH_IMAGES || [];
    for (const name of fishList) {
      const stem = name.replace(/\.png$/i, "");
      const key = "fish_" + stem;
      const frames = result.get(key);
      const first = Array.isArray(frames) ? frames[0] : frames;
      if (!first) {
        // 序列帧回退：fish_xxx_0.png 若存在则视为序列帧
        const frameUrls = [];
        for (let f = 0; f < 4; f++) {
          frameUrls.push(base + cfg.assets.fishDir + stem + "_" + f + ".png");
        }
        const imgs = [];
        for (const u of frameUrls) {
          const img = await loader.loadOne(key, u);
          if (img) imgs.push(img);
        }
        if (imgs.length > 0) {
          result.set(key, imgs.length === 1 ? imgs[0] : imgs);
        } else {
          result.set(key, null);
        }
      }
    }
  }

  /** 主入口：items 可选；默认 buildItems(cfg) */
  async function loadAll(cfg, onProgress) {
    const loader = {
      async loadOne(key, url) {
        try {
          const img = await Utils.loadImage(url);
          return img;
        } catch (e) {
          return null;
        }
      },
    };
    const items = buildItems(cfg);
    const result = await preload(items, onProgress);
    await fallbackFish(loader, result, cfg);
    return result;
  }

  return { preload, buildItems, loadAll };
})();
