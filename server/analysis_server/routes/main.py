# standard modules
import os, sys
import pickle
import time
sys.path.append(os.path.abspath("../"))

# flask modules
from flask import request, jsonify
from flask_restful import Resource, Api

# OpenSource modules

# Own modules
import bin.message as message
import bin.es_client as es_client
from bin.config import _train_job, _pred_job, _alphabet, _log_job
from bin.im_book import *
from bin.logger import Logger
import bin.exceptions as exceptions
from bin.exceptions import *
from bin.integrity import *

# parsing options
alphabet_matcher = _alphabet["matcher"]
scrap_job = _pred_job["scrap_analyze"]
book_image_job = _pred_job["book_image_analyze"]
cluster_type = _train_job["parameters"]["cluster_type"]
model_path = _train_job["paths"]["dir"]["models"]
model_path = os.path.abspath(model_path)+'/'
log_path = _log_job["save_path"]
log_path = os.path.abspath(log_path)+'/'

# Global Trackers
error_returner = ErrorReturner()
logger = Logger(
                save_path = log_path,
                limit = _log_job["limit"],
                verbose = _log_job["verbose"], 
                debug = _log_job["debug"],
            )

# load image analyzer
raw_model = BookRecognizer()

# load Viz-Vocab models
logger.logging(f"[start][load][{cluster_type} models]", debug_flag=False)
start_time = time.time()
model_lists = os.listdir(model_path)
model_lists = [model_list for model_list in model_lists if model_checker(model_list, cluster_type)]
for model_list in model_lists:
    with open(f"{model_path}{model_list}", "rb") as fp:
        var_name = model_list[:-4]
        globals()[var_name] = pickle.load(fp)
end_time = f"{(time.time()-start_time)/60}분"
logger.logging(f"[end][load][{cluster_type} models] loading time {end_time}", debug_flag=False)

class BookImageAnalyze(Resource):
    '''
    -Description:
    -Input:
    -Output:
    '''
    def get(self):
        '''
        -Description:
        -Input:
        -Output:
        '''
        global cluster_type
        global _pred_job
        global raw_model
        global logger
        response_body = {}

        req = request.args
        image_url = req.get("image_url")

        if image_url is None or image_url == '':
            # 필수 파라미터 누락
            message.set_result_message(response_body, "EC001")
            return jsonify(response_body)

        result = {}
        # get image feature
        try:
            image_feature, kor_feature, eng_feature = self.analyze(image_url)
        except URLError as e:
            # Invaild URL
            message.set_result_message(response_body, "EC004", "Invalid URL Error")
            return jsonify(response_body)
        except ImageError as e:
            # 이미지 에러: image is null
            message.set_result_message(response_body, "EP000")
            return jsonify(response_body)

        if image_feature is None:
            # 이미지 에러: image is null
            message.set_result_message(response_body, "EP000")
            return jsonify(response_body)

        # 특성 검색
        try:
            result = es_client.get_result(image_feature)
        except Exception as e: # have to check Exception
            message.set_result_message(response_body, "ES014")
            logger.logging(f"[ERROR][es_client][get_result] {e}", debug_flag=False)
        else:
            message.set_result_message(response_body, "RS000")
            response_body["Response"] = result

        return jsonify(response_body)

    def analyze(self, image_url):
        '''
        -Description:
        -Input:
        -Output:
        '''
        # get image from url
        image = ImageHandler(img_path = image_url, path_type = "url")

        # extract features from image
        features = raw_model.predict(img=image.image,
                                    features=book_image_job["features"],
                                    text_options=book_image_job["text_options"],
                                    image_options=book_image_job["image_options"],
                                )
        surf_feature = features["image"]["SURF"]

        # convert image feature to viz-vocab
        viz_vocabs = []
        for feature in surf_feature:
            try:
                viz_vocab = self.predict_viz_vocab(feature)
            except Exception as e:
                logger.logging(f"[ERROR][BookImageAnalyze][predict_viz_vocab] {e}", debug_flag=False)
            else:
                viz_vocabs.append(viz_vocab)
        viz_vocabs = " ".join(viz_vocabs)

        return viz_vocabs, None, None

    def predict_viz_vocab(self, feature):
        '''
        - Input: feature shape
        '''
        global alphabet_matcher
        global cluster_type
        pred = ""
        while 1:
            try:
                temp = globals()[f"{cluster_type}{pred}"].predict([feature])[0]
                pred += alphabet_matcher[temp]
            except KeyError:
                return pred

class ScrapImageAnalyze(Resource):
    '''
    -Description:
    -Input:
    -Output:
    '''
    def get(self):
        '''
        -Description:
        -Input:
        -Output:
        '''
        global logger

        response_body = {}

        req = request.args
        image_url = req.get("image_url")
        language = scrap_job["text_options"]["langs"][0]

        if image_url is None or image_url == '':
            # 필수 파라미터 누락
            message.set_result_message(response_body, "EC001")
            return jsonify(response_body)

        try:
            scrap_text = self.scrap(image_url=image_url, lang=language)
        except URLError as e:
            # Invaild URL
            message.set_result_message(response_body, "EC004", "Invalid URL Error")
        except ImageError as e:
            # 이미지 에러: image is null
            message.set_result_message(response_body, "EP000")
        else:
            message.set_result_message(response_body, "RS000")
            response_body["Response"] = {"text": scrap_text}
                
        return jsonify(response_body)

    def scrap(self, image_url, lang):
        '''
        -Description:
        -Input:
        -Output:
        '''
        global _pred_job
        global raw_model
        global logger

        # get image from url
        image = ImageHandler(img_path = image_url, path_type = "url")

        # extract text
        features = raw_model.predict(img=image.image,
                                    features=scrap_job["features"],
                                    text_options=scrap_job["text_options"],
                                    image_options=scrap_job["image_options"],
                                )

        scrap_text = features["text"][lang]
        return scrap_text