;(function(exports) {
  function Ball(w, h) {
    this.CANVAS_WIDTH = w;
    this.CANVAS_HEIGHT = h;

    this.r = 7;
    this.x = this.CANVAS_WIDTH/2;
    this.y = this.CANVAS_HEIGHT/2;
    this.vx = 200;
    this.vy = 200;
    this.directionX = (Math.random() > 0.5? 1: -1);
    this.directionY = (Math.random() > 0.5? 1: -1);


    // return true when ball has betmeen floor and ceiling of game world
    this.isInPlayArea = function() {
      return this.x - this.r > 0 && this.x + this.r < this.CANVAS_WIDTH;
    };
  }

  exports.Ball = Ball;
}(typeof exports === 'undefined' ? this : module.exports));
