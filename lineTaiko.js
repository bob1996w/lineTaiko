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


/*
  KeyHandler class that keep on listening on keys.

  keyDownTrigger and keyUpTrigger are updated by the event handlers with trigger()
  function.
  When _compund() starts a new cycle, nowStatus(true when key is held)
  will be updated by update() function.
  rise and fall indicates some key had keyDown or keyUp Action in this frame.
*/
var KeyHandler = function () {
  this.keyDownTrigger = false;
  this.keyUpTrigger = false;
  this.nowStatus = false;
  this.rise = false;
  this.fall = false;
};
KeyHandler.prototype.fell = function(){
  return this.fall;
}
KeyHandler.prototype.rose = function(){
  return this.rise;
}
KeyHandler.prototype.isHolding = function(){
  return this.nowStatus;
}
KeyHandler.prototype.trigger = function(status){
  // if status = true then trigger keyDownTrigger.
  if(status){
    if(!this.nowStatus){
      // press and hold the key will fire multiple keyDown events
      this.keyDownTrigger = true;
    }
  }else{
    this.keyUpTrigger = true;
  }
}
KeyHandler.prototype.update = function(){
  if(this.rise){
    this.rise = false;
  }
  if(this.fall){
    this.fall = false;
  }
  if(this.keyDownTrigger){
    this.nowStatus = true;
    this.keyDownTrigger = false;
    this.rise = true;
  }else if(this.keyUpTrigger){
    this.nowStatus = false;
    this.keyUpTrigger = false;
    this.fall = true;
  }
}
// end of KeyHandler

$(document).ready(function(){
  var bgm = document.createElement("audio");
  var canvas = document.getElementById("mainGame");
  var ctx = canvas.getContext("2d");

  // initialize KeyHandler Objects

  var keys = {};
  keys["Spacebar"] = new KeyHandler();
  keys["ArrowLeft"] = new KeyHandler();
  keys["ArrowRight"] = new KeyHandler();

  // canvas mouse listener
  canvas.addEventListener('click', function(evt) {
    var mousePos = getMousePos(canvas, evt);
    if(window.statusMode == 1){
      for (var button in menuButtons){
        if (isInside(mousePos, menuButtons[button])) {
            if(button == "startButton"){
              startGame();
              changeStatusMode(2);
              console.log("yes");
            }
        }
      }
    }
  }, false);
  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);
  function keyDownHandler(e) {
    if(e.key == " " || e.key == "Spacebar") {
      keys["Spacebar"].trigger(true);
    }
    else if(e.key == "ArrowLeft") {
      keys["ArrowLeft"].trigger(true);
    }
    else if(e.key == "ArrowRight") {
      keys["ArrowRight"].trigger(true);
    }
  }

  function keyUpHandler(e) {
    if(e.key == " " || e.key == "Spacebar") {
      keys["Spacebar"].trigger(false);
    }
    else if(e.key == "ArrowLeft") {
      keys["ArrowLeft"].trigger(false);
    }
    else if(e.key == "ArrowRight") {
      keys["ArrowRight"].trigger(false);
    }
  }

  var nowTime = Date.now();
  var startTime = Date.now();
  var elapseTime = 0;
  var nowFrame = 0;
  var playarea = {x1: 0, y1: 50, x2: canvas.width, y2: 150};
  var judge = {x: 100, y: 100, h: playarea.y2 - playarea.y1};
  var scrollSpeed = 400;   // pixel per sec
  var scrollMult = 1.0;   // set on menu screen
  var dataObj = {};
  var revNoteObjs = {}; // for drawing notes
  var hitNoteObjs = {}; // for timing the hits
  var eventObjs = {}; // reserved for events like song end
  var judgeTime = {great: 35, good: 100};
  var hitNotePos = 0; // this is the place where a note is detected.
  var evPos = 0; // indeicate event collection's position.
  // game variables
  var score = 0;
  var combo = 0;
  var judgeRes = {great: 0, good: 0, miss: 0};
  var lastJudge = {delay: 0, judge: "", timing: "", hitNotePosNext: false}


  // ui buttons
  var menuButtons = {
    startButton: {x: 150, y: 200, w: canvas.width - 300, h:50, text: "Start", fg: "white", bg: "#0095DD"}
  };

  // start playing the notes
  function startGame(){
    dataObj = window.dataObj;
    hitNoteObjs = dataObj["s"];
    revNoteObjs = hitNoteObjs;
    //console.log(hitNoteObjs);
    eventObjs = dataObj["e"];
    console.log(eventObjs);
    hitNotePos = 0;
    evPos = 0;
    bgm.src = window.musicBlobUrl;
    //console.log(dataObj);
    score = 0;
    combo = 0;
    judgeRes = {great: 0, good: 0, miss: 0};
    lastJudge = {delay: 0, judge: "", timing: "", hitNotePosNext: false};
    nowTime = Date.now();
    startTime = nowTime;
    bgm.play();
  }

  function eventProcess(elapseTime, evPos){
    if(elapseTime > eventObjs[evPos].t && eventObjs[evPos].done == false){
      console.log(eventObjs[evPos]);
      if(eventObjs[evPos].type == "end"){
        changeStatusMode(3);
        bgm.pause();
        bgm.currentTime = 0;
        eventObjs[evPos].done = true;
      }
    }

    return (evPos >= eventObjs.length - 1)? evPos : evPos + 1;
  }

  // TODO: read the hit label and don't draw when the note is hit
  function drawNote(noteObj, elapseTime, scrollSpeed, special){
    var xpos = (noteObj.t - elapseTime) * scrollSpeed * noteObj.s / 1000 + judge.x;
    if(xpos > -300 && xpos < canvas.width + 300){

      if(special){
        ctx.beginPath();
        ctx.fillStyle = "black"
        ctx.arc(xpos, judge.y, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = "orange"
        ctx.lineWidth = 5;
        ctx.stroke();
        //ctx.closePath();
      }else{
        ctx.beginPath();
        ctx.fillStyle = "orange"
        ctx.arc(xpos, judge.y, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = "black"
        ctx.lineWidth = 5;
        ctx.stroke();
        //ctx.closePath();
      }
    }
  }

  function drawPlayField(elapseTime, hitNotePos){
    for (var index = revNoteObjs.length - 1; index >= 0; index--){
      if(revNoteObjs[index].n > 0){
        if(index == hitNotePos){
          drawNote(revNoteObjs[index], elapseTime, scrollSpeed, true);
        }
        else{
          drawNote(revNoteObjs[index], elapseTime, scrollSpeed, false);
        }
      }
    }
  }


  function updatePos(elapseTime, pos, objs){
    if(hitNotePos >= hitNoteObjs.length - 1){
      return hitNotePos;
    }
    else if(elapseTime - hitNoteObjs[hitNotePos].t > judgeTime.good){
      judgeRes.miss ++;
      return hitNotePos + 1;
    }
    else {
      return hitNotePos;
    }
  }

  // TODO: add combo counter
  // TODO: handle Miss -> display
  function detectHit(elapseTime, noteObj){
    var delay = elapseTime - noteObj.t;
    var judgeObj = {
      delay: delay,
      judge: "",
      timing: "",
      hitNotePosNext: false
    };
    judgeObj["delay"] = delay;
    if(delay > judgeTime.good){ // too late
      judgeObj.judge = "miss";
      judgeObj.timing = "";
      judgeObj.hitNotePosNext = true;
    }else if(judgeTime.great < delay && delay < judgeTime.good){
      judgeObj.judge = "good";
      judgeObj.timing = "late";
      judgeObj.hitNotePosNext = true;
    }else if(-judgeTime.great < delay && delay < judgeTime.great){
      judgeObj.judge = "great";
      judgeObj.timing = "";
      judgeObj.hitNotePosNext = true;
    }else if(-judgeTime.good < delay && delay < -judgeTime.great){
      judgeObj.judge = "good";
      judgeObj.timing = "early"
      judgeObj.hitNotePosNext = true;
    }
    return judgeObj;
  }

  function drawJudge(judge){
    ctx.beginPath();
    ctx.font = "20px Lucida Sans Unicode";
    ctx.fillStyle = "#0095DD"
    ctx.textAlign = "center";
    ctx.fillText(judge.timing + " " + judge.judge + " " + judge.delay + " ms", canvas.width/2, canvas.height/2 + 20);
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

  function drawKeyDownBurst(){
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(judge.x - judge.h/2, judge.y - judge.h/2, judge.h, judge.h);
  }
  // TODO: add hit burst

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


  function _compound(){
    nowFrame += 1;
    nowTime = Date.now();
    elapseTime = nowTime - startTime;
    for(var key in keys){
      keys[key].update();
    }
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
      hitNotePos = updatePos(elapseTime, hitNotePos, hitNoteObjs);
      //console.log(hitNotePos);
      if(keys["Spacebar"].isHolding()){
        drawKeyDownBurst();
      }
      if(keys["Spacebar"].rose()){
        var detectResult = detectHit(elapseTime, hitNoteObjs[hitNotePos]);
        if(detectResult.hitNotePosNext){
          hitNotePos += 1;
        }
        switch(detectResult.judge){
          case "great":
            judgeRes.great++;
            break;
          case "good":
            judgeRes.good++;
            break;
          case "miss":
            judgeRes.miss++;
            break;
          default:
            break;
        }
        lastJudge = detectResult;
      }
      drawUI();
      drawPlayField(elapseTime, hitNotePos);
      drawJudge(lastJudge);
      eventProcess(elapseTime, evPos);
      ctx.beginPath();
      ctx.font = "20px Lucida Sans Unicode";
      ctx.fillStyle = "#0095DD"
      ctx.textAlign = "center";
      ctx.fillText(nowFrame + "\nhitNotePos = " + hitNotePos, canvas.width/2, canvas.height/2);
    }
    else if(window.statusMode==3){
      ctx.beginPath();
      ctx.font = "20px Lucida Sans Unicode";
      ctx.fillStyle = "#0095DD"
      ctx.textAlign = "center";
      ctx.fillText("Song End", canvas.width/2, canvas.height*0.2);
      ctx.fillText("Results:", canvas.width/2, canvas.height/2);
      ctx.fillText("great: " + judgeRes.great, canvas.width/2, canvas.height/2 + 25);
      ctx.fillText("good: " + judgeRes.good, canvas.width/2, canvas.height/2 + 50);
      ctx.fillText("miss: " + judgeRes.miss, canvas.width/2, canvas.height/2 + 75);
    }
  }
  setInterval(_compound, 5); //run every 10ms

});
