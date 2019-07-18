try:
    import warnings, os, sys
    warnings.filterwarnings('ignore')
    import cv2
    import im_book
except ImportError as e:
    print("Error: "+str(e))
else:
    def Main(args):
        try:
            try:
                _, img_path, path_type, *options = args
            except ValueError as e:
                return 'Error: '+'too_less_input'
            try:
                if len(is_proper_args)>0:
                    raise NotProperQuery('too_many_input')
            except NotProperQuery as e:
                return 'Error: '+str(e)

            origin_img = im_book.ImageHandler(img_path=img_path, path_type=path_type)
   
            args = {}
            args["background"] = 
            # background=None, background_option=0, rotation_degree=None, rotation_size_contraint=False
            origin_img.im_augmentation()

        except Exception as e:
            return "Error: "+str(e)

    
    im_book.im_augmentation()

    ret = Main(sys.argv)
    print(ret)