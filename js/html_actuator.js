<<<<<<< HEAD
function HTMLActuator1() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
}

HTMLActuator1.prototype.actuate = function (grid, metadata) {
  var self = this;

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
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator1.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator1.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator1.prototype.addTile = function (tile) {
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

HTMLActuator1.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator1.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator1.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator1.prototype.updateScore = function (score) {
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

HTMLActuator1.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator1.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator1.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
=======
function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.timerContainer   = document.querySelector(".timer-container");
  this.timerValue       = document.querySelector(".timer-value");

  this.score = 0;
  this.lastGridState = null;
  this.lastMetadata = null;

  document.addEventListener("showStatsHistory", this.showHistory.bind(this));
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  this.inverseMode = metadata.inverseMode;
  this.lastGridState = grid.serialize();
  this.lastMetadata = {
    score: metadata.score,
    bestScore: metadata.bestScore,
    over: metadata.over,
    won: metadata.won,
    gameMode: metadata.gameMode,
    inverseMode: metadata.inverseMode,
    bombMode: metadata.bombMode,
    stats: metadata.stats
  };

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
    self.updateMoveTimer(metadata.timer);

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
  var self = this;
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

  var shareBtn = document.createElement("button");
  shareBtn.className = "stats-btn stats-share-btn";
  shareBtn.textContent = "Compartilhar";
  shareBtn.addEventListener("click", function () {
    self.shareResult();
  });

  btnRow.appendChild(shareBtn);
  btnRow.appendChild(closeBtn);
  box.appendChild(title);
  box.appendChild(grid);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
};

HTMLActuator.prototype.shareResult = function () {
  if (!this.lastGridState || !this.lastMetadata) return;

  var canvas = this.buildShareCanvas();
  var self = this;
  var filename = "supreme-2048-resultado.png";

  this.canvasToBlob(canvas, function (blob) {
    if (!blob) {
      self.downloadCanvas(canvas, filename);
      return;
    }

    var fileSupported = typeof File !== "undefined";
    var shareSupported = navigator.share && fileSupported;
    var file = shareSupported ? new File([blob], filename, { type: "image/png" }) : null;
    var canShare = false;

    try {
      canShare = shareSupported &&
                 (!navigator.canShare || navigator.canShare({ files: [file] }));
    } catch (e) {
      canShare = false;
    }

    if (canShare) {
      navigator.share({
        title: "Supreme 2048",
        text: "Meu resultado no Supreme 2048",
        files: [file]
      }).catch(function () {
        self.downloadBlob(blob, filename);
      });
    } else {
      self.downloadBlob(blob, filename);
    }
  });
};

HTMLActuator.prototype.canvasToBlob = function (canvas, callback) {
  if (canvas.toBlob) {
    canvas.toBlob(callback, "image/png");
    return;
  }

  var data = canvas.toDataURL("image/png").split(",")[1];
  var bytes = atob(data);
  var buffer = new ArrayBuffer(bytes.length);
  var view = new Uint8Array(buffer);

  for (var i = 0; i < bytes.length; i++) {
    view[i] = bytes.charCodeAt(i);
  }

  callback(new Blob([buffer], { type: "image/png" }));
};

HTMLActuator.prototype.downloadBlob = function (blob, filename) {
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

HTMLActuator.prototype.downloadCanvas = function (canvas, filename) {
  var link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

HTMLActuator.prototype.buildShareCanvas = function () {
  var canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1080;

  var context = canvas.getContext("2d");
  var grid = this.lastGridState;
  var metadata = this.lastMetadata;
  var stats = metadata.stats || {};
  var size = grid.size;
  var boardSize = 680;
  var boardX = 110;
  var boardY = 280;
  var gap = 16;
  var tileSize = (boardSize - gap * (size + 1)) / size;

  context.fillStyle = "#faf8ef";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#776e65";
  context.font = "bold 78px Arial";
  context.textAlign = "center";
  context.fillText("Supreme 2048", canvas.width / 2, 110);

  context.font = "bold 42px Arial";
  context.fillText(metadata.won ? "Vitoria" : "Fim de jogo", canvas.width / 2, 170);

  context.font = "28px Arial";
  context.fillText("Pontuacao: " + (stats.score || 0).toLocaleString(), canvas.width / 2, 220);
  context.fillText("Maior tile: " + (stats.maxTile || 0) + " | Movimentos: " + (stats.moves || 0) +
                   " | Tempo: " + this.formatTime(stats.time || 0), canvas.width / 2, 255);

  this.drawRoundRect(context, boardX, boardY, boardSize, boardSize, 12, "#bbada0");

  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var cell = grid.cells[x][y];
      var value = cell ? cell.value : null;
      var isBomb = cell && cell.type === "bomb";
      var tileX = boardX + gap + x * (tileSize + gap);
      var tileY = boardY + gap + y * (tileSize + gap);

      this.drawRoundRect(context, tileX, tileY, tileSize, tileSize, 8,
                         cell ? this.shareCellColor(cell) : "#cdc1b4");

      if (cell) {
        context.fillStyle = isBomb || value > 4 ? "#f9f6f2" : "#776e65";
        context.font = "bold " + this.shareTileFontSize(isBomb ? "!" : value, tileSize) + "px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(isBomb ? "!" : value, tileX + tileSize / 2, tileY + tileSize / 2);
      }
    }
  }

  context.fillStyle = "#776e65";
  context.font = "24px Arial";
  context.textBaseline = "alphabetic";
  context.fillText("Gerado pelo Supreme 2048", canvas.width / 2, 1010);

  return canvas;
};

HTMLActuator.prototype.shareCellColor = function (cell) {
  if (cell.type === "bomb") return "#2d2a32";

  return this.tileColor(cell.value);
};

HTMLActuator.prototype.drawRoundRect = function (context, x, y, width, height, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
};

HTMLActuator.prototype.tileColor = function (value) {
  var colors = {
    2: "#eee4da",
    4: "#ede0c8",
    8: "#f2b179",
    16: "#f59563",
    32: "#f67c5f",
    64: "#f65e3b",
    128: "#edcf72",
    256: "#edcc61",
    512: "#edc850",
    1024: "#edc53f",
    2048: "#edc22e"
  };

  return colors[value] || "#3c3a32";
};

HTMLActuator.prototype.shareTileFontSize = function (value, tileSize) {
  var digits = String(value).length;
  if (digits <= 2) return Math.floor(tileSize * 0.46);
  if (digits === 3) return Math.floor(tileSize * 0.38);
  return Math.floor(tileSize * 0.3);
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
  var isBomb = tile.type === "bomb";
  var tileClass = isBomb ? "tile-bomb" : "tile-" + tile.value;

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", tileClass, positionClass];

  if (!isBomb && tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = isBomb ? "!" : tile.value;

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

HTMLActuator.prototype.updateMoveTimer = function (timer) {
  if (!this.timerContainer || !this.timerValue) return;

  if (!timer || !timer.enabled) {
    this.timerContainer.classList.add("timer-hidden");
    this.timerContainer.classList.remove("timer-warning");
    this.timerValue.textContent = "--";
    return;
  }

  this.timerContainer.classList.remove("timer-hidden");
  this.timerValue.textContent = timer.remaining + "s";

  if (timer.remaining <= 3) {
    this.timerContainer.classList.add("timer-warning");
  } else {
    this.timerContainer.classList.remove("timer-warning");
  }
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
>>>>>>> 2600a93d712238063fd72d6bfd56adc3734800e5
