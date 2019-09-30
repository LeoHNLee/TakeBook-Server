### image
import cv2
### text
import re
### own
from exceptions import *
### 
import sys
import os
import numpy as np
import warnings
warnings.filterwarnings('ignore')

class TextHandler():
    __text_compiler__ = {
            "kor": re.compile("[^ㄱ-ㅣ가-힣,.!?]"),
            "eng": re.compile("[^a-zA-Z,.!?]"),
        }

    def __init__(self, text):
        self.text = text

    def text_cleaning(self, lang, text=None):
        if text is None:
            text = self.text
        try:
            compiler = self.__text_compiler__[lang]
        except KeyError as e:
            raise TextError("not defined language")
        else:
            ret = compiler.sub(" ", text)
            ret = " ".join(ret.split())
        return ret