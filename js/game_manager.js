function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size;
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.winningValue = 2048;
  this.fourTileProbability = 0.1;

  try {
    this.inverseMode = localStorage.getItem("supreme2048_mode") === "inverse";
  } catch (e) {
    this.inverseMode = false;
  }

  this.moveCount  = 0;
  this.maxTile    = 0;
  this.startTime  = null;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("setInverseMode", this.setInverseMode.bind(this));

  var self = this;
  document.addEventListener("setInverseMode", function (e) {
    self.setInverseMode(e.detail);
  });

  this.setup();
}

GameManager.prototype.setInverseMode = function (enabled) {
  this.inverseMode = enabled;
  this.storageManager.clearGameState();
  this.actuator.continueGame();
  this.setup();
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
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlayingFlag  = previousState.keepPlaying ;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlayingFlag = false;
    this.moveCount   = 0;
    this.maxTile     = 0;
    this.startTime   = Date.now();

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
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
    inverseMode: this.inverseMode,
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

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlayingFlag
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
        var canMerge = next && next.value === tile.value && !next.mergedFrom;
        if (canMerge) {
            self.mergeTiles(tile, next, positions.next);
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
      if (!this.movesAvailable()) {
        this.over = true;
      }
    }

    this.actuate();
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

          if (other && other.value === tile.value) {
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
