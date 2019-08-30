'''
-description:
-input:
        ap.add_argument("-p", "--path", type=str, help="path to input image")
        ap.add_argument("-t", "--type", type=str, default="local", help="type of input image")
        ap.add_argument("-l", "--language", type=str, default="kor+eng", help="select languge of book cover")
        ap.add_argument("-e", "--east", type=str, help="east algorithm path")
-output: str predicted_img
'''
import sys, os, warnings, argparse
warnings.filterwarnings('ignore')
from im_book import BookRecognizer, ImageHandler
from exceptions import *

error_returner = ErrorReturner()

def main(args):
    try:
        img = ImageHandler(img_path=args["path"], path_type=args["type"])
        model = BookRecognizer()
        ret = model.predict(img.image, lang=args["language"], east=args["east"])
    except TextError as e:
        ret = error_returner.get("TextError")
        ret["message"] = e
    except ImageError as e:
        ret = error_returner.get("ImageError")
        ret["message"] = e
    except Exception as e:
        ret = error_returner.get("PythonError")
        ret["message"] = e
    return ret

if __name__ == "__main__":
    try:
    # construct the argument parser and parse the arguments
        ap = argparse.ArgumentParser()
        ap.add_argument("-p", "--path", type=str, help="path to input image")
        ap.add_argument("-t", "--type", type=str, default="local", help="type of input image")
        ap.add_argument("-l", "--language", type=str, default="kor+eng", help="select languge of book cover")
        ap.add_argument("-e", "--east", type=str, help="east algorithm path")
        args = vars(ap.parse_args())
    except Exception as e:
        ret = error_returner.get("PythonError")
        ret["message"] = e
    else:
        ret = main(args)
    print(ret)