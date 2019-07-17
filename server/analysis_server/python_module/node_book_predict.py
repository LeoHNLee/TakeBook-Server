class Not_proper_query(Exception):
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
                raise Not_proper_query('too_many_input')
        except Not_proper_query as e:
            return 'Error: '+str(e)

        img = bclf.image_handler(img_path=img_path, path_type=path_type)
        model = bclf.book_classification()
        ret = model.predict(img.image)
        return ret
    except Exception as e:
        return 'Error: '+str(e)
if __name__ == "__main__":
    try:
        import sys, os, warnings
        warnings.filterwarnings('ignore')
        import book_classification as bclf
    except Exception as e:
        print('Error: '+"During Import Libraries"+str(e))
    else:  
        ret = main(sys.argv)
        print(ret)