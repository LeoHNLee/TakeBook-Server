const jwt = require("jsonwebtoken");
const secretObj = require("../config/jwtkey");

let jwt_token = {
    //토큰 생성
    create_token: function(value, expiration_time) {
        // @ param value: 암호화 할 json 값
        // @ param expiration_time: token 만료 시간. ex> 5m
        // @ return 암호화된 token값

        let token = '';
        if (expiration_time) {
            token = jwt.sign(value, secretObj.secret,
                {
                    expiresIn: expiration_time    // 유효 시간은 5분
                })
        }else{
            token = jwt.sign(value, secretObj.secret)
        }

        return token
    },
    //토큰값 확인
    token_check: function(token) {
        // @ param token: 복호화 할 토큰 값
        // @ return 복호화된 json 정보.
        // @ return 유효하지 않은 토큰 -> null.

        try {
            let decoded = jwt.verify(token, secretObj.secret);
            if (decoded) {
                return decoded;
            } else {
                return null;
            }
        }
        catch (JsonWebTokenError) {
            return null;
        }
    }
}

module.exports = jwt_token;