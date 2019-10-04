import boto3

bucket = 'red-bucket'
s3 = boto3.resource('s3')
s3.meta.client.download_file(Bucket = bucket, Key = 'ImageURL.csv', Filename = 'myfile.csv')