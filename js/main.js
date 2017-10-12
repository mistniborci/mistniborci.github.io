'use strict';

//TODO url event id
//TODO přehled akcí

/**
 * @ngdoc overview
 * @name mbWeb
 * @description
 * # mbWeb
 * mbWeb main module
 */
angular
    .module('mbWeb', [
        //'ngAnimate',
        //'ngResource',
        'ngRoute'
        //'ngSanitize'
        //'ngTouch'
    ])
    .config(function($routeProvider) {
        console.debug('mbWeb configuration');

        $routeProvider
            .when('/akce', {
                templateUrl: 'views/events.html'
            })
            .when('/onas', {
                templateUrl: 'views/about.html'
            })
            .when('/data', {
                templateUrl: 'views/data.html'
            })
            .otherwise({
                redirectTo: '/akce'
            });
    })
    .constant('constants', {
        iOS: navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false,
        IE: navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0
        //,accessToken: 'CAACEdEose0cBAHQZAZAkUYDCCJKF1awmbd5ZBR8TujUrvFavKd26msnB1gKYDIn9gL5o3ZA643LQqTrcnAF9wjNiblB5PlY2SxCDCwPS4osl9hLEvZAwgW20voGQsZBLVrqQN6DY8aF42lLkFe9sZBoimZCQOdvpBfZCSLgpb1ZAk2jiD6DnAIhDMa8XRZC10DEfXqzcWBpghyq4bSZB7vkmGCg3'
        //https://developers.facebook.com/tools/explorer/
    });

/**
 * @ngdoc function
 * @name mbWeb.controller:MainCtrl
 * @description
 * # MainCtrl
 * Main controller for mbWeb
 */
angular.module('mbWeb')
    .controller('MainCtrl', function($scope, $http, $location, $timeout, $filter, $sce, constants) {

        var current = null;

        var init = function() {
            console.debug('MainCtrl init');

            $scope.events = [];
            $scope.backgroundImage = {};

            if(constants.accessToken) {
                loadFacebookData();
            }
            else {
                loadStaticData(function(events) {
                    $scope.events = events.reverse();
                    //console.debug($scope.events);

                    var now = new Date().getTime();

                    angular.forEach($scope.events, function(event, index) {
                        event.start_time = moment(event.start_time).toDate(); //iPad can't parse new Date('2015-04-17T20:00:00+0200')
                        event.end_time = new Date(event.start_time.getTime());
                        event.end_time.setHours(23,59,59,999);

                        event.description = convertDescription(event.description);

                        if(current === null && now < event.end_time.getTime()) {
                            current = index;
                        }
                    });

                    if(current === null) {
                        current = $scope.events.length - 1;
                    }

                    registerArrowKeys();
                    navigate();
                });
            }
        };

        $scope.page = function(page) {
            console.debug('page', page);

            $location.path(page);
        };

        $scope.isActive = function(page) {
            return page === $location.path();
        };

        $scope.next = function($event) {
            console.debug('next');

            if(last())
                return;

            current++;
            animateTitle();
            navigate();

            if($event)
                $event.currentTarget.blur();
        };

        $scope.prev = function($event) {
            console.debug('prev');

            if(first())
                return;

            current--;
            animateTitle();
            navigate();

            if($event)
                $event.currentTarget.blur();
        };

        var first = function() {
            return current === 0;
        };

        var last = function() {
            return current === $scope.events.length - 1;
        };

        var registerArrowKeys = function() {
            var arrowKeysHandler = function(e) {
                if(e.keyCode === 37) { //left
                    $timeout($scope.prev);
                }
                else if(e.keyCode === 39) { //right
                    $timeout($scope.next);
                }
            };

            var $document = angular.element(document);

            $document.on('keydown', arrowKeysHandler);
            $scope.$on('$destroy',function() {
                $document.off('keydown', arrowKeysHandler);
            });
        };

        var animateTitle = function() {
            var title = angular.element(document.querySelector('#title h1'));
            title.addClass('animated fadeInDown');
            title.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
                title.removeClass('animated fadeInDown');
            });
        };

        var navigate = function() {
            $scope.event = $scope.events[current];
            //console.debug(' event', $scope.event);

            $scope.background = getBackground($scope.event.cover && $scope.event.cover.source);

            if($scope.event.venue.latitude && $scope.event.venue.longitude) {
                $scope.location = $scope.event.venue.latitude + ',' + $scope.event.venue.longitude;
                $scope.googleMap = 'http://maps.googleapis.com/maps/api/staticmap?center=' + $scope.location + '&zoom=16&scale=2&size=640x440&maptype=roadmap&format=png&visual_refresh=true&markers=' + $scope.location;
            }
            else {
                $scope.location = $scope.event.location;
                $scope.googleMap = null;
            }

            $scope.first = first();
            $scope.last = last();
        };

        var getBackground = function(imageUrl) {
            if(imageUrl) {
                var gradient = constants.IE ? '' : 'linear-gradient(rgba(0, 0, 0, 0.5),rgba(0, 0, 0, 0.5)),'; //doesn't work in IE
                var attachment = constants.iOS ? 'scroll' : 'fixed'; //fixed breaks background cover on iPad

                return {
                    'background': gradient + 'url(' + imageUrl + ') no-repeat center center ' + attachment,
                    'background-size': 'cover'
                };
            }
            else {
                return {
                    'background-color': 'black'
                };
            }
        };

        var convertDescription = function(text) {
            if(!text)
                return '';

            var html = '';

            angular.forEach(text.split('\n'), function(line) {

                if(line.startsWith('@[NjQyMT')) { //event 699280483473982, 325635177642308
                    line = line.slice(line.lastIndexOf('http'));
                    line = line.substring(0, line.indexOf(']'));
                }

                if(line.startsWith('http')) {
                    /*if(line.indexOf('youtube.com') > -1) {
                        line = '<iframe type="text/html" width="640" height="390" src="' + line + '?origin=http://mistniborci.cz&output=embed" frameborder="0"/>';
                    }
                    else */{
                        line = '<a href="' + line + '" target="_blank">' + line + '</a>';
                    }
                }

                html = html.concat(line + '<br/>');
            });

            /*var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            text = text.replace(exp, '<a href="$1" target="_blank">$1</a>');*/

            //text = $filter('linky')(text, '_blank');
            //text = text.replace(/\n/g, '<br/>');

            return $sce.trustAsHtml(html);
        };

        /*
         * Load data
         */

        var loadStaticData = function(success) {
            console.debug('loadStaticData');

            $http.get('data/events.json').then(
                function(response) {
                    console.debug(' success');

                    success(response.data);
                },
                function(response) {
                    console.error(' error');
                }
            )
            .finally(function() {
                console.debug(' finally');
            });
        };

        var loadFacebookData = function() {
            getEvents();
        };

        var getEvents = function(url) {
            console.debug('getEvents', url);

            var parameters = {
                access_token: constants.accessToken,
                since: 0
            };

            $http({
                method: 'GET',
                url: url ? url : 'https://graph.facebook.com/MistniBorci/events',
                params: url ? '' : parameters
            })
            .then(
                function(response) {
                    console.debug(' success', response.data);

                    createEvents(response.data);

                    if(response.data.paging.next) {
                        getEvents(response.data.paging.next);
                    }
                },
                function(response) {
                    console.error(' error');
                }
            )
            .finally(function() {
                console.debug(' finally');
            });
        };

        var getEvent = function(event) {
            console.debug('getEvent');

            var parameters = {
                access_token: constants.accessToken,
                fields: 'cover,description,venue'
            };

            $http({
                method: 'GET',
                url: 'https://graph.facebook.com/' + event.id,
                params: parameters
            })
            .then(
                function(response) {
                    console.debug(' success');

                    createEvent(event, response.data);
                },
                function(response) {
                    console.error(' error');
                }
            )
            .finally(function() {
                console.debug(' finally');
            });
        };

        var createEvents = function(data) {
            console.debug('createEvents', data);

            $scope.events = $scope.events.concat(data.data);

            angular.forEach($scope.events, function(event) {
                getEvent(event);
            });
        };

        var createEvent = function(event, data) {
            console.debug('createEvent', event, data);

            angular.extend(event, data);
        };

        init();
    });

/* ==========================================================================
   ECMAScript 6 polyfills
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
   ========================================================================== */

if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function (searchString, position) {
      position = position || 0;
      return this.lastIndexOf(searchString, position) === position;
    }
  });
}
