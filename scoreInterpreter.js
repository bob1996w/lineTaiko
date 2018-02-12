
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
        errMsg(1);
        return 1;
      }
  }
}

// all regex's in data files
var dataRegEx = {
  "bpm": /^\(\d+(\.\d+)?\)/,
  "noteSpeed": /^\[\d+(\.\d+)?\]/,
  "division": /^\{\d+(\.\d+)?\}/,
  "step": /^,/,
  "note": /^\d/,
  "end": /E/,
}

/*
note obj:
  {t, n, s}
    t: time(ms)
    n: note type:
      0: end
      1: normal note
    s: note speed(multiplier) of this note
*/

function scoreInterpreter(scorestr){
  var rawLines = scorestr.split(/\r\n|\n/).map(removeComments).map(line => line.replace(/\s+$/, ''));
  var metaData = convertMetaData(rawLines.filter(line => line[0] == '#').map(line => line.substring(1)));
  var scoreDataStr = rawLines.filter(line => line[0] != '#').map(line => line.replace(/\s/g, '')).join('');
  //console.log(metaData);

  var time = 0; // in ms
  var notes = [];  // Array of all the Notes
  var discards = []; // discarded characters
  var pos = 0;
  var noteSpeed = 1.0;
  var bpm = checkAndConvert(metaData["bpm"], "number");
  var defdiv = (metaData["defdiv"])? checkAndConvert(metaData["offset"], "number") : 4;
  var div = checkAndConvert(metaData["div"], "number");
  var noteLength = 60000.0 / bpm / (div/4);
  var offset = (metaData["offset"])? checkAndConvert(metaData["offset"], "number") : 0;

  time += offset;
  while(pos < scoreDataStr.length){
    var validflag = false;
    var nowString = scoreDataStr.substring(pos);
    for(var regExType in dataRegEx){
      var result = dataRegEx[regExType].exec(nowString);
      if(result != null){
        if(result.index == 0){
          console.log("Pos " + pos + " Regex matched: " + regExType + ": " + result[0]);
          switch(regExType){
            case "bpm":
              bpm = checkAndConvert(result[0].substring(1, result[0].length - 1), "number");
              noteLength = 60000.0 / bpm / (div/4);
              break;
            case "noteSpeed":
              noteSpeed = checkAndConvert(result[0].substring(1, result[0].length - 1), "number");
              break;
            case "division":
              div = checkAndConvert(result[0].substring(1, result[0].length - 1), "number");
              noteLength = 60000.0 / bpm / (div/4);
              break;
            case "step":
              time += noteLength;
              break;
            case "note":
              var noteObj = {t: time, n: 1, s: noteSpeed};
              notes.push(noteObj);
              break;
            case "end":
              var noteObj = {t: time, n: 0, s: noteSpeed};
              notes.push(noteObj);
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
  return metaData;
}

function errMsg(errN){
  var msg = "";
  switch(errN){
    case 1:
      msg = "No bpm found.";
    case 2:
      msg = "Something's wrong with the code."
    default:
      msg = "Something goes wrong.";
  }
  alert("Error " + errN + ":\n" + msg);
}
