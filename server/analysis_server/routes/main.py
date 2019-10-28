import os, sys
from flask import request, jsonify
from flask_restful import Resource, Api

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))
import bin.message as message
import bin.es_client as es_client
from bin.config import _train_job, _pred_job
from bin.im_book import *

class BookImageAnalyze(Resource):
    train_params = _train_job["parameters"]
    cluster_type = params["cluster_type"]
    pred_params = _pred_job

    # model_lists = os.listdir(dir_path)
    # model_lists = [model_list for model_list in model_lists if model_checker(model_list, cluster_type)]
    # for model_list in model_lists:
    #     global globals()[model_list[:-4]]
    raw_model = BookRecognizer()

    def get(self):
        print(sys.path)
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
            features = raw_model.predict(img=image.image, 
                                    features=pred_params["features"], 
                                    text_options=pred_params["text_options"], 
                                    image_options=pred_params["image_options"],
                                )
            surf_feature = features["image"]["SURF"]
            viz_vocabs = []
            for feature in surf_feature:
                viz_vocab = self.predict_viz_vocab(feature)
                viz_vocabs.append(viz_vocab)
            viz_vocabs = " ".join(viz_vocabs)

            # 특성 검색
            result = es_client.get_result("test0", "test1", "test2")

            message.set_result_message(response_body, "RS000")
            response_body["Response"] = result
        return jsonify(response_body)

    def predict_viz_vocab(feature):
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