var http = require('http'),
    fs = require('fs'),
    io = require('socket.io'),
    url = require('url');

var Player = require('./Players').Player,
    Ball = require('./Ball').Ball;
    Game = require('./Game').Game;

var GameState = function(options, socket){
  var defaults = {step: 50};
  this.state = {};
  this.settings = extend(defaults, options);
  this.socket = socket; 
}

GameState.prototype.sendUpdate = function(ball, players){
  this.socket.sockets.emit('move ball', {x: ball.x, y: ball.y});
  this.socket.sockets.emit('player moved', {player1: {y : players[0].y}, player2: {y : players[1].y}});
  this.socket.sockets.emit('update score', {score1 : players[0].score, score2 : players[1].score});
}

Game.prototype.init = function(socket) {
    this.ball = new Ball(this.width, this.height);
    this.state = new GameState(null, socket);
    this.setEventHandlers(socket);
}

Game.prototype.addPlayer = function(client, data) {
  //only accept up to 2 players
  if(this.players.length < 2) {
    
    //figure out the necessary player variables
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
    
    //send player data about itself (which player it is) and the ball
    client.emit('assign player', {nth: nth, x: playerX});
    client.emit('create ball', {x: this.ball.x, y: this.ball.y});

    //start the game once there are 2 players already
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
    self.collisionDetect();
    self.state.sendUpdate(self.ball, self.players);

    if(!self.ball.isInPlayArea()){
      console.log('Game Over');
      clearInterval(loop);
      socket.sockets.emit('game over', {msg: 'Game Over'});
    }

    time = Date.now();
  }, this.state.step);
}

Game.prototype.collisionDetect = function() {
  //do collision detection on the game objects--player 1, 2 and ball
  for(var i = 0, maxPlayers = this.players.length; i < maxPlayers; i++){
    var nth = parseInt(this.players[i].nth, 10);
    var playerXStartToCompare = nth === 1 ?
      this.players[i].x :
      this.players[i].x + this.players[i].width;
    var playerXEndToCompare = nth === 1 ?
      this.players[i].x + this.players[i].width:
      this.players[i].x ;

    //bounce ball if its x is equal to or past the start x of the paddle but not past the end x of the paddle
    var xCompared = nth === 1 ?
      this.ball.x + this.ball.r >= playerXStartToCompare && this.ball.x + this.ball.r < playerXEndToCompare : 
      this.ball.x - this.ball.r <= playerXStartToCompare && this.ball.x + this.ball.r > playerXEndToCompare;

    if ((this.ball.y + this.ball.r >= this.players[i].y &&
         this.ball.y - this.ball.r <= this.players[i].y + this.players[i].height) &&
        xCompared) {
      this.players[i].score++;
      this.ball.directionX *= -1;
    }
  }
}

Game.prototype.movePlayer = function(client, data) {
  var playerIndex = findIndexById(client.id);
  this.players[playerIndex].y = data.y;
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

Game.prototype.setEventHandlers = function(socket){
  var self = this;
	socket.sockets.on('connection', function(client) {
	  client.on('disconnect', function() {
      self.removePlayer(this);
    });

	  client.on('new player', function(data) {
      self.addPlayer(this, data);
    });

	  client.on('player moved', function(data) {
      self.movePlayer(this, data);
    });
  });
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

function findIndexById(playerId){
	for(var i = 0, maxPlayers = game.players.length; i < maxPlayers; i++){
		if(game.players[i].id === playerId)
			return i;
	}
}

function extend(def, opt){
  opt = opt || {}; 
  var ext = {}; 

  for (prop in def) {
    if (def.hasOwnProperty(prop) && typeof opt[prop] != 'undefined') {
      ext[prop] = opt[prop];
    } else if (def.hasOwnProperty(prop) && typeof opt[prop] == 'undefined') {
      ext[prop] = def[prop];
    }   
  }

  return ext; 
}

var socket = initSocketIO(startServer());
var game = new Game();
game.init(socket);
