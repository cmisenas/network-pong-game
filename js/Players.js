function Player(n, w, h) {
  this.num = n;
	this.width = 50;
  this.height = 5;
	this.x = w/2 - this.width/2;
	this.y = this.num === 1 ? h - this.height - 5 : 5;
  this.score = 0;
  this.vx = 200;
}

module.exports = Player;
