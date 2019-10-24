### image
import cv2
import numpy as np
### own
from exceptions import *
import warnings
warnings.filterwarnings('ignore')

def predict_image(img, options):
    '''
    -Description
    -Input
    -Output
    '''
    y, x, *_ = img.shape
    if x != options["weight"] or y != options["height"]:
        dsize = (options["weight"], options["height"])
        img = cv2.resize(img, dsize=dsize, interpolation=cv2.INTER_LINEAR)
                
    # get image features
    predicted_features = {}
    for im_feature in options["type"]:
        predicted_features[im_feature] = globals()[im_feature+"_features"](img=img)


def ORB_features(img):
    '''
    -Description: extract image descriptors using ORB method
    -Input
        -img: resized image
    -Output
        -descriptors: image descriptors ((n,32) dim list)
    '''
    # gray scale
    img = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)

    # Create ORB Algorithm, Find keypoints and Compute descripotrs
    ORB = cv2.ORB_create()
    keypoints = ORB.detect(img,None)
    keypoints, descriptors = ORB.compute(img, keypoints)
    descriptors = descriptors.tolist()
    return descriptors

def SURF_features(img):
    '''
    -Description: extract image descriptors using SURF method
    -Input
        -img: resized image
    -Output
        -descriptors: image descriptors ((n,128) dim list)
    '''
    # Create SURF Algorithm and set to 128-dim
    surf = cv2.xfeatures2d.SURF_create(500)
    surf.setExtended(True)

    # extract descriptor
    _, descriptors = surf.detectAndCompute(img, None)
    descriptors = descriptors.tolist()
    return descriptors

def histogram_features(img):
    '''
    -Description:
    -Input
        -img:
    -Output
        -bgr_histogram
    '''
    bgr_histogram = {}
    colors = ("blue", "green", "red")
    for i, color in enumerate(colors):
        color_histogram = cv2.calcHist([img],[i],None,[256],[0,256])
        bgr_histogram[color] = color_histogram[:,0].astype("int").tolist()
    return bgr_histogram