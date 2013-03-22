var fs      = require('fs');
var cp      = require('child_process');
var path    = require('path');
var prefix  = 'release_';

var getNextTagIndex = function(earl, next){

    cp.exec('svn list ' + earl + '/tags', function(err, stdout, stderr){

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

    cp.exec(command, function(err, stdout, stderr){

        if(err)         { console.log(err);     }
        else if(stderr) { console.log(stderr);  }
        else            {
            if(next) { next(); }
        }
    });
};


var makeStageFile = function(earl, tagName, next){
    var localPath       = path.join(process.env['HOME'], '.rollin/tags');
    var stageFilePath   = path.join(localPath, 'stagefile');

    fs.exists(localPath, function(exists){
        if(exists == false) { fs.mkdir(localPath, 0777, checkout); }
        else checkout()
    });

    var checkout = function(){
        var command = 'svn co ' + earl + '/tags --depth=empty ' + localPath;
        cp.exec(command, function(err, stdout, stderr){
            if(err)         { console.log(err);     }
            else if(stderr) { console.log(stderr);  }
            else            { writeFile();      }
        });
    };

    var writeFile = function(){
        fs.writeFile(stageFilePath, tagName, function(err){
            if(err) { console.log(err); }
            else    { addFile();        }
        });
    };

    var addFile = function(){
        var command = 'svn add ' + stageFilePath;
        cp.exec(command, function(err, stdout, stderr){
            console.log('adding file');
            if(err)         { console.log(err);     }
            else if(stderr) { console.log(stderr);  }
            else            { commitFile()          }
        });
    };

    var commitFile = function(){
        var command = 'svn commit ' + localPath + ' -m "creating a new stage file for release ' + tagName + '"';
        cp.exec(command, function(err, stdout, stderr){
            console.log('comitting file');
            if(err)         { console.log(err);     }
            else if(stderr) { console.log(stderr);  }
            else            {
                if(next) {next()}
            }
        });
    };
};


var getSVNinfo = function(next){

    cp.exec('git svn info', function (err, stdout, stderr) {

        if(err)         { console.log(err);  }
        else if(stdout) { objectify(stdout); }
        else if(stderr) {
            cp.exec('svn info', function (err, stdout, stderr) {
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
            console.log('Updating stage file and comitting...');
            makeStageFile(earl, tagName, function(){
                console.log('FIN!');
            });
        });
    });
});