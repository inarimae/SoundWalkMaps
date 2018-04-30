/***********************************

Sound Walk Map by A.Takahashi, 2016.11.16

 A variable "SoundMapFile_json" should be given.
 A map, images, an audio control are located at ID: map_canvas, img_canvas and sound_control respectively.
 Some documents go to ID: image_time, sound_time, caption, current_lat and current_lng.

 (rev.1 SoundJump function is appended. 2017.05.06.)
 (rev.2.1 Multiple sound sources can be applied. 2017.09.21-2018.01.16)
 (rev.2.2 Notations can be located. 2018.01.24-)
 (rev.2.3 Satelite image option is added as maptype. 2018.04.30)
***********************************/

// include http://maps.googleapis.com/maps/api/js?key=AIzaSyBOQopGO-8ZGVLtaB0Q7u_uLFMKXazUBX4&sensor=false
// include http://code.jquery.com/jquery-1.11.3.min.js

// �ȉ��͊O���t�@�C��(SoundMapFile_json)�����荞�܂��B

var d_path = []; // ���s�f�[�^�BGPS�ʒu�Ǝ����B
function d_pathobj(loc,datetime) { this.loc=loc; this.datetime=datetime; }

var d_images = []; // �摜�f�[�^�B�t�@�C�����ƎB�e�����B
function d_imageobj(filename,datetime) { this.filename=filename; this.datetime=datetime; }

var imagebase = "images/" ; // �摜�t�@�C�����u����Ă���f�B���N�g���B
var map_center = null ; // �\������n�}�̒��S�ʒu(�ܓx�E�o�x)�ƕ\���{���B
var zoom = 14 ;

var dataset_num = 1 ; // �����f�[�^�Z�b�g���܂܂�邩�B
var ids = [] ; // �f�[�^�Z�b�g��ID�B������B
var soundfile = [] ; // �����f�[�^�t�@�C���B
var sound_start_dt = [] ; // �^���J�n�����B
var sound_playstart = [] ; // �v���C�J�n�̏ꏊ�B�^���J�n��������̕b���B
var captions = [] ;

var notefile = null ; // �����i�m�[�e�[�V�����j�t�@�C���B�Ȃ���Ή������Ȃ��B

var d_notes = []; // �����}���f�[�^�B�t�@�C����ɂ� lat, lng �͂Ȃ��A�����Ŋ���o���K�v������B
function d_noteobj(id,starttime,endtime,loc,comment) {
  this.id=id; this.starttime=starttime; this.endtime=endtime;
  this.loc=loc; this.comment=comment;
}

var img_canvas_ctx = null ;
var img_canvas_w = 360 ; // �ʐ^�`��̈�̑傫���BCSS��`���D�悳���B
var img_canvas_h = 240 ;

var soundtz = 9; imagetz = 9; displaytz = 9 ; notetz = 9 ; // �L�^�͒ʏ킷�ׂē��{���ԁB

var map = null ;
var polylines = [] ;
var mark_current = null ;
var audio = null ;
var audio_running = false ;
var image_current = null ;
var maptype = 'roadmap' ;

var i_dataset_current = 0 ; // ���ݍĐ����Ă��鉹���̔ԍ��B

var month_conv = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12} ;

function initialize() {
  // �O���t�@�C��(SoundMapFile_json)����K�v�f�[�^����荞�ݏI����Ă���A���C�����[�`���Ɉڂ�B
  // �����̂��߂� Promise ���g���Ă��邪�A����� IE �ƃA���h���C�h��̈ꕔ�u���E�U�ł͎g���Ȃ��B

  $.getJSON(SoundMapFile_json, function(data, statusCode){
      map_center = new google.maps.LatLng(data.maploc.lat, data.maploc.lng) ;
      zoom = data.maploc.zoom ;
      imagebase = data.imagebase ;

      if ( data.soundtz != null  ) { soundtz = data.soundtz ; }
      if ( data.imagetz != null  ) { imagetz = data.imagetz ; }
      if ( data.displaytz != null) { displaytz = data.displaytz ; }
      if ( data.notetz != null   ) { notetz = data.notetz ; }

      if ( data.notefile != null ) { notefile=data.notefile ; } // ����Α���B

      if ( data.maptype != null  ) { maptype = data.maptype ; } // �I�v�V�����Ƃ��Ēn�}�X�^�C���ݒ�B

      // �Â��`���ƐV�����`���o���ɑΉ����邽�߁A�f�[�^�O������if�Ő؂蕪����B

      if ( typeof data.dataset == 'undefined' ) {
        // ���� "dataset" �ł������Ă��Ȃ��Â��`���̏ꍇ�Adataset �Ɏ��߂Ȃ����B
        // �V�����`���ɓ��ꂵ�����_�ŁA�璷�Ȃ̂ŁAelse�߂��c���č폜����\��B

        dataset_num = 1 ; // dataset ��������Ȃ��B

        ids[0] = "" ; // ID�͋󔒂Ƃ��Ă����B
        soundfile[0] = data.sounds.filename ;
        sound_start_dt[0] = new Date ( data.sounds.starttime ) ;
        sound_start_dt[0].setTime ( sound_start_dt[0].getTime() - soundtz * 60*60*1000 ) ;
        sound_playstart[0] = data.sounds.playstart ;
        captions[0] = data.sounds.caption ;

        d_path[0] = [] ;
        for (var i = 0; i < data.marker.length; i++) {
          var date_splitted = data.marker[i].date.split("-") ;
          var day = date_splitted[0] ;
          var month = month_conv[date_splitted[1]] ;
          var year = date_splitted[2] ;
          if ( year < 100 ) { year = "20" + year }

          d_path[0][i] = new d_pathobj(
            new google.maps.LatLng(data.marker[i].lat, data.marker[i].lng ),
            new Date(year+"/"+month+"/"+day+" "+data.marker[i].time)
          ) ;
        }

        d_images[0] = [] ;
        for (var i = 0; i < data.images.length; i++) {
          d_images[0][i] = new d_imageobj(
            data.images[i].filename,
            new Date ( data.images[i].datetime )
          ) ;
          d_images[0][i].datetime.setTime ( d_images[0][i].datetime.getTime() - imagetz * 60*60*1000 ) ;
        }

      } else {
        // ������dataset ��z��Ɋi�[�B

        dataset_num = data.dataset.length ; // dataset �̌��B

        for ( var i_dataset=0; i_dataset < dataset_num; i_dataset++) {
          ids[i_dataset] = data.dataset[i_dataset].id ;
          soundfile[i_dataset] = data.dataset[i_dataset].sounds.filename ;
          sound_start_dt[i_dataset] = new Date ( data.dataset[i_dataset].sounds.starttime ) ;
          sound_start_dt[i_dataset].setTime( sound_start_dt[i_dataset].getTime() - soundtz * 60*60*1000 ) ;
          sound_playstart[i_dataset] = data.dataset[i_dataset].sounds.playstart ;
          captions[i_dataset] = data.dataset[i_dataset].sounds.caption ;

          d_path[i_dataset] = [] ;
          for (var i = 0; i < data.dataset[i_dataset].marker.length; i++) {
            var date_splitted = data.dataset[i_dataset].marker[i].date.split("-") ;
            var day = date_splitted[0] ;
            var month = month_conv[date_splitted[1]] ;
            var year = date_splitted[2] ;
            if ( year < 100 ) { year = "20" + year }
            d_path[i_dataset][i] = new d_pathobj(
              new google.maps.LatLng(data.dataset[i_dataset].marker[i].lat, data.dataset[i_dataset].marker[i].lng ),
              new Date(year+"/"+month+"/"+day+" "+data.dataset[i_dataset].marker[i].time)
            ) ;
          }

          d_images[i_dataset] = [] ;
          for (var i = 0; i < data.dataset[i_dataset].images.length; i++) {
            d_images[i_dataset][i] = new d_imageobj(
              data.dataset[i_dataset].images[i].filename,
              new Date ( data.dataset[i_dataset].images[i].datetime )
            ) ;
            d_images[i_dataset][i].datetime.setTime(
                d_images[i_dataset][i].datetime.getTime() - imagetz * 60*60*1000 ) ;
          }
        }
      } //else

  }) // getJSON()

  .success(function(){
    $.get( notefile, function(data,statusCode) {
      var k = 0 ;
      var data_lines = data.split(/\r\n|\r|\n/);
      for ( var i=0; i<data_lines.length; i++ ) {
        var data_splitted = data_lines[i].split(",") ;
        if ( data_splitted.length < 3 ) { continue ; } // �󔒍s�ȂǁB
        var id = data_splitted[0] ;

        var i_dataset ;
        for ( i_dataset = 0; i_dataset < dataset_num; i_dataset++ ) { // ID�����񂩂�z��̃C���f�b�N�X������o���B
          if ( id == ids[i_dataset] ) { break ; }
        }
        if ( i_dataset >= dataset_num ) { continue ; } // �Ή�����ID�������ł��Ȃ��ꍇ�́A�������Ȃ��B

        var loc ;
        var starttime = new Date ( data_splitted[1] ) ;
        var endtime = new Date ( data_splitted[2] ) ;
        starttime.setTime(starttime.getTime() - notetz * 60*60*1000 ) ;
        endtime.setTime(endtime.getTime() - notetz * 60*60*1000 ) ;

        var j ;
        for ( j=d_path[i_dataset].length-1; j >=0; j-- ) { // �m�[�e�[�V�����w�莞���̒��O�̃}�[�J�[��T���B
          if ( d_path[i_dataset][j].datetime <= starttime ) {
            loc = d_path[i_dataset][j].loc ;
            break ;
          }
        }
        if ( j<0 ) { loc = d_path[i_dataset][0].loc ; } // �����w�莞���ȑO���Ȃ���΁A�p�X�̍ŏ��ɂ��Ă����B

        d_notes[k] = new d_noteobj(
          id, starttime, endtime,
          loc, data_splitted[3] // comment
        ) ;
        k++ ;
      }
    }, "text") // get()

    .complete(function(){
      InitAndMainloop() ; // ���C�����[�`�������s�B
    }) ;

  }) // getJSON.success()

}


function InitAndMainloop() { // ���C�����[�`���B�n�}�Ɖ������N���A���[�v���[�`����@���B

  var opts = {
    zoom: zoom,
    center: map_center,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    clickableIcons: false, // �n�����I������ă}�[�J�[����΂����̂�h�~�B
    mapTypeId: maptype // �}�b�v�^�C�v��ݒ�B�f�t�H���g�� 'roadmap'
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), opts);
  google.maps.event.addListener(map, 'click', setMarkerByposition); // �n�}��̃N���b�N�𑨂���B
  google.maps.event.addListener(map, 'rightclick', putNewMarker); // �ҏW�p�B

  for ( var i_dataset=0; i_dataset < dataset_num; i_dataset++) {
    var pathlist = []

    for ( var i=0; i < d_path[i_dataset].length; i++ ) {
      pathlist[i]=d_path[i_dataset][i].loc;
    }
    opts = {
      map: map,
      path: pathlist,
      clickable: false,
      strokeColor: '#FF0000'
    } ;
    polylines[i_dataset] = new google.maps.Polyline( opts ) ;
  }

  //for ( var i=d_notes.length-1; i >= 0 ; i-- ) {
  for ( var i=0; i < d_notes.length ; i++ ) {
    var marker = new google.maps.Marker({
      position: d_notes[i].loc,
      map: map,
      title: d_notes[i].comment,
      //icon: "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|0000ff"
      icon: "http://labs.google.com/ridefinder/images/mm_20_blue.png"
    }) ;
    marker.setMap(map) ;
    google.maps.event.addListener(marker, 'click', function(event) {
      for ( var j=0; j < d_notes.length; j++ ) {
        if ( d_notes[j].loc.lat()==event.latLng.lat() & d_notes[j].loc.lng()==event.latLng.lng() ) { break; }
      }
      if ( j < d_notes.length ) { SoundJumpB(d_notes[j].id, d_notes[j].starttime); }
         // �m�[�e�[�V�����̃}�[�J�[�݂̂ɔ�������悤�ɂ����B���ݒn�}�[�J�[�ɂ͔��������Ȃ��B
    });
  }

  img_canvas_ctx = document.getElementById("img_canvas").getContext("2d");
  img_canvas_w = $('#img_canvas').width(); // CSS�ɂ��`��̈�̑傫����`���m�F�B
  img_canvas_h = $('#img_canvas').height();

  audio = document.getElementById("sound_control");
  audio.autoplay = true ; // ���̃o�[�W�����ł͎����J�n�Ƃ���B

  i_dataset_current = 0 ;
  audio.src = soundfile[i_dataset_current] ; // audio.autoplay==true �Ȃ̂ŁA����ōĐ��J�n�B
  audio.currentTime = sound_playstart[i_dataset_current] ; // �Đ��J�n��ɏ����Đ��ʒu�ֈړ��B
  audio.addEventListener('ended', CirculateLoop ); // ��{�Đ����I���x�Ɏ��֐i�ށB
  setInterval("LocationUpdate();",1000) ; // �ȍ~�A�P�b���ƂɃ}�[�J�[�Ɖ摜���Ǘ��B�Đ��I�������m����Ɩ߂��Ă���B
  audio_running = true ; // �Đ����t���O�𗧂Ă�B
  document.getElementById("caption").textContent = captions[i_dataset_current] ;

}


function CirculateLoop(){
  audio_running = false ;
  i_dataset_current++ ;
  if ( i_dataset_current >= dataset_num ) { i_dataset_current = 0 ; }
  audio.src = soundfile[i_dataset_current] ;
  audio.currentTime = sound_playstart[i_dataset_current] ;
  audio_running = true ;
  document.getElementById("caption").textContent = captions[i_dataset_current] ;

}


function LocationUpdate(){ // �}�[�J�[�Ɖ摜���X�V����B
  if ( ! audio_running ) { return 0 ; } // �Đ����I����Ă����牽�����Ȃ��B�O�̂��߁B

  var datetime = new Date(sound_start_dt[i_dataset_current]) ;
  datetime.setTime ( datetime.getTime() + audio.currentTime * 1000 ) ;

  var datetimeDisp = new Date ( datetime ) ;
  datetimeDisp.setTime ( datetime.getTime() + displaytz * 60*60*1000) ;
  document.getElementById("sound_time").textContent = datetimeDisp.toLocaleString() ;

  //if ( d_path[i_dataset_current][0].datetime != null ) { //���ʂ� if �Ɍ�����̂ŊO�������B
    var i ;
    for ( var i=d_path[i_dataset_current].length-1; i>=0; i-- ) {
      if ( d_path[i_dataset_current][i].datetime <= datetime ) {
        break ;
      }
    }
    var current_loc ;
    if ( i > 0 ) {
      current_loc = d_path[i_dataset_current][i].loc;
    } else {
      current_loc = d_path[i_dataset_current][0].loc;
    }
    document.getElementById("current_lat").textContent = current_loc.lat() ;
    document.getElementById("current_lng").textContent = current_loc.lng() ;
    if ( mark_current != null ) { mark_current.setMap(null) ; } // �O�̃}�[�J�[�͏����B
    mark_current = new google.maps.Marker({
      map:map,
      position: current_loc
    });
    mark_current.setMap(map);
  //}

  for ( var i=1; i < d_images[i_dataset_current].length; i++ ) { // ��O�̊G���o���B
    if ( d_images[i_dataset_current][i].datetime > datetime ) {
      var imagefile = imagebase + d_images[i_dataset_current][i-1].filename ;
      if ( imagefile == image_current ) { break ; }
      image_current = imagefile ;
      var img = new Image() ;
      img.src = imagefile ;
      img.onload = function() {
        var i_prop ;
        if ( img_canvas_h / img.height <= img_canvas_w / img.width )
          { i_prop = img_canvas_h / img.height ; }
        else
          { i_prop = img_canvas_w / img.width ; }
        img_canvas_ctx.clearRect(0, 0, img_canvas_w, img_canvas_h) ;
        img_canvas_ctx.drawImage(img, 0, 0, img.width * i_prop, img.height * i_prop);
      }
      datetimeDisp.setTime (
          d_images[i_dataset_current][i-1].datetime.getTime() + displaytz * 60*60*1000 ) ;
      document.getElementById("image_time").textContent = datetimeDisp.toLocaleString() ;
      break ;
    }
  }

  var notationText = "" ;
  for ( var i=d_notes.length-1; i >= 0; i-- ) {
     if ( d_notes[i].id != ids[i_dataset_current] ) { continue ; }
     if ( datetime > d_notes[i].endtime ) { continue ; }
     if ( datetime < d_notes[i].starttime ) { continue ; }
     notationText = d_notes[i].comment ; 
     break ;
  }
  document.getElementById("notation").textContent = notationText ;

}


function setMarkerByposition(event){
  // �n�}�N���b�N���ɍł��߂����s�ʒu��T���A��������T�E���h�Đ��|�C���g���X�V�B
  var e_lat = event.latLng.lat() ;
  var e_lng = event.latLng.lng() ;
  var min_distance = 10000000000 ;
  var min_i_dataset = 0 ;
  var min_i = 0 ;
  var id, datetime ;

  for ( var i_dataset=0; i_dataset < dataset_num; i_dataset++) {
    for ( var i=0; i < d_path[i_dataset].length; i++ ) {
      var dist2 = (d_path[i_dataset][i].loc.lat() - e_lat)*(d_path[i_dataset][i].loc.lat() - e_lat)
                + (d_path[i_dataset][i].loc.lng() - e_lng)*(d_path[i_dataset][i].loc.lng() - e_lng) ;
      if ( dist2 < min_distance ) {
        min_i_dataset = i_dataset ;
        min_i = i ;
        min_distance = dist2 ;
      }
    }
  }

  id = ids[min_i_dataset] ;
  //datetime = new Date( d_path[min_i_dataset][min_i].datetime - 5000 ) ; // �����O����ɂ��Ȃ��Ƃ������ֈڂ��Ă��܂��B
  datetime = new Date( d_path[min_i_dataset][min_i].datetime ) ;
  //alert("Call: "+id + " " + datetime.toLocaleDateString()+" "+datetime.toLocaleTimeString()) ;

  SoundJumpB( ids[min_i_dataset], datetime ) ;

  // �摜�A�}�[�J�[�̏����͂����ł͂��Ȃ��BLocationUpdate() �ɔC����B1�b�ȓ��ɏ������Ă����B
  // ���̂��߃}�[�J�[�\���ɂ������芴������B�r���������������Ǘ����Ă����ł��̂��]�܂����Ƃ͎v���B
}


function SoundJump(id_datetime) { // HTML����̌Ăяo���p�ŁA�����ł͕s�g�p�Bnotetz�Ŏ����������s���B
  var id ;
  var datetime_splitted = id_datetime.split(" ") ;

  if ( datetime_splitted[0].search(/\d+\/\d+\/\d+/) == -1 ) { // �ŏ������t�Ƃ��ĉ��߂ł��Ȃ��ꍇ�� ID �ƌ��􂷁B
    sound_dt = new Date ( datetime_splitted[1] + " " + datetime_splitted[2] ) ;
    id = datetime_splitted[0] ;
    //alert("Jump to /"+id+"/ "+datetime_splitted[1]+" "+datetime_splitted[2] ) ;
  }
  else { // ID���w�肳��Ă��Ȃ��B
    var i_dataset ;
    sound_dt = new Date ( datetime_splitted[0] + " " + datetime_splitted[1] ) ;
    for ( i_dataset = dataset_num-1; i_dataset >= 0; i_dataset--) { // �K�؂�ID��T���B
      if ( sound_dt > sound_start_dt[i_dataset] ) { break ; } // �����ԂɎ��Ԃ̏d�Ȃ�͂Ȃ����̂Ƃ���B
    }
    if ( i_dataset < 0 ) { return ; } // �Đ��ʒu���S�������O�̏ꍇ�́A�������Ȃ��B
    id = ids[i_dataset] ;
    //alert("Jump to /"+id+"/ "+datetime_splitted[0]+" "+datetime_splitted[1] ) ;
  }
  sound_dt.setTime ( sound_dt.getTime() - notetz * 60*60*1000) ;
  SoundJumpB(id,sound_dt); // ID������� Date�^�̓�����n���B
}

function SoundJumpB(id,sound_dt) { // �w��̓����ɃT�E���h�Đ��|�C���g���ړ�����B�����ł͂�������g���B
  var i_dataset ;

  //alert(id + " " + sound_dt.toLocaleDateString()+" "+sound_dt.toLocaleTimeString()) ;

  for ( i_dataset = 0; i_dataset < dataset_num; i_dataset++ ) { // ID�����񂩂�z��̃C���f�b�N�X������o���B
    if ( id == ids[i_dataset] ) { break ; }
  }
  if ( i_dataset >= dataset_num ) { return ; } // �Ή�����ID�������ł��Ȃ��ꍇ�́A�������Ȃ��B

  if ( i_dataset != i_dataset_current ) { // �قȂ鉹���ɔ�ԏꍇ�B
    audio_running = false ;
    i_dataset_current = i_dataset ;
    audio.src = soundfile[i_dataset_current] ;
    audio_running = true ;
    document.getElementById("caption").textContent = captions[i_dataset_current] ;
  }
  audio.currentTime = ( sound_dt - sound_start_dt[i_dataset_current] ) / 1000

  // �摜�A�}�[�J�[�̏����͂����ł͂��Ȃ��BLocationUpdate() �ɔC����B
}

// �ȉ��A�m�[�e�[�V�����ǉ���Ɨp�̃R�[�h�B�I�[�T�����O�p��HTML�݂̂Ŏg����B

var datetime_onset = ""

function Notation_onset() {
  datetime_onset = document.getElementById("sound_time").textContent
}

function Notation_offset() {
  var newnotation = document.getElementById("new_notation").value
  newnotation = 
    ids[i_dataset_current] + "," + datetime_onset + "," + document.getElementById("sound_time").textContent + "," + newnotation
  document.getElementById("appended_notation").value =
      document.getElementById("appended_notation").value + "\n" + newnotation
}

function SoundRewind(sec) {
  audio.currentTime = audio.currentTime - sec
}

var month_inv = {0:"JAN",1:"FEB",2:"MAR",3:"APR",4:"MAY",5:"JUN",6:"JUL",7:"AUG",8:"SEP",9:"OCT",10:"NOV",11:"DEC"} ;

function putNewMarker(event) { // div �v�f�� oncontextmenu="return false;" ��ǉ����邱�ƁB

  if ( typeof editOn === "undefined" || ! editOn ) { return ; } // �ҏW�t���O���Ȃ���Ή������Ȃ��B
  var e_lat = event.latLng.lat() ;
  var e_lng = event.latLng.lng() ;
  var current_dt = new Date (
    sound_start_dt[i_dataset_current].getTime() + audio.currentTime * 1000 ) ; // GMT
  var loc_string = 
    "{\"lat\":" + e_lat + ",\"lng\":" + e_lng +
    ",\"date\":\"" + current_dt.getDate() + "-" + month_inv[current_dt.getMonth()] + "-" + current_dt.getFullYear() +
    "\",\"time\":\"" + current_dt.getHours() + ":" + current_dt.getMinutes() + ":" + current_dt.getSeconds() +
    "\",\"alt\":-1.00}," ;

  document.getElementById("appended_marker").value =
      document.getElementById("appended_marker").value + "\n" + loc_string ;

  // {"lat":43.6126757,"lng":1.4331794,"date":"30-JAN-08","time":"16:26:06","alt":-18.0},

  var marker = new google.maps.Marker({
    position: event.latLng,
    map: map,
    title: current_dt.toGMTString(),
    //icon: "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|0000ff"
    icon: "http://labs.google.com/ridefinder/images/mm_20_red.png"
  }) ;
  marker.setMap(map) ;
}

function ImageRewind(RwdNo) { // �摜�B�e�n�_�܂Ŏ����������C���h�B
  //var image_time = document.getElementById("image_time") ;
  var datetime = new Date(document.getElementById("image_time").textContent) ;
  datetime.setTime ( datetime.getTime() - displaytz * 60*60*1000) ;

  var image_no ;
  if ( RwdNo==0 ) {
    SoundJumpB(ids[i_dataset_current],datetime) ;
  } else {
    for ( image_no=0; image_no < d_images[i_dataset_current].length; image_no++ ) {
      if ( d_images[i_dataset_current][image_no].datetime >= datetime ) { break ; }
    }
    image_no = image_no - RwdNo ;
    if ( image_no >= d_images[i_dataset_current].length ) {
      image_no = d_images[ids[i_dataset_current]].length - 1 ;
    }
    if ( image_no < 0 ) {
      image_no == 0 ;
    }
  }
  SoundJumpB(ids[i_dataset_current],d_images[i_dataset_current][image_no].datetime) ;
}
