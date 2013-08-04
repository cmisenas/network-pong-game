function Game() {
  this.players = [];
}

Game.prototype.setPlayAreaDimensions = function(width, height) {
  this.width = width;
  this.height = height;
}

module.exports = Game;
