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

        download: path => {
            let inputs = `<input type="hidden" name="path" value="${path}" />`;
            $(`<form action="Api/file_download" method="get" >${inputs}</form>`)
                .appendTo('body').submit().remove();
        },

        fileList: path => {
            return Api.get('Api/file_list', {path: path});
        },

        copy: (path, newPath, type) => {
            return Api.get('Api/copy_file', {path, new_path: newPath, type});
        },

        move: (path, newPath, type) => {
            return Api.get('Api/move_file', {path, new_path: newPath, type});
        },

        loadPath: path => {

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
        },

        dirTree: (path = '') => {
            return Api.get('Api/dir_tree', {path});
        },


        filterError: data => {
            if (data.error && data.error.length) {
                throw data;
            }
            return data;
        }
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
                </div>
                <div class="message error hide">登录失败!</div>             
                `));
            $('.login-box button').click(function () {
                let handleSuccess = data => {
                    Cookies.set('path', data.path);
                    fm.loadPage('index');
                };
                let handleError = error => {
                    console.error(error);
                    layout.find('.error').removeClass('hide');
                };
                Api.post('Login/login', {password: md5($('.login-box input').val())})
                    .then(Api.filterError)
                    .then(handleSuccess)
                    .catch(handleError);
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
                        <button class="btn btn-primary">上传</button>
                        <button class="btn btn-default">新文件夹</button>
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
                            <div class="title">选择文件夹</div>
                            <div class="close-button"><a><i class="zmdi zmdi-close"></i></a></div>
                        </div>
                        <div class="directory-tree">
                        
                        </div>
                        
                        <div class="selected-line">
                            <input type="text" class="selected-text form-control">
                            <button class="cancel-button btn btn-default">取消</button>
                            <button class=" confirm-button btn btn-primary ">确定</button>
                        </div>
                    </div>
                </div>`);
            this.listNode = nodes.find('.file-list');
            layout.append(nodes);

            this.directoryBox = new View.DirectoryBox(this);

            this.loadPath();

        }

        loadPath(path) {

            path = fm.path = path || Cookies.get('path');

            this.listNode.empty();

            let append = e => this.listNode.append(e.node);

            Api.loadPath(path)
                .then(F.each(append));

            this.nodes.find('.toolbar .path').text(path);

            Cookies.set('path', path);
        }

        reload() {
            this.loadPath(fm.path);
        }
    };

    View.Item = class Item {

        constructor(data) {
            this.data = data;
            this.name = data.name;
            this.path = data.path;
            this.type = Item.typeOf(data);

            this.perms = data.perms || '';
            this.group = data.group || '';
            this.owner = data.owner || '';

            if (this.group || this.owner) {
                this.groupOwner = `${this.group}:${this.owner}`;
            } else {
                this.groupOwner = '';
            }

            let node = this.node = $(`
                <div class="item ${this.type}">
                    <input type="checkbox">
                    <div class="icon"></div>
                    <div class="filename"></div>
                    <div class="actions">
                        <a><i class="zmdi zmdi-format-size"></i></a>
                        <a><i class="zmdi zmdi-delete"></i></a>
                    </div>
                    <div class="authority">${this.perms}</div>
                    <div class="owner">${this.groupOwner}</div>
                    <div class="size"></div>
                </div>
            `);

            let nameNode = $(`<a>${this.name}</a>`);
            nameNode.click(this.click.bind(this));
            nameNode.attr('title', this.path);
            nameNode.appendTo(node.find('.filename'));

            if (data.size) {
                let formatSize = size => {
                    if (size == 0) {
                        return 0;
                    }
                    if (size < 1024) {
                        return `${size}B`;
                    }
                    if (size < 1024 * 1024) {
                        return `${(size / 1024).toFixed(2)}k`;
                    }
                    return `${(size / 1024 / 1024).toFixed(2)}m`;
                };

                node.find('.size').text(formatSize(data.size));
            }

            let actions = [];
            let actionsNode = node.find('.actions');

            if (!this.isDirectory()) {
                let downloadNode = $(`<a><i class="zmdi zmdi-download"></i></a>`);
                downloadNode.click(this.download.bind(this));
                downloadNode.attr('title', this.name);
                actions.push(downloadNode);
            }

            let copyNode = $('<a><i class="zmdi zmdi-copy"></i></a>');
            copyNode.click(this.copy.bind(this));
            actions.push(copyNode);

            let moveNode = $('<a><i class="zmdi zmdi-redo"></i></a>');
            moveNode.click(this.move.bind(this));
            actions.push(moveNode);

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
            if (!this.isDirectory()) {
                Api.download(this.path);
            }
        }

        copy() {
            view.directoryBox.waitSelect().then(data => {
                if (!data) {
                    return;
                }
                Api.copy(this.path, data, this.isDirectory() ? 'dir' : 'file');
                view.reload();
            })
        }

        move() {
            view.directoryBox.waitSelect().then(data => {
                if (!data) {
                    return;
                }
                Api.move(this.path, data, this.isDirectory() ? 'dir' : 'file');
                view.reload();
            })
        }

        static typeOf(data) {
            if (!data['exten']) {
                return View.Item.DIR;
            }
            //TODO
        }

    };
    View.Item.DIR = 'dir';

    View.DirectoryBox = class DirectoryBox {

        constructor(view) {
            let root = this.root = view.nodes.filter('.dialog-background');
            this.container = view.nodes.find('.directory-tree');
            this.cancelButton = root.find('.cancel-button,.close-button');
            this.confirmButton = root.find('.confirm-button');
            this.selectedInput = root.find('.selected-text');
            this.loadTree();
            this.selectedNode = null;
        }

        loadTree(path) {
            let loop = (name, inner) => {
                let node = $(`<div class="dir-item hide-inner"><div class="dir-name">${name}</div><div class="dir-inner"></div></div>`);
                node.children('.dir-name').click(() => {
                    node.toggleClass('hide-inner');
                    this.select(name, node);
                });
                let innerNode = node.find('.dir-inner');
                let append = n => innerNode.append(n);

                Object.entries(inner).map(c => loop(...c)).forEach(append);
                return node;
            };
            let append = n => this.container.append(n);
            let addNode = n => Object.entries(n).map(c => loop(...c)).forEach(append);
            this.container.empty();
            Api.dirTree(path).then(addNode);
        }

        select(name, node) {
            if (this.selectedNode) {
                this.selectedNode.removeClass('selected');
            }
            this.selectedNode = node;
            this.selectedInput.val(name);
            node.addClass('selected');
        }

        waitSelect() {
            this.root.removeClass('hide');
            return new Promise(resolve => {
                let handle = value => {
                    return () => {
                        this.cancelButton.off('click');
                        this.confirmButton.off('click')
                        this.root.addClass('hide');
                        resolve(value());
                    }
                };
                this.cancelButton.click(handle(() => null));
                this.confirmButton.click(handle(() => this.selectedInput.val()));
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
                (view = new View.Login(this.layout)).render();
            }
            if (page == 'index') {
                (view = new View.List(this.layout)).render();
            }
        }


    }

    return new FileManager();

}();