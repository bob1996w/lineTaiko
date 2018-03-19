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

function playSfx(sfx){
  sfx.currentTime = 0;
  sfx.play();
}

function judgeResInit(judgeTimeList, noteDigest){
  var judgeResList = {};
  for(var noteType in noteDigest) {
    judgeResList[noteType] = {};
    for(var judgeType in judgeTimeList) {
      judgeResList[noteType][judgeType] = 0;
    }
    judgeResList[noteType]["miss"] = 0;
  }
  return judgeResList;
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
  this.lastRise = Date.now();
  this.lastFall = Date.now();
};
KeyHandler.prototype.fell = function(){
  return this.fall;
}
KeyHandler.prototype.lastFell = function(){
  return this.lastFall;
}
KeyHandler.prototype.rose = function(){
  return this.rise;
}
KeyHandler.prototype.lastRose = function(){
  return this.lastRise;
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
      this.lastRise = Date.now();
    }
  }else{
    this.keyUpTrigger = true;
    this.lastFall = Date.now();
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
  var sfx = document.createElement("audio");
  var useSfx = true;  // whether sfx has been uploaded
  var canvas = document.getElementById("mainGame");
  var ctx = canvas.getContext("2d");
  var statusMode = window.statusMode;

  // initialize KeyHandler Objects
  var acceptKeys = ["Spacebar", "ArrowLeft", "ArrowRight", "f", "j"];
  var playKeys = ["Spacebar", "f", "j"];
  var keys = {};
  for(var index in acceptKeys){
    keys[acceptKeys[index]] = new KeyHandler();
  }

  // canvas mouse listener
  canvas.addEventListener('click', function(evt) {
  var mousePos = getMousePos(canvas, evt);
    for (var button in menuButtons){
      if (isInside(mousePos, menuButtons[button])) {
        menuButtons[button].trigger = true;
        menuButtons[button].triggerTime = Date.now();
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
  var visualObjs = {}; // for visuals on screen
  var noteDigest = {}; // total notes of each kind; for calculating score
  var hitNotePos = 0; // this is the place where a note is detected.
  var evPos = 0; // indeicate event collection's position.
  // game variables
  var score = 0;
  var combo = 0;
  var maxCombo = 0;
  var judgeTime = {perfect: 20, great: 45, good: 100};
  var judgeScore = {perfect: 1, great: 0.8, good: 0.5, miss: 0};
  var noteTypeScore = {"0": 1, "1": 2}
  var totalScoreRep = 0;
  var judgeColor = {perfect: "#ffff00", great: "#ff7700", good: "#06bf00", miss:"#515151"};
  var judgeRes = {}
  var lastJudge = {delay: 0, judge: "", timing: ""}
  var totalJudge = {delay: 0, hitNotes: 0}; // to calculate average delay of notes hit.


  // ui buttons
  var menuButtons = {
    startButton: {x: 150, y: 200, w: canvas.width - 300, h:50, text: "Start (Space)", fg: "white", bg: "#0095DD", trigger: false, clicked: false, triggerTime: 0}
  };

  // start playing the notes
  function startGame(){
    dataObj = window.dataObj;
    hitNoteObjs = dataObj["s"];
    revNoteObjs = hitNoteObjs;
    eventObjs = dataObj["e"];
    visualObjs = dataObj["v"];
    noteDigest = dataObj["digest"];
    //console.log(visualObjs);
    hitNotePos = 0;
    evPos = 0;
    bgm.src = window.musicBlobUrl;
    if(window.sfxBlobUrl != ""){
      useSfx = true;
      sfx.src = window.sfxBlobUrl;
      //console.log("SFX: " + sfx.src);
    }
    score = 0;
    combo = 0;
    maxCombo = 0;
    judgeRes = judgeResInit(judgeTime, noteDigest);
    lastJudge = {delay: 0, judge: "", timing: ""};
    totalJudge = {delay: 0, hitNotes: 0};
    totalScoreRep = getTotalScoreRep(noteDigest);
    nowTime = Date.now();
    startTime = nowTime;
    bgm.play();
  }

  function eventProcess(elapseTime, evPos){
    if(elapseTime > eventObjs[evPos].t && eventObjs[evPos].done == false){
      //console.log(eventObjs[evPos]);
      if(eventObjs[evPos].type == "end"){
        bgm.pause();
        bgm.currentTime = 0;
        eventObjs[evPos].done = true;
        changeStatusMode(3);
        window.statusMode = 3;
        statusMode = 3;
      }
    }

    return (evPos >= eventObjs.length - 1)? evPos : evPos + 1;
  }

  // TODO: read the hit label and don't draw when the note is hit
  function drawNote(noteObj, elapseTime, scrollSpeed, special){
    var xpos = (noteObj.t - elapseTime) * scrollSpeed * noteObj.s / 1000 * Math.cos(deg2Rad(noteObj.angle)) + noteObj.approachJudgePos.x;
    var ypos = (noteObj.t - elapseTime) * scrollSpeed * noteObj.s / -1000 * Math.sin(deg2Rad(noteObj.angle)) + noteObj.approachJudgePos.y;
    if(xpos > -300 && xpos < canvas.width + 300 && ypos > -300 && ypos < canvas.height + 300 && !noteObj.hit){

      if(special){
        ctx.beginPath();
        ctx.fillStyle = "black"
        ctx.arc(xpos, ypos, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = "orange"
        ctx.lineWidth = 5;
        ctx.stroke();
        //ctx.closePath();
      }else{
        ctx.beginPath();
        ctx.fillStyle = "orange"
        ctx.arc(xpos, ypos, 25, 0, Math.PI*2);
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
      if(revNoteObjs[index].n > 0 && !revNoteObjs[index].hidden){
        if(index == hitNotePos){
          drawNote(revNoteObjs[index], elapseTime, scrollSpeed, true);
        }
        else{
          drawNote(revNoteObjs[index], elapseTime, scrollSpeed, false);
        }
      }
    }
  }

  function drawVisual(visualObj, elapseTime, scrollSpeed){
    var xpos = (visualObj.t - elapseTime) * scrollSpeed * visualObj.s / 1000 * Math.cos(deg2Rad(visualObj.angle)) + visualObj.approachJudgePos.x;
    var ypos = (visualObj.t - elapseTime) * scrollSpeed * visualObj.s / -1000 * Math.sin(deg2Rad(visualObj.angle)) + visualObj.approachJudgePos.y;
    if(xpos > -300 && xpos < canvas.width + 300 && ypos > -300 && ypos < canvas.height + 300){
      switch(visualObj.type){
        case "barLine":
          var linePos = {x: judgePos.h * 0.5 * Math.cos(deg2Rad(visualObj.angle + 90)), y: judgePos.h * -0.5 * Math.sin(deg2Rad(visualObj.angle + 90))};
          //var lineEndPos = {x: linePos.x + (linePos.x - xpos) * 2, y: linePos.y + (linePos.y - ypos) * 2};
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#666666"
          ctx.moveTo(xpos - linePos.x, ypos - linePos.y);
          ctx.lineTo(xpos + linePos.x, ypos + linePos.y);
          ctx.stroke();
          break;
        default:
          break;
      }
    }
  }

  function drawVisuals(elapseTime){
    for (var index = visualObjs.length - 1; index >=0; index --){
      drawVisual(visualObjs[index], elapseTime, scrollSpeed);
    }
  }

  function getTotalScoreRep(noteDigest) {
    var totalScoreRep = 0;
    for(var noteType in noteDigest) {
      totalScoreRep += noteTypeScore[noteType] * judgeScore["perfect"] * noteDigest[noteType]
    }
    return totalScoreRep;
  }
  function updateScore(judgeRes, noteDigest) {
    var totalUserScoreRep = 0;
    for(var noteType in noteDigest) {
      for(var judgeName in judgeScore) {
        totalUserScoreRep += noteTypeScore[noteType] * judgeScore[judgeName] * judgeRes[noteType][judgeName]
      }
    }
    return ~~(1000000 * totalUserScoreRep / totalScoreRep)
  }
  // updates the last judge result and combo status
  function updateLastJudge(delay, judgeText){
    lastJudge.delay = delay;
    lastJudge.judge = judgeText;
    if(judgeText == "perfect" || judgeText == "great" || judgeText == "good"){
      totalJudge.delay += delay;
      totalJudge.hitNotes += 1;
      combo += 1;
      if(combo > maxCombo){
        maxCombo = combo;
      }
    }
    else{
      combo = 0;
    }
    score = updateScore(judgeRes, noteDigest);
  }

  function updatePos(elapseTime, pos, objs){
    if(hitNotePos >= hitNoteObjs.length - 1){
      return hitNotePos;
    }
    else if(elapseTime - hitNoteObjs[hitNotePos].t > judgeTime.good){
      judgeRes[hitNoteObjs[hitNotePos].n].miss ++;
      updateLastJudge(judgeTime.good, "miss");
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
    /*
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
    */
    timing = (delay > 0)? "late" : (delay < 0)? "fast" : "";
    var delayAbs = Math.abs(delay);
    /*
    for(var judgeType in judgeTime){
      if(delayAbs < judgeTime[judgeType]){
        judgeObj.judge = judgeType;
        judgeObj.hitNotePosNext = true;
      }
    }*/
    if(delayAbs < judgeTime.perfect){
      judgeObj.judge = "perfect";
      judgeObj.hitNotePosNext = true;
    }
    else if(delayAbs < judgeTime.great){
      judgeObj.judge = "great";
      judgeObj.hitNotePosNext = true;
    }
    else if(delayAbs < judgeTime.good){
      judgeObj.judge = "good";
      judgeObj.hitNotePosNext = true;
    }
    else if(judgeObj.judge == "" && delay > 0){
      judgeObj.judge = "miss";
      judgeObj.hitNotePosNext = true;
    }
    return judgeObj;
  }

  function drawJudge(judge, judgePos){
    ctx.beginPath();
    ctx.font = "20px Lucida Sans Unicode";
    ctx.strokeStyle = "#000000"
    ctx.textAlign = "center";
    ctx.lineWidth = 2;
    ctx.strokeText(judge.judge, judgePos.x, judgePos.y - 0.65 * judgePos.h);
    ctx.fillStyle = judgeColor[judge.judge];
    ctx.fillText(judge.judge, judgePos.x, judgePos.y - 0.65 * judgePos.h);
    if(judge.judge == "perfect" || judge.judge == "great" || judge.judge == "good"){
      var delayStr = (judge.delay >= 0)? "+" : "-"
      delayStr += Math.round(Math.abs(judge.delay));
      ctx.fillStyle = "#0095DD";
      ctx.fillText(delayStr, judgePos.x, judgePos.y + 0.65 * judgePos.h);
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
    if(totalJudge.hitNotes > 0){
      ctx.fillText("Average delay: " + Math.round(totalJudge.delay / totalJudge.hitNotes), canvas.width - 30, canvas.height - 30);
    }
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

  function drawJudgeText(judgeText, result, x, y){
    ctx.beginPath();
    ctx.font = "20px Lucida Sans Unicode";
    ctx.strokeStyle = "#000000";
    ctx.textAlign = "left";
    ctx.lineWidth = 2;
    ctx.strokeText(judgeText, x, y);
    ctx.fillStyle = judgeColor[judgeText];
    ctx.fillText(judgeText, x, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#0095DD";
    ctx.fillText(result, x + 190, y);
  }


  function getJudgeTotal(judgeName) {
    var thisJudgeTotal = 0;
    for (var noteType in noteDigest) {
      thisJudgeTotal += judgeRes[noteType][judgeName]
    }
    return thisJudgeTotal;
  }

  function drawJudgeResult(x, y){
    ctx.beginPath();
    ctx.font = "20px Lucida Sans Unicode";
    ctx.fillStyle = "#0095DD";
    ctx.textAlign = "left";
    ctx.fillText("maxCombo", x + 5, y + 150);
    ctx.textAlign = "right";
    ctx.fillText(maxCombo, x + 195, y + 150);

    drawJudgeText("perfect", getJudgeTotal("perfect"), x + 5, y + 30);
    drawJudgeText("great", getJudgeTotal("great"), x + 5, y + 55);
    drawJudgeText("good", getJudgeTotal("good"), x + 5, y + 80);
    drawJudgeText("miss", getJudgeTotal("miss"), x + 5, y + 105);
    ctx.rect(x, y, 200, 165);
    ctx.stroke();
 }
  function drawResultScreen(){
    ctx.beginPath();
    ctx.font = "30px Lucida Sans Unicode";
    ctx.fillStyle = "#0095DD";
    ctx.textAlign = "center";
    ctx.fillText(score, canvas.width/2, 85)
    ctx.font = "20px Lucida Sans Unicode";
    ctx.fillText("Song End", canvas.width/2, canvas.height*0.15);
    ctx.fillText("Overall Delay: " + Math.round(totalJudge.delay / totalJudge.hitNotes) + "ms", canvas.width/2, canvas.height/2 + 125);
    drawJudgeResult(canvas.width/2 - 100, 100);
  }


  function _compound(){
    statusMode = window.statusMode;
    nowFrame += 1;
    nowTime = Date.now();
    elapseTime = nowTime - startTime;
    for(var key in keys){
      keys[key].update();
    }
    for(var button in menuButtons){
      if(menuButtons[button].trigger){
        menuButtons[button].trigger = false;
        menuButtons[button].clicked = true;
      }
      if(menuButtons[button].clicked && nowTime - menuButtons[button] > 1000){
        menuButtons[button].clicked = false;
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(statusMode==0){
      // no files loaded
      drawJudgeBorder();
      drawoverlay();
    }
    else if(statusMode==1){
      // files loaded and ready to start game
      // start the game
      if(keys["Spacebar"].rose() || menuButtons["startButton"].clicked){
        startGame();
        changeStatusMode(2);
        //console.log("yes");
      }
      drawJudgeBorder();
      drawMenu();
    }
    else if(statusMode==2){
      // in game
      hitNotePos = updatePos(elapseTime, hitNotePos, hitNoteObjs);
      //console.log(hitNotePos);
      if(keys["Spacebar"].isHolding() || keys["f"].isHolding() || keys["j"].isHolding()){
        drawKeyDownBurst();
      }
      for(var i = 0; i < playKeys.length; i++){
        if(keys[playKeys[i]].rose()){
          if(useSfx){playSfx(sfx);}
          /* TODO: might need to revamp the detectHit with detecting all the note instead of a position
          
          */
          var detectResult = detectHit(keys[playKeys[i]].lastRose() - startTime, hitNoteObjs[hitNotePos]);
          var thisNoteType = hitNoteObjs[hitNotePos].n;
          switch(detectResult.judge){
            case "perfect":
              judgeRes[thisNoteType].perfect++;
              hitNoteObjs[hitNotePos].hit = true;
              updateLastJudge(detectResult.delay, detectResult.judge);
              break;
            case "great":
              judgeRes[thisNoteType].great++;
              hitNoteObjs[hitNotePos].hit = true;
              updateLastJudge(detectResult.delay, detectResult.judge);
              break;
            case "good":
              judgeRes[thisNoteType].good++;
              hitNoteObjs[hitNotePos].hit = true;
              updateLastJudge(detectResult.delay, detectResult.judge);
              break;
            case "miss":
              judgeRes[thisNoteType].miss++;
              updateLastJudge(detectResult.delay, detectResult.judge);
              break;
            default:
              break;
          }
          if(detectResult.hitNotePosNext){
            hitNotePos += 1;
          }
        }
      }
      drawJudgeBorder();
      drawVisuals(elapseTime);
      drawPlayField(elapseTime, hitNotePos);
      drawJudge(lastJudge, judgePos);
      drawHUD(combo, score);
      eventProcess(elapseTime, evPos);
    }
    else if(statusMode==3){
      drawResultScreen();
    }
  }
  setInterval(_compound, 5); //run every 10ms

});
