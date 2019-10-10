__error_schemas__ = {
    "ArgumentError":{
        "code":000,
        "error":"ArgumentError",
        "message":None,
    },
    "TextError":{
        "code":100,
        "error":"TextError",
        "message":None,
    },
    "ImageError":{
        "code":200,
        "error":"ImageError",
        "message":None,
    },
    "URLError":{
        "code":700,
        "error":"URLError",
        "message":None,
    },
    "LoggingError":{
        "code":800,
        "error":"LoggingError",
        "message":None,
    },
    "PythonError":{
        "code":900,
        "error":"PythonError",
        "message":None,
    },
    "SuccessCode":{
        "code":999,
        "error": "OK",
        "message": None,
        "body": None,
    }
}
class ErrorReturner():
    def __init__(self):
        pass

    def get(self, error):
        return __error_schemas__[error]

class TextError(Exception):
    pass

class ImageError(Exception):
    pass

class ArgumentError(Exception):
    pass

class LoggingError(Exception):
    pass