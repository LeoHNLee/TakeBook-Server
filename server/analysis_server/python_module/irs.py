import cv2
import warnings, os
warnings.filterwarnings("ignore")
import numpy as np
from sklearn.cluster import KMeans
from sklearn.externals import joblib

def extract_total_feature(im_paths):
    im_paths = [im_paths+p for p in os.listdir(im_paths) if p[-4:]==".png"]
    surf = cv2.xfeatures2d.SURF_create(500)
    total_feature = np.zeros((1,64), dtype="float16")
    for path in im_paths:
        img = cv2.imread(path)
        _, descriptors = surf.detectAndCompute(img, None)
        total_feature = np.append(total_feature, descriptors.astype("float16"), axis=0)
    return total_feature

def construct_viz_vocab(total_feature, write_path):
    H = 0
    n_features = total_feature.shape[0]
    while n_features > 500:
        H += 1
        n_features//=9
    tails0 = [""]
    for i in range(1,H):
        locals()["tails"+str(i)] = []
        for j in range(1,10):
            locals()["tails"+str(i)] += [k+str(j) for k in locals()["tails"+str(i-1)]]
    locals()["kmeans"] = KMeans(n_clusters=9, random_state=666).fit(total_feature)
    joblib.dump(locals()["kmeans"], write_path+'kmeans.pkl')
    for i in range(1,H):
        for tail in locals()["tails"+str(i)]:
            locals()["total_feature"+tail] = locals()["total_feature"+tail[:-1]][locals()["kmeans"+tail[:-1]].labels_==(int(tail[-1])-1)]
            locals()["kmeans"+tail] = KMeans(n_clusters=9, random_state=666).fit(locals()["total_feature"+tail])
            joblib.dump(locals()["kmeans"+tail], write_path+'kmeans'+tail+'.pkl')
        for tail in locals()["tails"+str(i-1)]:
            del locals()["total_feature"+tail]
    return H

def predict_viz_vocab(feature):
    pred = ""
    while 1:
        try:
            temp = globals()["kmeans"+str(pred)].predict(feature)[0]
            pred += str(temp+1)
        except KeyError:
            return pred