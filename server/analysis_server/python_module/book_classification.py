import sys, os, warnings
warnings.filterwarnings('ignore')
import numpy as np
import urllib, requests
import cv2, imutils
import pytesseract

class Not_proper_image(Exception):
    pass

class book_classification(object):
    '''example:
    import book_classification
    book_classification.book_classification().predict(img_path)
    '''
    def __init__(self):
        self.ocr = None
        self.vision = None

    def image_cleaning(self):
        pass

    def train(self):
        pass

    def predict(self, img, lang='kor'):
        return pytesseract.image_to_string(img, lang=lang)

class image_handler(object):

    def __init__(self, img=None, img_path=None, path_type=None):
        self.path_type = path_type
        self.img_path = img_path
        if (img_path is None)^(path_type is None):
            raise Not_proper_image('You have to input both img_path and path_type')
        if img is None:
            if img_path is None:
                raise Not_proper_image("You do not input any args. You have to input at least one arg. 'img' or 'img_path'")
            else:
                self.image = self.get_image()
        else:
            self.image = img

    def get_image(self):
        if self.path_type=='url':
            ret = self.get_image_from_url(self.img_path)
        elif self.path_type=='local':
            ret = self.get_image_from_local(self.img_path)
        elif self.path_type=='s3':
            ret = self.get_image_from_s3(self.img_path)
        else:
            raise Not_proper_image("Is it proper img_path?")
        return ret

    def get_image_from_url(self, img_path):
        img_from_url = requests.get(img_path)
        img = np.asarray(bytearray(img_from_url.content), dtype="uint8")
        img = cv2.imdecode(img, cv2.IMREAD_COLOR)
        return img

    def get_image_from_local(self, img_path):
        return cv2.imread(img_path)

    def get_image_from_s3(self, img_path):
        pass

    def save_image(self, save_path):
        '''
        -argument:
            -img:
                -type: opencv image
            -save_path: real path of directory you want to save the image
        '''
        cv2.imwrite(save_path, self.image)
        
    def rotate_image(self, degree=90):
        img = imutils.rotate(self.image, degree)
        return image_handler(img=img)