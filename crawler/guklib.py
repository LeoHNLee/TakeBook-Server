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
conn = pymysql.connect(host='1.201.136.108', port=3306, user='root', password='92064aaB!!',
                       db='web_scrap_db', charset='utf8mb4')
# cursor 설정
db_cursor = conn.cursor()

def get_book(start_date, end_date):
    url = f"http://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key=9feaa6583980cb950aa17f9b33b30b67&result_style=xml&page_no=1&page_size=10&start_publish_date={start_date}&end_publish_date={end_date}"
    html_source = requests.get(url = url)
    bs_obj = BS(html_source.content, "xml")
    docs = bs_obj.find_all("e")

    for doc in docs:
        title = doc.select_one("TITLE").text
        isbn = doc.select_one("EA_ISBN").text
        book = get_aladin(isbn)
        #if book != None:
        #    insert_data(db_cursor,book)
        print(title + " | " + isbn)
        time.sleep(1)

    print(f"{start_date}, {end_date} ::: success")

def get_aladin(isbn_no):
    url = f"http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=ttbguide942248001&itemIdType=ISBN13&ItemId={isbn_no}&output=xml"
    html_source = requests.get(url = url)
    bs_obj = BS(html_source.content, "xml")

    try:
        link = bs_obj.find_all("link")
        for l in link:
            print(l.text)

        title = bs_obj.select_one("title").text
        sub_title = bs_obj.select_one("subTitle").text
        pub_date = bs_obj.select_one("pubDate").text
        author = bs_obj.select_one("author").text
        isbn13 = bs_obj.select_one("isbn13").text
        price_standard = bs_obj.select_one("priceStandard").text
        price_sales = bs_obj.select_one("priceSales").text
        category_id = bs_obj.select_one("categoryId").text
        category_name = bs_obj.select_one("categoryName").text
        item_page = bs_obj.select_one("itemPage").text
        toc = bs_obj.select_one("toc").text

        print(title)
        print(sub_title)
        print(pub_date)
        print(author)
        print(isbn13)
        print(price_standard)
        print(price_sales)
        print(category_id)
        print(category_name)
        print(item_page)
        print(toc)

        print(f"{isbn_no} ::: success")
        li = {}
        li["title"] = title
        li["sub_title"] = sub_title
        li["author"] = author
        li["isbn13"] = isbn13
        li["price_standar"] = price_standard
        li["price_sales"] = price_sales
        li["category_id"] = category_id
        li["category_name"] = category_name
        li["item_page"] = item_page
        li["toc"] = toc

        return li

    except Exception:
        print(f"{isbn_no} ::: exception")
        return None

        # db에 data저장
def insert_data(curs, book):

    sql = """insert into book
         values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    
    try:    
        curs.execute(sql, (book['title'], book['author'], " ",
                       " ", " ", " ",
                       " ", " ",book['category_name'],
                        book['sub_title'], 
                           book['toc'], 
                           book['isbn13']))
        conn.commit()
    except pymysql.err.IntegrityError:
        print("Already exists")
    except TypeError:
        print("Data is not complete")

i = 0

#while i < 10:
#    start_date = datetime.date(2015, 1, 1)
#    
#    print(f"{start_date.year}")
#    i += 1

get_book(20190102, 20190102)

