import os
import joblib
import json
from elasticsearch import Elasticsearch

model_dir = ""
features_dir = ""
cluster_type="kmeans"
es_cluster = [{"host":"localhost", "port":9200}]
es_index = ""

alphabet = ('A', 'B', 'C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',)
alphabet_matcher = {k:v for k, v in enumerate(alphabet)}

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

def isbn_checker(isbn):
    if isbn[-5:]!=".json":
        return False
    ################
    # isbn checker #
    ################
    return True

def model_checker(model):
    if model[-4:]!=".pkl":
        return False
    if cluster_type not in model:
        return False
    return True

# load models
models = os.listdir(model_dir)
models = [model for model in models if model_checker(model)]
for model in models:
    globals()[model[:-4]] = joblib.load(f"{model_dir}{model}")

# isbns
isbns = os.listdir(features_dir)
isbns = [isbn for isbn in isbns if isbn_checker(isbn)]

# Elasticsearch Setting
es = Elasticsearch(es_cluster)

#
for isbn in isbns:
    with open(f"{features_dir}{isbn}", "r") as fp:
        features = json.load(fp)
    
    # visual vocabulary
    surf_feature = np.array(features["image"]["SURF"], dtype="float32")
    viz_vocab = []
    for sf in surf_feature:
        vocab = predict_viz_vocab(sf)
        viz_vocab.append(vocab)
    viz_vocab = " ".join(viz_vocab)
    
    #
    body = {
        "isbn":isbn[:-5],
        "image":viz_vocab,
        "kor":features["text"]["kor"],
        "eng":features["text"]["eng"]
    }
    es.index(index=es_index, id=isbn, body=body)
    # 예상되는 에러: 이미 인덱싱되어 있는 곳에 재인덱싱 했을 때 어떤 결과를 초래할까??