def predict_viz_vocab(feature):
    '''
    -Description:
    -Input: feature shape
    -Output:
    '''
    pred = ""
    while 1:
        try:
            temp = globals()[f"{cluster_type}{pred}"].predict([feature])[0]
            pred += alphabet_matcher[temp]
        except KeyError:
            return pred

class HKMModel:
    '''
    -Descriptor:
    -Input:
    -Output:
    '''
    alphabet_matcher={0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J', 10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T', 20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z'}
    alphabet_matcher_inv={'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25, '': ''}
    
    def __init__(self, parent, logger, is_mini_batch=False, data=None, which_cluster=None, file_path=None):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        self.logger = logger
        self.file_path = file_path
            
        self.which_cluster = which_cluster
        self.is_mini_batch = is_mini_batch
            
        self.parameters = parent.parameters
        self.K = self.parameters["K"]
        self.max_leaf_features = self.parameters["max_leaf_features"]
        self.min_leaf_features = self.parameters["min_leaf_features"]
        self.n_init = self.parameters["n_init"]
        self.max_iter = self.parameters["max_iter"]
        self.random_state = self.parameters["random_state"]
        self.batch_size = self.parameters["batch_size"]
        
        self.parent = parent
        self.H = parent.H
        self.my_H = parent.my_H + 1
        self.is_leaf = False
            
        # check the 
        if self.H == self.my_H:
            self.is_leaf = True
        elif self.H < self.my_H:
            raise Exception("-")
        else:
            pass
            
        # get data from parent cluster
        if data is not None:
            self.data = data
        elif not self.is_leaf:
            self.data = parent.classify(which_cluster=self.which_cluster)
        else:
            self.data = None
            
        # get number of data
        if self.data is None:
            self.my_N = None
        else:
            self.my_N = self.data.shape[0]
            
        # check my_N < min??
        if self.my_N is None:
            pass
        elif self.my_N < self.min_leaf_features:
            self.is_leaf = True
        else:
            pass
                
    def train(self, debug_flag=False):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        if self.is_leaf:
            return 
        self.logger.logging(f"{self} start_train", debug_flag=debug_flag)
        start_time = time.time()
            
        if self.is_mini_batch:
            self.model = MiniBatchKMeans(n_clusters=self.K, 
                                        batch_size=self.batch_size, 
                                        n_init=self.n_init, 
                                        max_iter=self.max_iter, 
                                        random_state=self.random_state,
                                        ).fit(self.data)
        else:
            self.model = KMeans(n_clusters=self.K, 
                                n_init=self.n_init, 
                                max_iter=self.max_iter, 
                                random_state=self.random_state,
                                ).fit(self.data)
            
        end_time = f"{(time.time()-start_time)/60}분"
        self.logger.logging(f"{self} finish_train {end_time}", debug_flag=debug_flag)

        # save model
        try:
            self.save()
        except Exception as e:
            self.logger.logging(f"{self} ERROR during model save: {e}")
            self.parent.model_del_trigger = False
        
        self.children = list(k for k in range(self.K))
        self.model_del_trigger = True
        for child in self.children:
            # child file path
            child_alphabet = alphabet_matcher[child]
            if self.file_path is None:
                file_path = None
            else:
                path_parse = self.file_path.split("/")
                dir_path = "/".join(path_parse[:-1])
                fn_parse = path_parse[-1].split(".")
                file_name = f"{fn_parse[0]}{child_alphabet}.{fn_parse[-1]}"
                file_path = f"{dir_path}/{file_name}"
            child_model = HKMModel(parent=self, 
                                    is_mini_batch=False, 
                                    which_cluster=child, 
                                    logger=self.logger,
                                    file_path=file_path,
                                  )
            child_model.train()
            self.children[child] = child_model
        
        # save memory
        del self.data
        if self.model_del_trigger:
            del self.model

    def predict(self, data, debug_flag=True):
            '''
            -Descriptor:
            -Input:
            -Output:
            '''
            self.logger.logging(f"{self} start_prdict", debug_flag=debug_flag)
            start_time = time.time()
            
            ret = self.model.predict([data])[0]
            
            end_time = f"{(time.time()-start_time)/60}분"
            self.logger.logging(f"{self} finish_predict {end_time}", debug_flag=debug_flag)

            return ret
        
    def classify(self, which_cluster, debug_flag=True):
            '''
            -Descriptor:
            -Input:
            -Output:
            '''
            self.logger.logging(f"{self} start_classify", debug_flag=debug_flag)
            start_time = time.time()
            
            ret = self.data[self.model.labels_==which_cluster]
                        
            end_time = f"{(time.time()-start_time)/60}분"
            self.logger.logging(f"{self} finish_classify {end_time}", debug_flag=debug_flag)

            return ret
        
    def save(self, file_path=None, debug_flag=False):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        # check file_path
        if file_path is None:
            file_path = self.file_path
            
        self.logger.logging(f"{self} start_save", debug_flag=debug_flag)
        start_time = time.time()
        with open(file_path, "wb") as fp:
            pickle.dump(self.model, fp)
            
        end_time = f"{(time.time()-start_time)/60}분"
        self.logger.logging(f"{self} finish_save {end_time}", debug_flag=debug_flag)
                
class HierarchicalKMeans:
    '''
    -Descriptor:
    -Input:
    -Output:
    '''
    def __init__(self, parameters, n_size=None, file_name=None, dir_path=None, verbose=False, debug=False):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        self.parameters = parameters
        self.K = self.parameters["K"]
        self.max_leaf_features = self.parameters["max_leaf_features"]
        
        if n_size is None:
            pass
        else:
            # get total hierarchy
            hierarchy = 0
            while n_size > self.max_leaf_features:
                hierarchy += 1
                n_size//=self.K
            if hierarchy>4: hierarchy=4

            # 
            self.H = hierarchy
            self.my_H = 0
            self.N = n_size
        
        self.file_name = file_name
        self.dir_path = dir_path
        self.logger = Logger(verbose=verbose, debug=debug)

    def train(self, data, is_mini_batch=True, dir_path=None, file_name=None,):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        if file_name is None:
            file_name = self.file_name
        if dir_path is None:
            dir_path = self.dir_path
        if dir_path is None or file_name is None:
            raise ArgumentError(f"HierarchicalKMeans(dir_path={dir_path}, file_name={file_name})")
        
        self.models = HKMModel(parent=self, 
                                is_mini_batch=is_mini_batch, 
                                data=data,
                                file_path=f"{dir_path}{file_name}.pkl",
                                logger=self.logger,
                              )
        self.models.train()
        
    # def load(self, dir_path=None, file_name=None,):
    #     '''
    #     -Descriptor:
    #     -Input:
    #     -Output:
    #     '''
    #     self.logger.logging(f"{self} start_classify", debug_flag=debug_flag)
    #     start_time = time.time()
        
    #     # check model paths
    #     if dir_path is None:
    #         dir_path = self.dir_path
    #     if file_name is None:
    #         file_name = self.file_name
    #     if dir_path is None or file_name is None:
    #         raise ArgumentError(f"HierarchicalKMeans(dir_path={dir_path}, file_name={file_name})")
        
        
        
    #     end_time = f"{(time.time()-start_time)/60}분"
    #     self.logger.logging(f"{self} finish_save {end_time}", debug_flag=debug_flag)