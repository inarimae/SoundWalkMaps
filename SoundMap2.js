// ��ƃ����B�Đ��I�����E���Ă��炸���ֈڂ�Ȃ��B�W�����v�@�\�����C�BGoogleMap�ꕔ�R�����g�A�E�g�B

/***********************************

Sound Walk Map by A.Takahashi, 2016.11.16

 A variable "SoundMapFile_json" should be given.
 A map, images, an audio control are located at ID: map_canvas, img_canvas and sound_control respectively.
 Some documents go to ID: image_time, sound_time, current_lat and current_lng.

 (rev.1 SoundJump function is appended. 2017.05.06.)
 (rev.2 Multiple sound sources can be applied. 2017.09.21)
***********************************/

// include http://maps.googleapis.com/maps/api/js?key=AIzaSyBOQopGO-8ZGVLtaB0Q7u_uLFMKXazUBX4&sensor=false
// include http://code.jquery.com/jquery-1.11.3.min.js

// �ȉ��͊O���t�@�C��(SoundMapFile_json)�����荞�܂��B

var d_path = [];//[] ; // ���s�f�[�^�BGPS�ʒu�Ǝ����B
function d_pathobj(loc,datetime) { this.loc=loc; this.datetime=datetime; }

var d_images = [];//[] ; // �摜�f�[�^�B�t�@�C�����ƎB�e�����B
function d_imageobj(filename,datetime) { this.filename=filename; this.datetime=datetime; }

var imagebase = "images/" ; // �摜�t�@�C�����u����Ă���f�B���N�g���B
var map_center = null ; // �\������n�}�̒��S�ʒu(�ܓx�E�o�x)�ƕ\���{���B
var zoom = 14 ;

var dataset_num = 1 ; // �����f�[�^�Z�b�g���܂܂�邩�B
var ids = [] ; // �f�[�^�Z�b�g��ID�B������B
var soundfile = [] ; // �����f�[�^�t�@�C���B
var sound_start_dt = [] ; // �^���J�n�����B
var sound_playstart = [] ; // �v���C�J�n�̏ꏊ�B�^���J�n��������̕b���B

var img_canvas_ctx = null ;
var img_canvas_w = 360 ; // �ʐ^�`��̈�̑傫���BCSS��`���D�悳���B
var img_canvas_h = 240 ;

var map = null ;
var polylines = [] ;
var mark_current = null ;
var audio = null ;
var audio_running = false ;

var i_dataset_current = 0 ; // ���ݍĐ����Ă��鉹���̔ԍ��B

var month_conv = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12} ;

function initialize() {
  // �O���t�@�C��(SoundMapFile_json)����K�v�f�[�^����荞�ݏI����Ă���A���C�����[�`���Ɉڂ�B
  // �����̂��߂� Promise ���g���Ă��邪�A����� IE �ƃA���h���C�h��̈ꕔ�u���E�U�ł͎g���Ȃ��B
  var phndl = new Promise ( function(resolve,reject){
    $.getJSON(SoundMapFile_json, function(data, statusCode){
///      map_center = new google.maps.LatLng(data.maploc.lat, data.maploc.lng) ;
      zoom = data.maploc.zoom ;
      imagebase = data.imagebase ;

      // �Â��`���ƐV�����`���o���ɑΉ����邽�߁A�f�[�^�O������if�Ő؂蕪����B

      if ( typeof data.dataset == 'undefined' ) {
        // ���� "dataset" �ł������Ă��Ȃ��Â��`���̏ꍇ�Adataset �Ɏ��߂Ȃ����B
        // �V�����`���ɓ��ꂵ�����_�ŁA�璷�Ȃ̂ŁAelse�߂��c���č폜����\��B

        dataset_num = 1 ; // dataset ��������Ȃ��B

        ids[0] = "" ; // ID�͋󔒂Ƃ��Ă����B
        soundfile[0] = data.sounds.filename ;
        sound_start_dt[0] = new Date ( data.sounds.starttime ) ;
        sound_playstart[0] = data.sounds.playstart ;

        d_path[0] = [] ;
        for (var i = 0; i < data.marker.length; i++) {
          var date_splitted = data.marker[i].date.split("-") ;
          var day = date_splitted[0] ;
          var month = month_conv[date_splitted[1]] ;
          var year = "20" + date_splitted[2] ;

          d_path[0][i] = new d_pathobj(
            new google.maps.LatLng(data.marker[i].lat, data.marker[i].lng ),
            new Date(year+"/"+month+"/"+day+" "+data.marker[i].time)
          ) ;
          d_path[0][i].datetime.setSeconds ( d_path[0][i].datetime.getSeconds() + 9 * 60*60 ) ;
        }

        d_images[0] = [] ;
        for (var i = 0; i < data.images.length; i++) {
          d_images[0][i] = new d_imageobj(
            data.images[i].filename,
            new Date ( data.images[i].datetime )
          ) ;
        }

      } else {
        // ������dataset ��z��Ɋi�[�B

        dataset_num = data.dataset.length ; // dataset �̌��B

        for ( var i_dataset=0; i_dataset < dataset_num; i_dataset++) {
          ids[i_dataset] = data.dataset[i_dataset].id ;
          soundfile[i_dataset] = data.dataset[i_dataset].sounds.filename ;
          sound_start_dt[i_dataset] = new Date ( data.dataset[i_dataset].sounds.starttime ) ;
          sound_playstart[i_dataset] = data.dataset[i_dataset].sounds.playstart ;

          d_path[i_dataset] = [] ;
          for (var i = 0; i < data.dataset[i_dataset].marker.length; i++) {
            var date_splitted = data.dataset[i_dataset].marker[i].date.split("-") ;
            var day = date_splitted[0] ;
            var month = month_conv[date_splitted[1]] ;
            var year = "20" + date_splitted[2] ;
            d_path[i_dataset][i] = new d_pathobj(
              new google.maps.LatLng(data.dataset[i_dataset].marker[i].lat, data.dataset[i_dataset].marker[i].lng ),
              new Date(year+"/"+month+"/"+day+" "+data.dataset[i_dataset].marker[i].time)
            ) ;
            d_path[i_dataset][i].datetime.setSeconds ( d_path[i_dataset][i].datetime.getSeconds() + 9 * 60*60 ) ;
          }

          d_images[i_dataset] = [] ;
          for (var i = 0; i < data.dataset[i_dataset].images.length; i++) {
            d_images[i_dataset][i] = new d_imageobj(
              data.dataset[i_dataset].images[i].filename,
              new Date ( data.dataset[i_dataset].images[i].datetime )
            ) ;
          }
        }

      } //else

      resolve() ;
    });
  });

  phndl.then (
    InitAndMainloop // ���C�����[�`�������s�B
  );
}

function InitAndMainloop() { // ���C�����[�`���B�n�}�Ɖ������N���A���[�v���[�`����@���B

  var opts = {
    zoom: zoom,
    center: map_center,
///    mapTypeId: google.maps.MapTypeId.ROADMAP,
    clickableIcons: false // �n�����I������ă}�[�J�[����΂����̂�h�~�B
  };
///  map = new google.maps.Map(document.getElementById("map_canvas"), opts);
///  google.maps.event.addListener(map, 'click', setMarker); // �n�}��̃N���b�N�𑨂���B

  for ( var i_dataset=0; i_dataset < dataset_num; i_dataset++) {
    var pathlist = []

    for ( var i=0; i < d_path[i_dataset].length; i++ ) {
      pathlist[i]=d_path[i_dataset][i].loc;
    }
    opts = {
      map: map,
      path: pathlist,
      clickable: false
    } ;
///    polylines[i_dataset] = new google.maps.Polyline( opts ) ;
  }

  img_canvas_ctx = document.getElementById("img_canvas").getContext("2d");
  img_canvas_w = $('#img_canvas').width(); // CSS�ɂ��`��̈�̑傫����`���m�F�B
  img_canvas_h = $('#img_canvas').height();

  audio = document.getElementById("sound_control");
  audio.autoplay = true ; // ���̃o�[�W�����ł͎����J�n�Ƃ���B
  audio.addEventListener('ended', function () { audio_running = false ; }); // �I�������t���O����B

  while ( true ) { // ���C�����[�v�B
    for ( i_dataset_current=0; i_dataset_current < dataset_num; i_dataset_current++) {
      audio.currentTime = sound_playstart[i_dataset_current] ; // �T�E���h�͓r������J�n�ł���B
      audio.src = soundfile[i_dataset_current] ; // audio_running==true �Ȃ̂ŁA����ōĐ��J�n�B
      audio_running = true ; // �Đ����t���O�𗧂Ă�B
      LocationUpdate() ; // �ȍ~�A�P�b���ƂɃ}�[�J�[�Ɖ摜���Ǘ��B�Đ��I�������m����Ɩ߂��Ă���B
    }
  }

}

function LocationUpdate(){ // �P�b���Ƃɉ����Đ��ʒu���m�F���A�}�[�J�[�Ɖ摜���X�V����B
  if ( ! audio_running ) { alert("replay finished"); return 0 ; } // �Đ����I����Ă����烁�C�����[�v�֐����߂��B

  if ( d_path[i_dataset_current][0].datetime != null ) {
    var datetime = new Date(sound_start_dt[i_dataset_current]) ;
    datetime.setSeconds ( sound_start_dt[i_dataset_current].getSeconds() + audio.currentTime ) ;
    document.all.sound_time.innerText = datetime ;
    for ( var i=0; i < d_path[i_dataset_current].length; i++ ) {
      if ( d_path[i_dataset_current][i].datetime > datetime ) {
        var current_loc = d_path[i_dataset_current][i].loc;
        document.all.current_lat.innerText = current_loc.lat() ;
        document.all.current_lng.innerText = current_loc.lng() ;
        if ( mark_current != null ) { mark_current.setMap(null) ; } // �O�̃}�[�J�[�͏����B
///        mark_current = new google.maps.Marker({
///          map:map,
///          position: current_loc
///        });
        mark_current.setMap(map);
        break ;
      }
    }

    for ( var i=1; i < d_images[i_dataset_current].length; i++ ) { // ��O�̊G���o���B
      if ( d_images[i_dataset_current][i].datetime > datetime ) {
        var img = new Image() ;
        img.src = imagebase + d_images[i_dataset_current][i-1].filename ;
        img.onload = function() {
          var i_prop ;
          if ( img_canvas_h / img.height <= img_canvas_w / img.width )
            { i_prop = img_canvas_h / img.height ; }
          else
            { i_prop = img_canvas_w / img.width ; }
          img_canvas_ctx.clearRect(0, 0, img_canvas_w, img_canvas_h) ;
          img_canvas_ctx.drawImage(img, 0, 0, img.width * i_prop, img.height * i_prop);
        }
        document.all.image_time.innerText = d_images[i_dataset_current][i-1].datetime ;
        break ;
      }
    }
  }

  setTimeout("LocationUpdate();",1000) ; // �P�b��ɂ܂��Ăяo�����B
}

//d_path, d_images, sound �֘A�� i_dataset<dataset_num ���C���f�b�N�X�Ƃ���z��ɂȂ�B
// �ȉ���ƒ��B�}�[�J�[�ʒu�ɂ���Ă̓T�E���h�t�@�C�������ւ���K�v������B

function setMarker(event){
  // �n�}�N���b�N���ɍł��߂����s�ʒu��T���A��������T�E���h�Đ��|�C���g���X�V�B
  var e_lat = event.latLng.lat() ;
  var e_lng = event.latLng.lng() ;
  var min_distance = 10000000000 ;
  var min_i_dataset = 0 ;
  var min_i = 0 ;

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
  audio.currentTime = ( d_path[min_i_dataset][min_i].datetime - sound_start_dt[min_i_dataset] ) / 1000 - 5 ;
    // �����O����ɂ��Ȃ��Ƃ������ֈڂ��Ă��܂��B
  if ( min_i_dataset != i_dataset_current ) { // �قȂ鉹���ɔ�ԏꍇ�́A�Đ����~����B
    i_dataset_current = min_i_dataset ;
    audio_running = false ;
  }

  // �摜�A�}�[�J�[�̏����͂����ł͂��Ȃ��BLocationUpdate() �ɔC����B1�b�ȓ��ɏ������Ă����B
  // ���̂��߃}�[�J�[�\���ɂ������芴������B�r���������������Ǘ����Ă����ł��̂��]�܂����Ƃ͎v���B
}

function SoundJump(datetime) {
  // �w��̓����ɃT�E���h�Đ��|�C���g���ړ�����B�t�H�[�}�b�g��"YYYY/MM/DD hh:mm:ss"�ŉB
  var i_dataset ;
  sound_dt = new Date ( datetime ) ;
  for ( i_dataset = dataset_num-1; i_dataset >= 0; i_dataset--) {
    if ( sound_dt > sound_start_dt[i_dataset_global] ) { break ; }
  }
  if ( i_dataset < 0 ) { return ; } // �Đ��ʒu���S�������O�̏ꍇ�́A�������Ȃ��B
  if ( i_dataset != i_dataset_current ) { // �قȂ鉹���ɔ�ԏꍇ�́A�Đ����~����B
    i_dataset_current = i_dataset ;
    audio_running = false ;
  }
  audio.currentTime = ( sound_dt - sound_start_dt[i_dataset_current] ) / 1000
  // �摜�A�}�[�J�[�̏����͂����ł͂��Ȃ��BLocationUpdate() �ɔC����B
}
