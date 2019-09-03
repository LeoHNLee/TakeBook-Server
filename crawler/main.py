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
import pymysql
import datetime


# db에 data저장
def insert_into_database(curs, book):

    sql = """insert into book
         values (%s, %s, %s, %s, %s, %s, %s,%s,%s,%s, %s, %s, %s)"""

    try:
        curs.execute(sql, (book['isbn'], book['title'], book['author'],
                           book['publisher'],book['published_date'], book['category'], 
                           book['price'],book['image_url'], book['alladin_url'],
                           None, None, book['contents'],
                           book['discriptions']))
        conn.commit()
        
        print(f'{book["isbn"]}: is success!')
    except pymysql.err.IntegrityError:
        print(f'{book["isbn"]}: Already exists')
    except TypeError as e:
        print(f'{book["isbn"]}: Data is not complete')
    except Exception as e:
        print(e)


def combine_book_data(library_book, aladin_book):
    book = {}
    book['isbn'] = library_book['isbn']
    book['title'] = library_book['title']
    book['author'] = library_book['author']
    book['publisher'] = library_book['publisher']
    book['published_date'] = library_book['published_date']

    if aladin_book.get('author') is not None:
        book['author'] = aladin_book.get('author')

    book['alladin_url'] = aladin_book['alladin_url']
    book['contents'] = aladin_book['contents']
    book['discriptions'] = aladin_book['discriptions']
    book['category'] = aladin_book['category']
    book['image_url'] = aladin_book['image_url']
    book['price'] = aladin_book['price']

    return book



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

    query_count = 94997

    while(published_date != tomorrow):
        date = str(published_date).replace('-', '')
        # 해당 date로 검색한 페이지에 검색된 책들의 최대 갯수 확인
        item_count = crawler.check_item_count(
            date, cert_key=system_parameters["library_key"])

        while page_no*(page_size-1) < item_count:
            logfile = open(system_parameters["state_file_path"], 'w')
            logfile.write(f'{date}{page_no}')
            logfile.close()

            library_books = crawler.get_library_book_info(
                published_date=date, page_no=page_no, page_size=page_size, cert_key=system_parameters['library_key'])

            for library_book in library_books:
                aladin_book = crawler.get_aladin_book_info(
                    isbn_no=library_book['isbn'], ttbkey=system_parameters['aladin_key'])
                
                query_count += 1
                # if aladin_book == 'daily_limt':
                #     print(aladin_book)
                #     return
                if aladin_book is not None:
                    book = combine_book_data(library_book,aladin_book)
                    insert_into_database(db_cursor, book)

                else:
                    print(library_book['isbn'] + " is falid")

                time.sleep(1)


                if query_count > 95000:
                    print("daliy query limit")
                    sys.exit()

            
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

    # MySQL Connection 연결
    conn = pymysql.connect(host=system_parameters["db_host"],
                           port=system_parameters["db_port"],
                           user=system_parameters['db_user'],
                           password=system_parameters["db_pw"],
                           db=system_parameters["db_name"],
                           charset='utf8')

    # cursor 설정
    db_cursor = conn.cursor()
    db_cursor.execute("set names utf8")
    conn.commit()
    

    main(system_parameters=system_parameters)
