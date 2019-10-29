import os, sys
import pickle

from flask import Flask
from flask_restful import Api
from routes.main import *
from bin.exceptions import * # exception file work like message
from bin.logger import Logger
from bin.integrity import model_checker
from bin.config import _train_job # model parameters
from bin.im_models import HierarchicalKMeans, HKMModel # models

# def predict_viz_vocab(feature):
#     '''
#     - Input: feature shape
#     '''
#     pred = ""
#     while 1:
#         try:
#             temp = globals()[f"{cluster_type}{pred}"].predict([feature])[0]
#             pred += alphabet_matcher[temp]
#         except KeyError:
#             return pred

# connect Flask
app = Flask(__name__)
api = Api(app)

# hooker
api.add_resource(BookImageAnalyze, '/BookImageAnalyze')
api.add_resource(ScrapImageAnalyze, '/ScrapImageAnalyze')

# # Global Trackers
# error_returner = ErrorReturner()
# logger = Logger(save_path="c:/swm10/p1039_red/server/analysis_server/", verbose=True, debug=False)

# # params parsing
# params = _train_job["parameters"]
# cluster_type = params["cluster_type"]

# dir_path = _train_job["paths"]["dir"]["models"]

# # load models
# model_lists = os.listdir(dir_path)
# model_lists = [model_list for model_list in model_lists if model_checker(model_list, cluster_type)]
# for model_list in model_lists:
#     with open(f"{dir_path}{model_list}", "rb") as fp:
#         globals()[model_list[:-4]] = pickle.load(fp)

# # load models
# model = HierarchicalKMeans(parameters = params, logger = logger)
# model.load(dir_path=dir_path, file_name=file_name)

if __name__ == '__main__':
    app.run(debug=True, host = '0.0.0.0', port = 5000)