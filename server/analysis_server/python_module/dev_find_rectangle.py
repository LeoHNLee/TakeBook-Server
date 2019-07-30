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
argparser.add_argument("-w", "--width", type=int, default=288, help="resize image width")
argparser.add_argument("-height", "--height", type=int, default=384, help="resize image height")
argparser.add_argument("-med", "--medKSize", type=int, default=5, help="kernel size of median filter")
args = vars(argparser.parse_args())

origin = im_book.ImageHandler(img_path=args["path"], path_type = args["type"])
origin_height, origin_width = origin.image.shape[:2]
rate_height = origin_height/args["height"]
rate_width = origin_width/args["width"]
resized = origin.im_resize(x=args["width"], y=args["height"])

median = cv2.medianBlur(resized, ksize=args["medKSize"])

gauss_width = round(args["width"]*.1)
gauss_height = round(args["height"]*.1)
if gauss_width%2==0: gauss_width-=1
if gauss_height%2==0: gauss_height-=1

gaussed_height = cv2.GaussianBlur(median, ksize=(1,gauss_height), sigmaX=0)
gaussed_width = cv2.GaussianBlur(gaussed_height, ksize=(gauss_width,1), sigmaX=0)

gaussed = cv2.GaussianBlur(median, ksize=(11,15), sigmaX=0)
    
alpha = 1
unsharp = im_book.ImageHandler(img=(1+alpha)*gaussed_width.astype(np.int16))
unsharp = unsharp.im_minus(alpha*gaussed.astype(np.int16))

gray = im_book.ImageHandler(unsharp).im_change_type()
binary = cv2.adaptiveThreshold(src=gray, maxValue=1, adaptiveMethod=cv2.ADAPTIVE_THRESH_GAUSSIAN_C, thresholdType=cv2.THRESH_BINARY_INV, blockSize=101, C=2)

kernel=cv2.getStructuringElement(shape=cv2.MORPH_RECT, ksize=(3,4))
mophology = cv2.erode(src=binary, kernel=kernel, iterations=2)
mophology = cv2.dilate(src=mophology, kernel=kernel, iterations=10)
mophology = cv2.erode(src=mophology, kernel=kernel, iterations=8)

contours, hierarchy = cv2.findContours(mophology, mode=cv2.RETR_EXTERNAL, method=cv2.CHAIN_APPROX_NONE)

len_contours = [contour.shape[0] for contour in contours]
main_contour = len_contours.index(max(len_contours))
contour = contours[main_contour][:,0]

retval=cv2.boundingRect(contour)
# retval = tuple([round(rate_width*v) if i%2==0 else round(rate_height*v) for i, v in enumerate(retval)])

find_rectangle = cv2.rectangle(resized, retval, (0, 0, 255), 2)
cv2.imshow("Text Detection", find_rectangle)
cv2.waitKey(0)