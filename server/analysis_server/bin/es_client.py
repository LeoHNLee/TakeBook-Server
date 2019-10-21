import sys
import json
from elasticsearch import Elasticsearch
from os.path import dirname, abspath

config_path = dirname(dirname(abspath(__file__)))+"/config/elasticsearch.json"

with open(config_path) as config_file:
    json_data = json.load(config_file)
    host = json_data["host"]

es = Elasticsearch(host)


def get_result(img_feature, kor_text_feature, eng_text_feature):

    body = {
        "from": 0,
        "size": 5,
        "query": {
            "match": {
                # "kor": "",
                # "eng": "",
                "surf": img_feature
            }
        }
    }

    # 결과값 매칭
    # results = es.search(index="takebook", body=body)

    # results  = {
    #     "isbn": results.hits.hits[0]._source.isbn,
    #     "second_candidate": results.hits.hits[1]._source.isbn,
    #     "third_candidate": results.hits.hits[2]._source.isbn,
    #     "fourth_candidate": results.hits.hits[3]._source.isbn,
    #     "fifth_candidate": results.hits.hits[4]._source.isbn
    # }
    
    results  = {
        "isbn": "9788927192459",
        "second_candidate": "9788928096435",
        "third_candidate": "9788928096619",
        "fourth_candidate": "9788928096992",
        "fifth_candidate": "9788928645381"
    }

    return results
