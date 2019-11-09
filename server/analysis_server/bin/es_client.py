import sys
import json
from elasticsearch import Elasticsearch
from os.path import dirname, abspath
from .config import _es_job

es = Elasticsearch(_es_job["cluster"])

book_image_analyze_query = {
        "from": 0,
        "size": 5,
        "query": {
            "match": {
                "image": None,
            }
        }
    }

response_keys = ("isbn", "second_candidate", "third_candidate", "fourth_candidate", "fifth_candidate",)

def get_result(img_feature, kor_text_feature=None, eng_text_feature=None):
    '''
    -Description:
    -Input:
    -Output:
    '''
    global book_image_analyze_query

    book_image_analyze_query["query"]["match"]["image"] = img_feature
    # book_image_query["query"]["match"]["image"] = kor_text_feature
    # book_image_query["query"]["match"]["image"] = eng_text_feature

    # 결과값 매칭
    es_results = es.search(index=_es_job["index"], body=book_image_analyze_query, request_timeout=50)["hits"]["hits"]

    results_body = {}
    for key, value in zip(response_keys, es_results):
        results_body[key] = value["_source"]["isbn"]

    return results_body
