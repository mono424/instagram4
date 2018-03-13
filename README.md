# Welcome to Instagram4

Hey, this is human acting Instagram Bot, which pretends activity on Instagram so you gain followers withouts doing anything. **Instagram4** is able to like stuff & follow persons in areas you define.

## Get Started!

All you need to do is creating two config files.

The first will be the **cred.js** file. You can just copy *cred.exmaple.js* and rename it to *cred.js*. After that fill in your information, the file could look like that:

    module.exports = {
	    user: "instagram4",
	    pass: "secretpasswd312",
    };

The second file, **config.js**, stores the behavior of the bot. You can copy *config.example.js* and rename it to *config.js*. The config file could look like that:

    module.exports = {
	    
	    // Related Tags
	    tags: [ 
		    "picoftheday", 
		    "like4like", 
		    "follow4follow" 
	    ],
	    
	    // Enable Track & Auto Delete Duration 
	    trackLikes: true, 
	    trackFollows: true, 
	    followDuration: 6 * 60 * 60 * 1000, 
	    likeDuration: 2 * 60 * 60 * 1000, 
	    
		// Max Delayed Time for each delete request for more human delete actions 
		unfollowTime: 5000, 
		unlikeTime: 20000, 
		// Display of Status 
		statusRate: 3 * 60 * 1000, 

		// Like & Follow Session Settings 
		sessionDuration: 30 * 60 * 1000, 
		maxLikesPerSession: 60, 
		maxFollowsPerSession: 4, /* keep this low to avoid getting banned ! */
		maxTagsCombined: 10, 

		// Max Session Delays 
		maxFollowSessionDelay: 2 * 60 * 60 * 1000, 
		maxLikeSessionDelay: 2 * 60 * 60 * 1000, 

		// Start Delay 
		startLikeDelay: 5 * 1000, 
		startFollowDelay: 5 * 1000,
	};
And after setting it up, just run following in terminal:

    npm i && npm run start
to install the dependencies & run it.

## Sorry but no sorry
I quickly made this in my freetime, so **sorry for the lack of documentation**, feel free to **contribute and improve** this bot.

*Made with **<3** by mono424.*
