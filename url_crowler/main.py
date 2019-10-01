import pandas as pd
import boto3
import random
import requests
import time 
import os
import time
from datetime import datetime

path = os.path.dirname(os.path.abspath(__file__))

s3 = boto3.client('s3')
bucket = 'takebook-answer-book-image'

args = {
    'read_path': f'{path}/file/ImageURL.csv',
    'log_path': f'{path}/file/log.txt',
    'image_path': f'{path}/file/image',
    'mount_of_job': 2000
}

with open(args["log_path"], "r") as logs:
    latest_logs = logs.readlines()
    result_log = ""
    date_log, result_log, start_log, end_log = latest_logs[-1].split()


# set new index log
start_log = int(end_log)
end_log = int(end_log) + args["mount_of_job"] -1

# get urls and parse urls and isbns
url_df = pd.read_csv(args["read_path"])
isbns = url_df.iloc[start_log:end_log,0].values.tolist()
urls = url_df.iloc[start_log:end_log,1].values.tolist()
state_index = 0


for isbn, url in zip(isbns, urls):
    try:
        image_url = requests.get(url, allow_redirects=True)

        file_name = f'{args["image_path"]}/{isbn}.jpg'

        open(file_name, 'wb').write(image_url.content)

        with open(file_name, 'rb') as data:
            s3.upload_fileobj(data, bucket, f'{isbn}.jpg')

        os.remove(file_name)

        print(f"{isbn} success!!")
        state_index += 1
        time.sleep(random.uniform(1,1.7))
    except Exception as e:
        print(f"{isbn} fail...")
        result_log = str(e)
        result_log = result_log.replace(' ', '_')
        end_log = start_log+state_index -1
        break


# set date log
date_log = datetime.today()
date_log = str(date_log.year)+"-"+str(date_log.month)+"-"+str(date_log.day)+"-"+str(date_log.hour)+"-"+str(date_log.minute)+"-"+str(date_log.second)
        

# update log file
with open(args["log_path"], "a") as logs:
    latest_log = " ".join([date_log, result_log, str(start_log), str(end_log)])+"\n"
    logs.write(latest_log)

