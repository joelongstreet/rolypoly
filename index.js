var fs      = require('fs');
var cp      = require('child_process');
var path    = require('path');
var prefix  = 'release_';


var getNextTagIndex = function(earl, next){

    var command = 'svn list ' + earl + '/tags';
    shellCommand(command, function(stdout){
        if(stdout)  { next(stdout.split('\n').length - 1); }
        else        { next(0); }
    });
};


var makeTag = function(earl, tagName, next){

    var trunk   = earl + '/trunk';
    var tag     = earl + '/tags/' + tagName;
    var message = '"Creating tag ' + tagName + '"';
    var command = 'svn copy ' + trunk + ' ' + tag + ' -m ' + message;

    shellCommand(command, function(){
        if(next) { next(); }
    });
};


var makeStageFile = function(earl, tagName, next){

    var localPath       = path.join(process.env['HOME'], '.rollin');
    var stageFilePath   = path.join(localPath, 'stage');

    fs.mkdir(localPath, 0777, function(){
        checkout(function(){
            createFile(function(){
                writeToFile(function(){
                    commitFile(function(){
                        cleanUp(function(){
                            if(next) { next(); }
                        });
                    });
                });
            });
        });
    });

    var checkout = function(next){
        var command = 'svn co ' + earl + '/tags --depth files ' + localPath;
        shellCommand(command, function(){
            if(next) { next(); }
        });
    };

    var createFile = function(next){
        fs.exists(stageFilePath, function(exists){
            if(!exists){
                fs.writeFile(stageFilePath, function(){
                    addFile(function(){
                        if(next) { next(); }
                    });
                });
            } else { if(next) { next(); } }
        });
    };

    var addFile = function(next){
        var command = 'svn add ' + stageFilePath;
        shellCommand(command, function(){
            if(next) { next(); }
        });
    };

    var writeToFile = function(next){
        var buffer = new Buffer(tagName);
        var stream = fs.createWriteStream(stageFilePath);
        stream.on('open', function(data){
            stream.write(buffer);
            stream.end();
            if(next) { next(); }
        });
    };

    var commitFile = function(next){
        var command = 'svn commit ' + stageFilePath + ' -m "creating a new stage file for release ' + tagName + '"';
        shellCommand(command, function(){
            if(next) { next(); }
        });
    };

    var cleanUp = function(next){
        var command = 'rm -rf ' + localPath;
        shellCommand(command, function(){
            if(next) { next(); }
        });
    }
};


var shellCommand = function(command, next, errHandler){

    cp.exec(command, function(err, stdout, stderr){
        if(err) {
            if(errHandler)  { errHandler();         }
            else            { console.log(err);     }
        } else if(stderr) {
            if(errHandler)  { errHandler()          }
            else            { console.log(stderr);  }
        } else {
            if(next) {next(stdout)}
        }
    });
}


var getSVNinfo = function(next){

    var tryGitSvn = function(){
        shellCommand('git svn info', function(stdout){
            objectify(stdout);
        });
    };

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

    shellCommand('svn info', function(stdout){objectify(stdout)}, tryGitSvn);
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