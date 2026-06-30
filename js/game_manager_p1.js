function GameManager1(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Tamanho do tabuleiro (3, 4 ou 5)
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Reinicia o jogo
GameManager1.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Limpa a tela de game over/win
  this.setup();
};

// Mantém jogando após vencer
GameManager1.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame();
};

// Retorna true se o jogo terminou (ganhou ou não há movimentos)
GameManager1.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Configuração inicial do tabuleiro
GameManager1.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  if (previousState) {
    this.grid        = new Grid(previousState.grid.size, previousState.grid.cells);
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Adiciona os blocos iniciais
    this.addStartTiles();
  }

  // Atualiza a interface
  this.actuate();
};

GameManager1.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

GameManager1.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);
    this.grid.insertTile(tile);
  }
};

// Envia o estado atualizado para o Atuador e salva
GameManager1.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Salva o estado atual se o jogo não acabou
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });
};

GameManager1.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

GameManager1.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

GameManager1.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// LÓGICA DE MOVIMENTAÇÃO MODIFICADA COM MULTIPLICADOR SELECIONÁVEL
GameManager1.prototype.saveUndo = function () {
  this.undoState = {
    grid:  JSON.parse(JSON.stringify(this.grid.serialize())),
    score: this.score,
    over:  this.over,
    won:   this.won
  };
  this.hasUndo = true;
  var btn = document.getElementById("undo-p1");
  if (btn) btn.disabled = false;
};

GameManager1.prototype.undo = function () {
  if (!this.hasUndo) return;
  this.grid  = new Grid(this.undoState.grid.size, this.undoState.grid.cells);
  this.score = this.undoState.score;
  this.over  = this.undoState.over;
  this.won   = this.undoState.won;
  this.hasUndo = false;
  this.actuate();
  var btn = document.getElementById("undo-p1");
  if (btn) btn.disabled = true;
};

GameManager1.prototype.move = function (direction) {
  // 0: cima, 1: direita, 2: baixo, 3: esquerda
  var self = this;

  if (this.isGameTerminated()) return;
  this.saveUndo();

  var cell, tile;
  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Recupera as configurações dinâmicas salvas antes da partida
  var multiplier = parseInt(localStorage.getItem("fusionMultiplier") || "2", 10);
  var targetTileValue = parseInt(localStorage.getItem("targetTileScoreValue") || "2048", 10);

  // Prepara os blocos salvando suas posições anteriores
  this.prepareTiles();

  // Percorre o grid na direção correta
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Verifica se pode fundir com o próximo bloco
        if (next && next.value === tile.value && !next.mergedFrom) {
          // MODIFICAÇÃO: Aplica o multiplicador dinâmico (x2 ou x3)
          var merged = new Tile(positions.next, tile.value * multiplier);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge a posição do bloco original
          tile.updatePosition(positions.next);

          // Atualiza a pontuação com o valor gerado
          self.score += merged.value;

          // VERIFICAÇÃO DINÂMICA DE VITÓRIA PROPORCIONAL
          if (merged.value === targetTileValue) {
            self.won = true;
            var bannerText = document.getElementById("winner-text");
            if (bannerText) bannerText.innerText = "Player 1 Venceu!";
            var banner = document.getElementById("winner-banner");
            if (banner) banner.classList.add("show");
          }
          moved = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // O bloco mudou de posição no grid
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Fim de jogo se não houver movimentos válidos
    }

    this.actuate();
  }
};

GameManager1.prototype.getVector = function (direction) {
  var map = {
    0: { x: 0,  y: -1 }, // Cima
    1: { x: 1,  y: 0 },  // Direita
    2: { x: 0,  y: 1 },  // Baixo
    3: { x: -1, y: 0 }   // Esquerda
  };
  return map[direction];
};

GameManager1.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Sempre navega do canto mais distante na direção do movimento
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager1.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Avança até encontrar uma parede ou outro bloco
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Bloco que causou a parada (pode ser usado para fusão)
  };
};

GameManager1.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

GameManager1.prototype.tileMatchesAvailable = function () {
  var self = this;
  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };
          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // Existe uma fusão possível adjacente
          }
        }
      }
    }
  }
  return false;
};

GameManager1.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

