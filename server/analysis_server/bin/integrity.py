__image_format__ = ("png", "jpg", "jpeg",)

def image_checker(image):
    extention = image.split(".")[-1]
    extention = extention.lower()
    if extention not in __image_format__:
        return False

    return True

def isbn_checker(isbn):
    if len(isbn) != 13:
        return False
    try:
        checker = 0
        for i, digit in enumerate(isbn[:-1]):
            if i%2==0:
                checker += int(digit)
            else:
                checker += 3*int(digit)
        checker = 10-checker%10
        if checker == 10:
            checker = 0
        if int(isbn[-1]) != checker:
            print(f"{isbn}: {int(isbn[-1])} != {checker}")
            return False
    except ValueError as e:
        print(f"{isbn}: {e}")
        return False
    return True

def model_checker(model, cluster_type):
    prefix = len(cluster_type)
    if model[:prefix] != cluster_type:
        return False
    if model[-4:] != ".pkl":
        return False
    return True

def restful_checker(code):
    if code < 200:
        return False
    if code >= 300:
        return False
    return True