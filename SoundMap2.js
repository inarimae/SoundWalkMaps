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

// 以下は外部ファイル(SoundMapFile_json)から取り込まれる。

var d_path = []; // 歩行データ。GPS位置と時刻。
function d_pathobj(loc,datetime) { this.loc=loc; this.datetime=datetime; }

var d_images = []; // 画像データ。ファイル名と撮影時刻。
function d_imageobj(filename,datetime) { this.filename=filename; this.datetime=datetime; }

var imagebase = "images/" ; // 画像ファイルが置かれているディレクトリ。
var map_center = null ; // 表示する地図の中心位置(緯度・経度)と表示倍率。
var zoom = 14 ;

var dataset_num = 1 ; // いくつデータセットが含まれるか。
var ids = [] ; // データセットのID。文字列。
var soundfile = [] ; // 音声データファイル。
var sound_start_dt = [] ; // 録音開始日時。
var sound_playstart = [] ; // プレイ開始の場所。録音開始時刻からの秒数。
var captions = [] ;

var notefile = null ; // 説明（ノーテーション）ファイル。なければ何もしない。

var d_notes = []; // 説明挿入データ。ファイル上には lat, lng はなく、ここで割り出す必要がある。
function d_noteobj(id,starttime,endtime,loc,comment) {
  this.id=id; this.starttime=starttime; this.endtime=endtime;
  this.loc=loc; this.comment=comment;
}

var img_canvas_ctx = null ;
var img_canvas_w = 360 ; // 写真描画領域の大きさ。CSS定義が優先される。
var img_canvas_h = 240 ;

var soundtz = 9; imagetz = 9; displaytz = 9 ; notetz = 9 ; // 記録は通常すべて日本時間。

var map = null ;
var polylines = [] ;
var mark_current = null ;
var audio = null ;
var audio_running = false ;
var image_current = null ;
var maptype = 'roadmap' ;

var i_dataset_current = 0 ; // 現在再生している音源の番号。

var month_conv = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12} ;

function initialize() {
  // 外部ファイル(SoundMapFile_json)から必要データを取り込み終わってから、メインルーチンに移る。
  // 同期のために Promise を使っているが、これは IE とアンドロイド上の一部ブラウザでは使えない。

  $.getJSON(SoundMapFile_json, function(data, statusCode){
      map_center = new google.maps.LatLng(data.maploc.lat, data.maploc.lng) ;
      zoom = data.maploc.zoom ;
      imagebase = data.imagebase ;

      if ( data.soundtz != null  ) { soundtz = data.soundtz ; }
      if ( data.imagetz != null  ) { imagetz = data.imagetz ; }
      if ( data.displaytz != null) { displaytz = data.displaytz ; }
      if ( data.notetz != null   ) { notetz = data.notetz ; }

      if ( data.notefile != null ) { notefile=data.notefile ; } // あれば代入。

      if ( data.maptype != null  ) { maptype = data.maptype ; } // オプションとして地図スタイル設定。

      // 古い形式と新しい形式双方に対応するため、データ前処理をifで切り分ける。

      if ( typeof data.dataset == 'undefined' ) {
        // もし "dataset" でくくっていない古い形式の場合、dataset に収めなおす。
        // 新しい形式に統一した時点で、冗長なので、else節を残して削除する予定。

        dataset_num = 1 ; // dataset が一つしかない。

        ids[0] = "" ; // IDは空白としておく。
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
        // 複数のdataset を配列に格納。

        dataset_num = data.dataset.length ; // dataset の個数。

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
        if ( data_splitted.length < 3 ) { continue ; } // 空白行など。
        var id = data_splitted[0] ;

        var i_dataset ;
        for ( i_dataset = 0; i_dataset < dataset_num; i_dataset++ ) { // ID文字列から配列のインデックスを割り出す。
          if ( id == ids[i_dataset] ) { break ; }
        }
        if ( i_dataset >= dataset_num ) { continue ; } // 対応するIDが発見できない場合は、何もしない。

        var loc ;
        var starttime = new Date ( data_splitted[1] ) ;
        var endtime = new Date ( data_splitted[2] ) ;
        starttime.setTime(starttime.getTime() - notetz * 60*60*1000 ) ;
        endtime.setTime(endtime.getTime() - notetz * 60*60*1000 ) ;

        var j ;
        for ( j=d_path[i_dataset].length-1; j >=0; j-- ) { // ノーテーション指定時刻の直前のマーカーを探す。
          if ( d_path[i_dataset][j].datetime <= starttime ) {
            loc = d_path[i_dataset][j].loc ;
            break ;
          }
        }
        if ( j<0 ) { loc = d_path[i_dataset][0].loc ; } // もし指定時刻以前がなければ、パスの最初にしておく。

        d_notes[k] = new d_noteobj(
          id, starttime, endtime,
          loc, data_splitted[3] // comment
        ) ;
        k++ ;
      }
    }, "text") // get()

    .complete(function(){
      InitAndMainloop() ; // メインルーチンを実行。
    }) ;

  }) // getJSON.success()

}


function InitAndMainloop() { // メインルーチン。地図と音声を起動、ループルーチンを叩く。

  var opts = {
    zoom: zoom,
    center: map_center,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    clickableIcons: false, // 地物が選択されてマーカーが飛ばされるのを防止。
    mapTypeId: maptype // マップタイプを設定。デフォルトは 'roadmap'
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), opts);
  google.maps.event.addListener(map, 'click', setMarkerByposition); // 地図上のクリックを捉える。
  google.maps.event.addListener(map, 'rightclick', putNewMarker); // 編集用。

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
         // ノーテーションのマーカーのみに反応するようにした。現在地マーカーには反応させない。
    });
  }

  img_canvas_ctx = document.getElementById("img_canvas").getContext("2d");
  img_canvas_w = $('#img_canvas').width(); // CSSによる描画領域の大きさ定義を確認。
  img_canvas_h = $('#img_canvas').height();

  audio = document.getElementById("sound_control");
  audio.autoplay = true ; // このバージョンでは自動開始とする。

  i_dataset_current = 0 ;
  audio.src = soundfile[i_dataset_current] ; // audio.autoplay==true なので、これで再生開始。
  audio.currentTime = sound_playstart[i_dataset_current] ; // 再生開始後に初期再生位置へ移動。
  audio.addEventListener('ended', CirculateLoop ); // 一本再生が終わる度に次へ進む。
  setInterval("LocationUpdate();",1000) ; // 以降、１秒ごとにマーカーと画像を管理。再生終了を検知すると戻ってくる。
  audio_running = true ; // 再生中フラグを立てる。
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


function LocationUpdate(){ // マーカーと画像を更新する。
  if ( ! audio_running ) { return 0 ; } // 再生が終わっていたら何もしない。念のため。

  var datetime = new Date(sound_start_dt[i_dataset_current]) ;
  datetime.setTime ( datetime.getTime() + audio.currentTime * 1000 ) ;

  var datetimeDisp = new Date ( datetime ) ;
  datetimeDisp.setTime ( datetime.getTime() + displaytz * 60*60*1000) ;
  document.getElementById("sound_time").textContent = datetimeDisp.toLocaleString() ;

  //if ( d_path[i_dataset_current][0].datetime != null ) { //無駄な if に見えるので外す準備。
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
    if ( mark_current != null ) { mark_current.setMap(null) ; } // 前のマーカーは消す。
    mark_current = new google.maps.Marker({
      map:map,
      position: current_loc
    });
    mark_current.setMap(map);
  //}

  for ( var i=1; i < d_images[i_dataset_current].length; i++ ) { // 一つ前の絵を出す。
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
  // 地図クリック時に最も近い歩行位置を探し、時刻からサウンド再生ポイントを更新。
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
  //datetime = new Date( d_path[min_i_dataset][min_i].datetime - 5000 ) ; // 少し前からにしないとすぐ次へ移ってしまう。
  datetime = new Date( d_path[min_i_dataset][min_i].datetime ) ;
  //alert("Call: "+id + " " + datetime.toLocaleDateString()+" "+datetime.toLocaleTimeString()) ;

  SoundJumpB( ids[min_i_dataset], datetime ) ;

  // 画像、マーカーの処理はここではしない。LocationUpdate() に任せる。1秒以内に処理してくれる。
  // このためマーカー表示にもったり感がある。排他制御をきっちり管理してここでやるのが望ましいとは思う。
}


function SoundJump(id_datetime) { // HTMLからの呼び出し用で、内部では不使用。notetzで時差調整を行う。
  var id ;
  var datetime_splitted = id_datetime.split(" ") ;

  if ( datetime_splitted[0].search(/\d+\/\d+\/\d+/) == -1 ) { // 最初が日付として解釈できない場合は ID と見做す。
    sound_dt = new Date ( datetime_splitted[1] + " " + datetime_splitted[2] ) ;
    id = datetime_splitted[0] ;
    //alert("Jump to /"+id+"/ "+datetime_splitted[1]+" "+datetime_splitted[2] ) ;
  }
  else { // IDが指定されていない。
    var i_dataset ;
    sound_dt = new Date ( datetime_splitted[0] + " " + datetime_splitted[1] ) ;
    for ( i_dataset = dataset_num-1; i_dataset >= 0; i_dataset--) { // 適切なIDを探す。
      if ( sound_dt > sound_start_dt[i_dataset] ) { break ; } // 音源間に時間の重なりはないものとする。
    }
    if ( i_dataset < 0 ) { return ; } // 再生位置が全音源より前の場合は、何もしない。
    id = ids[i_dataset] ;
    //alert("Jump to /"+id+"/ "+datetime_splitted[0]+" "+datetime_splitted[1] ) ;
  }
  sound_dt.setTime ( sound_dt.getTime() - notetz * 60*60*1000) ;
  SoundJumpB(id,sound_dt); // ID文字列と Date型の日時を渡す。
}

function SoundJumpB(id,sound_dt) { // 指定の日時にサウンド再生ポイントを移動する。内部ではこちらを使う。
  var i_dataset ;

  //alert(id + " " + sound_dt.toLocaleDateString()+" "+sound_dt.toLocaleTimeString()) ;

  for ( i_dataset = 0; i_dataset < dataset_num; i_dataset++ ) { // ID文字列から配列のインデックスを割り出す。
    if ( id == ids[i_dataset] ) { break ; }
  }
  if ( i_dataset >= dataset_num ) { return ; } // 対応するIDが発見できない場合は、何もしない。

  if ( i_dataset != i_dataset_current ) { // 異なる音源に飛ぶ場合。
    audio_running = false ;
    i_dataset_current = i_dataset ;
    audio.src = soundfile[i_dataset_current] ;
    audio_running = true ;
    document.getElementById("caption").textContent = captions[i_dataset_current] ;
  }
  audio.currentTime = ( sound_dt - sound_start_dt[i_dataset_current] ) / 1000

  // 画像、マーカーの処理はここではしない。LocationUpdate() に任せる。
}

// 以下、ノーテーション追加作業用のコード。オーサリング用のHTMLのみで使われる。

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

function putNewMarker(event) { // div 要素に oncontextmenu="return false;" を追加すること。

  if ( typeof editOn === "undefined" || ! editOn ) { return ; } // 編集フラグがなければ何もしない。
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

function ImageRewind(RwdNo) { // 画像撮影地点まで時刻をリワインド。
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
