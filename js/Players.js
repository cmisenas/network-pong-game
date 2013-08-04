function Player(x, n) {
	this.x = x;
	this.y = null;
  this.num = n;
	this.width = 50;
  this.height = 5;
  this.score = 0;
  this.vx = 200;
}

module.exports = Player;
