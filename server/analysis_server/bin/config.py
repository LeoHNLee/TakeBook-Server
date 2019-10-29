_alphabet = {
    "matcher": {0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J', 10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T', 20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z'},
    "matcher_inv": {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25, '': ''},
}

_train_job = {
    "paths":{
        "dir":{
            "all_features": "", # .json dir
            "models": "c:/swm10/dataset/surf3000_kmeans/",
        },
        "file":{
            "surf_total" : "c:/swm10/dataset/300000/surf.npy", # .npy
            "update": "", # .csv
        },
    },
    "parameters":{
        "cluster_type": "HKM",
        "K":26,
        "max_leaf_features":260,
        "min_leaf_features":78,
        "batch_size":10**7,
        "max_iter":20,
        "n_init":1,
        "random_state":666,
    },
}

_es_job = {
    "cluster":[{
            "host":"13.125.115.97",
            "port":9200,
        }],
    "index":"takebook-alpha-v1",
}

_mysql_job = {
    "connetion":{
        "host":"takebook-book-database.cbvv7ahxy6xy.ap-northeast-2.rds.amazonaws.com",
        "user":"admin",
        "password":"takebook",
        "db":"innodb",
        "charset":"utf8",
    },
    "query":{
        "table":"book",
        "columns": "title, image_url",
    },
}

_pred_job = {
    "image_options":{
        "SURF":{
            "n_features":3000,
            "feature_dims":False,
        },
        # "ORB":{

        # },
        # "BGR": {

        # },
    },
    "features": (
        "image", 
        # "text",
        ),
    "text_options": {
        "east_path": None,
        "langs": ("kor", "eng",),
    },
}

_assets = {
    "url":"https://takebook-answer-book-image.s3.ap-northeast-2.amazonaws.com/",
    "paths":{
        "dir":{
            "index_image":"c:/swm10/dataset/10000/",
            "query_image":"c:/swm10/dataset/real_145_hand/image/",
            "gt_image": "c:/swm10/dataset/300000/",
        },
        "file":{
            "all_features":"c:/swm10/dataset/image_text/hand_3000/all_features.pkl"
        }
    },
}