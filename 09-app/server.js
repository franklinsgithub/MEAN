// BASE SETUP
// =========================

var User = require('./09-app/models/user');

// CALL THE PACKAGES
// =========================
var express		= require('express');
var app			= express();
var bodyParser	= require('body-parser');
var morgan		= require('morgan');
var mongoose	= require('mongoose');
var port		= process.env.PORT || 8080;
var User		= require('./models/user');
var jwt			= require('jsonwebtoken');
var superSecret	= 'ilovescotchscotchyscotchscotch';
mongoose.connect('mongodb://localhost:27017/localdb');

// APP CONFIG
// =========================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// configure our app to handle CORS requests
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET', 'POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization');
	next();
});


// log all requests to console
app.use(morgan('dev'));

// ROUTES FOR OUR API
// =============================

// basic route for the home page
app.get('/', function(req, res) {
	res.send('Welcome to the home page!');
});

// get an instance of the express router
var apiRouter = express.Router();

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRouter.post('/authenticate', function (req, res) {
	// find the user
	// select the name username and password explicitly
	User.findOne({
		username: req.body.username
	}).select('name username password').exec(function(err, user) {
		if(err) throw err;
		//no user with that username was found
		if(!user) {
			res.json({
				success: false,
				message: 'Authentication failed. User not found.'
			});
		} else if (user) {
			// check if password matches
			var validPassword = user.comparePassword(req.body.password);
			if(!validPassword) {
				res.json({
					success: false,
					message: 'Authentication failed. Wrong password.'
				});
			} else {
				// if user is found and password is right
				// create a token
				var token = jwt.sign({
					name: user.name,
					username: user.username
				}, superSecret, {
					expiresInMinutes: 1440 // expires in 24 hours
				});
				//return the information including token as JSON
				res.json({
					success: true,
					message: 'Enjoy your token!',
					token: token
				});
			}
		}
	});
});

// route middleware to verify a token
apiRouter.use(function(req, res, next) {
	// check header or url parameters or post parameters for token
	var token = req.body.token || req.query.token || req.headers['x-access-token'];
	// decode token
	if(token) {
		// verifies secret and checks exp
		jwt.verify(token, superSecret, function(err, decoded) {
			if (err) {
				return res.status(403).send({
					success: false,
					message: 'Failed to authenticate token.'
				});
			} else {
				// everything is good, save to request for user in other routes
				req.decoded = decoded;
				next();
			}
		});
	} else {
		// if there is no token
		// return an HTTP response of 403 (access forbidden) and an error message
		return res.status(403).send({
			success: false,
			message: 'No token provided.'
		});
	}
})

// test route to make sure everything is working
// accessed at GET http://localhost:8080/api
apiRouter.get('/', function(req, res) {
	res.json({ message: 'hooray! welcome to our api!' });
});

apiRouter.route('/users')
	.post(function(req, res) {
		var user = new User();
		user.name = req.body.name;
		user.username = req.body.username;
		user.password = req.body.password;
		user.save(function(err) {
			if (err) {
				// duplicate entry
				if(err.code == 11000)
					return res.json({ success: false, message: 'A user with that username already exists.'});
				else
					return res.send(err);
			}
			res.json({ message: 'User created!'});
		});
	})
	.get(function(req, res) {
		User.find(function(err, users) {
			if(err) res.send(err);
			res.json(users);
	})
})

apiRouter.route('/users/:user_id')
	.get(function(req, res) {
		User.findById(req.params.user_id, function(err, user) {
			if(err) res.send(err);
			res.json(user);
		})
	})
	.put(function(req, res) {
		//use our user model to find the user we want
		User.findById(req.params.user_id, function(err, user) {
			if(err) res.send(err);

			//update the users info only if it's new
			if (req.body.name) user.name = req.body.name;
			if (req.body.username) user.username = req.body.username;
			if (req.body.password) user.password = req.body.password;

			// save the user
			user.save(function(err) {
				if (err) res.send(err);
				// return a message
				res.json({ message: 'User updated!'});
			});
		});
	})
	.delete(function(req, res) {
		User.remove({
			_id: req.params.user_id
		}, function(err, user) {
			if (err) return res.send(err);
			res.json({ message: "Successfully deleted!" });
		});
	});

// api endpoint to get user information
apiRouter.get('/me', function(req, res) {
	res.send(req.decoded);
});

// more routes for our API will happen here

// REGISTER OUR ROUTES
// all of our routes will be prefixed with /api
app.use('/api', apiRouter);

// START THE SERVER
// ====================================
app.listen(port);
console.log('Magic happens on port ' + port);
