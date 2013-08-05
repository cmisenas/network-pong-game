function Player(id, x, y, w, h, n) {
  this.id = id;
	this.width = w;
  this.height = h;
	this.x = x;
	this.y = y;
  this.score = 0;
  this.vx = 200;
  this.nth = n;
}

module.exports = Player;
