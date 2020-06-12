let send = () => {
    let formd = new FormData();
    let file = document.querySelector('#hidden').files;
    allowed_extensions = ['jpg','jpeg','png','gif', 'txt'];
    if(file.length == 0) alert('Please, choose a file to upload.');
    else if(!allowed_extensions.includes(file[0].name.split('.')[1])) alert('Please, upload jpg, jpeg, png, gif or txt file');    
    else {
        formd.append('passwd', prompt('Enter the password.'));
        formd.append('name', file[0]);
        
        let xhr = new XMLHttpRequest();
        xhr.open('post', '/upload');
        xhr.addEventListener('load', e => window.location.href = xhr.responseURL);
        xhr.send(formd);

        console.log(xhr.response);

        document.querySelector('#submit').innerHTML = 'それは終わった';
        document.querySelector('#submit').style     = 'border-color:#1EAEDB;';
    }

}