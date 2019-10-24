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
def model_checker(model, cluster_type):
    if model[-4:]!=".pkl":
        return False
    if cluster_type not in model:
        return False
    return True

alphabet = ('A', 'B', 'C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',)
alphabet_matcher = {k:v for k, v in enumerate(alphabet)}

def predict_viz_vocab(feature, cluster_type):
    '''
    - Input: feature shape
    '''
    pred = ""
    while 1:
        try:
            temp = globals()[f"{cluster_type}{pred}"].predict([feature])[0]
            pred += alphabet_matcher[temp]
        except KeyError:
            return pred

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
        book_recognizer = BookRecognizer()
        try:
            features=args["feature"].split("+")
            text_lang=args["language"].split("+")
            text_east=args["east"]
            image_options=args["image_option"].split("+")
            cluster_type = args["cluster_type"]
        except Exception:
            raise ArgumentError(f"Arguments are not proper type: <{args}>")
        else:
            feature = book_recognizer.predict(img.image, features=features, text_lang=text_lang, text_east=text_east, image_options=image_options)

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
        import os
        import argparse
        import joblib
        import json
        import numpy as np
        from im_book import BookRecognizer, ImageHandler
        from exceptions import *
        from config import _train_job

        error_returner = ErrorReturner()

    # construct the argument parser and parse the arguments
        ap = argparse.ArgumentParser()
        ap.add_argument("-p", "--path", type=str, help="path to input image")
        ap.add_argument("-t", "--type", type=str, default="url", help="type of input image")
        ap.add_argument("-mp", "--model_dir", type=str, default="", help="select model path")
        ap.add_argument("-l", "--language", type=str, default="kor+eng", help="select languge of book cover")
        ap.add_argument("-e", "--east", type=str, help="east algorithm path")
        ap.add_argument("-f", "--feature", type=str, default="image+text", help="select features")
        ap.add_argument("-io", "--image_option", type=str, default="SURF", help="select image descriptor")
        ap.add_argument("-ct", "--cluster_type", type=str, default="kmeans", help="select clustering model")
        args = vars(ap.parse_args())

        cluster_type = args["cluster_type"]
        # load models
        model_dir = args["model_dir"]
        models = os.listdir(model_dir)
        models = [model for model in models if model_checker(model, cluster_type)]
        for model in models:
            globals()[model[:-4]] = joblib.load(f"{model_dir}{model}")

    except Exception as e:
        ret = error_returner.get("PythonError")
        ret["message"] = str(e)
    else:
        ret = main(args)
        if ret["code"] == 999:
            surf_feature = np.array(ret["body"]["image"]["SURF"], dtype="float32")
            viz_vocab = []
            for sf in surf_feature:
                vocab = predict_viz_vocab(sf, cluster_type=cluster_type)
                viz_vocab.append(vocab)
            viz_vocab = " ".join(viz_vocab)
            ret["body"]["image"]["SURF"] = viz_vocab
    ret = json.dumps(ret)
    print(ret)
