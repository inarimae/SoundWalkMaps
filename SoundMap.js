/***********************************

Sound Walk Map by A.Takahashi, 2016.11.16

 A variable "SoundMapFile_json" should be given.
 A map, images, an audio control are located at ID: map_canvas, img_canvas and sound_control respectively.
 Some documents go to ID: image_time, sound_time, current_lat and current_lng.

 (rev.1 SoundJump function is appended. 2017.05.06.)
***********************************/

// include http://maps.googleapis.com/maps/api/js?key=AIzaSyBOQopGO-8ZGVLtaB0Q7u_uLFMKXazUBX4&sensor=false
// include http://code.jquery.com/jquery-1.11.3.min.js

// 以下は外部ファイル(SoundMapFile_json)から取り込まれる。

var d_path = [] ; // 歩行データ。GPS位置と時刻。
function d_pathobj(loc,datetime) { this.loc=loc; this.datetime=datetime; }

var d_images = [] ; // 画像データ。ファイル名と撮影時刻。
function d_imageobj(filename,datetime) { this.filename=filename; this.datetime=datetime; }

var imagebase = "images/" ; // 画像ファイルが置かれているディレクトリ。
var map_center = null ; // 表示する地図の中心位置(緯度・経度)と表示倍率。
var zoom = 14 ;
var soundfile = null ; // 音声データファイルと、録音開始時刻。
var sound_start_dt = null ;
var sound_playstart = 0 ; // プレイ開始時の場所。録音開始時刻からの秒数。

var img_canvas_ctx = null ;
var img_canvas_w = 360 ; // 写真描画領域の大きさ。CSS定義が優先される。
var img_canvas_h = 240 ;

var map = null ;
var polylines = [] ;
var mark_current = null ;
var audio = null ;

var month_conv = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12} ;

function initialize() {
  // 外部ファイル(SoundMapFile_json)から必要データを取り込み終わってから、メインルーチンに移る。
  // 同期のために Promise を使っているが、これは IE とアンドロイド上の一部ブラウザでは使えない。
  var phndl = new Promise ( function(resolve,reject){
    $.getJSON(SoundMapFile_json, function(data, statusCode){
      map_center = new google.maps.LatLng(data.maploc.lat, data.maploc.lng) ;
      zoom = data.maploc.zoom ;
      soundfile = data.sounds.filename ;
      sound_start_dt = new Date ( data.sounds.starttime ) ;
      sound_playstart = data.sounds.playstart ;
      imagebase = data.imagebase ;

      for (var i = 0; i < data.marker.length; i++) {
        var date_splitted = data.marker[i].date.split("-") ;
        var day = date_splitted[0] ;
        var month = month_conv[date_splitted[1]] ;
        var year = "20" + date_splitted[2] ;
        d_path[i] = new d_pathobj(
          new google.maps.LatLng(data.marker[i].lat, data.marker[i].lng ),
          new Date(year+"/"+month+"/"+day+" "+data.marker[i].time)
        ) ;
        d_path[i].datetime.setSeconds ( d_path[i].datetime.getSeconds() + 9 * 60*60 ) ;
      }

      for (var i = 0; i < data.images.length; i++) {
        d_images[i] = new d_imageobj(
          data.images[i].filename,
          new Date ( data.images[i].datetime )
        ) ;
      }

      resolve() ;
    });
  });

  phndl.then (
    InitAndMainloop // メインルーチンを実行。
  );
}

function InitAndMainloop() { // メインルーチン。地図と音声を起動、ループルーチンを叩く。
  var opts = {
    zoom: zoom,
    center: map_center,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    clickableIcons: false // 地物が選択されてマーカーが飛ばされるのを防止。
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), opts);
  var pathlist = []
  for ( var i=0; i < d_path.length; i++ ) { pathlist[i]=d_path[i].loc; }
  opts = {
    map: map,
    path: pathlist,
    clickable: false
  } ;
  polylines[0] = new google.maps.Polyline( opts ) ;
  google.maps.event.addListener(map, 'click', setMarker); // 地図上のクリックを捉える。

  img_canvas_ctx = document.getElementById("img_canvas").getContext("2d");
  img_canvas_w = $('#img_canvas').width(); // CSSによる描画領域の大きさ定義を確認。
  img_canvas_h = $('#img_canvas').height();

  audio = document.getElementById("sound_control");
  audio.autoplay = true ; // このバージョンでは自動開始とする。
  audio.currentTime = sound_playstart ; // サウンドは途中から開始できる。
  audio.src = soundfile ;

  LocationUpdate() ; // 走らせっぱなしになる。
}

function LocationUpdate(){ // １秒ごとに音声再生位置を確認し、マーカーと画像を更新する。
  if ( d_path[0].datetime != null ) {
    var datetime = new Date(sound_start_dt) ;
    datetime.setSeconds ( sound_start_dt.getSeconds() + audio.currentTime ) ;
    document.all.sound_time.innerText = datetime ;
    for ( var i=0; i < d_path.length; i++ ) {
      if ( d_path[i].datetime > datetime ) {
        var current_loc = d_path[i].loc;
        document.all.current_lat.innerText = current_loc.lat() ;
        document.all.current_lng.innerText = current_loc.lng() ;
        if ( mark_current != null ) { mark_current.setMap(null) ; } // 前のマーカーは消す。
        mark_current = new google.maps.Marker({
          map:map,
          position: current_loc
        });
        mark_current.setMap(map);
        break ;
      }
    }

    for ( var i=1; i < d_images.length; i++ ) { // 一つ前の絵を出す。
      if ( d_images[i].datetime > datetime ) {
        var img = new Image() ;
        img.src = imagebase + d_images[i-1].filename ;
        img.onload = function() {
          var i_prop ;
          if ( img_canvas_h / img.height <= img_canvas_w / img.width )
            { i_prop = img_canvas_h / img.height ; }
          else
            { i_prop = img_canvas_w / img.width ; }
          img_canvas_ctx.clearRect(0, 0, img_canvas_w, img_canvas_h) ;
          img_canvas_ctx.drawImage(img, 0, 0, img.width * i_prop, img.height * i_prop);
        }
        document.all.image_time.innerText = d_images[i-1].datetime ;
        break ;
      }
    }

  }

  setTimeout("LocationUpdate();",1000) ; // １秒後にまた呼び出される。
}

function setMarker(event){
  // 地図クリック時に最も近い歩行位置を探し、時刻からサウンド再生ポイントを更新。
  var e_lat = event.latLng.lat() ;
  var e_lng = event.latLng.lng() ;
  var min_distance = 10000000000 ;
  var min_i = 0 ;
  for ( var i=0; i < d_path.length; i++ ) {
    var dist2 = (d_path[i].loc.lat() - e_lat)*(d_path[i].loc.lat() - e_lat)
              + (d_path[i].loc.lng() - e_lng)*(d_path[i].loc.lng() - e_lng) ;
    if ( dist2 < min_distance ) { min_i = i ; min_distance = dist2 ;}
  }
  audio.currentTime = ( d_path[min_i].datetime - sound_start_dt ) / 1000 - 5 ;
    // 少し前からにしないとすぐ次へ移ってしまう。

  // 画像、マーカーの処理はここではしない。LocationUpdate() に任せる。1秒以内に処理してくれる。
  // このためマーカー表示にもったり感がある。排他制御をきっちり管理してここでやるのが望ましいとは思う。
}

function SoundJump(datetime) {
  // 指定の日時にサウンド再生ポイントを移動する。フォーマットは"YYYY/MM/DD hh:mm:ss"で可。
  sound_dt = new Date ( datetime ) ;
  audio.currentTime = ( sound_dt - sound_start_dt ) / 1000
  // 画像、マーカーの処理はここではしない。LocationUpdate() に任せる。
}
