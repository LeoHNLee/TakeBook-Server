import sys, os, warnings, random, copy, math
warnings.filterwarnings('ignore')
import numpy as np
import urllib, requests
import cv2, imutils
import pytesseract

class NotProperImage(Exception):
    pass

class BookClassification(object):
    '''example:
    import im_book
    im_book.BookClassification().predict(img_path)
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

class ImageHandler(object):
    '''
    -description:
    -input:
    -output:
    '''
    def __init__(self, img=None, img_path=None, path_type=None):
        self.path_type = path_type
        self.img_path = img_path
        if (img_path is None)^(path_type is None):
            raise NotProperImage('You have to input both img_path and path_type')
        if img is None:
            if img_path is None:
                raise NotProperImage("You do not input any args. You have to input at least one arg. 'img' or 'img_path'")
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
            raise NotProperImage("Is it proper img_path?")
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

    def im_change_type(self, img=None, img_type=cv2.COLOR_BGR2GRAY):
        if img is None:
            img = self.image
        ret = cv2.cvtColor(img, img_type)
        return ret

    def im_minus(self, other, origin=None):
        if origin is None:
            origin = self.image
        ret = origin.astype(np.int16) - other.astype(np.int16)
        is_underflow = ret < 0
        ret *= is_underflow ^ True
        return ret.astype(np.uint8)

    def im_plus(self, other, origin=None):
        if origin is None:
            origin = self.image
        ret = origin.astype(np.int16) + other.astype(np.int16)
        is_overflow = (ret > 255)
        ret *= is_overflow ^ True
        ret += is_overflow * 255
        return ret.astype(np.uint8)

    def im_resize(self, img=None, x=None, y=None, option=cv2.INTER_LINEAR):
        if img is None:
            img = self.image
        if x is None:
            y = img.shape[0]
        if y is None:
            x = img.shape[1]
        ret = cv2.resize(img, dsize=(x,y), interpolation=option)
        return ret

    def im_padding(self, big_size_img, small_size_img=None, value=0, padding=None, borderType=cv2.BORDER_CONSTANT, option=0):
        '''
        - option
            - 0: middle of big_size_img
            - 1: uniform random position
            - 2: 지정한만큼 패딩
        '''
        if small_size_img is None:
            small_size_img = self.image
        adding_height = big_size_img.shape[0] - small_size_img.shape[0]
        adding_width = big_size_img.shape[1] - small_size_img.shape[1]
        if adding_height <2 or adding_width <2:
            raise ValueError("too small big_size_img")
        if option == 0:
            height_rest = width_rest = 0
            if adding_height%2==1: 
                height_rest = 1
            if adding_width%2==1: 
                width_rest = 1
            top = int(adding_height/2)
            bottom = top+height_rest
            left = int(adding_width/2)
            right = left+width_rest
        elif option == 1:
            top = random.randint(1, adding_height)
            bottom = adding_height-top
            left = random.randint(1, adding_width)
            right = adding_width-left
        elif option == 2:
            if padding is None:
                top = bottom = left = right = 0
            else:
                top, bottom, left, right = padding
        else:
            raise ValueError("undefiend option")
        ret = cv2.copyMakeBorder(small_size_img, top, bottom, left, right, borderType=borderType, value=value)
        return ret

    def im_augmentation(self, img=None, background=None, background_option=0, rotation_degree=None, flip_option=None, size_constraint=False):
        if img is None:
            img = self.image
        cols, rows, *channels = img.shape
        ret = copy.deepcopy(img)
        if rotation_degree is not None:
            if len(channels)==0:
                plus_one = np.ones((cols, rows), np.uint8)
            else:
                plus_one = np.ones((cols, rows, channels[0]), np.uint8)
            ret = self.im_plus(origin=ret, other=plus_one)
            ret = self.im_rotate(img=ret, degree=rotation_degree)
        if flip_option is not None:
            ret = self.im_flip(img=ret, option=flip_option)
        if background is not None:
            ret = self.im_background(background=background, img=ret, option=background_option)
        if size_constraint:
            ret = self.im_resize(img=ret, x=rows, y=cols)
        return ret

    def im_rotate(self, img=None, degree=90):
        '''
        - description: rotate counterclockwise without cropping
        '''
        if img is None:
            img = self.image
        cols, rows, *channels = img.shape
        new_row = math.ceil(np.sqrt(rows**2+cols**2))
        if len(channels) == 0:
            background = np.zeros((new_row, new_row), np.uint8)
        else:
            background = np.zeros((new_row, new_row, channels[0]), np.uint8)
        padded_img = self.im_padding(background, img)
        rotated_img = imutils.rotate(padded_img, degree)
        return rotated_img

    def im_crop(self, img=None):
        if img is None:
            img = self.image

    def im_flip(self, img=None, option=0):
        '''
        - option
            - 0: filp over x-axis
            - 1: filp over y-axis
            - -1: filp over Origin(원점)
        '''
        if img is None:
            img = self.image
        return cv2.flip(img, option)

    def im_translate(self, img=None, x=0, y=0):
        if img is None:
            img = self.image
        return imutils.translate(img, x, y)

    def im_shear(self, img=None):
        if img is None:
            img = self.image

    def im_background(self, background, img=None, padding=None, option=0):
        if img is None:
            img = self.image
        cols, rows, *channels = img.shape
        # hole = np.zeros((cols,rows))
        # if option == 1:
        #     option = 2
        #     adding_height = background.shape[0] - cols
        #     adding_width = background.shape[1] - rows
        #     top = random.randint(1, adding_height)
        #     bottom = adding_height-top
        #     left = random.randint(1, adding_width)
        #     right = adding_width-left
        #     padding = (top, bottom, left, right)
        padded_img = self.im_padding(background, img, padding=padding, option=option)
        is_it_background = padded_img==0
        # padded_hole = self.im_padding(background, hole, value=1, padding=padding, option=option)
        background_hole = background*is_it_background
        ret = self.im_plus(background_hole, padded_img)
        return ret

    def im_perspective(self, origin_points, img=None, new_width=None, new_height=None):
        if img is None:
            img = self.image
        if new_width is None:
            new_width = img.shape[1]
        if new_height is None:
            new_height = img.shape[0]
        new_points = [[0,0], [width, 0], [height, 0], [width, height]]
        M = cv2.getPerspectiveTransform(np.float32(origin_points), np.float32(new_points))
        ret = cv2.wrapPerspective(img, M, dsize=(new_width, new_height))
        return ret