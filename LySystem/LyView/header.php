<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>文件管理</title>
    <link href="<?php echo get_file_url('css/bootstrap.min.css') ?>" rel="stylesheet">
    <link rel="stylesheet" href="<?php echo get_file_url('css/material-design-iconic-font.min.css') ?>">
    <link rel="stylesheet" href="<?php echo get_file_url('css/codemirror.css') ?>">
    <link rel="stylesheet" href="<?php echo get_file_url('css/style.css') ?>">
    <script src="<?php echo get_file_url('js/jquery-2.2.4.min.js') ?>"></script>
    <script src="<?php echo get_file_url('js/codemirror.js') ?>"></script>

</head>
<body>

<nav id="navbar" class="navbar navbar-default">
    <div class="container-fluid">
        <div class="collapse navbar-collapse">
            <ul class="nav navbar-nav">
                <li><a href="<?= WEB_URL ?>">文件</a></li>
                <li><a href="<?= WEB_URL . 'API' ?>">API</a></li>
            </ul>
        </div>
    </div>
</nav>