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
            end_log = int(end_log) + 300

        # get url
        url_df = pd.read_csv(args["read_path"], header=None)
        isbns = url_df.iloc[start_log:end_log,0].values.tolist()
        urls = url_df.iloc[start_log:end_log,1].values.tolist()
        if len(isbns) == 0:
            result_log = "end_of_file"
        else:
            features = {}
            model = BookRecognizer()
            for isbn, url in zip(isbns, urls):
                image = ImageHandler(img_path = url, path_type = "url")
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
        ap.add_argument("-r", "--read_path", type=str, help="path to input image")
        ap.add_argument("-w", "--write_path", type=str, help="path to output model")
        ap.add_argument("-log", "--log_path", type=str, help="path to log")
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
            json.dump(features, fp)
        with open(args["log_path"], "a") as logs:
            latest_log = " ".join([date_log, result_log, str(start_log), str(end_log)])+"\n"
            logs.write(latest_log)
    print(ret)