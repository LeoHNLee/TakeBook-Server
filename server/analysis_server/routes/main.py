# python modules
import os, sys
import pickle
import time

# flask modules
from flask import request, jsonify
from flask_restful import Resource, Api

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))
import bin.message as message
import bin.es_client as es_client
from bin.config import _train_job, _pred_job, _alphabet
from bin.im_book import *
from bin.logger import Logger
from bin.exceptions import *
from bin.integrity import *

# Global Trackers
error_returner = ErrorReturner()
logger = Logger(save_path="c:/swm10/p1039_red/server/analysis_server/log_test/", verbose=True, debug=True)

cluster_type = _train_job["parameters"]["cluster_type"]
model_path = _train_job["paths"]["dir"]["models"]
alphabet_matcher = _alphabet["matcher"]

# load models
logger.logging(f"[start][load][{cluster_type} models]", debug_flag=False)
start_time = time.time()


model_lists = os.listdir(model_path)
model_lists = [model_list for model_list in model_lists if model_checker(model_list, cluster_type)]
for model_list in model_lists:
        with open(f"{model_path}{model_list}", "rb") as fp:
            var_name = model_list[:-4]
            if var_name not in globals():
                globals()[var_name] = pickle.load(fp)

end_time = f"{(time.time()-start_time)/60}분"
logger.logging(f"[end][load][{cluster_type} models] loading time {end_time}", debug_flag=False)

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

class BookImageAnalyze(Resource):
    train_params = _train_job["parameters"]
    cluster_type = train_params["cluster_type"]
    pred_params = _pred_job
    model_path = _train_job["paths"]["dir"]["models"]

    raw_model = BookRecognizer()

    def get(self):
        response_body = {}

        req = request.args
        image_url = req.get("image_url")

        if image_url is None:
            # 필수 파라미터 누락
            message.set_result_message(response_body, "EC001")
        else:
            result = {}
            result["code"] = 999
            # 이곳에서 특성 추출.
            image = ImageHandler(img_path = image_url, path_type = "url")
            
            features = self.raw_model.predict(img=image.image,
                                    features=self.pred_params["features"],
                                    text_options=self.pred_params["text_options"],
                                    image_options=self.pred_params["image_options"],
                                )
            surf_feature = features["image"]["SURF"]
            viz_vocabs = []
            for feature in surf_feature:
                viz_vocab = predict_viz_vocab(feature, self.cluster_type)
                viz_vocabs.append(viz_vocab)
            viz_vocabs = " ".join(viz_vocabs)

            # 특성 검색
            result = es_client.get_result(viz_vocabs, "test1", "test2")

            message.set_result_message(response_body, "RS000")
            response_body["Response"] = result

        return jsonify(response_body)

class ScrapImageAnalyze(Resource):
    def get(self):
        response_body = {}

        req = request.args
        image_url = req.get("image_url")

        if image_url is None:
            # 필수 파라미터 누락
            message.set_result_message(response_body, "EC001")
        else:
            # 이곳에서 텍스트 추출.
            ##################################
            # scrap_text = get_scrap_text(image_url)
            ##################################


            message.set_result_message(response_body, "RS000")
            response_body["Response"] = {
                # "text": scrap_text,
                "text": "scrap_text"
            }
        return jsonify(response_body)