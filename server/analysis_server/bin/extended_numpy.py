# Standard libraries
import re
import sys
import os

# Opensources
import numpy as np

# Own modules
from .exceptions import *

class ExtendedNumpy():
    '''
    -Descriptor: numpy 
    -Input:
    -Output:
    '''
    def __init__(self, capacity=10**6, dims=(64,), logger=None):
        '''
        -Description:
        -Input:
        -Output:
        '''
        if type(capacity) != int:
            raise ArgumentError(f"[ArgumentError][ExtendedNumpy][__init__] type of capacity has to int: but {type(capacity)}")
        if type(dims) != tuple:
            raise ArgumentError(f"[ArgumentError][ExtendedNumpy][__init__] type of dims has to tuple: but {type(dims)}")
        if logger is None:
            raise ArgumentError(f"[ArgumentError][ExtendedNumpy][__init__] logger is necessary: but {logger}")
        
        shape = [capacity]
        for dim in dims:
            shape.append(dim)
        self.shape = tuple(shape)
        self.logger = logger
        self.capacity = capacity
        self.data = np.zeros(self.shape, dtype="float32")
        self.now_size = 0

    def append(self, rows):
        '''
        -Description:
        -Input:
        -Output:
        '''
        if rows is None:
            raise ValueError(f"[ValueError][ExtendedNumpy][append] rows is neccessary: but {rows})")
        
        for row in rows:
            self.append_one(row)

    def append_one(self, row):
        '''
        -Description:
        -Input:
        -Output:
        '''
        if self.now_size == self.capacity:
            self.capacity *= 2
            self.shape = (self.capacity, 64)
            new_data = np.zeros(self.shape, dtype="float32")
            new_data[:self.now_size] = self.data
            self.data = new_data
            log_message = f"[FINISH][ExtendedNumpy][append_one] extend capacity: new_capacity={self.capacity}, new_shape={self.shape}"
            self.logger.logging(log_message, debug_flag = True)

        self.data[self.now_size] = row
        self.now_size += 1

    def get(self):
        '''
        '''
        ret = self.data[:self.now_size]
        return ret
    
    def save(self, path):
        '''
        '''
        log_message = f"[START][ExtendedNumpy][save]"
        self.logger.logging(log_message, debug_flag = True)
        ret = self.get()
        np.save(path, ret)
        log_message = f"[FINISH][ExtendedNumpy][save]"
        self.logger.logging(log_message, debug_flag = False)

    def load(self, path):
        '''
        '''
        log_message = f"[START][ExtendedNumpy][load]"
        self.logger.logging(log_message, debug_flag = True)
        self.data = np.load(path)
        self.shape = self.data.shape
        self.now_size = self.shape[0]
        self.capacity = self.now_size * 2
        log_message = f"[FINISH][ExtendedNumpy][load]"
        self.logger.logging(log_message, debug_flag = False)