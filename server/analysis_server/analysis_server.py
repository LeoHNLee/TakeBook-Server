# flask modules
from flask import Flask
from flask_restful import Api

# main hookers
from routes.main import *

# connect Flask
app = Flask(__name__)
api = Api(app)

# hooker
api.add_resource(BookImageAnalyze, '/BookImageAnalyze')
api.add_resource(ScrapImageAnalyze, '/ScrapImageAnalyze')

if __name__ == '__main__':
    app.run(debug=False, host = '0.0.0.0', port = 5000)