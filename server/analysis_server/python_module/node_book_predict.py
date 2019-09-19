'''
-description:
-input:
        ap.add_argument("-p", "--path", type=str, help="path to input image")
        ap.add_argument("-t", "--type", type=str, default="local", help="type of input image")
        ap.add_argument("-l", "--language", type=str, default="kor+eng", help="select languge of book cover")
        ap.add_argument("-e", "--east", type=str, help="east algorithm path")
-output: str predicted_img
'''

def main(args):
    try:
        img = ImageHandler(img_path=args["path"], path_type=args["type"])
        model = BookRecognizer()
        ret = model.predict(img.image, lang=args["language"], east=args["east"], features=args["feature"].split("+"))
    except TextError as e:
        ret = error_returner.get("TextError")
        ret["message"] = str(e)
    except ImageError as e:
        ret = error_returner.get("ImageError")
        ret["message"] = str(e)
    except Exception as e:
        ret = error_returner.get("PythonError")
        ret["message"] = str(e)
    return ret

if __name__ == "__main__":
    try:
        import sys
        import os
        import warnings
        import argparse
        import json
        warnings.filterwarnings('ignore')
        from im_book import BookRecognizer, ImageHandler
        from exceptions import *

        error_returner = ErrorReturner()
    # construct the argument parser and parse the arguments
        ap = argparse.ArgumentParser()
        ap.add_argument("-p", "--path", type=str, help="path to input image")
        ap.add_argument("-t", "--type", type=str, default="local", help="type of input image")
        ap.add_argument("-l", "--language", type=str, default="kor+eng", help="select languge of book cover")
        ap.add_argument("-e", "--east", type=str, help="east algorithm path")
        ap.add_argument("-f", "--feature", type=str, default="img", help="select features")
        args = vars(ap.parse_args())
    except Exception as e:
        ret = error_returner.get("ArgumentError")
        ret["message"] = str(e)
    else:
        ret = main(args)
    ret = json.dumps(ret)
    print(ret)
