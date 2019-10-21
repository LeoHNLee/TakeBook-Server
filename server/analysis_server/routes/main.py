import os, sys
from flask import request, jsonify
from flask_restful import Resource, Api

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))
import bin.message as message
import bin.es_client as es_client


class UrlAnalyze(Resource):
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
            ##################################
            # feature = get_feature(image_url)
            ##################################

            # 특성 검색
            result = es_client.get_result("test0", "test1", "test2")

            message.set_result_message(response_body, "RS000")
            response_body["Response"] = result
        

        return jsonify(response_body)