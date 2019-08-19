# from collections import OrderedDict
import json
import os.path
import datetime
import warnings
import os
import sys
import time
import random
import crawler
import boto3
import botocore

# db에 data저장
def insert_into_database(book):

    #table name 설정
    table = dynamodb.Table('book')

    Item={}

    # 속성 순서
    values = ['isbn','title','published_date','author','translator','publisher','url_alladin','image_url','contents','discriptions']

    for value in values:
        if book[value] !='':
            Item[value]= book[value]

    try:
        table.put_item(Item=Item,Expected={
            'isbn':{
                "Exists":False
            }
        })
        print(f'{book["isbn"]}: is success!')

    except botocore.exceptions.ClientError as e:
        error_name = e.response['Error']['Code']
        if error_name == 'ValidationException':
            print(e)
        else:
            print(f'{book["isbn"]}: Already exists')
    except Exception as e:
        print(e)
    
# 메인함수
def main(system_parameters, page_size=10):

    # 이전 상태 불러오기
    statefile = open(system_parameters['state_file_path'], 'r')
    state = statefile.readline()

    # 초기 날짜
    year = int(state[:4])
    month = int(state[4:6])
    day = int(state[6:8])
    page_no = int(state[8:])
    published_date = datetime.date(year, month, day)
    print(f'load published_date: {year} {month} {day}  page_no: {page_no}')

    # 현재 기준 내일 시간
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)

    statefile.close()

    while(published_date != tomorrow):
        date = str(published_date).replace('-', '')
        # 해당 date로 검색한 페이지에 검색된 책들의 최대 갯수 확인
        item_count = crawler.check_item_count(
            date, cert_key=system_parameters["library_key"])

        while page_no*(page_size-1) < item_count:
            logfile = open(system_parameters["state_file_path"], 'w')
            logfile.write(f'{date}{page_no}')
            logfile.close()

            books = crawler.get_library_book_info(
                published_date=date, page_no=page_no, page_size=page_size, cert_key=system_parameters['library_key'])

            for book in books:
                aladin_book = crawler.get_aladin_book_info(
                    isbn_no=book['isbn'], ttbkey=system_parameters['aladin_key'])
                if aladin_book == 'daily_limt':
                    print(aladin_book)
                    return
                elif aladin_book is not None:
                    if aladin_book.get('author') is not None:
                        book['author'] = aladin_book.get('author')

                    book['url_alladin'] = aladin_book['url_alladin']
                    book['translator'] = aladin_book['translator']
                    book['contents'] = aladin_book['contents']
                    book['image_url'] = aladin_book['image_url']
                    book['discriptions'] = crawler.get_kyobo_book_descriptions(
                        book['isbn'])
                    # insert_into_database(db_cursor, book)
                    insert_into_database(book)
                else:
                    print(book['isbn'] + " is falid")

                time.sleep(1)

            page_no += 1

        page_no = 1
        published_date += datetime.timedelta(days=1)


if __name__ == "__main__":

    # 현제 경로
    current_path = os.path.dirname(os.path.abspath(__file__))

    system_parameters = {}

    # key 정보 가져오기
    with open(f'{current_path}/config/config.json') as json_file:
        json_data = json.load(json_file)
        for key in json_data:
            system_parameters[key] = json_data[key]

    system_parameters["state_file_path"] = current_path+'/config/save_state'

    # database 설정
    dynamodb = boto3.resource('dynamodb',
                            aws_access_key_id=system_parameters["access_key_id"],
                            aws_secret_access_key=system_parameters["secret_access_key"],
                            region_name=system_parameters['region_name'])

    main(system_parameters=system_parameters)
