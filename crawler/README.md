# swm10-red


## 사용법
* config 폴더를 생성하여 2개의 파일을 만들어 줘야함.
    * config.json
        {
            "db_host":"host name",
            "db_port": port,
            "db_user":"db_id",
            "db_pw":"db_pw",
            "db_name":"db_name",
            "library_key":"국립중앙도서관 api 검색 key",
            "aladin_key": "알라딘 api 검색 key"
        }
    * save_state
        * 텍스트값 1줄 ex> 2015011032
        * 앞 8자리는 책 출판 날짜를 나타냄
        * 나머지 숫자는 api검색 페이지의 page_no를 나타냄