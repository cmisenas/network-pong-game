// ideas for improvement:
// - instead of sending individual updates about game state changes (ball, score etc), send periodic updates of whole game state from server to client.  Then make clients just run through that state and set client state to the same.  Also makes code way easier.

var http = require('http'),
    fs = require('fs'),
    io = require('socket.io'),
    url = require('url');

var Player = require('./Players').Player,
    Ball = require('./Ball').Ball;
    Game = require('./Game').Game;

Game.prototype.init = function() {
    this.ball = new Ball(this.width, this.height);
}

Game.prototype.addPlayer = function(client, data) {
  //only accept up to 2 players
  if(this.players.length < 2) {
    //only set the canvasWidth and canvasHeight with the first player

    var playerId = client.id;
    var playerX = this.players.length + 1 === 1? data.canvasWidth - data.width - 10 : 10;
    var nth = this.players.length + 1 === 1? 1: 2;
    var player = new Player(playerId, playerX, data.y, data.width, data.height, nth);
    
    this.players.push(player);
    var playerIndex = findIndexById(playerId);

    //broadcast to other players about new player
    if(this.players.length > 1){
      client.broadcast.emit('new player', {id: playerId, y: this.players[playerIndex].y, x: this.players[playerIndex].x, nth: 2});
    }

    //send new player data about existing players
    for(var i = 0; i < this.players.length; i++){
      if(this.players[i].id !== playerId) {
        client.emit('new player', {id: this.players[i].id, y: this.players[i].y, x: this.players[i].x, nth: 1});
      }
    }

    client.emit('assign player', {nth: nth, x: playerX});
    client.emit('create ball', {x: this.ball.x, y: this.ball.y});

    if(this.players.length === 2){
      this.start();
    }
  }
}

Game.prototype.start = function() {
  var time = Date.now();
  var self = this;
  var loop = setInterval(function() {
    self.ball.update((Date.now() - time)/1000);

    //do collision detection on the game objects--player 1, 2 and ball
    for(var i = 0, maxPlayers = self.players.length; i < maxPlayers; i++){
      var nth = parseInt(self.players[i].nth);
      var playerXToCompare = nth === 1 ?
        self.players[i].x :
        self.players[i].x + self.players[i].width;

      if(nth === 1){
        var xCompared = self.ball.x + self.ball.r >= playerXToCompare;
      }else{
        var xCompared = self.ball.x - self.ball.r <= playerXToCompare;
      }

      if ((self.ball.y + self.ball.r >= self.players[i].y &&
           self.ball.y - self.ball.r <= self.players[i].y + self.players[i].height) &&
          xCompared) {
        self.players[i].score++;
        self.ball.directionX *= -1;
        socket.sockets.emit('update score', {nth: nth, score: self.players[i].score});
      }
    }

    socket.sockets.emit('move ball', {x: self.ball.x, y: self.ball.y});

    if(!self.ball.isInPlayArea()){
      console.log('Game Over');
      clearInterval(loop);
      socket.sockets.emit('game over', {msg: 'Game Over'});
    }

    time = Date.now();
  }, 50);
}

Game.prototype.movePlayer = function(client, data) {
  var playerId = client.id;
  var playerIndex = findIndexById(playerId);
  this.players[playerIndex].y = data.y;
  client.broadcast.emit('player moved', {y: data.y});
}

Game.prototype.removePlayer = function(client) {
  //remove from players array
  var playerId = client.id;
  this.players.splice(findIndexById(playerId), 1);
  //broadcast to other players that client disconnected
  if(this.players.length > 0) {
    client.broadcast.emit('player disconnected', {id: playerId});
  }
}

Ball.prototype.update = function(mod){
  if(this.y - this.r <= 0 || this.y + this.r >= this.CANVAS_HEIGHT)
    this.directionY *= -1;

  this.x += (this.vx * this.directionX) * mod;
  this.y += (this.vy * this.directionY) * mod;
}

var serveStaticFile = function(filename, type, res) {
  fs.readFile(filename, 'utf8', function (err, data) {
    if (data) {
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    } else {
		  res.writeHead(400);
		  res.end('404 Not Found');
    }
  });
};

var startServer = function() {
  var PORT = 8000;
  var app = http.createServer(function(req, res){
	  var pathname = url.parse(req.url).pathname;
	  if (pathname == '/') {
      serveStaticFile('index.html', 'text/html', res);
    } else {
      var type = pathname.indexOf('.js') > -1 ? 'text/javascript' : 'text/css' ;
      serveStaticFile(pathname.substring(1), type, res);
	  }
  }).listen(PORT);

  console.log("Server started on port", PORT);
  return app;
};

function initSocketIO(app){
	var socket = io.listen(app);
	socket.configure(function(){
		socket.set('transports', ['websocket']);
		socket.set('log level', 2);
	});

  return socket;
}

function setEventHandlers(socket){
	socket.sockets.on('connection', function(client) {
	  client.on('disconnect', function() {
      game.removePlayer(this);
    });

	  client.on('new player', function(data) {
      game.addPlayer(this, data);
    });

	  client.on('player moved', function(data) {
      game.movePlayer(this, data);
    });
  });
}

function findIndexById(playerId){
	for(var i = 0, maxPlayers = game.players.length; i < maxPlayers; i++){
		if(game.players[i].id === playerId)
			return i;
	}
}

var socket = initSocketIO(startServer());
var game = new Game();
game.init();
setEventHandlers(socket);
