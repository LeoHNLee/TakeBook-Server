'''
- input: num_of_images, origin_path, background_path, save_path
'''

try:
    import warnings, os, sys, random
    warnings.filterwarnings('ignore')
    import cv2
    import im_book
except ImportError as e:
    print("Error: "+str(e))
else:
    class NotProperQuery(Exception):
        pass

    def main(args):
        try:
            try:
                _, num_of_images, origin_path, background_path, save_path, *is_proper_args = args
            except ValueError as e:
                return 'Error: '+'too_less_input'
            try:
                if len(is_proper_args)>0:
                    raise NotProperQuery('too_many_input')
            except NotProperQuery as e:
                return 'Error: '+str(e)

            origin_img = im_book.ImageHandler(img_path=origin_path, path_type="local")

            backgrounds = {}
            for background in os.listdir(background_path):
                tmp = im_book.ImageHandler(img_path=background_path+background, path_type="local")
                backgrounds[background[:-4]] = tmp.image
            bg_lists = list(backgrounds.keys())

            for i in range(int(num_of_images)):
                background = backgrounds[random.choice(bg_lists)]
                rotation_degree = random.randint(-90,90)
                tmp = origin_img.im_augmentation(img=None, background=background, background_option=1, rotation_degree=rotation_degree, flip_option=None, size_constraint=False)
                cv2.imwrite(save_path+str(i)+".jpg", tmp)

        except Exception as e:
            return "Error: "+str(e)

    ret = main(sys.argv)
    print(ret)