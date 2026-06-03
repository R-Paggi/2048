function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size;
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.winningValue = 2048;
  this.fourTileProbability = 0.1;
  this.bombSpawnFrequency = 5;

  this.applyGameMode(this.getSavedGameMode());

  this.moveCount  = 0;
  this.maxTile    = 0;
  this.startTime  = null;
  this.bombMoveCounter = 0;
  this.timerEnabled = false;
  this.timerLimit = 5;
  this.timerRemaining = 0;
  this.timerInterval = null;

  try {
    this.timerEnabled = localStorage.getItem("supreme2048_timer_enabled") === "true";
    this.timerLimit = parseInt(localStorage.getItem("supreme2048_timer_limit"), 10) === 10 ? 10 : 5;
  } catch (e) {
    this.timerEnabled = false;
    this.timerLimit = 5;
  }

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("setInverseMode", this.setInverseMode.bind(this));
  this.inputManager.on("setGameMode", this.setGameMode.bind(this));

  var self = this;
  document.addEventListener("setInverseMode", function (e) {
    self.setInverseMode(e.detail);
  });
  document.addEventListener("setGameMode", function (e) {
    self.setGameMode(e.detail);
  });
  document.addEventListener("setMoveTimer", function (e) {
    self.setMoveTimer(e.detail);
  });

  this.setup();
}

GameManager.prototype.normalizeGameMode = function (mode) {
  return mode === "inverse" || mode === "bomb" ? mode : "classic";
};

GameManager.prototype.getSavedGameMode = function () {
  try {
    return this.normalizeGameMode(localStorage.getItem("supreme2048_mode"));
  } catch (e) {
    return "classic";
  }
};

GameManager.prototype.applyGameMode = function (mode) {
  this.gameMode = this.normalizeGameMode(mode);
  this.inverseMode = this.gameMode === "inverse";
  this.bombMode = this.gameMode === "bomb";
};

GameManager.prototype.setInverseMode = function (enabled) {
  this.setGameMode(enabled ? "inverse" : "classic");
};

GameManager.prototype.setGameMode = function (mode) {
  var nextMode = this.normalizeGameMode(mode);
  if (nextMode === this.gameMode) return;

  this.applyGameMode(nextMode);
  this.bombMoveCounter = 0;

  try {
    localStorage.setItem("supreme2048_mode", this.gameMode);
  } catch (e) {}

  this.storageManager.clearGameState();
  this.actuator.continueGame();
  this.setup();
};

GameManager.prototype.setMoveTimer = function (config) {
  this.timerEnabled = !!(config && config.enabled);
  this.timerLimit = config && config.limit === 10 ? 10 : 5;

  try {
    localStorage.setItem("supreme2048_timer_enabled", this.timerEnabled ? "true" : "false");
    localStorage.setItem("supreme2048_timer_limit", this.timerLimit);
  } catch (e) {}

  this.restartMoveTimer();
  this.actuate();
};

GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame();
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlayingFlag = true;
  this.actuator.continueGame(); // Clear the game won/lost message
  if (!this.inverseMode && !this.movesAvailable()) {
    this.over = true;
    this.actuate();
  } else {
    this.restartMoveTimer();
  }
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlayingFlag);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.applyGameMode(previousState.gameMode || this.gameMode);
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlayingFlag  = previousState.keepPlaying ;
    this.bombMoveCounter = previousState.bombMoveCounter || 0;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlayingFlag = false;
    this.moveCount   = 0;
    this.maxTile     = 0;
    this.startTime   = Date.now();
    this.bombMoveCounter = 0;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.restartMoveTimer();
  this.actuate();
};

GameManager.prototype.addStartTiles = function () {
  if (this.inverseMode) {
    this.fillBoardInverse();
  } else {
    for (var i = 0; i < this.startTiles; i++) {
      this.addRandomTile();
    }
  }
};

GameManager.prototype.fillBoardInverse = function () {
  var cells = [];
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      cells.push({ x: x, y: y });
    }
  }
  for (var k = 0; k < cells.length; k++) {
    var value = Math.random() < 0.5 ? 2048 : 1024;
    var tile = new Tile(cells[k], value);
    this.grid.insertTile(tile);
  }
};

GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value;
    if (this.inverseMode) {
      value = Math.random() < 0.5 ? 2048 : 1024;
    } else {
      value = Math.random() < (1 - this.fourTileProbability) ? 2 : 4;
    }
    var tile = new Tile(this.grid.randomAvailableCell(), value);
    this.grid.insertTile(tile);
  }
};

GameManager.prototype.addBombTile = function () {
  if (!this.grid.cellsAvailable()) return false;

  var tile = new Tile(this.grid.randomAvailableCell(), 0, "bomb");
  this.grid.insertTile(tile);

  return true;
};

GameManager.prototype.maybeAddBombTile = function () {
  if (!this.bombMode) return;

  this.bombMoveCounter++;

  if (this.bombMoveCounter >= this.bombSpawnFrequency && this.addBombTile()) {
    this.bombMoveCounter = 0;
  }
};

GameManager.prototype.actuate = function () {
  if (!this.inverseMode && this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  this.saveGameState();

  var elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;

  this.actuator.actuate(this.grid, {
    score:       this.inverseMode ? 0 : this.score,
    over:        this.over,
    won:         this.won,
    bestScore:   this.storageManager.getBestScore(),
    terminated:  this.isGameTerminated(),
    gameMode:    this.gameMode,
    inverseMode: this.inverseMode,
    bombMode:    this.bombMode,
    timer: {
      enabled:   this.timerEnabled && !this.isGameTerminated(),
      limit:     this.timerLimit,
      remaining: this.timerRemaining
    },
    stats: {
      score:     this.score,
      maxTile:   this.maxTile,
      moves:     this.moveCount,
      time:      elapsed
    }
  });
};

GameManager.prototype.saveGameState = function () {
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }
};

GameManager.prototype.clearMoveTimer = function () {
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
};

GameManager.prototype.restartMoveTimer = function () {
  var self = this;

  this.clearMoveTimer();

  if (!this.timerEnabled || this.isGameTerminated()) {
    this.timerRemaining = 0;
    if (this.actuator.updateMoveTimer) {
      this.actuator.updateMoveTimer({
        enabled: false,
        limit: this.timerLimit,
        remaining: this.timerRemaining
      });
    }
    return;
  }

  this.timerRemaining = this.timerLimit;
  if (this.actuator.updateMoveTimer) {
    this.actuator.updateMoveTimer({
      enabled: true,
      limit: this.timerLimit,
      remaining: this.timerRemaining
    });
  }

  this.timerInterval = setInterval(function () {
    self.timerRemaining--;

    if (self.actuator.updateMoveTimer) {
      self.actuator.updateMoveTimer({
        enabled: true,
        limit: self.timerLimit,
        remaining: Math.max(self.timerRemaining, 0)
      });
    }

    if (self.timerRemaining <= 0) {
      self.clearMoveTimer();
      self.handleMoveTimerExpired();
    }
  }, 1000);
};

GameManager.prototype.handleMoveTimerExpired = function () {
  if (this.isGameTerminated()) return;

  var directions = this.availableMoveDirections();

  if (!directions.length) {
    this.over = true;
    this.restartMoveTimer();
    this.actuate();
    return;
  }

  var direction = directions[Math.floor(Math.random() * directions.length)];
  this.move(direction);
};

GameManager.prototype.availableMoveDirections = function () {
  var directions = [];

  for (var direction = 0; direction < 4; direction++) {
    if (this.canMoveDirection(direction)) {
      directions.push(direction);
    }
  }

  return directions;
};

GameManager.prototype.canMoveDirection = function (direction) {
  var vector = this.getVector(direction);

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      var tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        var cell = { x: x + vector.x, y: y + vector.y };
        var other = this.grid.cellContent(cell);

        if (this.grid.withinBounds(cell) && (!other || this.tilesCanInteract(tile, other))) {
          return true;
        }
      }
    }
  }

  return false;
};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlayingFlag,
    gameMode:    this.gameMode,
    bombMoveCounter: this.bombMoveCounter
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        var canInteract = next && self.tilesCanInteract(tile, next) && !next.mergedFrom;
        if (canInteract) {
          if (self.isBombInteraction(tile, next)) {
            self.explodeBomb(tile, next, positions.next);
          } else {
            self.mergeTiles(tile, next, positions.next);
          }
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    if (!this.inverseMode) this.moveCount++;

    this.grid.eachCell(function (x, y, tile) {
      if (tile && !self.inverseMode && tile.value > self.maxTile) {
        self.maxTile = tile.value;
      }
    });

    if (this.inverseMode) {
      if (this.isBoardEmpty()) {
        this.won = true;
      } else {
        this.addRandomTile();
        if (!this.grid.cellsAvailable() && !this.tileMatchesAvailable()) {
          this.over = true;
        }
      }
    } else {
      this.addRandomTile();
      this.maybeAddBombTile();
      if (!this.movesAvailable() && (!this.won || this.keepPlayingFlag)) {
        this.over = true;
      }
    }

    this.restartMoveTimer();
    this.actuate();
  }
};

GameManager.prototype.isBombTile = function (tile) {
  return tile && tile.type === "bomb";
};

GameManager.prototype.isBombInteraction = function (tile, other) {
  return this.bombMode && (this.isBombTile(tile) || this.isBombTile(other));
};

GameManager.prototype.tilesCanInteract = function (tile, other) {
  if (!tile || !other) return false;
  if (this.isBombInteraction(tile, other)) return true;

  return tile.value === other.value;
};

GameManager.prototype.explodeBomb = function (tile, next, position) {
  this.grid.removeTile(tile);
  this.grid.removeTile(next);
  tile.updatePosition(position);

  for (var x = position.x - 1; x <= position.x + 1; x++) {
    for (var y = position.y - 1; y <= position.y + 1; y++) {
      var cell = { x: x, y: y };
      var affectedTile = this.grid.cellContent(cell);

      if (affectedTile) {
        this.grid.removeTile(affectedTile);
      }
    }
  }
};

GameManager.prototype.mergeTiles = function (tile, next, position) {
  if (this.inverseMode) {
    var half = tile.value / 2;
    if (half < 2) {
      this.grid.removeTile(tile);
      this.grid.removeTile(next);
      tile.updatePosition(position);
    } else {
      var merged = new Tile(position, half);
      merged.mergedFrom = [tile, next];
      this.grid.insertTile(merged);
      this.grid.removeTile(tile);
      tile.updatePosition(position);
    }
  } else {
    var merged = new Tile(position, tile.value * 2);
    merged.mergedFrom = [tile, next];
    this.grid.insertTile(merged);
    this.grid.removeTile(tile);
    tile.updatePosition(position);
    this.score += merged.value;
    if (merged.value === this.winningValue) this.won = true;
  }
};

GameManager.prototype.isBoardEmpty = function () {
  return this.grid.availableCells().length === this.size * this.size;
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
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

          if (this.tilesCanInteract(tile, other)) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
