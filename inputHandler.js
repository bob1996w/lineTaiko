function getExtension(filename){
  var parts = filename.split(".");
  return parts[parts.length - 1];
}

function isAudio(filename){
  var ext = getExtension(filename);
  switch(ext.toLowerCase()){
    case "mp3":
    case "ogg":
      return true;
  }
  return false;
}

function isData(filename){
  var ext = getExtension(filename);
  if(ext.toLowerCase() == "txt"){
    return true;
  }
  return false;
}

function failValidation(msg){
  alert(msg);
  return false;
}

// manage the switching of status
function changeStatusMode(toStatus){
  window.statusMode = toStatus
}

// start when document is ready
$(document).ready(function(){
  $("#toGoogle").attr("title", "Haha");
  $("#getFiles").submit(function(e){
    e.preventDefault(); // prevent reload page when submit
    var musicFile = $("#musicFile");
    if(!isAudio(musicFile.val())){
      return failValidation("Please select an audio file.");
    }else{
      console.log("Get Music File: " + musicFile.val());
    }
    var dataFile = $("#dataFile");
    if(!isData(dataFile.val())){
      return failValidation("Please select a data file.");
    }else {
      console.log("Get Data File: " + dataFile.val());
    }

    var musicBlobUrl = (window.URL || window.webkitURL).createObjectURL(musicFile.prop('files')[0]);
    //console.log("MusicFileURL = " + musicBlobUrl);
    window.musicBlobUrl = musicBlobUrl;
    var dataBlobUrl = (window.URL || window.webkitURL).createObjectURL(dataFile.prop('files')[0]);
    //console.log("DataFileURL = " + dataBlobUrl);
    window.dataBlobUrl = dataBlobUrl;
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
