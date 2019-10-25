
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
    }
    
}

module.exports = Method;