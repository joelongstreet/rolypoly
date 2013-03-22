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
var prefix  = 'release_';

var getNextTagIndex = function(earl, next){

    process.exec('svn list ' + earl + '/tags', function(err, stdout, stderr){

        if(err)         { console.log(err);     }
        else if(stderr) { console.log(stderr);  }
        else            {
            if(stdout)  { next(stdout.split('\n').length - 1); }
            else        { next(0); }
        }
    });
};


var makeTag = function(earl, tagName, next){

    var trunk   = earl + '/trunk';
    var tag     = earl + '/tags/' + tagName;
    var message = '"Creating tag ' + tagName + '"';
    var command = 'svn copy ' + trunk + ' ' + tag + ' -m ' + message;

    process.exec(command, function(err, stdout, stderr){

        if(err)         { console.log(err);     }
        else if(stderr) { console.log(stderr);  }
        else            {
            if(next) { next(); }
        }
    });
};


var makeStageFile = function(earl, tagName, next){
    fs.writeFile('svn-temporary-file.txt', tagName, function(err){
        if(err) { console.log(err); }
        else {
            process.exec('svn copy svn-temporary-file.txt ' + earl + tagName + '-m "creating a new stage file"', function(err, stdout, stderr){
                if(err)         { console.log(err);     }
                else if(stderr) { console.log(stderr);  }
                else            {
                    if(next) {next(stdout)}
                }
            });
        }
    });
};


var getSVNinfo = function(next){

    process.exec('git svn info', function (err, stdout, stderr) {

        if(err)         { console.log(err);  }
        else if(stdout) { objectify(stdout); }
        else if(stderr) {
            process.exec('svn info', function (err, stdout, stderr) {
                if(err)         { console.log(err);     }
                else if(stdout) { objectify(stdout);    }
                else if(stderr) { console.log(stderr);  }
            });
        }
    });

    var objectify = function(out){
        var info    = {};
        var splits  = out.split('\n');

        for(var i=0; i<splits.length; i++){
            var property = splits[i].split(':');
            if(splits.length > 2){
                info[property.shift()] = property.join(':');
            } else {
                info[property[0]] = property[1];
            }
        }

        next(info);
    }
};


console.log('Checking local svn info...');

getSVNinfo(function(info){

    var earl = info.URL;
    if(earl.indexOf('/trunk') != -1){ earl = earl.replace('/trunk', ''); }
    console.log('Gathering tags from remote repository...');

    getNextTagIndex(earl, function(index){

        var tagName = prefix + index;
        console.log('Copying trunk to tag "' + tagName + '"...');

        makeTag(earl, tagName, function(){
            console.log('Succesfully created tag... \n Creating temporary file and comitting...');
            makeStageFile(earl, tagName, function(){
                console.log('FIN!');
            });
        });
    });
});