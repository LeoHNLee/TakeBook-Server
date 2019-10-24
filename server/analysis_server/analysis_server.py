from flask import Flask
from flask_restful import Api
from routes.main import *
from bin.exceptions import * # exception file work like message
from bin.logger import Logger
from bin.config import _train_job # model parameters
from bin.im_models import HierarchicalKMeans, HKMModels # models

app = Flask(__name__)
api = Api(app)

api.add_resource(BookImageAnalyze, '/BookImageAnalyze')
api.add_resource(ScrapImageAnalyze, '/ScrapImageAnalyze')

# 
logger = Logger(verbose=True, debug=False)

# params parsing
params = _train_job["parameters"]
dir_path = _train_job["paths"]["dir"]["models"]
file_name = _train_job["paths"]["file"]["model_name"]

# load models
model = HierarchicalKMeans(parameters = params, logger = logger)
model.load(dir_path=dir_path, file_name=file_name)

if __name__ == '__main__':
    app.run(debug=True, host = '0.0.0.0', port = 5000)