from .image_features import *
from .text_features import *
from .exceptions import *

import cv2
import numpy as np

import sys
import os
import warnings
warnings.filterwarnings('ignore')

class BookRecognizer(object):
    '''
    -Description:
    -Input: None
    -Output: Model
    '''
    def __init__(self, image_shape=(360,480), image_feature_type="ORB", lang='kor+eng', east=None):
        self.image_options = {
            "weight":image_shape[0],
            "height":image_shape[1],
            "type":image_feature_type.split("+")
        }
        self.text_options = {

        }

    def predict(self, img, feature=("image","text")):
        '''
        -Description:
        -Input
        -Output
            - 
        '''
        # create results dictionary contains features of image
        predicted_features = {}

        for feature in features:
            predicted_features[feature] = globals()["predict_"+feature]
                
        return predicted_features

    def predict_text(self, img, east=None, lang="kor"):
        if east is None:
            return self.ocr(img=img, lang=lang)
        else:
            ocr_results = {}
            text_areas = self.find_text_area(img=img, east_path=east)
            for area in text_areas:
                x1, x2, y1, y2 = area
                ocr_results[area] = self.ocr(img=img[y1:y2, x1:x2], lang=lang)
            return ocr_results

    def ocr(self, img, lang="kor"):
        langs = lang.split("+")
        ret = {}
        for lang in langs:
            text = pytesseract.image_to_string(img, lang=lang)
            ret[lang] = TextHandler(text).text_cleaning(lang=lang)
        return ret

    def find_text_area(self, img, east_path="models/east.pb", min_confidence=0.5, new_width=320, new_height=320):
        (origin_height, origin_width) = img.shape[:2]
        ratio_width = origin_width / float(new_width)
        ratio_height = origin_height / float(new_height)

        img = ImageHandler(img=img)
        origin = img.copy()

        img.image = img.im_resize(x=new_width, y=new_height)
        blob = cv2.dnn.blobFromImage(img.image, 1.0, (new_width, new_height),
		                            (123.68, 116.78, 103.94), swapRB=True, crop=False)

        model = cv2.dnn.readNet(east_path)
        model.setInput(blob)

        # define the two output layer names for the EAST detector model that
        # we are interested -- the first is the output probabilities and the
        # second can be used to derive the bounding box coordinates of text
        layer_names = [
            "feature_fusion/Conv_7/Sigmoid",
		    "feature_fusion/concat_3",
            ]
        (scores, geometry) = model.forward(layer_names)

        (num_rows, num_cols) = scores.shape[2:4]
        rects = []
        confidences = []

        for y in range(0, num_rows):
            # extract the scores (probabilities), followed by the geometrical
            # data used to derive potential bounding box coordinates that
            # surround text
            scoresData = scores[0, 0, y]
            xData0 = geometry[0, 0, y]
            xData1 = geometry[0, 1, y]
            xData2 = geometry[0, 2, y]
            xData3 = geometry[0, 3, y]
            anglesData = geometry[0, 4, y]

            # loop over the number of columns
            for x in range(0, num_cols):
                # if our score does not have sufficient probability, ignore it
                if scoresData[x] < min_confidence:
                    continue

                # compute the offset factor as our resulting feature maps will
                # be 4x smaller than the input image
                (offsetX, offsetY) = (x * 4.0, y * 4.0)

                # extract the rotation angle for the prediction and then
                # compute the sin and cosine
                angle = anglesData[x]
                cos = np.cos(angle)
                sin = np.sin(angle)

                # use the geometry volume to derive the width and height of
                # the bounding box
                h = xData0[x] + xData2[x]
                w = xData1[x] + xData3[x]

                # compute both the starting and ending (x, y)-coordinates for
                # the text prediction bounding box
                endX = int(offsetX + (cos * xData1[x]) + (sin * xData2[x]))
                endY = int(offsetY - (sin * xData1[x]) + (cos * xData2[x]))
                startX = int(endX - w)
                startY = int(endY - h)

                # add the bounding box coordinates and probability score to
                # our respective lists
                rects.append((startX, startY, endX, endY))
                confidences.append(scoresData[x])

        # apply non-maxima suppression to suppress weak, overlapping bounding
        # boxes
        boxes = NMS(np.array(rects), probs=confidences)
        points = []
        # loop over the bounding boxes
        for (startX, startY, endX, endY) in boxes:
            # scale the bounding box coordinates based on the respective
            # ratios
            startX = int(startX * ratio_width)
            startY = int(startY * ratio_height)
            endX = int(endX * ratio_width)
            endY = int(endY * ratio_height)
            point = (startX, endX, startY, endY)

            point = origin.im_get_area(points=point, ratio=2.0)
            points.append(point)

        return points
