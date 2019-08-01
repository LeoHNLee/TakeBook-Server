'''
median blur
10*gaussian blur: save for unsharpning
mean blur
unsharpning
'''
import im_book
import numpy as np
import warnings, os, sys, argparse
warnings.filterwarnings('ignore')
import cv2, imutils

argparser = argparse.ArgumentParser()
argparser.add_argument("-p", "--path", type=str, help="path to input image")
argparser.add_argument("-t", "--type", type=str, default="local", help="type of input image")
input_args = vars(argparser.parse_args())
args = {}
args["input"] = input_args
args["size"] = {}
args["size"]["width"] = 480
args["size"]["height"] = 720
args["median"] = {}
args["median"]["KSize"] = 5
args["gauss"] = {}
args["gauss"]["KRate"] = 0.1
args["gauss"]["sigmaXH"] = 0
args["gauss"]["sigmaYH"] = 0
args["gauss"]["sigmaXW"] = 0
args["gauss"]["sigmaYW"] = 0
args["unsharp"] = {}
args["unsharp"]["KSize"] = (11,15)
args["unsharp"]["alpha"] = 1
args["unsharp"]["sigmaX"] = 0
args["unsharp"]["sigmaY"] = 0
args["adaBin"] = {}
args["adaBin"]["method"] = cv2.ADAPTIVE_THRESH_GAUSSIAN_C
args["adaBin"]["type"] = cv2.THRESH_BINARY_INV
args["adaBin"]["BSize"] = 41
args["adaBin"]["C"] = 5
args["morphology"] = {}
args["morphology"]["KSize"] = (3,4)
args["morphology"]["shape"] = cv2.MORPH_RECT
args["morphology"]["it_opening"] = 2
args["morphology"]["it_closing"] = 8
args["contour"] = {}
args["contour"]["mode"] = cv2.RETR_EXTERNAL
args["contour"]["method"] = cv2.CHAIN_APPROX_NONE

origin = im_book.ImageHandler(img_path=args["input"]["path"], path_type = args["input"]["type"])
args["size"]["height_origin"], args["size"]["width_origin"] = origin.image.shape[:2]
args["size"]["height_rate"] = args["size"]["height_origin"]/args["size"]["height"]
args["size"]["width_rate"] = args["size"]["width_origin"]/args["size"]["width"]
resized = origin.im_resize(x=args["size"]["width"], y=args["size"]["height"])

median = cv2.medianBlur(resized, ksize=args["median"]["KSize"])

ga_args = args["gauss"]
gauss_width = round(args["size"]["width"]*ga_args["KRate"])
gauss_height = round(args["size"]["height"]*ga_args["KRate"])
if gauss_width%2==0: gauss_width-=1
if gauss_height%2==0: gauss_height-=1

gaussed_h = cv2.GaussianBlur(median, ksize=(1,gauss_height), sigmaX=ga_args["sigmaXH"])
gaussed_w = cv2.GaussianBlur(gaussed_h, ksize=(gauss_width,1), sigmaX=ga_args["sigmaXW"])

un_args = args["unsharp"]
gaussed = cv2.GaussianBlur(median, ksize=un_args["KSize"], sigmaX=0)
unsharp = im_book.ImageHandler(img=(1+un_args["alpha"])*gaussed_w.astype(np.int16))
unsharp = unsharp.im_minus(un_args["alpha"]*gaussed.astype(np.int16))

gray = im_book.ImageHandler(unsharp).im_change_type()

bin_args = args["adaBin"]
binary = cv2.adaptiveThreshold(src=gray, maxValue=1, 
                            adaptiveMethod=bin_args["method"], 
                            thresholdType=bin_args["type"], 
                            blockSize=bin_args["BSize"], C=bin_args["C"])

mor_args = args["morphology"]
kernel=cv2.getStructuringElement(shape=mor_args["shape"], ksize=mor_args["KSize"])
morphology = cv2.erode(src=binary, kernel=kernel, iterations=mor_args["it_opening"])
morphology = cv2.dilate(src=morphology, kernel=kernel, iterations=mor_args["it_opening"]+mor_args["it_closing"])
morphology = cv2.erode(src=morphology, kernel=kernel, iterations=mor_args["it_closing"])

cont_args = args["contour"]
contours, hierarchy = cv2.findContours(morphology, mode=cont_args["mode"], method=cont_args["method"])

len_contours = [contour.shape[0] for contour in contours]
main_contour = len_contours.index(max(len_contours))
contour = contours[main_contour][:,0]

retval=cv2.boundingRect(contour)

find_rectangle = cv2.rectangle(resized, retval, (0, 0, 255), 2)
cv2.imwrite("C:/swm10/dataset/real_img/results/"+args["input"]["path"].split("\\")[-1],find_rectangle)
cv2.imshow("Text Detection", find_rectangle)
cv2.waitKey(0)