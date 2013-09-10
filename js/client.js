var player, otherPlayer, ball, game;
var time, pressedKey = [];


Player.prototype.move = function(mod) {
  if(pressedKey[38] && this.y > 0){
    this.y -= this.vy * mod;
  }else if(pressedKey[40] && this.y + this.height < canvas.height){
    this.y += this.vy * mod;
  }
}

Player.prototype.draw = function() {
  ctx.fillStyle = this.color;
  ctx.beginPath();
  ctx.fillRect(this.x, this.y, this.width, this.height);
  ctx.closePath();
}

Ball.prototype.update = function(newX, newY){
  this.x = newX;
  this.y = newY;
}


Ball.prototype.draw = function(){
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
  ctx.fill();
  ctx.closePath();
}

Game.prototype.init = function() {
  socket = io.connect(window.location.hostname, {port: 80, transports: ["websocket"]});
  //instantiate player
  player = new Player(null, null, 5, 10, 70, null);
  //emit player has joined
  socket.emit('new player', {y: player.y, canvasWidth: canvas.width, canvasHeight: canvas.height, width: player.width, height: player.height});
  this.setEventHandlers();
  time = Date.now();
}

Game.prototype.setEventHandlers = function(){
  socket.on('new player', onNewPlayer);
  socket.on('assign player', onPlayerAssign);
  socket.on('create ball', onCreateBall);
  socket.on('move ball', onMoveBall);
  socket.on('player disconnected', onDisconnected);
  socket.on('player moved', onPlayerMoved);
  socket.on('game over', onGameOver);
  socket.on('update score', onUpdateScore);
}

Game.prototype.drawAll = function(){
  drawCanvas();
  player.draw();
  if(otherPlayer)
    otherPlayer.draw();
  if(ball)
    ball.draw();
}

Game.prototype.updateAll = function(mod){
  player.move(mod);
}

Game.prototype.loop = function(){
  var self = this;
  game = setInterval(function() {
    self.updateAll((Date.now() - time)/1000);
    self.drawAll();
    time = Date.now();
  }, 50);
}


function onNewPlayer(data){
  otherPlayer = new Player(data.id, data.x, data.y, 10, 70, data.nth);
}

function onPlayerAssign(data){
  player.nth = data.nth;
  player.x = data.x;
}

function onCreateBall(data){
  //instantiate the ball
  ball = new Ball(canvas.width, canvas.height);
  ball.x = data.x;
  ball.y = data.y;
}

function onMoveBall(data){
  ball.update(data.x, data.y);
}

function onDisconnected(data){
  delete otherPlayer.x;
  delete otherPlayer.y;
  clearTimeout(game);
  drawGameOver('Player ' + otherPlayer.nth + ' Disconnected');
}

function onPlayerMoved(data){
  otherPlayer.y = otherPlayer.nth === 1 ? data.player1.y : data.player2.y;
}

function onGameOver(data){
  console.log(data.msg);
  clearTimeout(game);
  drawGameOver();
}

function onUpdateScore(data){
  player.score = player.nth === 1 ? data.score1 : data.score2;
  otherPlayer.score = otherPlayer.nth === 1 ? data.score1 : data.score2;
}


window.addEventListener('keydown', function(e){
  pressedKey[e.keyCode] = true;
  socket.emit('player moved', {y: player.y});
});

window.addEventListener('keyup', function(e){
  delete pressedKey[e.keyCode];
});

//Rendering functions
function drawCanvas(){
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGameOver(msg){
  var winner = (player.score + otherPlayer.score) % 2 === 0 ? 2 : 1;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = '30px Verdana';
  ctx.fillText('Game Over', (canvas.width - 100)/2, canvas.height/2, 100);
  ctx.font = '20px Verdana';
  if (msg !== undefined) {
    ctx.fillText(msg, (canvas.width - 100)/2, (canvas.height + 50)/2, 100);
  } else {
    ctx.fillText('Player ' + winner + ' Won!', (canvas.width - 60)/2, (canvas.height + 50)/2, 60);
  }
}

var main = new Game();
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
canvas.width = main.width;
canvas.height = main.height;

main.init();
main.loop();
