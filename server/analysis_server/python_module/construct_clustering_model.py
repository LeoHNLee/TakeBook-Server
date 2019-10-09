import os
import joblib
import numpy as np
from sklearn.cluster import KMeans
from kmodes.kmodes import KModes

alphabet = ('A', 'B', 'C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',)
alphabet_matcher = {k:v for k, v in enumerate(alphabet)}
alphabet_matcher_inv = {k:v for v, k in enumerate(alphabet)}
alphabet_matcher_inv[""] = ""

total_feature_file = ""
model_dir = ""
K=26
cluster_type="kmeans"
min_leaf_features = 15
max_iter = 10
random_state = 666

# Load total features
with open(total_feature_file, "rb") as fp:
    total_feature = np.load(fp)

# Get Height of HKM
n_features = total_feature.shape[0]
H = 0
height_checker = min_leaf_features*k
while n_features > height_checker:
    H += 1
    n_features//=K

# Set tails
tails0 = [""]
for i in range(1,H):
    locals()[f"tails{str(i)}"] = []
    for j in range(K):
        j = alphabet_matcher[j]
        locals()[f"tails{str(i)}"] += [k+j for k in locals()[f"tails{str(i-1)}"]]

# Train Initial Cluster
if cluster_type == "kmeans":
    locals()[cluster_type] = KMeans(n_clusters=K, n_init=1, max_iter=20, random_state=666).fit(total_feature)
elif cluster_type == "kmodes":
    locals()[cluster_type] = KModes(n_clusters=K, n_init=1, max_iter=20, random_state=666).fit(total_feature)
else:
    raise ArgumentError(f"Not Found construct_viz_vocab parameter cluster_type: <{cluster_type}>")

with open(f"{model_dir}{cluster_type}.pkl", "wb") as fp:
    joblib.dump(locals()[cluster_type], fp)

for i in range(1,H):
    now_tails = locals()[f"tails{str(i)}"]
    for tail in now_tails:
        now_tail = alphabet_matcher_inv[tail[-1]]
        upper_cluster = locals()[f"total_feature{tail[:-1]}"]
        upper_model = locals()[f"{cluster_type}{tail[:-1]}"]
        now_cluster = upper_cluster[upper_model.labels_==now_tail]
        if cluster_type == "kmeans":
            locals()[f"{cluster_type}{tail}"] = KMeans(n_clusters=K, n_init=1, max_iter=max_iter, random_state=random_state).fit(now_cluster)
        elif cluster_type == "kmodes":
            locals()[f"{cluster_type}{tail}"] = KModes(n_clusters=K, n_init=1, max_iter=max_iter, random_state=random_state).fit(now_cluster)
        else:
            raise ArgumentError(f"Not Found construct_viz_vocab parameter cluster_type: <{cluster_type}>")
        locals()[f"total_feature{tail}"] = now_cluster

        with open(f"{model_dir}{cluster_type}{tail}.pkl", "wb") as fp:
            joblib.dump(locals()[f"{cluster_type}{tail}"], )

    upper_tails = locals()[f"tails{str(i-1)}"]
    for tail in upper_tails:
        del locals()[f"total_feature{tail}"]