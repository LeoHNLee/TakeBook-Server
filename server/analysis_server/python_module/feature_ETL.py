'''
- Log: YYYY-MM-DD-HH-mm-SS result start_index end_index
'''

def main(args):
    global error_returner
    try:
        with open(args["log_path"], "r") as logs:
            latest_logs = logs.readlines()
            result_log = ""
            i = -1
            while result_log != "Success":
                try:
                    date_log, result_log, start_log, end_log = latest_logs[i].split()
                except IndexError as e:
                    ret = error_returner.get("LoggingError")
                    ret["message"] = str(e)+"\n every log is fail."
                    date_log = None
                    result_log = None
                    start_log = "0"
                    end_log = "0"
                    return ret
                else:
                    i -= 1
            if result_log == "end_of_file":
                try:
                    raise EOFError("file is end")
                except EOFError as e:
                    ret = error_returner.get("LoggingError")
                    ret["message"] = str(e)
                    return ret
            start_log = int(end_log)
            end_log = int(end_log) + args["mount_of_job"]

        # get url
        url_df = pd.read_csv(args["read_path"])
        isbns = url_df.iloc[start_log:end_log,0].values.tolist()
        urls = url_df.iloc[start_log:end_log,1].values.tolist()
        if len(isbns) == 0:
            result_log = "end_of_file"
        else:
            features = {}
            model = BookRecognizer()
            for isbn, url in zip(isbns, urls):
                # get image from url
                image = ImageHandler(img_path = url, path_type = "url")
                ###########################################
                # 이부분에서 S3에 이미지 던지는 코드 작성할 것
                ###########################################
                # get image features
                surf = model.predict_SURF_features(image.image)
                orb = model.predict_ORB_features(image.image)
                text_feature = model.predict_text(image.image, lang = "kor+eng")
                image_feature = {
                    "SURF": surf,
                    "ORB": orb,
                }
                feature = {
                    "image": image_feature,
                    "text": image_feature,
                }
                features[isbn] = feature
                ###########################
                # time sleep code 조정할 것
                ###########################
                time.sleep(random.uniform(0.5,1))

    except TextError as e:
        ret = error_returner.get("TextError")
        ret["message"] = str(e)
    except ImageError as e:
        ret = error_returner.get("ImageError")
        ret["message"] = str(e)
    except Exception as e:
        ret = error_returner.get("PythonError")
        ret["message"] = str(e)
    else:
        ret = error_returner.get("SuccessCode")
        ret["message"] = "feature extraction is Complete"
    try:
        features = features
    except NameError:
        features = None
    return ret, features, (date_log, result_log, start_log, end_log)

if __name__ == "__main__":
    try:
        import sys
        import os
        import warnings
        import random
        import time
        import argparse
        import json
        ########################################################################
        # pandas는 이번 프로젝트에서 한 번도 안 쓴 비표준 라이브러리임. 설치 확인 필요
        ########################################################################
        import pandas as pd
        import numpy as np
        from datetime import datetime
        warnings.filterwarnings('ignore')
        import requests
        import cv2
        from exceptions import *
        from im_book import ImageHandler, BookRecognizer

        error_returner = ErrorReturner()
    # construct the argument parser and parse the arguments
        ap = argparse.ArgumentParser()
        #######################
        # default 값 꼭 고칠 것
        #######################
        ap.add_argument("-r", "--read_path", type=str, default="URL CSV 파일 경로.csv", help="path to input image")
        ap.add_argument("-w", "--write_path", type=str, default="특성 JSON 디렉토리 경로/", help="path to output model")
        ap.add_argument("-log", "--log_path", type=str, default="로그 파일 경로.txt", help="path to log")
        ap.add_argument("-job", "--mount_of_job", type=int, default=300, help="mount of job")
        args = vars(ap.parse_args())
    except Exception as e:
        ret = error_returner.get("ArgumentError")
        ret["message"] = str(e)
    else:
        ret, features, (date_log, result_log, start_log, end_log) = main(args)
        date_log = datetime.today()
        date_log = str(date_log.year)+"-"+str(date_log.month)+"-"+str(date_log.day)+"-"+str(date_log.hour)+"-"+str(date_log.minute)+"-"+str(date_log.second)
        if ret["code"]==999:
            result_log = "Success"
        else:
            result_log = ret["error"]
        with open(args["write_path"], "w") as fp:
            fn = str(start_log)+"_"+str(end_log)+".json"
            json.dump(features, fp+fn)
        with open(args["log_path"], "a") as logs:
            latest_log = " ".join([date_log, result_log, str(start_log), str(end_log)])+"\n"
            logs.write(latest_log)
    print(ret)