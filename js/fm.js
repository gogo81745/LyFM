const fm = function () {

    let fm = {};
    let page = '';
    let layout = $('.layout');

    fm.page = page;

    fm.load_page = function (page) {
        if (page == fm.page) {
            return
        }
        layout.children().remove();
        layout.attr('class', 'layout');
        if (page == 'login') {
            layout.addClass('login');
            layout.append($(`
                <h1 class="">登录</h1>
                <div class="login-box input-group">
                    <input type="text" name="password" class="form-control" placeholder="password">
                    <span class="input-group-btn">
                        <button class="btn btn-primary" type="button">登录</button>
                    </span>
                </div>`));
            $('.login-box button').click(function () {
                post('Login/login', {password: md5($('.login-box input').val())}).then(data => {
                    //TODO
                })
            });
        }
        if (page == 'index') {
            layout.addClass('login');
        }
    };

    function post(url, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                url: url,
                data: data,
                dataType: 'json',
                success: resolve,
                error: reject
            });
        });
    }

    return fm;

}();