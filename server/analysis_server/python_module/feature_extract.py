import os
import json
import pandas as pd
import numpy as np
from im_book import BookRecognizer, ImageHandler, TextHandler
from exceptions import *

# book DB에서 새로운 정보를 긁어왔다고 가정하자. 일단 하루에 한 번 실행
# 크롤러가 그날의 크롤링이 끝나면 크롤링된 데이터를 DB로부터 리스트업한다.
surf_total_feature_file = ""
features_dir = ""
new_data_file = ""

with open(new_data_file, "rb") as fp:
    new_datas = pd.read_csv(fp)
isbns = new_datas.isbn
urls = new_datas.image_url
################
# 기타 feature들
################

model = BookRecognizer()

new_surf_features = []

for isbn, url in zip(isbns, urls):
    try:
        image = ImageHandler(img_path = url, path_type = "url")
    except URLError as e:
        ##############
        # need logging
        ##############
        continue
    try:
        features = model.predict(img = image.image, text_lang=("kor", "eng",), features=("text", "image",), image_options=("SURF",))
    except ArgumentError as e:
        ##############
        # need logging
        ##############
        continue
    raw_features = {
        "features": features,
    }
    with open(f"{features_dir}{isbn}.json", "w") as fp:
        json.dump(raw_features, fp)

    surf_feature = features["image"]["SURF"]
    if len(surf_feature)<1:
        continue
    new_surf_features += surf_feature

with open(surf_total_feature_file, "rb") as fp:
    surf_total_features = np.load(fp)
new_surf_features = np.array(new_surf_features, dtype="float32")
surf_total_features = np.append(surf_total_features, new_surf_features, axis=0)
with open(surf_total_feature_file, "wb") as fp:
    np.save(fp, surf_total_features)