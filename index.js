/*

x 1. get current svn info. Can i run either svn info or git svn info
x 2. look at the url and verify that the last item is trunk.
x 3. Make a remote request to look at the list of tags.
x 4. find out what the next number should be.
x 5. Copy trunk to the new tag number
  6. create the stage file?
  7. edit the stage file
  8. commit the stage file

*/
var fs      = require('fs');
var process = require('child_process');

// Are we using git svn or svn?
process.exec('git svn info', function (err, stdout, stderr) {

    console.log('Checking local svn info...');

    if(err)         { console.log(err); }
    else if(stdout) { execute(stdout);  }
    else if(stderr) {
        process.exec('svn info', function (err, stdout, stderr) {
            if(err)         { console.log(err);     }
            else if(stdout) { execute(stdout);      }
            else if(stderr) { console.log(stderr);  }
        });
    }
});


var execute = function(output){

    var prefix      = 'release_';
    var releaseId   = 0;

    buildInfoObject(output, function(info){
        if(info.URL.indexOf('/trunk') != -1){
            info.URL = info.URL.replace('/trunk', '')
        }

        console.log('Gathering tags from remote repository...');

        process.exec('svn list ' + info.URL + '/tags', function(err, stdout, stderr){

            if(err)         { console.log(err);     }
            else if(stderr) { console.log(stderr);  }
            else            {
                if(stdout){
                    releaseId = stdout.split('\n').length - 1;
                }

                var trunk   = info.URL + '/trunk';
                var dirName = prefix + releaseId;
                var tag     = info.URL + '/tags/' + dirName;
                var message = '"Creating tag for revision ' + releaseId + '"';
                var command = 'svn copy ' + trunk + ' ' + tag + ' -m ' + message;

                console.log('Copying trunk to tag "' + dirName + '"...');

                process.exec(command, function(err, stdout, stderr){

                    if(err)         { console.log(err);     }
                    else if(stderr) { console.log(stderr);  }
                    else            {
                        var out = stdout.replace('\n', '');
                        console.log('Succesfully copied, ' + out + '...');
                        console.log('Creating temporary file...');
                        fs.writeFile('svn-temporary-file.txt', dirName, function(err){
                            if(err) { console.log(err); }
                            else {
                                console.log('Comitting updated stage file...')
                                console.log('svn copy svn-temporary-file.txt ' + info.URL + '/tags/stage');
                                process.exec('svn copy svn-temporary-file.txt ' + info.URL + '/tags/stage -m "committing a file"', function(err, stdout, stderr){
                                    if(err)         { console.log(err);     }
                                    else if(stderr) { console.log(stderr);  }
                                    else            {
                                        console.log(stdout);
                                        console.log('FIN!');
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });
};


var buildInfoObject = function(stdout, next){
    var info    = {};
    var splits  = stdout.split('\n');

    for(var i=0; i<splits.length; i++){
        var property = splits[i].split(':');
        if(splits.length > 2){
            info[property.shift()] = property.join(':');
        } else {
            info[property[0]] = property[1];
        }
    }

    next(info);
};