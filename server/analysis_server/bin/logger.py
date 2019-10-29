import re
import time
from datetime import datetime as dt

class Logger:
    '''
    -Descriptor:
    -Input:
    -Output:
    '''
    text_compiler = re.compile("[^0-9]")

    def __init__(self, save_path, limit=10**4, verbose=False, debug=False):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        self.log = list()
        self.size = 0
        self.output_limit = limit
        self.output_path = save_path
        self.verbose = verbose
        self.debug = debug
        
    def logging(self, event, debug_flag=False):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        if debug_flag and not self.debug:
            pass
        time_stamp = int(time.time())
        time_stamp = str(dt.fromtimestamp(time_stamp))
        this_log = f"{time_stamp} {event}"
        self.log.append(this_log)
        self.size += 1

        # if log size over than output limitation, do output!
        if  self.size > self.output_limit:
            time_stamp = self.text_compiler.sub("", time_stamp)
            with open(f"{self.output_path}{time_stamp}.txt", "w") as fp:
                outputs = self.output()
                for output in outputs:
                    fp.write(output)

        # if verbose option, print write logs
        if self.verbose:
            print(this_log)
                
    def get(self):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        return self.log
        
    def output(self):
        '''
        -Descriptor:
        -Input:
        -Output:
        '''
        ret = self.get()
        del self.log
        self.log = list()
        return ret