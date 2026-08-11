/**
 * UI 层（UIManager）
 * - DOM 渲染：金币、倍率、分数、技能按钮（冷却遮罩）、设置、退出
 * - 与 Canvas 分离，实时更新
 */
window.UIManager = (function () {
  "use strict";

  let game = null;
  let els = {};

  function init(g) {
    game = g;
    const root = document.getElementById("game-ui");
    root.innerHTML = `
      <div class="ui-top">
        <div class="ui-panel ui-gold">
          <span class="ui-icon">🪙</span>
          <span id="ui-gold">0</span>
        </div>
        <div class="ui-panel ui-mult">
          倍率 <span id="ui-mult">1</span>×
        </div>
        <div class="ui-panel ui-score">
          得分 <span id="ui-score">0</span>
        </div>
        <div class="ui-panel ui-kills">
          击杀 <span id="ui-kills">0</span>
        </div>
      </div>

      <div class="ui-skills">
        <div class="skill-btn" data-skill="freeze">
          <div class="skill-icon">❄️</div>
          <div class="skill-name">冰冻</div>
          <div class="skill-cd"><span>Q</span></div>
        </div>
        <div class="skill-btn" data-skill="frenzy">
          <div class="skill-icon">⚡</div>
          <div class="skill-name">狂暴</div>
          <div class="skill-cd"><span>W</span></div>
        </div>
        <div class="skill-btn" data-skill="lock">
          <div class="skill-icon">🎯</div>
          <div class="skill-name">锁定</div>
          <div class="skill-cd"><span>E</span></div>
        </div>
      </div>

      <div class="ui-bottom">
        <button id="btn-settings" class="ui-btn">⚙ 设置</button>
        <button id="btn-exit" class="ui-btn">✕ 退出</button>
      </div>

      <div id="modal-settings" class="modal hidden">
        <div class="modal-box">
          <h3>设置</h3>
          <label><input type="checkbox" id="opt-sound" checked> 音效</label>
          <label><input type="checkbox" id="opt-fps" checked> 显示 FPS</label>
          <label><input type="checkbox" id="opt-pause" checked> 自动暂停（失焦）</label>
          <div class="modal-actions">
            <button id="btn-settings-close" class="ui-btn">关闭</button>
          </div>
        </div>
      </div>

      <div id="modal-exit" class="modal hidden">
        <div class="modal-box">
          <h3>退出游戏？</h3>
          <div class="modal-actions">
            <button id="btn-exit-close" class="ui-btn">继续游戏</button>
          </div>
        </div>
      </div>

      <div id="hint" class="ui-hint">
        左键开火 · 右键自动开火 · 滚轮切倍率 · Q/W/E 技能
      </div>
    `;

    els = {
      gold: document.getElementById("ui-gold"),
      mult: document.getElementById("ui-mult"),
      score: document.getElementById("ui-score"),
      kills: document.getElementById("ui-kills"),
      btnSettings: document.getElementById("btn-settings"),
      btnExit: document.getElementById("btn-exit"),
      modalSettings: document.getElementById("modal-settings"),
      modalExit: document.getElementById("modal-exit"),
      btnSettingsClose: document.getElementById("btn-settings-close"),
      btnExitClose: document.getElementById("btn-exit-close"),
      optSound: document.getElementById("opt-sound"),
      optFps: document.getElementById("opt-fps"),
      optPause: document.getElementById("opt-pause"),
      hint: document.getElementById("hint"),
    };

    els.btnSettings.addEventListener("click", () => showSettings(true));
    els.btnSettingsClose.addEventListener("click", () => showSettings(false));
    els.btnExit.addEventListener("click", () => showExit(true));
    els.btnExitClose.addEventListener("click", () => showExit(false));

    // 技能按钮
    document.querySelectorAll(".skill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.skill;
        if (game.logic.useSkill(name)) {
          pulse(btn);
          game.audio.play("skill");
        } else {
          shake(btn);
        }
      });
    });

    // 更新一次
    render(0);
  }

  function showSettings(show) {
    els.modalSettings.classList.toggle("hidden", !show);
    if (show) {
      game.setPaused(true);
      // 同步开关
      els.optSound.checked = game.audio.enabled;
      els.optFps.checked = game.showFps;
      els.optPause.checked = game.autoPause;
    } else {
      game.audio.enabled = els.optSound.checked;
      game.showFps = els.optFps.checked;
      game.autoPause = els.optPause.checked;
      game.setPaused(false);
    }
  }

  function showExit(show) {
    els.modalExit.classList.toggle("hidden", !show);
    if (show) {
      game.setPaused(true);
    } else {
      game.setPaused(false);
    }
  }

  function pulse(btn) {
    btn.classList.remove("pulse");
    void btn.offsetWidth;
    btn.classList.add("pulse");
  }

  function shake(btn) {
    btn.classList.remove("shake");
    void btn.offsetWidth;
    btn.classList.add("shake");
  }

  /** 每帧刷新（冷却遮罩比例） */
  function render(dt) {
    if (!game) return;

    const logic = game.logic;
    els.gold.textContent = Math.floor(logic.gold);
    els.mult.textContent = game.cannon.multiplier;
    els.score.textContent = Math.floor(logic.stats.score);
    els.kills.textContent = logic.stats.kills;

    // 技能冷却/激活状态
    document.querySelectorAll(".skill-btn").forEach(btn => {
      const name = btn.dataset.skill;
      const ratio = logic.skillCooldownRatio(name); // 1=可用, 0~1=冷却中比例(激活态)
      const active = logic.isSkillActive(name);
      const cdEl = btn.querySelector(".skill-cd");

      if (active) {
        btn.classList.add("active");
        btn.classList.remove("cooldown");
        cdEl.textContent = "";
        // 激活进度圈
        btn.style.setProperty("--cd-p", (ratio * 100) + "%");
      } else if (ratio < 1) {
        btn.classList.remove("active");
        btn.classList.add("cooldown");
        cdEl.textContent = Math.ceil((1 - ratio) * game.cfg.skills[name].cd);
        btn.style.setProperty("--cd-p", ((1 - ratio) * 100) + "%");
      } else {
        btn.classList.remove("active", "cooldown");
        cdEl.textContent = "";
        btn.style.setProperty("--cd-p", "0%");
      }
    });
  }

  /** 提示文字淡出 */
  function flashHint(text, ms) {
    els.hint.textContent = text;
    els.hint.classList.remove("flash");
    void els.hint.offsetWidth;
    els.hint.classList.add("flash");
    clearTimeout(flashHint._t);
    flashHint._t = setTimeout(() => els.hint.classList.remove("flash"), ms || 1800);
  }

  return { init, render, showSettings, showExit, flashHint };
})();
