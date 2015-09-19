angular.module('stuffService', [])

.factory('Stuff', function($http) {
	//create the object
	var myFactory = {};

	//a function to get all the stuff
	myFactory.all = function() {
		return $http.get('/api/stuff');
	};

	return myFactory;
});