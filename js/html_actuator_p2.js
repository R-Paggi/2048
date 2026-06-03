function HTMLActuatorP2() {
  this.tileContainer    = document.getElementById("game-container-p2").querySelector(".tile-container");
  this.scoreContainer   = document.getElementById("score-p2");
  this.bestContainer    = document.getElementById("best-p2");
  this.messageContainer = document.getElementById("game-container-p2").querySelector(".game-message");
  this.score = 0;
}

HTMLActuatorP2.prototype.actuate = function (grid, metadata) {
  var self = this;
  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) { self.addTile(cell); }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false);
      } else if (metadata.won) {
        self.message(true);
      }
    }
  });
};

HTMLActuatorP2.prototype.continueGame = function () { this.clearMessage(); };

HTMLActuatorP2.prototype.clearContainer = function (container) {
  while (container.firstChild) { container.removeChild(container.firstChild); }
};

HTMLActuatorP2.prototype.addTile = function (tile) {
  var self = this;
  var element   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var classPosition = this.positionClass(position);

  var classes = ["tile", "tile-" + tile.value, classPosition];
  if (tile.value > 2048) { classes.push("tile-super"); }

  this.applyClasses(element, classes);
  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  var multiplier = parseInt(localStorage.getItem("fusionMultiplier") || "2", 10);
  if (multiplier === 3) {
    var steps = Math.log(tile.value / 2) / Math.log(3);
    var hue = 32 + (steps * 26);
    inner.style.backgroundColor = "hsl(" + (hue % 360) + ", 80%, 46%)";
    inner.style.color = "#f9f6f2";
    if (tile.value >= 10000) {
      inner.style.fontSize = "18px";
    } else if (tile.value >= 1000) {
      inner.style.fontSize = "24px";
    }
  }

  if (tile.previousPosition) {
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(element, classes);
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(element, classes);
    tile.mergedFrom.forEach(function (merged) { self.addTile(merged); });
  } else {
    classes.push("tile-new");
    this.applyClasses(element, classes);
  }

  element.appendChild(inner);
  this.tileContainer.appendChild(element);
};

HTMLActuatorP2.prototype.applyClasses = function (element, classes) { element.className = classes.join(" "); };
HTMLActuatorP2.prototype.positionClass = function (position) { return "tile-position-" + (position.x + 1) + "-" + (position.y + 1); };

HTMLActuatorP2.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);
  var difference = score - this.score;
  this.score = score;
  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;
    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuatorP2.prototype.updateBestScore = function (bestScore) { this.bestContainer.textContent = bestScore; };
HTMLActuatorP2.prototype.clearMessage = function () { this.messageContainer.classList.remove("game-won", "game-over"); };

HTMLActuatorP2.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "Vitória!" : "Fim de Jogo!";
  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};