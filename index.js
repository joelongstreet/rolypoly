#!/usr/bin/env node

var fs      = require('fs');
var cp      = require('child_process');
var path    = require('path');
var color   = require('cli-color');

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

    var localPath       = path.join(process.env['HOME'], '.rolypoly_tmp_checkout');
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
        console.log(color.cyan('Creating a temporary checkout at ') + color.green('~/.rolypoly_tmp_checkout') + color.cyan('...'));
        var command = 'svn co ' + earl + '/tags --depth files ' + localPath;
        shellCommand(command, function(){
            if(next) { next(); }
        });
    };

    var createFile = function(next){
        fs.exists(stageFilePath, function(exists){
            if(!exists){
                console.log(color.yellow('No stage file found, creating one...'))
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
        console.log(color.cyan('Writing stage file...'))
        var buffer = new Buffer(tagName);
        var stream = fs.createWriteStream(stageFilePath);
        stream.on('open', function(data){
            stream.write(buffer);
            stream.end();
            if(next) { next(); }
        });
    };

    var commitFile = function(next){
        console.log(color.cyan('Comitting updated stage file...'));
        var command = 'svn commit ' + stageFilePath + ' -m "creating a new stage file for release ' + tagName + '"';
        shellCommand(command, function(){
            if(next) { next(); }
        });
    };

    var cleanUp = function(next){
        console.log(color.cyan('Cleaning up temporary files...'))
        var command = 'rm -rf ' + localPath;
        shellCommand(command, function(){
            if(next) { next(); }
        });
    }
};


var shellCommand = function(command, next, errHandler){
    if (command) {
        cp.exec(command, function(err, stdout, stderr){
            if(err) {
                if(errHandler)  { errHandler();         }
                else            { printError(err);     }
            } else if(stderr) {
                if(errHandler)  { errHandler()          }
                else            { printError(stderr);  }
            } else {
                if(next) {next(stdout)}
            }
        });
    }
    else if (next) {next();}
}

var printError = function(err){
    console.log('\n');
    console.log(color.red.bold(err));
};


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


var printHelp = function(){
    console.log('\nUsage: rolypoly [options]');
    console.log('\nOptions:');
    console.log('  -t, --tagname        set the name of the tag to be created');
    console.log('  -h, --help           see help');
    console.log('\nDocumentation at https://github.com/joelongstreet/rolypoly')
};

var executeScript = function(tagName){

    console.log(color.cyan('Checking local svn info...'));

    getSVNinfo(function(info){

        var earl = info.URL;
        if(earl.indexOf('/trunk') != -1){
            var trunkIndex = earl.indexOf('/trunk');
            var substring  = earl.substring(trunkIndex, earl.length);
            earl = earl.replace(substring, '')
        }

        console.log(color.cyan('Gathering tags from remote repository...'));

        getNextTagIndex(earl, function(index){

            if(process.env.TAGNAME != undefined) {
                tagName = process.env.TAGNAME;
            }
            if(!tagName) { 
                var size = 3;
                var s = index+"";
                while (s.length < size) s = "0" + s;
                tagName = 'release_' + s;
            }

            console.log(color.cyan('Copying trunk and creating tag ') + color.green(tagName) + color.cyan('...'));
            
            makeTag(earl, tagName, function(){
                getConfigVariable(earl, 'beforeRoll', function(value) {
                    if (value) { console.log(color.cyan('Running beforeRoll commands ') + color.green(value) + color.cyan('...')); }
                    shellCommand(value, function(stdout){ 
                        console.log(stdout); 
                        
                        makeStageFile(earl, tagName, function(){
                            console.log(color.green('Successfully wrote tag ') + color.magenta(tagName));

                            getConfigVariable(earl, 'afterRoll', function(value) {
                                if (value) { console.log(color.cyan('Running afterRoll commands ') + color.green(value) + color.cyan('...')); }
                                shellCommand(value, function(stdout){ console.log(stdout); });
                            });
                        });
                    });
                });
            });           
        });
    });
};

var getConfigVariable = function(earl, variableName, next) {
    var configFile = path.join(process.env['HOME'], '.rolypoly');
    fs.exists(configFile, function (exists) {
        if (exists) {
            fs.readFile(configFile, 'utf8', function (err, data) {
                if (err) printError(err);
                data = JSON.parse(data);
                value = data[earl.trim() + '/tags/stage'][variableName];
                if (next) { next(value); }
                else return value;
            });
        } else {
            if (next) { next(); }
        }
    }); 
}

var args = process.argv;
if(args.indexOf('-h') != -1){
    printHelp();
} else if(args.indexOf('--help') != -1){
    printHelp();
} else if(args.indexOf('-t') != -1){
    var index = args.indexOf('-t') + 1;
    executeScript(args[index]);
} else if(args.indexOf('--tagname') != -1){
    var index = args.indexOf('--tagname') + 1;
    executeScript(args[index]);
} else {
    executeScript();
}
