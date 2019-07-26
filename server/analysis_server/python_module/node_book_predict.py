'''
-description:
-input: str img_path, str path_type
    - img_path: url, local path, s3 path
    - path_type: url, local, s3
-output: str predicted_img
'''
try:
    import sys, os, warnings, argparse
    warnings.filterwarnings('ignore')
    import im_book
except ImportError as e:
    print('Error: '+str(e))
else:
    class NotProperQuery(Exception):
        pass

    def main(args):
        # get node query
        try:
            img = im_book.ImageHandler(img_path=args["path"], path_type=args["type"])
            model = im_book.BookClassification()
            ret = model.predict(img.image, lang=args["language"])
            return ret
        except Exception as e:
            return 'Error: '+str(e)

    # construct the argument parser and parse the arguments
    ap = argparse.ArgumentParser()
    ap.add_argument("-p", "--path", type=str, help="path to input image")
    ap.add_argument("-t", "--type", type=str, help="type of input image")
    ap.add_argument("-l", "--language", type=str, default="kor", help="select languge of book cover")
    args = vars(ap.parse_args())
    ret = main(args)
    print(ret)