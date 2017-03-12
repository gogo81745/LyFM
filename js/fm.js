const fm = function () {

    class Page {

        constructor(layout) {
            this.layout = layout;
        }

        render() {
            let layout = this.layout;
            layout.children().remove();
            layout.attr('class', 'layout');
        }
    }

    Page.Login = class Login extends Page {
        render() {

            super.render();

            let layout = this.layout;

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
    };

    class FileManager {

        constructor() {
            this.page = '';
            this.path = '';
            this.layout = $('.layout');
        }

        loadPage(page) {
            if (page == this.page) {
                return;
            }
            this.page = page;

            if (page == 'login') {
                new Page.Login(this.layout).render();
            }
            if (page == 'index') {
                //TODO
            }
        }

        loadPath(path) {
            path = path || fm.path || Cookies.get('path');
            if (!path) {
                throw new Error('path 为空');
            }
            get('Api/file_list', {path: path}).then(data => {
                //TODO
            })
        }
    }

    function get(url, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'GET',
                url: url,
                data: data,
                dataType: 'json',
                success: resolve,
                error: reject
            });
        });
    }

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

    return new FileManager();

}();