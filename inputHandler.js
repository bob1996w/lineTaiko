function getExtension(filename){
  var parts = filename.split(".");
  return parts[parts.length - 1];
}

// see if the file is audio
function isAudio(filename){
  var ext = getExtension(filename);
  switch(ext.toLowerCase()){
    case "mp3":
    case "ogg":
      return true;
  }
  return false;
}
// see if the file is data
function isData(filename){
  var ext = getExtension(filename);
  if(ext.toLowerCase() == "txt"){
    return true;
  }
  return false;
}
// see if there are any file
function isValid(filename){
  return (filename == "")? false: true;
}

function failValidation(msg){
  alert(msg);
  return false;
}

// manage the switching of status
function changeStatusMode(toStatus){
  window.statusMode = toStatus
  return toStatus;
}

// start when document is ready
$(document).ready(function(){
  $("#getFiles").submit(function(e){
    e.preventDefault(); // prevent reload page when submit
    var musicFile = $("#musicFile");
    if(!isAudio(musicFile.val())){
      return failValidation("Please select an audio file.");
    }
    var dataFile = $("#dataFile");
    if(!isData(dataFile.val())){
      return failValidation("Please select a data file.");
    }
    var sfxBlobUrl;
    var sfxFile = $("#sfxFile");
    console.log("sfxFile = " + sfxFile.val())
    if(isAudio(sfxFile.val()) && isValid(sfxFile.val())){
      sfxBlobUrl = (window.URL || window.webkitURL).createObjectURL(sfxFile.prop('files')[0]);
    }else {
      sfxBlobUrl = "";
    }

    var musicBlobUrl = (window.URL || window.webkitURL).createObjectURL(musicFile.prop('files')[0]);
    window.musicBlobUrl = musicBlobUrl;
    var dataBlobUrl = (window.URL || window.webkitURL).createObjectURL(dataFile.prop('files')[0]);
    window.dataBlobUrl = dataBlobUrl;
    window.sfxBlobUrl = sfxBlobUrl;
    var dataObj = {};
    var jqxhr = $.get(dataBlobUrl, function(data){
      //alert("Finish getting data:\n" + data);
      dataObj = scoreInterpreter(data);
      window.dataObj = dataObj;
    }).done(function(){
      //alert("Done");
      changeStatusMode(1);
      $(".inputForm").hide();
    }).fail(function(){
      alert("Something went wrong while fetching data file.")
    });
    //console.log("input > gamemode = " + gamemode);
    return false; // holder, should be deleted
  });

});
