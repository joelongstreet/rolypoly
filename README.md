# RolyPoly

RolyPoly is a command line utility which helps you quickly create SVN tags intended for stage rolls.


## About

I'm certainly not an SVN expert, but my current company uses it for the majority of their code repositories. Creating tags for stage rolls was a manual process and kind of a pain, RolyPoly is my attempt to make it easier.

The script assumes a standard SVN configuration:

    /project_root
        /branches
        /tags
            stage
        /trunk

Where `stage` is a single line text file containing the name of the tag which will go to the stage server. We usually have some form of auto deploy working, so running `rolypoly` will automatically deploy to a stage server.


## Install

`npm install rolypoly`


## Usage

To use, first `cd` into a either a working SVN or Git SVN repository. From there, just run the command `rolypoly`. By default RolyPoly will name the tag `release_X`, where X is an automatically generated release number based on the number of releases in the tags directory.

If you don't want RolyPoly to automatically generate a release name, you can specify your own by passing in a flag. Sample: `rolypoly -t someTagName_201303221540`.

If there are additional commands you want to run before or after each roll 
(like clearing cache or putting the site into maintenance mode), you 
can associate these by adding .rolypoly file to the home directory on your machine.
The contents would look like this:

    {
	"https://svn.example.com/repos/myproject/tags/stage":{
            "afterRoll":"drush @stg updb -y; drush @stg fra -y; drush @stg cc all;"
	}
        "https://svn.example.com/repos/myproject/tags/dev":{
            "afterRoll":"drush @dev updb -y; drush @dev cc all;"
	}
        "https://svn.example.com/repos/anotherproject/tags/stage":{
            "beforeRoll": "drush @stg vset site_offline 1"
            "afterRoll":"drush @stg vset site_offline 0"
	}
    }

Where `https://svn.example.com/repos/myproject/tags/stage` is the path to an SVN
roll file and the values of `beforeRoll` and `afterRoll` are the shell commands
to execute before and after the roll.