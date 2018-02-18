
function removeComments(line){
  var index = line.indexOf(';');
  if(index < 0){
    return line;
  }else{
    return line.substring(0, index);
  }
}

function convertMetaData(lines){
  var metaObj = {};
  for(var line in lines){
    var index = lines[line].indexOf('=');
    metaObj[lines[line].substring(0, index).toLowerCase()] = lines[line].substring(index + 1);
  }
  return metaObj;
}

function checkAndConvert(data, type){
  switch(type){
    case "number":
      if(/^[0-9]+$/.test(data) || /^[0-9]+\.[0-9]+$/.test(data)){
        return eval(data);
      }else{
        errMsg(1, "" + type + ": " + data);
        return 1;
      }
  }
}

// cut off the first and last char in a string
String.prototype.trimHeadTail = function (){
  return this.substring(1, this.length - 1);
}

// all regex's in data files
var dataRegEx = {
  "bpm": /^\(\d+(\.\d+)?\)/,
  "noteSpeed": /^\[\d+(\.\d+)?\]/,
  "division": /^\{\d+(\.\d+)?\}/,
  "exCommand": /^\'[a-zA-Z_][a-zA-Z0-9_]*=[a-zA-Z0-9]+\'/,
  "step": /^,/,
  "note": /^\d/,
  "end": /^E/,
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

function scoreInterpreter(scorestr){
  var rawLines = scorestr.split(/\r\n|\n/).map(removeComments).map(line => line.replace(/\s+$/, ''));
  var metaData = convertMetaData(rawLines.filter(line => line[0] == '#').map(line => line.substring(1)));
  var scoreDataStr = rawLines.filter(line => line[0] != '#').map(line => line.replace(/\s/g, '')).join('');
  //console.log(metaData);

  var time = 0; // in ms
  var notes = [];  // Array of all the Notes
  var events = []; // Array of all the events(non-notes)
  var discards = []; // discarded characters
  var pos = 0;

  var noteSpeed = 1.0;
  var bpm = checkAndConvert(metaData["bpm"], "number");
  var defdiv = (metaData["defdiv"])? checkAndConvert(metaData["defdiv"], "number") : 4;
  var div = checkAndConvert(metaData["div"], "number");
  var noteLength = 60000.0 / bpm / (div/4);
  var offset = (metaData["offset"])? checkAndConvert(metaData["offset"], "number") : 0;
  var judgePos = {x: (metaData["judgePosX"])? checkAndConvert(metaData["judgePosX"], "number") : 100, 
    y: (metaData["judgePosY"])? checkAndConvert(metaData["judgePosY"], "number") : 100}
  var angle = 0;

  time += offset * 1000;
  while(pos < scoreDataStr.length){
    var validflag = false;
    var nowString = scoreDataStr.substring(pos);
    for(var regExType in dataRegEx){
      var result = dataRegEx[regExType].exec(nowString);
      if(result != null){
        if(result.index == 0){
          //console.log("Pos " + pos + " Regex matched: " + regExType + ": " + result[0]);
          switch(regExType){
            case "bpm":
              bpm = checkAndConvert(result[0].trimHeadTail(), "number");
              noteLength = 60000.0 / bpm / (div/4);
              break;
            case "noteSpeed":
              noteSpeed = checkAndConvert(result[0].trimHeadTail(), "number");
              break;
            case "division":
              div = checkAndConvert(result[0].trimHeadTail(), "number");
              noteLength = 60000.0 / bpm / (div/4);
              break;
            case "step":
              time += noteLength;
              break;
            case "note":
              var noteObj = {t: time, n: 1, s: noteSpeed, hit: false, angle: angle, approachJudgePos: {x: judgePos.x, y: judgePos.y}};
              notes.push(noteObj);
              break;
            case "end":
              var evObj = {t: time, type: "end", done: false};
              events.push(evObj);
              break;
            case "exCommand":
              // NOTE: reserved for future extension of data file
              var command = result[0].trimHeadTail().split("=");
              switch(command[0]){
                case "a":
                  angle = checkAndConvert(command[1], "number");
                  break;
                default:
                  console.log("Unknown exCommand: " + command[0] + "=" + command[1]);
                  break;
              }
              break;
            default:
              errMsg(2);
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
  return metaData;
}

function errMsg(errN, msgData){
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
