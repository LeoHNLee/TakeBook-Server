'''
-description:
-input:
        ap.add_argument("-p", "--path", type=str, help="path to input image")
        ap.add_argument("-t", "--type", type=str, default="local", help="type of input image")
        ap.add_argument("-l", "--language", type=str, default="kor+eng", help="select languge of book cover")
        ap.add_argument("-e", "--east", type=str, help="east algorithm path")
-output: str predicted_img

-Error:

'''
import sys, os, warnings, argparse
warnings.filterwarnings('ignore')
import im_book

class NotProperQuery(Exception):
        pass

def main(args):
        # get node query
    try:
        img = im_book.ImageHandler(img_path=args["path"], path_type=args["type"])
        model = im_book.BookClassification()
        ret = model.predict(img.image, lang=args["language"], east=args["east"])
        return ret
    except Exception as e:
        return 'Error: '+str(e)

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
        ret = "Error: "+str(e)
    else:
        ret = main(args)
    print(ret)