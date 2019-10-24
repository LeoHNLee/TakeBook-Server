import os, sys
from flask import request, jsonify
from flask_restful import Resource, Api

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))
import bin.message as message


class UrlAnalyze(Resource):
    def get(self):
        response_body = {}

        req = request.args
        image_url = req.get("image_url")

        if image_url is None:
            message.set_result_message(response_body, "EC001")
        else:
            result = {}
            result["code"] = 999

            # extract features
            # result = get_feature(image_url)

            message.set_result_message(response_body, result["code"])
            if result["code"]==999:
                message.set_result_message(response_body, "RS000")
                # 요청 성공
                # response_body["Response"] = {
                #     "image": {
                #         "SURF": 
                #     },
                #     "text":{
                #         "kor":,
                #         "eng":
                #     }
                # }
            elif result["code"]==0:
                # imgae_url 값 오류
                message.set_result_message(response_body, "EP001")
            else:
                # 파이썬 모듈에러
                message.set_result_message(response_body, "EP000")

        return jsonify(response_body)