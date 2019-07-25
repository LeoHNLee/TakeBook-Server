from bs4 import BeautifulSoup as BS
from collections import OrderedDict
import datetime
import requests
import random
import warnings, os, sys
import time
import json
import pymysql
warnings.filterwarnings('ignore')
file_data = OrderedDict()

# MySQL Connection 연결
conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password='92064aaB!!',
                       db='read_db', charset='utf8mb4')
# cursor 설정
db_cursor = conn.cursor()


def print_book_info(book):
    for i in book:
        print(f'{i}: {book[i]}')

def check_item_count(published_date):
    # 출판 날짜에 해당하는 국립중앙도서관 책 권수를 구해주는 함수
    # 
    # @ param   published_date: 출판 날짜
    # @ return  page_no: 출판 날짜에 해당하는 책 수

    url = f"http://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=9feaa6583980cb950aa17f9b33b30b67&ebook_yn=N&result_style=xml&page_no=1&page_size=10&start_publish_date={published_date}&end_publish_date={published_date}"
    html_source = requests.get(url = url)
    bs_obj = BS(html_source.content, "xml")
    item_count = bs_obj.select_one("TOTAL_COUNT").text
    return int(item_count)

def get_book(published_date,page_no,page_size):
    # 도서정보 긁어오기
    # 
    # @ param   published_date 출판 날짜, page_no: api 크롤링 페이지 넘버 ,page_size: api 크롤링 한 페이지당 표시할 책 갯수
    # @ return ##
    # @ exception 예외사항

    url = f"http://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=9feaa6583980cb950aa17f9b33b30b67&ebook_yn=N&result_style=xml&page_no={page_no}&page_size={page_size}&start_publish_date={published_date}&end_publish_date={published_date}"
    html_source = requests.get(url = url)
    bs_obj = BS(html_source.content, "xml")
    docs = bs_obj.find_all("e")

    for doc in docs:
        isbn = doc.select_one('EA_ISBN').text
        if isbn == '':
            isbn = doc.select_one('SET_ISBN').text
        book = get_aladin_book_info(isbn)
        if book != None:
            book['title'] = doc.select_one("TITLE").text
            book['isbn'] = isbn
            book['author'] = doc.select_one("AUTHOR").text
            book['publisher'] = doc.select_one("PUBLISHER").text
            book['published_date'] = published = doc.select_one("PUBLISH_PREDATE").text
            book['discriptions'] = get_kyobo_book_information(isbn)
            # print_book_info(book)
            insert_into_database(db_cursor,book)

        else:
            print(f'{isbn}: is failed')
        
        time.sleep(1)

def get_aladin_book_info(isbn_no):
    # isbn을 통하여 알라딘에 api를 검색하여 정보를 추출
    # 
    # param     isbn: 검색할 isbn
    # return    book: 검색한 정보들의 딕셔너리
    # book:  link, author, translator, publisher, category_id, category_name, toc, image_url
    url = f"http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=ttbguide942248001&itemIdType=ISBN13&ItemId={isbn_no}&output=xml"
    html_source = requests.get(url = url)
    bs_obj = BS(html_source.content, "xml")

    try:
        # 해당 아이템 링크
        link = bs_obj.find_all("link")
        item_link = link[0].text

        # 옮긴이 가져오기
        authors = bs_obj.select_one("authors")
        authors = authors.find_all('author')
        translator = ''
        for data in authors:
            if data['authorType'] == 'translator':
                translator = data.text

        # price_standard = bs_obj.select_one("priceStandard").text
        # price_sales = bs_obj.select_one("priceSales").text
        category_id = bs_obj.select_one("categoryId").text
        category_name = bs_obj.select_one("categoryName").text
        # 목차
        toc = bs_obj.select_one("toc").text
        toc = processing_text(str(toc))

        get_html_source = requests.get(url = item_link)
        # BeautifulSoup Object: html parsing
        bs_obj = BS(get_html_source.content, "html.parser")

        image_url = bs_obj.find("img",{"id":"CoverMainImage"})['src']

        book={}
        book["url_alladin"] = item_link                     
        book["translator"] = translator         
        book["category_id"] = category_id
        book["category_name"] = category_name
        book["contents"] = toc
        book["image_url"] = image_url

        return book

    except Exception:
        return None

def get_kyobo_book_information(item_id):
    url = f"http://www.kyobobook.co.kr/product/detailViewKor.laf?barcode={item_id}"

    result = requests.get(url=url)
    bs_obj = BS(result.content, "html.parser")

    # 도서 내용을 가지고 있는 container
    content_middle = bs_obj.findAll("div", {"class": "content_middle"})

    # 책 소개부분 주석을 통해 잘라내기

    try:
        book_content_intro = content_middle[3]
        book_intro = str(book_content_intro)
        book_intro_start = book_intro.find("<!-- *** s:책소개 *** -->")
        book_intro_end = book_intro.find("<!-- *** //e:책소개 *** -->")
        book_intro = book_intro[book_intro_start+len("<!-- *** s:책소개 *** -->") :book_intro_end]

        # 필요없는 부분 잘라내기
        bs_obj = BS(book_intro, "html.parser")
        book_content = bs_obj.find("div", {"class": "box_detail_article"})
        book_content = str(book_content.text).strip()

        return book_content
    except IndexError:
        return ''
    except Exception:
        return ''

# db에 data저장
def insert_into_database(curs, book):

    sql = """insert into book
         values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    
    try:    
        curs.execute(sql, (book['isbn'], book['title'], book['published_date'],
                       book['author'], book['translator'], book['publisher'],
                       book['url_alladin'],book['image_url'],book['contents'],
                        book['discriptions']))
        conn.commit()
        print(f'{book["isbn"]}: is success!')
    except pymysql.err.IntegrityError:
        print(f'{book["isbn"]}: Already exists')
    except TypeError:
        print(f'{book["isbn"]}: Data is not complete')

def processing_text(text):
    # 텍스트에 불필요한 부분을 삭제
    # 
    # @param text 가공이 필요한 텍스트
    # @return text 가공된 텍스트
    text = text.replace('<BR>','')
    text = text.replace('<B>','')
    text = text.replace('</B>','')
    text = text.replace('<p>','')
    text = text.replace('</p>','')
    text = text.replace('&lt;','')
    text = text.replace('&gt;','')
    text = text.replace('<br />','')
    text = text.replace('<b>','')
    text = text.strip()

    return text

# 메인함수
def main():
    state_file_path = '/Users/bsh/Documents/git_directory/p1039_red/crawler/save_state'

    # 이전 상태 불러오기
    statefile = open(state_file_path, 'r')
    state = statefile.readline()

    # 실행횟수
    count = 0
    maxcount =2000
    # 한번에 불러올 책 수 
    page_size = 10  # 이건 최대한 안건드는 걸루
    page_no =  int(state[8:])
    # 초기 날짜
    year = int(state[:4])
    month = int(state[4:6])
    day = int(state[6:8])
    print(f'load published_date: {year} {month} {day}  page_no: {page_no}')
    published_date = datetime.date(year, month, day)
    #현제 기준 내일 시간
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)

    statefile.close()

    
    while(published_date != tomorrow):
        date = str(published_date).replace('-','')
        item_count = check_item_count(date) 

        while page_no*(page_size-1) < item_count:
            logfile = open(state_file_path,'w')
            logfile.write(f'{date}{page_no}')
            logfile.close()

            get_book(date,page_no, page_size)
            page_no+=1
            count+=1

            if count == maxcount:
                break

        page_no =1
        published_date+=datetime.timedelta(days=1)
        if count == maxcount:
            break

    logfile.close()
        

main()


