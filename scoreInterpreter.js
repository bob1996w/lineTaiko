// use iife to prevent global variable/functions
(function (window) {

  var s = function () {
    // all regex's in data files
    this.dataRegEx = {
      "bpm": /^\(\d+(\.\d+)?\)/,
      "noteSpeed": /^\[\d+(\.\d+)?\]/,
      "division": /^\{\d+(\.\d+)?\}/,
      "exCommand": /^\'[a-zA-Z_][a-zA-Z0-9_]*=[a-zA-Z0-9,\.\/]+\'/,
      "step": /^,/,
      "note": /^[1-9]/,
      "hiddenNote": /^0/,
      "end": /^E/,
      "barLine": /^\|/,
    };
  }

  s.prototype.removeComments = function (line){
    var index = line.indexOf(';');
    if(index < 0){
      return line;
    }else{
      return line.substring(0, index);
    }
  }
  
  s.prototype.convertMetaData = function (lines){
    var metaObj = {};
    for(var line in lines){
      var index = lines[line].indexOf('=');
      metaObj[lines[line].substring(0, index).toLowerCase()] = lines[line].substring(index + 1);
    }
    return metaObj;
  }
  
  s.prototype.checkAndConvert = function (data, type){
    switch(type){
      case "number":
        if(/^\d+(\.\d+)?$/.test(data) || /^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(data)){
          var result = eval(data);
          if(isFinite(result)){
            return result;
          }else{
            this.errMsg(1, "" + type + ": " + data);
            return 1;
          }
        }else{
          this.errMsg(1, "" + type + ": " + data);
          return 1;
        }
    }
  }
  
  // cut off the first and last char in a string
  s.prototype.trimHeadTail = function (str){
    return str.substring(1, str.length - 1);
  }
  
  /*
  note obj:
    {t, n, s}
      t: time(ms)
      n: note type:
        0: end
        1: normal note
      s: note speed(multiplier) of this note
      hit: whether this note is hit
      angle: the andgle of approching judgePos in degree (+x = 0, counterclockwise)
      judgePos: the position it should go toward to
  */
  
  s.prototype.scoreInterpreter = function (scorestr){
    var rawLines = scorestr.split(/\r\n|\n/).map(this.removeComments).map(line => line.replace(/\s+$/, ''));
    var metaData = this.convertMetaData(rawLines.filter(line => line[0] == '#').map(line => line.substring(1)));
    var scoreDataStr = rawLines.filter(line => line[0] != '#').map(line => line.replace(/\s/g, '')).join('');
    //console.log(metaData);
  
    var time = 0;       // in ms
    var notes = [];     // Array of all the Notes
    var events = [];    // Array of all the events(non-notes)
    var visuals = [];   // Array of all the visual objects (e.g. bar line)
    var discards = [];  // discarded characters
    var noteDigest = {
      "0": 0,
      "1": 0
    };// Total of each kinds of notes
    var pos = 0;
    var noteSpeed = 1.0;
    var bpm = this.checkAndConvert(metaData["bpm"], "number");
    var defdiv = (metaData["defdiv"])? this.checkAndConvert(metaData["defdiv"], "number") : 4;
    var div = this.checkAndConvert(metaData["div"], "number");
    var noteLength = 60000.0 / bpm / (div/4);
    var offset = (metaData["offset"])? this.checkAndConvert(metaData["offset"], "number") : 0;
    var judgePos = {x: (metaData["judgeposx"])? this.checkAndConvert(metaData["judgeposx"], "number") : 100, 
      y: (metaData["judgeposy"])? this.checkAndConvert(metaData["judgeposy"], "number") : 100}
    var defJudgePos = {x: judgePos.x, y: judgePos.y};
    var angle = 0;
    if (judgePos.x != 100 || judgePos.y != 100){
      var evObj = {t: time, type: "jp", x: judgePos.x, y: judgePos.y, done: false};
      events.push(evObj);
    }
  
    time += offset * 1000;
    while(pos < scoreDataStr.length){
      var validflag = false;
      var nowString = scoreDataStr.substring(pos);
      for(var regExType in this.dataRegEx){
        var result = this.dataRegEx[regExType].exec(nowString);
        if(result != null){
          if(result.index == 0){
            //console.log("Pos " + pos + " Regex matched: " + regExType + ": " + result[0]);
            switch(regExType){
              case "bpm":
                bpm = this.checkAndConvert(this.trimHeadTail(result[0]), "number");
                noteLength = 60000.0 / bpm / (div/4);
                break;
              case "noteSpeed":
                noteSpeed = this.checkAndConvert(this.trimHeadTail(result[0]), "number");
                break;
              case "division":
                div = this.checkAndConvert(this.trimHeadTail(result[0]), "number");
                noteLength = 60000.0 / bpm / (div/4);
                break;
              case "step":
                time += noteLength;
                break;
              case "note":
                var noteObj = {t: time, n: 1, s: noteSpeed, hit: false, hidden: false, angle: angle, approachJudgePos: {x: judgePos.x, y: judgePos.y}};
                notes.push(noteObj);
                noteDigest[1] += 1;
                break;
              case "hiddenNote":
                var noteObj = {t: time, n: 0, s: noteSpeed, hit: false, hidden: true, angle: angle, approachJudgePos: {x: judgePos.x, y: judgePos.y}};
                notes.push(noteObj);
                noteDigest[0] += 1;
                break;
              case "end":
                var evObj = {t: time, type: "end", done: false};
                events.push(evObj);
                break;
              case "barLine":
                var visualObj = {t: time, type:"barLine", s: noteSpeed, angle: angle, approachJudgePos: {x: judgePos.x, y: judgePos.y}};
                visuals.push(visualObj);
                break;
                case "exCommand":
                // NOTE: reserved for future extension of data file
                var command = this.trimHeadTail(result[0]).split("=");
                switch(command[0]){
                  case "a":
                    angle = this.checkAndConvert(command[1], "number");
                    break;
                  case "jp":
                    if(command[1] == ","){
                      judgePos.x = defJudgePos.x;
                      judgePos.y = defJudgePos.y;
                    }
                    else{
                      var innerCommand = command[1].split(",");
                      var jpx = this.checkAndConvert(innerCommand[0], "number");
                      var jpy = this.checkAndConvert(innerCommand[1], "number");
                      judgePos.x = jpx;
                      judgePos.y = jpy;
                    }
                    var evObj = {t: time, type: "jp", x: judgePos.x, y: judgePos.y, done: false};
                    events.push(evObj);
                    break;
                  default:
                    console.log("Unknown exCommand: " + command[0] + "=" + command[1]);
                    break;
                }
                break;
              default:
                this.errMsg(2);
                alert("result\n" + result[0]);
            }
            pos += result[0].length
            validFlag = true;
          }
        }
      }
      if(!validFlag){
        var discardObj = {pos: pos, text: scoreDataStr[0]};
        discards.push(discardObj);
        pos += 1;
      }
  
    }
    alert("Scanned " + notes.length + " notes\n" + discards.length + " discarded");
    metaData["s"] = notes;
    metaData["e"] = events;
    metaData["v"] = visuals;
    metaData["digest"] = noteDigest;
    return metaData;
  }
  
  s.prototype.errMsg = function (errN, msgData){
    var msg = "";
    switch(errN){
      case 1:
        msg = "No " + msgData + " found.";
      case 2:
        msg = "Something's wrong with the code."
      default:
        msg = "Something goes wrong.";
    }
    alert("Error " + errN + ":\n" + msg + "\n" + msgData);
  }

  window.si = new s();
}) (window);

