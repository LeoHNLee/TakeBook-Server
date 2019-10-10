const moment = require('moment-timezone');

const mysql_pool = require('./mysql_pool');

let Method = {
    params_check: (params, check_list) => {
        // 입력받은 파라미터가 옳바른지 채크
        // @ param params: 채크하려는 파라미터
        // @ param check_list: 채크하려는 정보.
        // @ return 문제가 있는 param

        let result = null;

        for (let param in params) {
            if (params[param]) {
                if (!check_list[param].includes(params[param])) {
                    result = param;
                    break;
                }
            }
        }

        return result;
    },
    isnumber: (value)=> {
        // value 값이 숫자인지 아닌지 채크
        // @ param value: 채크하려는 string 값
        // @ return 숫자이면 true, 아니면 false
    
        value += ''; // 문자열로 변환
        value = value.replace(/^\s*|\s*$/g, ''); // 좌우 공백 제거
        if (value == '' || isNaN(value)) return false;
        return true;
    },
    trim_date: (datetime)=>{
        //mysql에서 나온 datetime를 다듬는다.
        // @ param datetime: 다듬으려는 datetime값
        // @ return 수정된 값.
    
        let trim_text = datetime.toISOString().slice(0, 19).replace('T', ' ');
        return trim_text;
    },
    current_time: ()=> {
        //현재시간 표시
        return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss:SSS');
    },
    email_parser:(user_id)=>{
        let text = user_id;
    
        if (text.indexOf('@') !== -1) {
            text = text.substring(0, text.indexOf('@'))
        }
        return text;
    },
    create_key: (user_id, datetime)=>{
        //replaceAll prototype 선언
        String.prototype.replaceAll = function (org, dest) {
            return this.split(org).join(dest);
        }
    
        let time = null;
        if (datetime) {
            time = datetime;
            let replace_list = ['-', ' ', ':'];
            for (let i in replace_list) {
                time = time.replaceAll(replace_list[i], '');
            }
    
        } else {
            time = moment().tz("Asia/Seoul").format('YYYYMMDDHHmmssSSS');
        }
    
        let key = `${Method.email_parser(user_id)}-${time}`;
        return key;
    },
    injoin_json_list: (join_key, list1, list2)=>{
    
        let join_list = [];
        for (let i in list1) {
            let result = Object.assign({}, list1[i], list2.find(item => item[join_key] == list1[i][join_key]))
            join_list.push(result)
        }
    
        return join_list;
    },
    outjoin_json_list: (join_key, list1, list2)=>{
    
        let join_list = [];
        for (let i in list1) {
            while (true) {
                let find_index = list2.findIndex(item => item[join_key] == list1[i][join_key])
                if (find_index === -1) {
                    break;
                } else {
                    let result = Object.assign({}, list1[i], list2[find_index])
                    join_list.push(result);
                    list2.splice(find_index, 1)
                }
            }
        }
    
        return join_list;
    },    
    update_user_update_date: (user_id)=>{
        Method.get_db_query_results(`update user set update_date = ? where user_id = ?`, [Method.current_time(), user_id])
            .then(results=>{
                console.log("update user update_date success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log("update user update_date fail");
            })
    },
    get_db_query_results: (query, values)=>{
        if (values) {
            return new Promise((resolve, reject) => {
    
                mysql_pool.getConnection((err, conn) => {
                    if (err) {
                        //db 오류
                        conn.release();
                        reject(err)
                        return;
                    }
    
                    conn.query(query, values, (err, results, fields) => {
                        if (err) {
                            //db 오류
                            reject(err)
                        }
                        else {
                            resolve(results)
                        }
                        //connection pool 반환
                        conn.release();
                    })
                })
            });
        } else {
            return new Promise((resolve, reject) => {
                mysql_pool.getConnection((err, conn) => {
                    if (err) {
                        //db 오류
                        conn.release();
                        reject(err)
                    }
    
                    conn.query(query, (err, results, fields) => {
                        if (err) {
                            //db 오류
                            reject(err)
                        }
                        else {
                            resolve(results)
                        }
                        //connection pool 반환
                        conn.release();
                    })
    
                });
            });
        }
    
    }
    
}

module.exports = Method;