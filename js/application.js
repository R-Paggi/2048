// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
});

(function () {
  var STORAGE_KEY = "supreme2048_theme";
  var MODE_KEY    = "supreme2048_mode";

  var themes = [
    {
      id: "default",
      name: "Padrão",
      colors: ["#eee4da", "#f2b179", "#f65e3b", "#edc22e"]
    },
    {
      id: "mono",
      name: "Slay the Princess",
      colors: ["#e8e8e8", "#bebebe", "#787878", "#111111"]
    },
    {
      id: "pastel",
      name: "Monument Valley",
      colors: ["#ffd6e0", "#e0aaff", "#b8c0ff", "#a2d2ff"]
    },
    {
      id: "mgs",
      name: "Metal Gear Solid",
      colors: ["#ffffff", "#c8000a", "#4a6fa5", "#5a6472"]
    },
    {
      id: "disco",
      name: "Disco Elysium",
      colors: ["#17698c", "#866937", "#10137a", "#c5dd2c"]
    },
    {
      id: "jsr",
      name: "Jet Set Radio",
      colors: ["#7de030", "#ff8c00", "#ff3d00", "#4dff91"]
    }
  ];

  var modes = [
    {
      id: "classic",
      name: "Clássico",
      description: "Combine tiles para chegar ao 2048."
    },
    {
      id: "inverse",
      name: "Modo Inverso",
      description: "Tiles com valores altos surgem no tabuleiro. Cancele tiles iguais para limpar o tabuleiro."
    }
  ];

  function getSavedTheme() {
    try { return localStorage.getItem(STORAGE_KEY) || "default"; } catch (e) { return "default"; }
  }

  function saveTheme(themeId) {
    try { localStorage.setItem(STORAGE_KEY, themeId); } catch (e) {}
  }

  function getSavedMode() {
    try { return localStorage.getItem(MODE_KEY) || "classic"; } catch (e) { return "classic"; }
  }

  function saveMode(modeId) {
    try { localStorage.setItem(MODE_KEY, modeId); } catch (e) {}
  }

  function applyTheme(themeId) {
    document.body.setAttribute("data-theme", themeId);
  }

  function applyMode(modeId) {
    document.body.setAttribute("data-mode", modeId);
    var event = new CustomEvent("setInverseMode", { detail: modeId === "inverse" });
    document.dispatchEvent(event);
  }

  function createSettingsModal() {
    var overlay = document.createElement("div");
    overlay.className = "settings-overlay";
    overlay.id = "settings-overlay";

    var modal = document.createElement("div");
    modal.className = "settings-modal";

    var closeBtn = document.createElement("button");
    closeBtn.className = "close-settings";
    closeBtn.innerHTML = "&#x2715;";
    closeBtn.setAttribute("aria-label", "Fechar configurações");
    closeBtn.addEventListener("click", closeSettings);

    var title = document.createElement("h2");
    title.textContent = "Paleta de Cores";

    var grid = document.createElement("div");
    grid.className = "theme-options";

    var currentTheme = getSavedTheme();

    themes.forEach(function (theme) {
      var option = document.createElement("div");
      option.className = "theme-option" + (theme.id === currentTheme ? " selected" : "");
      option.setAttribute("data-theme-id", theme.id);

      var preview = document.createElement("div");
      preview.className = "theme-preview";
      theme.colors.forEach(function (color) {
        var swatch = document.createElement("span");
        swatch.style.background = color;
        preview.appendChild(swatch);
      });

      var label = document.createElement("div");
      label.textContent = theme.name;

      option.appendChild(preview);
      option.appendChild(label);

      option.addEventListener("click", function () {
        grid.querySelectorAll(".theme-option").forEach(function (el) { el.classList.remove("selected"); });
        option.classList.add("selected");
        applyTheme(theme.id);
        saveTheme(theme.id);
      });

      grid.appendChild(option);
    });

    modal.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(grid);
    overlay.appendChild(modal);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeSettings();
    });

    document.body.appendChild(overlay);
  }

  function createModesModal() {
    var overlay = document.createElement("div");
    overlay.className = "settings-overlay";
    overlay.id = "modes-overlay";

    var modal = document.createElement("div");
    modal.className = "settings-modal";

    var closeBtn = document.createElement("button");
    closeBtn.className = "close-settings";
    closeBtn.innerHTML = "&#x2715;";
    closeBtn.setAttribute("aria-label", "Fechar modos");
    closeBtn.addEventListener("click", closeModes);

    var title = document.createElement("h2");
    title.textContent = "Modos de Jogo";

    var list = document.createElement("div");
    list.className = "mode-options";
    list.id = "mode-options-list";

    var currentMode = getSavedMode();

    modes.forEach(function (mode) {
      var option = document.createElement("div");
      option.className = "mode-option" + (mode.id === currentMode ? " selected" : "");
      option.setAttribute("data-mode-id", mode.id);

      var name = document.createElement("div");
      name.className = "mode-name";
      name.textContent = mode.name;

      var desc = document.createElement("div");
      desc.className = "mode-desc";
      desc.textContent = mode.description;

      option.appendChild(name);
      option.appendChild(desc);

      option.addEventListener("click", function () {
        list.querySelectorAll(".mode-option").forEach(function (el) { el.classList.remove("selected"); });
        option.classList.add("selected");
        saveMode(mode.id);
        applyMode(mode.id);
        setTimeout(closeModes, 300);
      });

      list.appendChild(option);
    });

    modal.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(list);
    overlay.appendChild(modal);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModes();
    });

    document.body.appendChild(overlay);
  }

  function createActionButton(className, text, ariaLabel, onClick, afterSelector) {
    var gameContainer = document.querySelector(".game-container");
    if (!gameContainer) return null;

    var btn = document.createElement("button");
    btn.className = className;
    btn.textContent = text;
    btn.setAttribute("aria-label", ariaLabel);
    btn.addEventListener("click", onClick);

    var reference = afterSelector ? document.querySelector(afterSelector) : null;
    reference = reference || gameContainer;
    reference.parentNode.insertBefore(btn, reference.nextSibling);

    return btn;
  }

  function openSettings() {
    document.getElementById("settings-overlay").classList.add("active");
  }

  function closeSettings() {
    document.getElementById("settings-overlay").classList.remove("active");
  }

  function openModes() {
    document.getElementById("modes-overlay").classList.add("active");
  }

  function closeModes() {
    document.getElementById("modes-overlay").classList.remove("active");
  }

  function init() {
    applyTheme(getSavedTheme());

    var savedMode = getSavedMode();
    document.body.setAttribute("data-mode", savedMode);

    createSettingsModal();
    createModesModal();
    createActionButton("settings-button", "Mudar Tema", "Mudar Tema", openSettings);
    createActionButton("settings-button modes-button", "Modos Extra", "Modos Extra", openModes, ".settings-button");
    createActionButton("settings-button stats-button", "Stats", "Estatísticas", function () {
      document.dispatchEvent(new CustomEvent("showStatsHistory"));
    }, ".modes-button");

    if (savedMode === "inverse") {
      window.addEventListener("load", function () {
        var event = new CustomEvent("setInverseMode", { detail: true });
        document.dispatchEvent(event);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

