#/usr/bin/python3
# -*- coding: utf-8 -*-

import os, sys, time
from PIL import Image
from PIL.ExifTags import TAGS

if len(sys.argv) < 2 :
    print ( sys.argv )
    input ( "One argument for filedir is necessary." )
    sys.exit(1)

filedir = sys.argv[1]

try:
    outfile = open("images.date.txt","w")
except:
    input ( "\"images.date.txt\" exists." )
    os.exit(1)

#exif_data = []
print( u"ファイル名,原画像ﾃﾞｰﾀの生成日時" )
outfile.write(u"ファイル名,原画像ﾃﾞｰﾀの生成日時\r\n")

for file in os.listdir(filedir):
    try:
        img = Image.open(filedir+"\\"+file)
        exif = img._getexif()

        for id, value in exif.items():
            if TAGS.get(id) == "DateTimeOriginal":
                datetime = time.strftime( "%Y/%m/%d %H:%M:%S", time.strptime(value,"%Y:%m:%d %H:%M:%S" ) )
                    # EXIF の日付は yyyy:mm:dd 形式なので変換しておく。
                #tag = file,TAGS.get(id, id),datetime
                #exif_data.extend(tag)
                print(filedir+"\\"+file+","+datetime)
                outfile.write(filedir+"\\"+file+","+datetime+"\r\n")
    except:
        pass

input( '>' )
outfile.close()

sys.exit(0)

# C:\Users\Akihiko\Desktop\行動記録(未バックアップ)\20180512金村\images\DSC00286.JPG,2018/05/12 13:20:44
