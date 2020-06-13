"use strict";
/**
 * Pingas Uploader (pup), by weld for pingas.army, wtfpl
 */
exports.__esModule = true;
var fs = require("fs");
var du = require("du");
var jsdom = require("jsdom");
var md5 = require("md5");
var path = require("path");
var form = require("formidable");
var mime = require("mime");
var express = require("express");
var fixed_date = Date.now();
var logstream = fs.createWriteStream(path.join(__dirname + '/logs/' + fixed_date + '.txt'), { flags: 'a' });
var log = function (type, msg) {
    var colorList = {
        'INFO': '\x1b[32m',
        'ERROR': '\x1b[41m',
        'reset': '\x1b[0m'
    };
    var date = new Date();
    var tolog = date.getDay() + '/' + date.getMonth() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' [' + type.toUpperCase() + '] ' + msg + '\n';
    logstream.write(tolog, function (err) {
        if (err)
            console.log('[' + colorList['ERROR'] + 'ERROR' + colorList['reset'] + '] ' + err.message);
        else
            console.log('[' + colorList[type.toUpperCase()] + type.toUpperCase() + colorList['reset'] + '] ' + msg);
    });
};
var App = /** @class */ (function () {
    function App(port) {
        this.params = this.init_params();
        this.salt = '***';
    }
    App.prototype.init_params = function () {
        var file = fs.readFileSync('pup.conf');
        var params = JSON.parse(String(file));
        return params;
    };
    App.getInstance = function (port) {
        if (!App.instance)
            App.instance = new App(port);
        return App.instance;
    };
    /**
     * Methods used in the router
     */
    App.prototype.gallery_get = function (req, res) {
        var tmpfd = fs.readFileSync(path.join(__dirname + '/www/gallery.html'));
        var dom = new jsdom.JSDOM(tmpfd);
        //create the ul, append it to the div
        var node = dom.window.document.createElement('ul');
        node.id = 'list';
        dom.window.document.querySelector('#gallery').appendChild(node);
        // take the list of files from the directory /www/media/
        var list = fs.readdirSync(path.join(__dirname + '/www/media/'));
        // sort by date, newest first
        list.sort(function (a, b) { return fs.statSync(path.join(__dirname + '/www/media/' + b)).mtime.getTime() - fs.statSync(path.join(__dirname + '/www/media/' + a)).mtime.getTime(); });
        list.forEach(function (file) {
            var tmpdate = new Date();
            var n = dom.window.document.createElement('li');
            n.innerHTML = '<a href="/media/' + file + '">' + file + '</a>';
            dom.window.document.querySelector('#list').appendChild(n);
        });
        log('INFO', req.ip + ' GET /gallery/');
        res.send(dom.serialize());
    };
    App.prototype.rsrc_get = function (req, res) {
        var filepath = path.join(__dirname + '/www/rsrc/' + req.params[0]);
        if (!fs.existsSync(filepath)) {
            log('INFO', req.ip + ' GET /404.html');
            res.sendFile(path.join(__dirname + '/www/404.html'));
        }
        else {
            log('INFO', req.ip + ' GET /rsrc/' + req.params[0]);
            res.sendFile(filepath);
        }
    };
    App.prototype.upload_get = function (req, res) {
        var filepath = path.join(__dirname + '/www/media/' + req.params[0]);
        if (!fs.existsSync(filepath)) {
            log('INFO', req.ip + ' GET /404.html');
            res.sendFile(path.join(__dirname + '/www/404.html'));
        }
        else {
            log('INFO', req.ip + ' GET /media/' + req.params[0]);
            res.sendFile(filepath);
        }
    };
    App.prototype.upload_post = function (req, res) {
        var _this = this;
        var f = form({ multiples: true });
        f.parse(req, function (err, fields, file) {
            if (err)
                log('ERROR', err);
            else if (fields.passwd == _this.params.passwd) {
                file = file[Object.keys(file)[0]];
                var authorized_extensions = ['jpg', 'jpeg', 'png', 'gif', 'txt'];
                if (authorized_extensions.includes(mime.getExtension(file.type))) {
                    var filename = md5(Date.now() + _this.salt) + '.' + mime.getExtension(file.type);
                    var filepath = path.join(__dirname + '/www/media/' + filename);
                    fs.createReadStream(file.path).pipe(fs.createWriteStream(filepath));
                    log('INFO', req.ip + ' POST /upload ' + filename);
                    res.redirect('/media/' + filename);
                }
                else {
                    console.log('INFO', req.ip + ' POST /upload Tried to access unauthorized');
                    res.send('Not authorized');
                }
            }
        });
    };
    App.prototype.watchdir = function (dirpath, maxsize) {
        du(path.join(__dirname + dirpath), function (err, size) {
            if (size >= maxsize) {
                fs.readdir(path.join(__dirname + dirpath), function (err, files) {
                    if (err)
                        log('ERROR', err.message);
                    else {
                        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                            var file = files_1[_i];
                            fs.unlink(path.join(__dirname + dirpath + file), function (err) { return log('ERROR', err.message); });
                        }
                    }
                });
            }
        });
    };
    /**
     * Here is the main ! The router is implemented differently for each allowed routes
     */
    App.prototype.start = function () {
        var _this = this;
        var router = express();
        // main page of the website
        router.get('/', function (req, res) { res.sendFile(path.join(__dirname + '/www/index.html')); });
        // here are the needed resources to the website (css, js, images, ...)
        router.get('/rsrc/*', function (req, res) { return _this.rsrc_get(req, res); });
        // main page of the gallery
        router.get('/gallery/?', function (req, res) { return _this.gallery_get(req, res); });
        // file uploaded are provided by this function
        router.get('/media/*', function (req, res) { return _this.upload_get(req, res); });
        // uploading a file
        router.post('/upload/?', function (req, res) { return _this.upload_post(req, res); });
        router.listen(this.params.port, function () { return log('INFO', 'Server is now listening on port ' + _this.params.port + ' !'); });
        // watch a given directory, see if its size is under the threshold, if not delete all files
        setInterval(function () {
            // 1 go
            _this.watchdir('/www/media/', Math.pow(10, 9));
        }, 1000);
    };
    return App;
}());
var app = App.getInstance(8888);
app.start();
