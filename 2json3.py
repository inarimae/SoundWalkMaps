#!/usr/bin/python3
# -*- conding: utf-8 -*-

import sys, os
import codecs
import re
import configparser

#sys.stdout = codecs.getwriter('utf_8')(sys.stdout)

if len(sys.argv) != 2 :
    inifile = 'config.ini'
else:
    inifile = sys.argv[1]

jsonfile = "default.json"
imagebase = "images.default/"
notefile = "default.csv"
soundtz = 9 # サウンド：日本時間
imagetz = 9 # 画像：日本時間
displaytz = 9 # 表示：日本時間 Asia/Japan
notetz = 9 # ノーテーション：日本時間
maptype = "roadmap" # オプションなのでなくても可。'roadmap'/'satellite'。
zoom = 14
ids = []
imagedatefiles = []
trkfiles = []
mp3files = []
starttimes = []
skiptimes = []
captions = []

ini = configparser.SafeConfigParser(inline_comment_prefixes=["#",";"])
if os.path.exists(inifile):
    ini.read(inifile)
else:
    input('No config.ini file')
    sys.exit(1)

for key in ini['Global']:
    value = ini['Global'][key]
    #print('Global',key,value)
    if key=="jsonfile": jsonfile=value
    elif key=="imagebase" : imagebase=value
    elif key=="notefile" : notefile=value
    elif key=="soundtz" : soundtz=value
    elif key=="imagetz" : imagetz=value
    elif key=="displaytz" : displaytz=value
    elif key=="notetz" : notetz=value
    elif key=="maptype" : maptype=value
    elif key=="zoom" : zoom=value

for section in ini.sections():
    if section == 'Global': continue
    ids.append("A")
    imagedatefiles.append("./images.date.txt")
    trkfiles.append("default.trk")
    mp3files.append("default.mp3")
    starttimes.append("2018-01-01 0:00:00")
    skiptimes.append("0")
    captions.append("")
    for key in ini[section]:
        value = ini[section][key]
        #print(section,key,value)
        lastindx = len(ids)-1
        if key=="ids" : ids[lastindx]=value
        if key=="imagedatefiles" : imagedatefiles[lastindx]=value
        if key=="trkfiles" : trkfiles[lastindx]=value
        if key=="mp3files" : mp3files[lastindx]=value
        if key=="starttimes" : starttimes[lastindx]=value
        if key=="skiptimes" : skiptimes[lastindx]=value
        if key=="captions" : captions[lastindx]=value

maplat = []
maplon = []

for indx in range(0,len(ids)):
    trkfile = trkfiles[indx]

    with open(trkfile,'r') as f_trk:
        for s in f_trk:
            m = re.findall(r'^T  (N|S)(\d*\.\d*) (E|W)(\d*\.\d*) ([^ ]*) ([^ ]*) (-*\d*)(.*)', s)
            if len(m)>0 :
                #print(m[0]) # ('N', '34.6623373', 'E', '135.5015088', '12-OCT-17', '06:29:27', '72')
                if m[0][0]=='S': m[0][1] = -float(m[0][1])
                if m[0][2]=='W': m[0][3] = -float(m[0][3])
                maplat.append(float(m[0][1]))
                maplon.append(float(m[0][3]))

maplat = sum(maplat)/len(maplat)
maplon = sum(maplon)/len(maplon)

jsonfile = codecs.open ( jsonfile, "w", "utf-8" )

jsonfile.write(
"""
{{
  "maploc":{{"lat":{2}, "lng":{3}, "zoom":{4} }},
  "maptype":"{5}",
  "imagebase":"{0}",
  "notefile":"{1}",
  "soundtz":"{6}", "imagetz":"{7}", "displaytz":"{8}", "notetz":"{9}",

  "dataset":[
""".format(imagebase, notefile, maplat, maplon, zoom, maptype, soundtz, imagetz, displaytz, notetz) )


cont0 = ''
for indx in range(0,len(ids)):
    id = ids[indx]
    imagedatefile = imagedatefiles[indx]
    trkfile = trkfiles[indx]
    mp3file = mp3files[indx]
    starttime = starttimes[indx]
    skiptime = skiptimes[indx]
    caption = captions[indx]

    jsonfile.write(
"""{cont0}
{{
 "id":"{0}",
  "sounds":{{"filename":"{1}", "starttime":"{2}",
     "playstart":{3}, "caption":"{4}"}},

  "marker":[
""".format(id, mp3file, starttime, skiptime, caption, cont0=cont0) )

    cont = ''
    with open(trkfile,'r') as f_trk:
        for s in f_trk:
            m = re.findall(r'^T  (N|S)(\d*\.\d*) (E|W)(\d*\.\d*) ([^ ]*) ([^ ]*) (-*\d*)(.*)', s)
            if len(m)>0 : # ('N', '34.6623373', 'E', '135.5015088', '12-OCT-17', '06:29:27', '72')
                if m[0][0]=='S': m[0][1] = -float(m[0][1])
                if m[0][2]=='W': m[0][3] = -float(m[0][3])
                jsonfile.write(
"""{cont}
{{"lat":{0},"lng":{1},"date":"{2}","time":"{3}","alt":{4}}}"""
            .format(float(m[0][1]),float(m[0][3]),m[0][4],m[0][5],float(m[0][6]),cont=cont) )
                cont = ','

    jsonfile.write(
"""
  ],
  "images":[
""")

    cont = ''
    with open(imagedatefile,'r',errors="ignore") as f_img: # python3.5から文字コード関連エラーが出るが、無視。
        for s in f_img:
            m = re.findall(r'^.*\\([^\\]*),(.*) (.*)$', s)
            if len(m)>0 : # ('DSC06214.JPG', '2017/10/12', '15:56:49')
                m0 = re.sub('JPG', 'jpg', m[0][0])
                jsonfile.write(
"""{cont}
{{"filename":"{0}","datetime":"{1} {2}"}}"""
            .format(m0, m[0][1], m[0][2], cont=cont) )
                cont = ','

    jsonfile.write(
"""
  ]
}
""")
    cont0 = ","

jsonfile.write(
"""
]
}
""")


sys.exit(0)