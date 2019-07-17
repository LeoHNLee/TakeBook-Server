'''
-description:
-input: str img_path, str path_type
    - img_path: url, local path, s3 path
    - path_type: url, local, s3
-output: str predicted_img
'''

class NotProperQuery(Exception):
    pass

def main(args):
    # get node query
    try:
        try:
            _, img_path, path_type, *is_proper_args = args
        except ValueError as e:
            return 'Error: '+'too_less_input'
        try:
            if len(is_proper_args)>0:
                raise NotProperQuery('too_many_input')
        except NotProperQuery as e:
            return 'Error: '+str(e)

        img = im_book.ImageHandler(img_path=img_path, path_type=path_type)
        model = im_book.BookClassification()
        ret = model.predict(img.image)
        return ret
    except Exception as e:
        return 'Error: '+str(e)

if __name__ == "__main__":
    try:
        import sys, os, warnings
        warnings.filterwarnings('ignore')
        import im_book
    except Exception as e:
        print('Error: '+"During Import Libraries"+str(e))
    else:
        ret = main(sys.argv)
        print(ret)