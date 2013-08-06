var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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

function Ball(x, y){
  this.r = 7;
  this.x = x;
  this.y = y;

  this.update = function(newX, newY){
    this.x = newX;
    this.y = newY;
  }

  this.draw = function(){
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
    ctx.fill();
    ctx.closePath();
  }
}

function init(){

  socket = io.connect("http://localhost", {port: 8000, transports: ["websocket"]});

  //instantiate player
  player = new Player(null, null, 5, 10, 70, null);

  //emit player has joined
  socket.emit('new player', {y: player.y, canvasWidth: canvas.width, canvasHeight: canvas.height, width: player.width, height: player.height});

  setEventHandlers();

  time = Date.now();
}

function setEventHandlers(){
  socket.on('new player', onNewPlayer);
  socket.on('assign player', onPlayerAssign);
  socket.on('create ball', onCreateBall);
  socket.on('move ball', onMoveBall);
  socket.on('player disconnected', onDisconnected);
  socket.on('player moved', onPlayerMoved);
  socket.on('game over', onGameOver);
  socket.on('update score', onUpdateScore);
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
  ball = new Ball(data.x, data.y);
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
  otherPlayer.y = data.y;
}

function onGameOver(data){
  console.log(data.msg);
  clearTimeout(game);
  drawGameOver();
}

function onUpdateScore(data){
  if((parseInt(data.nth) === 1 && player.nth === 1) || (parseInt(data.nth) === 2 && player.nth === 2)){
    player.score = data.score;
  }else{
    otherPlayer.score = data.score;
  }
  console.log(player.score, otherPlayer.score);
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
  var player1 = parseInt(player.nth) === 1? player: otherPlayer;
  var player2 = parseInt(player.nth) === 2? player: otherPlayer;
  var totalScore = player1.score + player2.score;
  var winner = ((totalScore % 2) === 0)?2:1;

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

function drawAll(){
  drawCanvas();
  player.draw();
  if(otherPlayer)
    otherPlayer.draw();
  if(ball)
    ball.draw();
}

function updateAll(mod){
  player.move(mod);
}

function gameLoop(){
  updateAll((Date.now() - time)/1000);
  drawAll();

  time = Date.now();

  game = setTimeout(gameLoop, 50);
}

init();
gameLoop();
