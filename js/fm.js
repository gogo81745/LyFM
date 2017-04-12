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
            $(`<form action="Api/file_download" method="get" >
             <input type="hidden" name="path" value="${path}" />
             </form>`).appendTo('body').submit().remove();
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
        rename: (path, name) => {
            return Api.get('Api/rename', {path, name});
        },
        delete: path => {
            return Api.get('Api/delete', {path});
        },

        upload: (path, file) => {
            let formData = new FormData();
            formData.append('path', path);
            formData.append('Filedata', file);
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: 'Api/upload_file',
                    type: 'POST',
                    data: formData,
                    cache: false,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: resolve,
                    error: reject
                });
            });
        },

        dirTree: (path = '') => {
            return Api.get('Api/dir_tree', {path});
        },

        newFolder: (path, name) => {
            return Api.get('Api/mkdir', {path, name});
        },

        filterError: data => {
            if (!data.status || data.error) {
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
                <form onsubmit="false" class="login-box input-group">
                    <input type="text" name="password" class="form-control" placeholder="password">
                    <span class="input-group-btn">
                        <button class="btn btn-primary" type="button">登录</button>
                    </span>         
                </form>
                <div class="message error hide">登录失败!</div>             
                `));
            $('.login-box button').click(function () {
                let handleSuccess = data => {
                    Cookies.set('root-path', data.path, {expires: 30});
                    Cookies.set('path', data.path, {expires: 30});
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
                        <button class="btn btn-primary upload">上传</button>
                        <button class="btn btn-default new-folder">新文件夹</button>
                        <p class="path"></p>
                    </div>
                    <div class="files">
                        <div class="file-list">
                
                        </div>
                    </div>
                </main>
                
                <aside class="sidebar">
                    <div class="multi-action">
                        <h5>批量操作</h5>
                        <button class="btn btn-default copy">复制</button>
                        <button class="btn btn-default move">移动</button>
                        <button class="btn btn-default download">下载</button>
                        <button class="btn btn-default delete">删除</button>
                    </div>
                    <div class="messages"></div>
                </aside>
                
                <div class="dialogs"></div>
            `);
            this.listNode = nodes.filter('main').find('.file-list');
            this.messageNode = nodes.filter('.sidebar').find('.messages');
            layout.append(nodes);

            let dialogs = nodes.filter('.dialogs');
            this.directoryBox = new View.DirectoryBox(dialogs);
            this.nameBox = new View.NameBox(dialogs);
            this.uploadBox = new View.UploadBox(dialogs);
            nodes.filter('main').find('.upload').click(this.uploadBox.show.bind(this.uploadBox));

            nodes.filter('main').find('.new-folder').click(() => {
                this.nameBox.input().then(data => {
                    if (!data) {
                        return;
                    }
                    Api.newFolder(fm.path, data)
                        .then(Api.filterError)
                        .then(view.reload)
                        .catch(view.errorMessage);
                })
            });

            nodes.filter('.sidebar').find('.multi-action .copy').click(() => {
                view.directoryBox.input().then(data => {
                    if (!data) {
                        return;
                    }
                    this.selected.forEach(item =>
                        Api.copy(item.path, data, item.isDirectory() ? 'dir' : 'file')
                            .then(Api.filterError)
                            .catch(view.errorMessage)
                    );
                });
            });

            nodes.filter('.sidebar').find('.multi-action .move').click(() => {
                view.directoryBox.input().then(data => {
                    if (!data) {
                        return;
                    }
                    Promise.all(this.selected.map(item =>
                        Api.move(item.path, data, item.isDirectory() ? 'dir' : 'file')
                            .then(Api.filterError)
                            .catch(view.errorMessage)
                    )).then(view.reload);
                });
            });


            nodes.filter('.sidebar').find('.multi-action .download').click(() => {
                this.selected.forEach((item, i) => {
                    /**
                     * 貌似不能同时一次请求多个文件，好吧那我就错开时间
                     */
                    setTimeout(() => {
                        item.download();
                    }, i * 50)
                })
            });

            nodes.filter('.sidebar').find('.multi-action .delete').click(() => {
                Promise.all(this.selected.map(item =>
                    Api.delete(item.path)
                        .then(Api.filterError)
                        .catch(view.errorMessage)
                )).then(view.reload);
            });

            this.loadPath();

        }

        loadPath(path) {

            path = fm.path = path || Cookies.get('path') || Cookies.get('root-path');
            if (!path) {
                fm.loadPage('login');
                return;
            }

            this.listNode.empty();
            this.selected = [];
            this.list = [];

            let append = e => {
                this.list.push(e);
                this.listNode.append(e.node)
            };

            this.getList(path)
                .then(F.each(append));

            this.nodes.find('.toolbar .path').text(path);

            Cookies.set('path', path, {expires: 30});
        }

        getList(path) {

            let makeList = data => {
                let res = [];
                res.push({name: '..', path: data.parent});
                res.push(...data.dir);
                res.push(...data.file);
                return res;
            };
            let buildItem = data => new View.List.Item(data);

            return Api.fileList(path)
                .then(makeList)
                .then(F.map(buildItem));
        }

        get reload() {
            return this.loadPath.bind(this, fm.path);
        }

        message(status, message) {
            let node = $(`
                <div class="message ${status}">
                    <div class="close-button"><a><i class="zmdi zmdi-close"></i></a></div>
                    <div class="message-content">${message}</div>
                </div>
            `);
            node.find('.close-button').click(() => {
                node.remove();
            });
            this.messageNode.append(node);
        }

        get errorMessage() {
            return data => {
                console.error(data);
                this.message('error', data.error);
            }
        }

        selectItem(item, flag) {
            if (!item) {
                return;
            }
            let selected = this.selected;
            if (flag !== true && flag !== false) {
                flag = !selected.includes(item);
            }
            if (flag && !selected.includes(item)) {
                selected.push(item);
            } else if (!flag && selected.includes(item)) {
                selected.splice(selected.indexOf(item), 1);
            }
        }
    };

    View.List.Item = class Item {

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

            this.selected = false;

            let typeClass = this.isDirectory() ? Item.DIR : Item.FILE;
            if (this.type !== typeClass) {
                typeClass += ' ' + this.type;
            }

            let node = this.node = $(`
                <div class="item ${typeClass}">
                    <input type="checkbox">
                    <div class="icon"></div>
                    <div class="filename"></div>
                    
                    <div class="actions">
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

            if (this.name === '.' || this.name === '..') {
                return;
            }

            this.checkbox = node.find('input[type=checkbox]');
            node.click(this.select.bind(this));

            if (data.size) {
                let formatSize = size => {
                    if (size === 0) {
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

                let editNode = $(`<a><i class="zmdi zmdi-edit"></i></a>`);
                editNode.click(this.edit.bind(this));
                actions.push(editNode);
            }

            let copyNode = $('<a><i class="zmdi zmdi-copy"></i></a>');
            copyNode.click(this.copy.bind(this));
            actions.push(copyNode);

            let moveNode = $('<a><i class="zmdi zmdi-redo"></i></a>');
            moveNode.click(this.move.bind(this));
            actions.push(moveNode);

            let renameNode = $('<a><i class="zmdi zmdi-format-size"></i></a>');
            renameNode.click(this.rename.bind(this));
            actions.push(renameNode);

            let deleteNode = $('<a><i class="zmdi zmdi-delete"></i></a>');
            deleteNode.click(this.delete.bind(this));
            actions.push(deleteNode);

            let appendActions = action => actionsNode.append(action);
            actions.forEach(appendActions);
        }

        isDirectory() {
            return this.type === Item.DIR;
        }

        click() {
            if (this.isDirectory()) {
                view.loadPath(this.path);
            } else {
                this.download();
            }
        }

        select(flag) {
            if (flag === true || flag === false) {
                this.selected = flag;
            } else {
                this.selected = !this.selected;
            }
            this.checkbox.prop('checked', this.selected);
            view.selectItem(this, this.selected);
        }

        download() {
            if (!this.isDirectory()) {
                Api.download(this.path);
            }
        }

        edit() {
            if (!this.isDirectory()) {
                //TODO
            }
        }

        copy() {
            view.directoryBox.input().then(data => {
                if (!data) {
                    return;
                }
                Api.copy(this.path, data, this.isDirectory() ? 'dir' : 'file')
                    .then(Api.filterError)
                    .then(view.reload)
                    .catch(view.errorMessage);
            })
        }

        move() {
            view.directoryBox.input().then(data => {
                if (!data) {
                    return;
                }
                Api.move(this.path, data, this.isDirectory() ? 'dir' : 'file')
                    .then(Api.filterError)
                    .then(view.reload)
                    .catch(view.errorMessage);
            })
        }

        rename() {
            view.nameBox.input(this.name).then(data => {
                if (!data) {
                    return;
                }
                Api.rename(this.path, data)
                    .then(Api.filterError)
                    .then(view.reload)
                    .catch(view.errorMessage);
            })
        }

        delete() {
            Api.delete(this.path)
                .then(Api.filterError)
                .then(view.reload)
                .catch(view.errorMessage);
        }

        static typeOf(data) {
            if (!data['exten']) {
                return Item.DIR;
            }
            let extend = data['exten'];
            switch (extend) {
                case 'txt':
                    return Item.TXT;
                case 'html':
                    return Item.HTML;
                case 'css':
                case 'less':
                case 'scss':
                    return Item.CSS;
                case 'js':
                    return Item.JAVASCRIPT;
                case 'jsx':
                    return Item.JSX;
                case 'php':
                    return Item.PHP;
                case 'py':
                    return Item.PYTHON;
                case 'xml':
                    return Item.XML;
                case 'yml':
                case 'yaml':
                    return Item.YAML;
                case 'md':
                case 'markdown':
                    return Item.MARKDOWN;
            }

            return Item.FILE;
        }

    };
    View.List.Item.DIR = 'dir';
    View.List.Item.FILE = 'file';
    View.List.Item.TXT = 'text';
    View.List.Item.HTML = 'html';
    View.List.Item.CSS = 'css';
    View.List.Item.JAVASCRIPT = 'javascript';
    View.List.Item.JSX = 'jsx';
    View.List.Item.PHP = 'php';
    View.List.Item.PYTHON = 'python';
    View.List.Item.XML = 'xml';
    View.List.Item.YAML = 'yaml';
    View.List.Item.MARKDOWN = 'markdown';

    View.DialogBox = class DialogBox {

        constructor() {
            this.root = null;
            this.cancelButton = null;
            this.confirmButton = null;
        }

        show() {
            this.root.removeClass('hide');
        }

        hide() {
            this.root.addClass('hide');
        }

        handle(done, value) {
            return () => {
                this.cancelButton.off('click');
                this.confirmButton.off('click');
                this.hide();
                done(value());
            }
        };

        input(confirm, cancel) {
            this.show();
            return new Promise(resolve => {
                cancel = cancel ? this.handle(resolve, cancel) : this.handle(resolve, () => null);
                confirm = this.handle(resolve, confirm);
                this.cancelButton.click(cancel);
                this.confirmButton.click(confirm);
            });
        }

    };

    View.DirectoryBox = class DirectoryBox extends View.DialogBox {

        constructor(node) {
            super();
            let root = this.root = $(`
                <div id="directory-dialog" class="dialog-background hide">
                    <div class="dialog">
                        <div class="title-box">
                            <div class="title">选择文件夹</div>
                            <div class="close-button"><a><i class="zmdi zmdi-close"></i></a></div>
                        </div>
                        <div class="directory-tree">
                        
                        </div>
                        
                        <div class="action-line">
                            <input type="text" class="form-control">
                            <button class="cancel-button btn btn-default">取消</button>
                            <button class="confirm-button btn btn-primary ">确定</button>
                        </div>
                    </div>
                </div>`);
            node.append(root);
            this.cancelButton = root.find('.cancel-button,.close-button');
            this.confirmButton = root.find('.confirm-button');
            this.container = root.find('.directory-tree');
            this.selectedInput = root.find('input[type=text]');
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

        input() {
            return super.input(() => this.selectedInput.val());
        }

    };

    View.NameBox = class NameBox extends View.DialogBox {

        constructor(node) {
            super();
            let root = this.root = $(`
                <div id="name-dialog" class="dialog-background hide">
                    <div class="dialog">
                        <div class="title-box">
                            <div class="title">输入名称</div>
                            <div class="close-button"><a><i class="zmdi zmdi-close"></i></a></div>
                        </div>
        
                        <div class="action-line">
                            <input type="text" class="form-control">
                            <button class="cancel-button btn btn-default">取消</button>
                            <button class="confirm-button btn btn-primary ">确定</button>
                        </div>
                    </div>
                </div>`);
            node.append(root);
            this.cancelButton = root.find('.cancel-button,.close-button');
            this.confirmButton = root.find('.confirm-button');

            this.inputNode = root.find('input[type=text]');
        }

        input(value = '') {
            this.inputNode.val(value);
            return super.input(() => this.inputNode.val());
        }


    };

    View.UploadBox = class UploadBox extends View.DialogBox {

        constructor(node) {
            super();
            let root = this.root = $(`
                <div id="upload-dialog" class="dialog-background hide">
                    <div class="dialog">
                        <div class="title-box">
                            <div class="title">上传文件</div>
                            <div class="close-button"><a><i class="zmdi zmdi-close"></i></a></div>
                        </div>
                        
                        <input class="btn btn-success" type="file" name="files[]" multiple>
                        
                        <div class="upload-list"></div>
                        
                        <div class="action-line">
                            <button class="upload-button btn btn-success">上传</button>
                            <button class="confirm-button btn btn-primary ">确定</button>
                        </div>
                    </div>
                </div>`);
            node.append(root);
            root.find('.close-button,.confirm-button').click(this.hide.bind(this));

            root.find('.upload-button').click(this.upload.bind(this));

            this.uploadNode = node.find('input[type=file]');
            this.listNode = node.find('.upload-list');
            this.list = [];

            this.uploadNode.on('change', () => {
                for (let f of this.uploadNode[0].files) {
                    this.list.push(new UploadBox.Item(f));
                }
                this.update();
            });

        }

        upload() {
            let list = this.list;
            for (let o of list) {
                if (o.status === View.UploadBox.Item.SUCCESS || o.status === View.UploadBox.Item.UPLOADING) {
                    continue;
                }
                let handleSuccess = data => {
                    o.setStatus(View.UploadBox.Item.SUCCESS);
                    view.reload();
                };
                let handleFailed = data => {
                    o.setStatus(View.UploadBox.Item.FAILED, data.error);
                    view.reload();
                };

                o.setStatus(View.UploadBox.Item.UPLOADING);
                Api.upload(fm.path, o.file)
                    .then(Api.filterError)
                    .then(handleSuccess)
                    .catch(handleFailed);
            }
        }

        update() {
            this.listNode.children().remove();
            let list = this.list;
            for (let o of list) {
                let f = o.file;
                let node = o.node = $(`
                    <div class="upload-item">
                        <span class="upload-name">${f.name}</span>
                        <span class="upload-status"></span>
                        <div class="close-button"><a><i class="zmdi zmdi-close"></i></a></div>
                    </div>`);
                node.find('.close-button').click(() => {
                    list.splice(list.indexOf(f), 1);
                    this.update();
                });
                this.listNode.append(node);
            }
        }

        input(value) {
        }


    };

    View.UploadBox.Item = class {
        constructor(file) {
            this.file = file;
            this.status = View.UploadBox.Item.INIT;
        }

        setStatus(value, ...args) {
            this.status = value;

            let className, text = null;
            if (value === View.UploadBox.Item.SUCCESS) {
                className = 'success';
                text = '上传成功';
            } else if (value === View.UploadBox.Item.FAILED) {
                className = 'failed';
                text = args[0];
            } else if (value === View.UploadBox.Item.UPLOADING) {
                className = ' ';
                text = '正在上传';
            }

            if (className && this.node) {
                this.node.find('.upload-status').attr('class', ['upload-status', className].join(' '));
                this.node.find('.upload-status').text(text);
            }
        }
    };

    View.UploadBox.Item.SUCCESS = 'Success';
    View.UploadBox.Item.FAILED = 'Failed';
    View.UploadBox.Item.INIT = 'Init';
    View.UploadBox.Item.UPLOADING = 'Uploading';

    class FileManager {

        constructor() {
            this.page = '';
            this.path = '';
            this.layout = $('.layout');
        }

        loadPage(page) {
            if (page === this.page) {
                return;
            }
            this.page = page;

            if (page === 'login') {
                (view = new View.Login(this.layout)).render();
            }
            if (page === 'index') {
                (view = new View.List(this.layout)).render();
            }
        }


    }

    return new FileManager();

}();