from flask import Flask
from flask_restful import Api
from routes.main import *

app = Flask(__name__)
api = Api(app)

api.add_resource(BookImageAnalyze, '/BookImageAnalyze')
api.add_resource(ScrapImageAnalyze, '/ScrapImageAnalyze')

if __name__ == '__main__':
    app.run(debug=True, host = '0.0.0.0', port = 5000)