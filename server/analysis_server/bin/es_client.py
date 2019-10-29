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
    results = es.search(index=_es_job["index"], body=book_image_analyze_query)

    results  = {
        "isbn": results.hits.hits[0]._source.isbn,
        "second_candidate": results.hits.hits[1]._source.isbn,
        "third_candidate": results.hits.hits[2]._source.isbn,
        "fourth_candidate": results.hits.hits[3]._source.isbn,
        "fifth_candidate": results.hits.hits[4]._source.isbn
    }
    
    results  = {
        "isbn": "9788927192459",
        "second_candidate": "9788928096435",
        "third_candidate": "9788928096619",
        "fourth_candidate": "9788928096992",
        "fifth_candidate": "9788928645381"
    }

    return results
