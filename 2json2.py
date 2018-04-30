#!/usr/bin/python3
# -*- conding: utf-8 -*-

import sys
import codecs
import re

#sys.stdout = codecs.getwriter('utf_8')(sys.stdout)

ids = ['A']

imagedatefiles = ['./images.date.txt']

trkfiles = ['20180428赤塚公園.trk']

mp3files = ['DR0000_0034(20180428Akatsuka).mp3']

starttimes = ['2018-04-29 0:47:15']

skiptimes = ['5']

captions = [u'Tsukuba Doho park to Akatsuka park in midnight']

imagebase = 'images.Akatsuka20180428/'
notefile = 'Akatsuka20180428.csv'

soundtz = 9 # サウンド：日本時間
imagetz = 9 # 画像：日本時間
displaytz = 9 # 表示：現地時間 Asia/Japan
notetz = 9 # ノーテーション：現地時間
maptype = 'satelite' # デフォルトは 'roadmap' だが、オプションなのでなくても可。

zoom = 15

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

print(
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

    print(
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
                print(
"""{cont}
{{"lat":{0},"lng":{1},"date":"{2}","time":"{3}","alt":{4}}}"""
            .format(float(m[0][1]),float(m[0][3]),m[0][4],m[0][5],float(m[0][6]),cont=cont), end='')
                cont = ','

    print(
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
                print(
"""{cont}
{{"filename":"{0}","datetime":"{1} {2}"}}"""
            .format(m0, m[0][1], m[0][2], cont=cont), end='')
                cont = ','

    print(
"""
  ]
}
""")
    cont0 = ","

print(
"""
]
}
""")


sys.exit(0)