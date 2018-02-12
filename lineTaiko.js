// Function to get the mouse position
function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}
// Function to check whether a point is inside a rectangle
function isInside(pos, rect){
    return pos.x > rect.x && pos.x < rect.x + rect.w && pos.y < rect.y + rect.h && pos.y > rect.y
}



$(document).ready(function(){
  var bgm = document.createElement("audio");

  var canvas = document.getElementById("mainGame");
  var ctx = canvas.getContext("2d");

  // canvas mouse listener
  canvas.addEventListener('click', function(evt) {
    var mousePos = getMousePos(canvas, evt);
    if(window.statusMode == 1){
      for (var button in menuButtons){
        if (isInside(mousePos, menuButtons[button])) {
            if(button == "startButton"){
              changeStatusMode(2);
              startGame();
              console.log("yes");
            }
        }
      }
    }
  }, false);

  var nowTime = Date.now();
  var startTime = Date.now();
  var elapseTime = 0;
  var nowFrame = 0;
  var playarea = {x1: 0, y1: 50, x2: canvas.width, y2: 150};
  var judge = {x: 100, y: 100, h: 50};
  var scrollSpeed = 100;   // pixel per sec
  var dataObj = {};
  var revNoteObjs = {}; // for drawing notes

  // ui buttons
  var menuButtons = {
    startButton: {x: 150, y: 200, w: canvas.width - 300, h:50, text: "Start", fg: "white", bg: "#0095DD"}
  };

  // start playing the notes
  function startGame(){
    dataObj = window.dataObj;
    revNoteObjs = dataObj["s"].reverse();
    bgm.src = window.musicBlobUrl;
    console.log(dataObj);
    nowTime = Date.now();
    startTime = nowTime;
    bgm.play();
  }

  function drawNote(noteObj, elapseTime, scrollSpeed){
    var xpos = (noteObj.t - elapseTime) * scrollSpeed * noteObj.s / 1000 + judge.x;
    if(xpos > -300 && xpos < canvas.width + 300){
      ctx.beginPath();
      ctx.fillStyle = "orange"
      ctx.arc(xpos, judge.y, 25, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = "black"
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.closePath();
    }
  }


  function drawPlayField(){
    nowTime = Date.now();
    elapseTime = nowTime - startTime;
    for (var note in revNoteObjs){
      drawNote(revNoteObjs[note], elapseTime, scrollSpeed);
    }
  }

  //draw button on menus
  function drawButton(button){
    ctx.fillStyle = button.bg;
    ctx.fillRect(button.x, button.y, button.w, button.h);
    ctx.fillStyle = button.fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(button.text, button.x + button.w/2, button.y + button.h/2);
  }

  // draw the background UIs
  function drawUI(){
    // draw judge line

    ctx.beginPath();
    ctx.moveTo(judge.x, judge.y - judge.x/2);
    ctx.lineTo(judge.x, judge.y + judge.x/2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#0095DD";
    ctx.stroke();
    // draw judge circle
    ctx.beginPath();
    ctx.strokeStyle = "#0095DD";
    ctx.arc(judge.x, judge.y, 25, 0, Math.PI*2);
    ctx.lineWidth = 4;
    ctx.stroke();
    // top line
    ctx.beginPath();
    ctx.moveTo(playarea.x1, playarea.y1);
    ctx.lineTo(playarea.x2, playarea.y1);
    ctx.linewidth = 3;
    ctx.strokeStyle = "#0095DD";
    ctx.stroke();
    // bottom lineTo
    ctx.beginPath();
    ctx.moveTo(playarea.x1, playarea.y2);
    ctx.lineTo(playarea.x2, playarea.y2);
    ctx.linewidth = 3;
    ctx.strokeStyle = "#0095DD";
    ctx.stroke();
  }

  function drawoverlay(){
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "white";
    ctx.fillRect(100, 100, canvas.width - 200, canvas.height - 200);
    ctx.font = "20px Lucida Sans Unicode";
    ctx.fillStyle = "#0095DD"
    ctx.textAlign = "center";
    ctx.fillText("Input Files below", canvas.width/2, canvas.height/2);
  }
  function drawMenu(){
    for (var button in menuButtons){
      drawButton(menuButtons[button]);
    }
  }

  function drawgame(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawUI();
  }

  function _compound(){
    nowFrame += 1;
    /*
    if(nowFrame % 100 == 0){
      console.log("statusMode = " + statusMode);
    }
    */
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(window.statusMode==0){
      // no files loaded
      drawUI();
      drawoverlay();
    }
    else if(window.statusMode==1){
      // files loaded and ready to start game
      drawUI();
      drawMenu();
    }
    else if(window.statusMode==2){
      // in game
      drawUI();
      drawPlayField();

    }
    else if(window.statusMode==3){
      // result
    }
  }
  setInterval(_compound, 10); //run every 10ms

});
