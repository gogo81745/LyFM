const fm = function () {


    const F = function () {

        let curry = f => (...args) => o => f.apply(o, args);
        let each = curry(Array.prototype.forEach);
        let map = curry(Array.prototype.map);

        return {curry, each, map};
    }();

    const Api = {
        get: (url, data) => {
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
        },

        post: (url, data) => {
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
        },

        fileList: (path) => {
            return Api.get('Api/file_list', {path: path});
        },
    };

    let view;

    class View {

        constructor(layout) {
            this.layout = layout;
        }

        render() {
            let layout = this.layout;
            layout.children().remove();
            layout.attr('class', 'layout');
        }

    }

    View.Login = class Login extends View {
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
                Api.post('Login/login', {password: md5($('.login-box input').val())}).then(data => {
                    Cookies.set('path', data.path);
                })
            });
        }
    };

    View.List = class List extends View {

        render() {
            super.render();

            let layout = this.layout;

            layout.addClass('index');
            let nodes = this.nodes = $(`
                <main>
                    <div class="toolbar">
                        <button type="button" class="btn btn-primary">上传</button>
                        <button type="button" class="btn btn-default">新文件夹</button>
                        <p class="path"></p>
                    </div>
                    <div class="files">
                        <div class="file-list">
                
                        </div>
                    </div>
                </main>
                
                <aside class="sidebar">
                </aside>
                
                <div class="dialog-background hide">
                    <div class="dialog">
                        <div class="title-box">
                            <div class="title">移动到</div>
                            <div class="close-button"><a href=""><i class="zmdi zmdi-close"></i></a></div>
                        </div>
                    </div>
                </div>`);
            this.listNode = nodes.find('.file-list');
            layout.append(nodes);

            this.loadPath();

        }

        loadPath(path) {

            path = path || Cookies.get('path');

            this.listNode.empty();

            let append = e => this.listNode.append(e.node);

            fm.loadPath(path)
                .then(F.each(append));

            this.nodes.find('.toolbar .path').text(path);

            Cookies.set('path', path);
        }
    };

    View.Item = class Item {

        constructor(data) {
            this.data = data;
            this.name = data.name;
            this.path = data.path;
            this.type = Item.typeOf(data);

            this.perms = data.perms || '';
            this.group = data.perms || '';
            this.owner = data.owner || '';

            if (this.group || this.owner) {
                this.groupOwner = `${this.group}:${this.owner}`;
            } else {
                this.groupOwner = '';
            }

            // TODO size actions

            let node = this.node = $(`
                <div class="item ${this.type}">
                    <input type="checkbox">
                    <div class="icon"></div>
                    <div class="filename"></div>
                    <div class="actions">
                        <a href=""><i class="zmdi zmdi-copy"></i></a>
                        <a href=""><i class="zmdi zmdi-redo"></i></a>
                        <a href=""><i class="zmdi zmdi-format-size"></i></a>
                        <a href=""><i class="zmdi zmdi-delete"></i></a>
                    </div>
                    <div class="authority">${this.perms}</div>
                    <div class="owner">${this.groupOwner}</div>
                    <div class="size">17m</div>
                </div>
            `);

            let nameNode = $(`<a>${this.name}</a>`);
            nameNode.click(this.click.bind(this));
            nameNode.attr('title', this.path);
            nameNode.appendTo(node.find('.filename'));

            let actions = [];
            let actionsNode = node.find('.actions');

            if (!this.isDirectory()) {
                let downloadNode = $(`<a><i class="zmdi zmdi-download"></i></a>`);
                downloadNode.click(this.download.bind(this));
                downloadNode.attr('title', this.name);
                actions.push(downloadNode);
            }

            //TODO other actions

            let appendActions = action => actionsNode.append(action);
            actions.forEach(appendActions);
        }

        isDirectory() {
            return this.type === View.Item.DIR;
        }

        click() {
            if (this.isDirectory()) {
                view.loadPath(this.path);
            }
        }

        download() {
            //TODO
        }

        static typeOf(data) {
            if (!data['exten']) {
                return View.Item.DIR;
            }
            //TODO
        }

    };
    View.Item.DIR = 'dir';

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
                (view = new View.Login(this.layout)).render();
            }
            if (page == 'index') {
                (view = new View.List(this.layout)).render();
            }
        }

        loadPath(path) {

            let makeList = data => {
                let res = [];
                res.push({name: '..', path: data.parent});
                res.push(...data.dir);
                res.push(...data.file);
                return res;
            };
            let buildItem = data => new View.Item(data);

            return Api.fileList(path)
                .then(makeList)
                .then(F.map(buildItem));

        }

    }

    return new FileManager();

}();