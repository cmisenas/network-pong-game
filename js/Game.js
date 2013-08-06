;(function(exports) {
  function Game() {
    this.players = [];
  }

  Game.prototype.setPlayAreaDimensions = function(width, height) {
    this.width = width;
    this.height = height;
  }

  exports.Game = Game;
}(typeof exports === undefined ? this : module.exports));
