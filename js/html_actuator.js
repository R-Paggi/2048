function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;

  document.addEventListener("showStatsHistory", this.showHistory.bind(this));
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  this.inverseMode = metadata.inverseMode;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
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
      if (!metadata.inverseMode) {
        var self2 = self;
        var delay = (metadata.over || metadata.won) ? 2200 : 0;
        setTimeout(function () {
          self2.saveStats(metadata.stats, metadata.won);
          self2.showStats(metadata.stats, metadata.bestScore);
        }, delay);
      }
    }

  });
};

HTMLActuator.prototype.saveStats = function (stats, won) {
  try {
    var history = JSON.parse(localStorage.getItem("supreme2048_history") || "[]");
    history.unshift({
      score:   stats.score,
      maxTile: stats.maxTile,
      moves:   stats.moves,
      time:    stats.time,
      won:     won,
      date:    Date.now()
    });
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem("supreme2048_history", JSON.stringify(history));
  } catch (e) {}
};

HTMLActuator.prototype.formatTime = function (seconds) {
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return (m > 0 ? m + "m " : "") + s + "s";
};

HTMLActuator.prototype.showStats = function (stats, bestScore) {
  var existing = document.getElementById("stats-overlay");
  if (existing) existing.parentNode.removeChild(existing);

  var overlay = document.createElement("div");
  overlay.id = "stats-overlay";
  overlay.className = "stats-overlay";

  var box = document.createElement("div");
  box.className = "stats-box";

  var title = document.createElement("h2");
  title.className = "stats-title";
  title.textContent = "Partida encerrada";

  var grid = document.createElement("div");
  grid.className = "stats-grid";

  var items = [
    { label: "Pontuação",   value: stats.score.toLocaleString() },
    { label: "Maior tile",  value: stats.maxTile },
    { label: "Movimentos",  value: stats.moves },
    { label: "Tempo",       value: this.formatTime(stats.time) },
    { label: "Recorde",     value: bestScore.toLocaleString() }
  ];

  if (stats.score >= bestScore && stats.score > 0) {
    items[4].value = "Novo recorde!";
    items[4].highlight = true;
  }

  items.forEach(function (item) {
    var card = document.createElement("div");
    card.className = "stats-card" + (item.highlight ? " stats-highlight" : "");

    var val = document.createElement("div");
    val.className = "stats-value";
    val.textContent = item.value;

    var lbl = document.createElement("div");
    lbl.className = "stats-label";
    lbl.textContent = item.label;

    card.appendChild(val);
    card.appendChild(lbl);
    grid.appendChild(card);
  });

  var btnRow = document.createElement("div");
  btnRow.className = "stats-btn-row";

  var closeBtn = document.createElement("button");
  closeBtn.className = "stats-btn";
  closeBtn.textContent = "Fechar";
  closeBtn.addEventListener("click", function () {
    overlay.parentNode.removeChild(overlay);
  });

  btnRow.appendChild(closeBtn);
  box.appendChild(title);
  box.appendChild(grid);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
};

HTMLActuator.prototype.showHistory = function () {
  var existing = document.getElementById("stats-overlay");
  if (existing) existing.parentNode.removeChild(existing);

  var overlay = document.createElement("div");
  overlay.id = "stats-overlay";
  overlay.className = "stats-overlay";

  var box = document.createElement("div");
  box.className = "stats-box";

  var title = document.createElement("h2");
  title.className = "stats-title";
  title.textContent = "Histórico";

  try {
    var history = JSON.parse(localStorage.getItem("supreme2048_history") || "[]");

    if (history.length === 0) {
      var empty = document.createElement("p");
      empty.className = "stats-empty";
      empty.textContent = "Nenhuma partida registrada ainda.";
      box.appendChild(title);
      box.appendChild(empty);
    } else {
      var self = this;
      var list = document.createElement("div");
      list.className = "stats-history-list";

      history.forEach(function (entry, i) {
        var row = document.createElement("div");
        row.className = "stats-history-row";

        var date = new Date(entry.date);
        var dateStr = date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        row.innerHTML =
          "<span class='sh-num'>#" + (i + 1) + "</span>" +
          "<span class='sh-score'>" + entry.score.toLocaleString() + " pts</span>" +
          "<span class='sh-tile'>tile " + entry.maxTile + "</span>" +
          "<span class='sh-time'>" + self.formatTime(entry.time) + "</span>" +
          "<span class='sh-date'>" + dateStr + "</span>";

        list.appendChild(row);
      });

      box.appendChild(title);
      box.appendChild(list);
    }
  } catch (e) {
    box.appendChild(title);
  }

  var btnRow = document.createElement("div");
  btnRow.className = "stats-btn-row";

  var closeBtn = document.createElement("button");
  closeBtn.className = "stats-btn";
  closeBtn.textContent = "Fechar";
  closeBtn.addEventListener("click", function () {
    overlay.parentNode.removeChild(overlay);
  });

  btnRow.appendChild(closeBtn);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
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

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message;
  if (won) {
    message = this.inverseMode ? "Board cleared!" : "You win!";
  } else {
    message = this.inverseMode ? "No moves left!" : "Game over!";
  }

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
