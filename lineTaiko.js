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

function deg2Rad(degrees){
  return degrees * (Math.PI / 180);
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
  var acceptKeys = ["Spacebar", "ArrowLeft", "ArrowRight", "f", "j"];
  var keys = {};
  for(var index in acceptKeys){
    keys[acceptKeys[index]] = new KeyHandler();
  }

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
    // some browsers will define key " ", some "Spacebar"
    if(e.key == " " && acceptKeys.find(keyLabel => keyLabel == "Spacebar")){
      keys["Spacebar"].trigger(true);
    }
    else if(acceptKeys.find(keyLabel => keyLabel == e.key)){
      keys[e.key].trigger(true);
    }
  }

  function keyUpHandler(e) {
    if(e.key == " " && acceptKeys.find(keyLabel => keyLabel == "Spacebar")){
      keys["Spacebar"].trigger(false);
    }
    else if(acceptKeys.find(keyLabel => keyLabel == e.key)){
      keys[e.key].trigger(false);
    }
  }

  var nowTime = Date.now();
  var startTime = Date.now();
  var elapseTime = 0;
  var nowFrame = 0;
  var playarea = {x1: 0, y1: 50, x2: canvas.width, y2: 150};
  var judgePos = {x: 100, y: 100, h: playarea.y2 - playarea.y1};
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
  var maxCombo = 0;
  var judgeRes = {great: 0, good: 0, miss: 0};
  var lastJudge = {delay: 0, judge: "", timing: ""}


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
    var xpos = (noteObj.t - elapseTime) * scrollSpeed * noteObj.s / 1000 * Math.cos(deg2Rad(noteObj.angle)) + noteObj.approachJudgePos.x;
    var ypos = (noteObj.t - elapseTime) * scrollSpeed * noteObj.s / 1000 * Math.sin(deg2Rad(noteObj.angle)) + noteObj.approachJudgePos.y;
    if(xpos > -300 && xpos < canvas.width + 300 && ypos > -300 && ypos < canvas.height + 300 && !noteObj.hit){

      if(special){
        ctx.beginPath();
        ctx.fillStyle = "black"
        ctx.arc(xpos, judgePos.y, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = "orange"
        ctx.lineWidth = 5;
        ctx.stroke();
        //ctx.closePath();
      }else{
        ctx.beginPath();
        ctx.fillStyle = "orange"
        ctx.arc(xpos, judgePos.y, 25, 0, Math.PI*2);
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

  // updates the last judge result and combo status
  function updateLastJudge(delay, judgeText){
    lastJudge.delay = delay;
    lastJudge.judge = judgeText;
    if(judgeText != "miss"){
      combo += 1;
      if(combo > maxCombo){
        maxCombo = combo;
      }
    }
    else{
      combo = 0;
    }
  }

  function updatePos(elapseTime, pos, objs){
    if(hitNotePos >= hitNoteObjs.length - 1){
      return hitNotePos;
    }
    else if(elapseTime - hitNoteObjs[hitNotePos].t > judgeTime.good){
      judgeRes.miss ++;
      updateLastJudge("miss", judgeTime.good);
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

  function drawJudge(judge, judgePos){
    ctx.beginPath();
    ctx.font = "20px Lucida Sans Unicode";
    ctx.fillStyle = "#0095DD"
    ctx.textAlign = "center";
    ctx.fillText(judge.judge, judgePos.x, judgePos.y - 0.65 * judgePos.h);
    var delayStr = (judge.delay >= 0)? "+" : "-"
    delayStr += Math.round(Math.abs(judge.delay));
    ctx.fillText(delayStr, judgePos.x, judgePos.y + 0.65 * judgePos.h);
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
    ctx.fillRect(judgePos.x - judgePos.h/2, judgePos.y - judgePos.h/2, judgePos.h, judgePos.h);
  }
  // TODO: add hit burst

  // draw the Border line of play field
  function drawJudgeBorder(){
    // draw judge line
    ctx.beginPath();
    ctx.moveTo(judgePos.x, judgePos.y - judgePos.x/2);
    ctx.lineTo(judgePos.x, judgePos.y + judgePos.x/2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#0095DD";
    ctx.stroke();
    // draw judge circle
    ctx.beginPath();
    ctx.strokeStyle = "#0095DD";
    ctx.arc(judgePos.x, judgePos.y, 25, 0, Math.PI*2);
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

  // draw the combo, score, etc. that does not move.
  function drawHUD(combo, score){
    ctx.beginPath();
    ctx.font = "20px Lucida Sans Unicode";
    if(combo > 0){
      ctx.fillStyle = "#0095DD"
      ctx.textAlign = "left";
      ctx.fillText(combo + " combo", 30, canvas.height - 30);
    }
    ctx.fillStyle = "#0095DD"
    ctx.textAlign = "right";
    ctx.fillText(score, canvas.width - 30, 30)
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
      drawJudgeBorder();
      drawoverlay();
    }
    else if(window.statusMode==1){
      // files loaded and ready to start game
      drawJudgeBorder();
      drawMenu();
    }
    else if(window.statusMode==2){
      // in game
      hitNotePos = updatePos(elapseTime, hitNotePos, hitNoteObjs);
      //console.log(hitNotePos);
      if(keys["Spacebar"].isHolding() || keys["f"].isHolding() || keys["j"].isHolding()){
        drawKeyDownBurst();
      }
      if(keys["Spacebar"].rose() || keys["f"].rose() || keys["j"].rose()){
        var detectResult = detectHit(elapseTime, hitNoteObjs[hitNotePos]);
        switch(detectResult.judge){
          case "great":
            judgeRes.great++;
            hitNoteObjs[hitNotePos].hit = true;
            updateLastJudge(detectResult.delay, detectResult.judge);
            break;
          case "good":
            judgeRes.good++;
            hitNoteObjs[hitNotePos].hit = true;
            updateLastJudge(detectResult.delay, detectResult.judge);
            break;
          case "miss":
            judgeRes.miss++;
            updateLastJudge(detectResult.delay, detectResult.judge);
            break;
          default:
            break;
        }
        if(detectResult.hitNotePosNext){
          hitNotePos += 1;
        }
        
      }
      drawJudgeBorder();
      drawPlayField(elapseTime, hitNotePos);
      drawJudge(lastJudge, judgePos);
      drawHUD(combo, score);
      eventProcess(elapseTime, evPos);
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
      ctx.fillText("maxCombo: " + maxCombo, canvas.width/2, canvas.height/2 + 100);
      
    }
  }
  setInterval(_compound, 5); //run every 10ms

});
