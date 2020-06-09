"use strict";
/**
 * Pingas Uploader (pup), by weld for pingas.army, wtfpl
 */
exports.__esModule = true;
var fs = require("fs");
var jsdom = require("jsdom");
var md5 = require("md5");
var path = require("path");
var form = require("formidable");
var mime = require("mime");
var express = require("express");
var App = /** @class */ (function () {
    function App(port) {
        this.port = port;
        this.passwd = '####';
        this.salt = '####';
    }
    App.getInstance = function (port) {
        if (!App.instance)
            App.instance = new App(port);
        return App.instance;
    };
    /**
     * Here is the main ! The router is implemented differently for each allowed routes
     */
    App.prototype.start = function () {
        var _this = this;
        var router = express();
        // main page
        router.get('/', function (req, res) { res.sendFile(path.join(__dirname + '/www/index.html')); });
        // css, js, images, ... for the website
        router.get('/rsrc/*', function (req, res) {
            var filepath = path.join(__dirname + '/www/rsrc/' + req.params[0]);
            if (!fs.existsSync(filepath))
                res.sendFile(path.join(__dirname + '/www/404.html'));
            else
                res.sendFile(filepath);
        });
        // main page of the gallery
        router.get('/gallery/?', function (req, res) {
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
            res.send(dom.serialize());
        });
        // files uploaded
        router.get('/media/*', function (req, res) {
            var filepath = path.join(__dirname + '/www/media/' + req.params[0]);
            if (!fs.existsSync(filepath))
                res.sendFile(path.join(__dirname + '/www/404.html'));
            else
                res.sendFile(filepath);
        });
        // uploader
        router.post('/upload/?', function (req, res) {
            var f = form({ multiples: true });
            f.parse(req, function (err, fields, file) {
                if (err)
                    console.log(err);
                else if (fields.passwd = _this.passwd) {
                    file = file[Object.keys(file)[0]];
                    var authorized_extensions = ['jpg', 'jpeg', 'png', 'gif', 'txt'];
                    if (authorized_extensions.includes(mime.getExtension(file.type))) {
                        var filepath = path.join(__dirname + '/www/media/' + md5(Date.now() + _this.salt) + '.' + mime.getExtension(file.type));
                        fs.createReadStream(file.path).pipe(fs.createWriteStream(filepath));
                        res.send('<script>alert("file uploaded")</script>');
                    }
                    else
                        res.send('Not authorized');
                }
            });
        });
        router.listen(this.port, function () { return console.log('server is now listening'); });
    };
    return App;
}());
var app = App.getInstance(8888);
app.start();
