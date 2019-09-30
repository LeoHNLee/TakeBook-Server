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
    global error_returner
    try:
        total_feature = extract_total_feature(args["read_path"])
        H = construct_viz_vocab(total_feature, args["write_path"])
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
        ret["message"] = "Train is Complete"
    return ret

if __name__ == "__main__":
    try:
        import sys
        import os
        import warnings
        import argparse
        import json
        warnings.filterwarnings('ignore')
        from exceptions import *
        from irs import extract_total_feature, construct_viz_vocab

        error_returner = ErrorReturner()
    # construct the argument parser and parse the arguments
        ap = argparse.ArgumentParser()
        ap.add_argument("-r", "--read_path", type=str, help="path to input image")
        ap.add_argument("-w", "--write_path", type=str, help="path to output model")
        args = vars(ap.parse_args())
    except Exception as e:
        ret = error_returner.get("ArgumentError")
        ret["message"] = str(e)
    else:
        ret = main(args)
    ret = json.dumps(ret)
    print(ret)
