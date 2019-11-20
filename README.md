# 제 10기 SW마에스트로 새빨간팀

## 구성원

이형남(팀장), 김성재, 배상현

멘토: 최광선, 정경민, 최정현, 조항준



# 책을 만나는 순간 '책을찍다'

사용자가 일일이 적어서 직접 입력할 필요 없이 촬영한 책 사진을 기반으로 책과 관련된 원하는 정보를 제공받고 바로 구매할 수 있는 서비스 입니다.



## 어떻게?

1. 사용자가 책, 스크랩 이미지를 촬영 -> 이미지 분석 및 검색으로 책 정보 등록
2. 등록된 책 클릭 -> 책에 대한 상세정보와 구매링크 연결!

## 디렉토리 구조

### crawler

도서정보를 크롤링 해오는 프로그램.

국립 중앙도서관, 알라딘 API, 교보문고 웹 크롤링을 통한 도서 데이터를 AWS RDS로 수집.



### Server

MSA(Microservice Architecture)적용하여 기능별 단위로 서비스를 나누어 총 4가지의 서버와 서버간 통신을 담당하는 Internal 서버로 구성되어 있음.
기술 스택: Node.js, Flask AWS RDS, AWS S3, Redis, Elasticsaerch, Tesseract

##### Account Server

사용자 정보를 관리하는 API서버

##### Analysis Server

이미지를 분석하여 결과값을 전송하는 API서버

##### Book Server

수집된 책 정보를 보여주는 API서버

##### Elasticsearch Server

수집된 책 정보를 사용자의 요청에따라 검색 해주는 API서버

##### Internal Server

각 서버간 요청을 담당하는 Internal API서버



### 그외 디렉토리



**log_collector**

각 서비스에 연결된 로그 수집기로부터 로그를 모아 파일로 저장하는 프로그램

**url_crowler**

클라우드에 저장되어있는 책 이미지를 배치잡을 통해 자동으로 다운로드를 하는 프로그램

**tessteract_file**

tessteract 설정을 위한 파일들의 집합



