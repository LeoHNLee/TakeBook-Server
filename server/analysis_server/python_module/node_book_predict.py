'''
-description:
-input:
        ap.add_argument("-p", "--path", type=str, help="path to input image")
        ap.add_argument("-t", "--type", type=str, default="local", help="type of input image")
        ap.add_argument("-l", "--language", type=str, default="kor+eng", help="select languge of book cover")
        ap.add_argument("-e", "--east", type=str, help="east algorithm path")
        ap.add_argument("-f", "--feature", type=str, default="image+text", help="select features")
-output: print(str)
'''

def main(args):
    '''
    - Description:
    - Input:
        ap.add_argument("-p", "--path", type=str, help="path to input image")
        ap.add_argument("-t", "--type", type=str, default="local", help="type of input image")
        ap.add_argument("-l", "--language", type=str, default="kor+eng", help="select languge of book cover")
        ap.add_argument("-e", "--east", type=str, help="east algorithm path")
        ap.add_argument("-f", "--feature", type=str, default="image+text", help="select features")
    - Output: Result Code like as json style that defined in exceptions
    '''
    try:
        img = ImageHandler(img_path=args["path"], path_type=args["type"])
        model = BookRecognizer()
        try:
            features=args["feature"].split("+")
            text_lang=args["language"].split("+")
            text_east=args["east"]
            image_options=args["image_option"].split("+")
        except:
            raise ArgumentError(f"Arguments are not proper type: <{args}>")
        feature = model.predict(img.image, features=features, text_lang=text_lang, text_east=text_east, image_options=image_options)

    # Exception Handling
    except ArgumentError as e:
        ret = error_returner.get("ArgumentError")
        ret["message"] = str(e)
    except TextError as e:
        ret = error_returner.get("TextError")
        ret["message"] = str(e)
    except ImageError as e:
        ret = error_returner.get("ImageError")
        ret["message"] = str(e)
    except Exception as e:
        ret = error_returner.get("PythonError")
        ret["message"] = str(e)

    # SuccessCode: 999
    else:
        ret = error_returner.get("SuccessCode")
        ret["message"] = "Prediction is Complete"
        ret["body"] = feature
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
        ap.add_argument("-f", "--feature", type=str, default="image+text", help="select features")
        ap.add_argument("-io", "--image_option", type=str, default="ORB", help="select features")
        args = vars(ap.parse_args())
    except Exception as e:
        ret = error_returner.get("ArgumentError")
        ret["message"] = str(e)
    else:
        ret = main(args)
    ret = json.dumps(ret)
    print(ret)
