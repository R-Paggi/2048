// Gerenciamento do Áudio de Fundo usando arquivos de áudio em Loop Contínuo
(function () {
  // Inicialização do elemento de áudio. Substitua pelo caminho correto do seu arquivo.
  var bgMusic = new Audio("audio/background.mp3");
  bgMusic.loop = true;

  // Carregar preferências salvas no localStorage ou usar valores padrão
  var isMuted = localStorage.getItem("bgm_muted") === "true";
  var savedVolume = localStorage.getItem("bgm_volume") !== null ? parseFloat(localStorage.getItem("bgm_volume")) : 0.5;

  // Aplicar volume inicial baseado no estado de mudo
  bgMusic.volume = isMuted ? 0 : savedVolume;

  window.AudioManager = {
    init: function () {
      var muteBtn = document.getElementById("mute-btn");
      var volumeSlider = document.getElementById("volume-slider");

      // Configurar estado inicial da UI
      if (muteBtn) {
        this.updateMuteButton(muteBtn);
        muteBtn.addEventListener("click", this.toggleMute.bind(this));
      }

      if (volumeSlider) {
        volumeSlider.value = savedVolume;
        volumeSlider.addEventListener("input", function (e) {
          window.AudioManager.setVolume(e.target.value);
        });
      }
    },

    updateMuteButton: function (btn) {
      btn.innerText = isMuted ? "🔇 Som: DESLIGADO" : "🎵 Som: LIGADO";
      if (isMuted) {
        btn.style.background = "#bcada0";
      } else {
        btn.style.background = "#8f7a66";
      }
    },

    toggleMute: function () {
      isMuted = !isMuted;
      localStorage.setItem("bgm_muted", isMuted);
      bgMusic.volume = isMuted ? 0 : savedVolume;

      var muteBtn = document.getElementById("mute-btn");
      if (muteBtn) this.updateMuteButton(muteBtn);

      // Tenta dar play caso ainda não tenha começado devido às políticas do navegador
      this.play();
    },

    setVolume: function (val) {
      savedVolume = parseFloat(val);
      localStorage.setItem("bgm_volume", savedVolume);
      
      // Só altera o volume real se não estiver mutado
      if (!isMuted) {
        bgMusic.volume = savedVolume;
      }
    },

    play: function () {
      // Executa o play tratando a restrição de autoplay dos navegadores modernos
      bgMusic.play().catch(function (error) {
        console.log("Autoplay bloqueado ou aguardando interação do usuário para iniciar o áudio.");
      });
    }
  };

  // Inicializa os escutadores assim que o DOM estiver pronto
  document.addEventListener("DOMContentLoaded", function () {
    window.AudioManager.init();
  });
})();
