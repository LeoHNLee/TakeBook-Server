const mysql = require('mysql');
const moment = require('moment-timezone');

let config = require('../config/mysql.json');

let log_register = require('./log_register');

config.connectionLimit = 20;
const mysql_pool = mysql.createPool(config);

function current_time() {
    //현재시간 표시
    return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
}

let log = new log_register();

let mysql_query = {
    get_db_query_results: (query, values) => {
        return new Promise((resolve, reject) => {

            mysql_pool.getConnection((err, conn) => {
                if (err) {
                    log.regist_database_log(null);
                    reject(err)
                    //db 오류
                    return;
                }

                if (values) {
                    let sql = conn.query(query, values, (err, results, fields) => {
                        if (err) {
                            //db 오류
                            log.regist_database_log(sql.sql, false);
                            reject(err)
                        }
                        else {
                            log.regist_database_log(sql.sql, true);
                            resolve(results)
                        }
                        //connection pool 반환
                        conn.release();
                    });
                }
                else {
                    let sql = conn.query(query, (err, results, fields) => {
                        if (err) {
                            //db 오류
                            log.regist_database_log(sql.sql, false);
                            reject(err)
                        }
                        else {
                            log.regist_database_log(sql.sql, true);
                            resolve(results)
                        }
                        //connection pool 반환
                        conn.release();
                    });
                }


            });
        });
    },
    update_user_update_date: (user_id)=>{
        mysql_query.get_db_query_results(`update user set update_date = ? where user_id = ?`, [current_time(), user_id])
            .then(results=>{
                console.log("update user update_date success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log("update user update_date fail");
            })
    },
    update_folder_update_date: (folder_id)=>{
        mysql_query.get_db_query_results(`update folder set update_date = ? where folder_id = ?`, [current_time(), folder_id])
            .then(results=>{
                console.log("update folder update_date success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log(err)
                console.log("update folder update_date fail");
            })
    },
    increment_comment_recomment_cnt: (comment_id)=>{
        mysql_query.get_db_query_results(`update comment set recomment_cnt = recomment_cnt + 1 where comment_id = ?`, [comment_id])
            .then(results=>{
                console.log("increment comment recomment_cnt success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log(err)
                console.log("increment comment recomment_cnt fail");
            })
    },
    decrement_comment_recomment_cnt: (comment_id)=>{
        mysql_query.get_db_query_results(`update comment set recomment_cnt = recomment_cnt - 1 where comment_id = ?`, [comment_id])
            .then(results=>{
                console.log("increment comment recomment_cnt success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log(err)
                console.log("increment comment recomment_cnt fail");
            })
    },
    increment_comment_good_cnt: (comment_id)=>{
        mysql_query.get_db_query_results(`update comment set good_cnt = good_cnt + 1 where comment_id = ?`, [comment_id])
            .then(results=>{
                console.log("increment comment good_cnt success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log(err)
                console.log("increment comment good_cnt fail");
            })
    },
    decrement_comment_good_cnt: (comment_id)=>{
        mysql_query.get_db_query_results(`update comment set good_cnt = good_cnt - 1 where comment_id = ?`, [comment_id])
            .then(results=>{
                console.log("decrement comment good_cnt success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log(err)
                console.log("decrement comment good_cnt fail");
            })
    },
    increment_comment_bad_cnt: (comment_id)=>{
        mysql_query.get_db_query_results(`update comment set bad_cnt = bad_cnt + 1 where comment_id = ?`, [comment_id])
            .then(results=>{
                console.log("increment comment bad_cnt success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log(err)
                console.log("increment comment bad_cnt fail");
            })
    },
    decrement_comment_bad_cnt: (comment_id)=>{
        mysql_query.get_db_query_results(`update comment set bad_cnt = bad_cnt - 1 where comment_id = ?`, [comment_id])
            .then(results=>{
                console.log("decrement comment bad_cnt success!");
            })
            .catch(err=>{
                //User DB 서버 오류
                console.log(err)
                console.log("decrement comment bad_cnt fail");
            })
    },

}




module.exports = mysql_query;