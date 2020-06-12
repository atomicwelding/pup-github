/**
 * Pingas Uploader (pup), by weld for pingas.army, wtfpl
 */

import fs       = require('fs');
import du       = require('du');
import jsdom    = require('jsdom');
import md5      = require('md5');
import path     = require('path');
import form     = require('formidable');
import mime     = require('mime');
import express  = require('express');


const fixed_date = Date.now();
const logstream  = fs.createWriteStream(path.join(__dirname + '/logs/'+fixed_date+'.txt'), {flags:'a'});
const log = (type:string, msg:string): void => {
    const colorList = {
        'INFO':'\x1b[32m',
        'ERROR':'\x1b[41m',
        'reset':'\x1b[0m'
    };

    const date  = new Date();
    const tolog = date.getDay()+'/'+date.getMonth()+'/'+date.getFullYear()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+' ['+type.toUpperCase()+'] ' + msg + '\n';
    logstream.write(tolog, (err) => {
        if(err)
            console.log('['+colorList['ERROR']+'ERROR'+colorList['reset']+ '] ' + err.message)
        else
            console.log('['+colorList[type.toUpperCase()]+type.toUpperCase()+colorList['reset']+ '] ' + msg)
    });
}


class App {
    private port: number;
    private passwd: string;
    private salt: string;
    private constructor(port: number) {
        this.port = port;
        this.passwd = '***';
        this.salt = '***';
    }

    /**
     * This class is a singleton, i.e. there is only one object that can be instanced.
     */
    private static instance: App;
    public static getInstance(port: number): App {
        if(!App.instance)
            App.instance = new App(port);
        return App.instance;
    }


    /**
     * Methods used in the router
     */
    private gallery_get(req, res): void {
        const tmpfd = fs.readFileSync(path.join(__dirname + '/www/gallery.html'));
        const dom = new jsdom.JSDOM(tmpfd);
        //create the ul, append it to the div
        const node = dom.window.document.createElement('ul');
        node.id = 'list';
        dom.window.document.querySelector('#gallery').appendChild(node);
     
        // take the list of files from the directory /www/media/
        const list = fs.readdirSync(path.join(__dirname + '/www/media/'));

        // sort by date, newest first
        list.sort((a,b) => fs.statSync(path.join(__dirname + '/www/media/' + b)).mtime.getTime() - fs.statSync(path.join(__dirname + '/www/media/' + a)).mtime.getTime());
        list.forEach(file => {
            let tmpdate = new Date();
            const n = dom.window.document.createElement('li');
            n.innerHTML = '<a href="/media/'+file+'">'+file+'</a>';
            dom.window.document.querySelector('#list').appendChild(n);
        })

        log('INFO', req.ip + ' GET /gallery/');
        res.send(dom.serialize());
    }

    private rsrc_get(req, res): void {
        const filepath: string = path.join(__dirname + '/www/rsrc/'+req.params[0]);
        if(!fs.existsSync(filepath)) {
            log('INFO', req.ip + ' GET /404.html');
            res.sendFile(path.join(__dirname + '/www/404.html'));
        }   
        else {
            log('INFO', req.ip + ' GET /rsrc/'+req.params[0]);
            res.sendFile(filepath);
        }
    }

    private upload_get(req, res): void {
        const filepath: string = path.join(__dirname + '/www/media/'+req.params[0]);
        if(!fs.existsSync(filepath)) {
            log('INFO', req.ip + ' GET /404.html');
            res.sendFile(path.join(__dirname + '/www/404.html'));
        }
        else {
            log('INFO', req.ip + ' GET /media/'+req.params[0]);
            res.sendFile(filepath);
        }
    }

    private upload_post(req, res): void {
        const f = form({multiples:true});
            f.parse(req, (err, fields, file) => {
                if(err)
                    log('ERROR', err)
                else if(fields.passwd = this.passwd) {
                    file = file[Object.keys(file)[0]];
                    const authorized_extensions: Array<string> = ['jpg','jpeg','png','gif', 'txt'];
                    if(authorized_extensions.includes(mime.getExtension(file.type))) {
                        const filename  = md5(Date.now() + this.salt) + '.' + mime.getExtension(file.type);
                        const filepath = path.join(__dirname + '/www/media/' + filename);
                        fs.createReadStream(file.path).pipe(fs.createWriteStream(filepath));

                        log('INFO', req.ip + ' POST /upload ' + filename)
                        res.redirect('/media/' + filename);
                    }

                    else {
                        console.log('INFO', req.ip + ' POST /upload Tried to access unauthorized');
                        res.send('Not authorized');
                    }
                }
            });
    }

    private watchdir(dirpath:string, maxsize:number): void {
       du(path.join(__dirname + dirpath), (err, size) => {
            if(size >= maxsize){
                fs.readdir(path.join(__dirname + dirpath), (err, files) => {
                        if(err) log('ERROR', err.message);
                        else {
                            for(const file of files)
                                fs.unlink(path.join(__dirname + dirpath + file), err => log('ERROR', err.message));
                        }
                });
            }
       });
       
    }

    /**
     * Here is the main ! The router is implemented differently for each allowed routes
     */
    public start(): void {
        const router: any = express();
        // main page of the website
        router.get('/', (req, res) => {res.sendFile(path.join(__dirname + '/www/index.html'));});
        // here are the needed resources to the website (css, js, images, ...)
        router.get('/rsrc/*', (req, res) => this.rsrc_get(req, res));
        // main page of the gallery
        router.get('/gallery/?', (req, res) => this.gallery_get(req, res));
        // file uploaded are provided by this function
        router.get('/media/*', (req, res) => this.upload_get(req, res));
        // uploading a file
        router.post('/upload/?', (req, res) => this.upload_post(req, res));

        router.listen(this.port, () => log('INFO', 'Server is now listening on port ' + this.port + ' !'));

        // watch a given directory, see if its size is under the threshold, if not delete all files
        setInterval(() => {
            // 1 go
            this.watchdir('/www/media/', Math.pow(10,9));
        }, 1000)

    }
}


const app: App = App.getInstance(8888);
app.start()
