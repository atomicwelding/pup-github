/**
 * Pingas Uploader (pup), by weld for pingas.army, wtfpl
 */

import fs       = require('fs');
import jsdom      = require('jsdom');
import md5      = require('md5');
import path     = require('path');
import form     = require('formidable');
import mime     = require('mime');
import express  = require('express');

class App {
    private port: number;
    private passwd: string;
    private salt: string;
    private constructor(port: number) {
        this.port = port;
        this.passwd = '####';
        this.salt = '####';
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
     * Here is the main ! The router is implemented differently for each allowed routes
     */
    public start(): void {
        const router = express();

        // main page
        router.get('/', (req, res) => {res.sendFile(path.join(__dirname + '/www/index.html'));});
        
        // css, js, images, ... for the website
        router.get('/rsrc/*', (req, res) => {
            
            const filepath: string = path.join(__dirname + '/www/rsrc/'+req.params[0]);
            if(!fs.existsSync(filepath))
                res.sendFile(path.join(__dirname + '/www/404.html'));
            else
                res.sendFile(filepath);
        });
        
        // main page of the gallery
        router.get('/gallery/?', (req, res) => {
            
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

            res.send(dom.serialize());
        });

        // files uploaded
        router.get('/media/*', (req, res) => {
            const filepath: string = path.join(__dirname + '/www/media/'+req.params[0]);
            if(!fs.existsSync(filepath))
                res.sendFile(path.join(__dirname + '/www/404.html'));
            else
                res.sendFile(filepath);
        });

        // uploader
        router.post('/upload/?', (req, res) => {
            const f = form({multiples:true});
            f.parse(req, (err, fields, file) => {
                if(err)
                    console.log(err)
                else if(fields.passwd = this.passwd) {
                    file = file[Object.keys(file)[0]];
                    const authorized_extensions: Array<string> = ['jpg','jpeg','png','gif', 'txt'];
                    if(authorized_extensions.includes(mime.getExtension(file.type))) {
                        const filepath = path.join(__dirname + '/www/media/' + md5(Date.now() + this.salt) + '.' + mime.getExtension(file.type));
                        fs.createReadStream(file.path).pipe(fs.createWriteStream(filepath));
                        res.send('<script>alert("file uploaded")</script>');
                    }

                    else
                        res.send('Not authorized');
                }
            });
        });

        router.listen(this.port, () => console.log('server is now listening'));
    }
}


const app: App = App.getInstance(8888);
app.start()