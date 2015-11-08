'use strict';

/* Controllers */

angular.module('openImageFeed.controllers', [])
    .controller('HomeCtrl', ['$scope','AUTH_EVENTS','AuthService','$mdDialog','$mdToast','$document','$rootScope', function ($scope,AUTH_EVENTS,AuthService,$mdDialog,$mdToast,$document,$rootScope){
        $scope.currentUser = null;
        $scope.isAuthenticated = AuthService.isAuthenticated;

        $scope.getProfile = function(){
            AuthService.profile().then(function(user){
                $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
                $rootScope.$broadcast(AUTH_EVENTS.currentUser,user);
            },function(){
                console.log("Not authenticated");
            });
        };

        $scope.getProfile();

        $scope.setCurrentUser = function (ev,user) {
            $scope.currentUser = user;
        };

        $scope.$on(AUTH_EVENTS.currentUser,$scope.setCurrentUser);

        $scope.showLoginDialog = function() {
            $mdDialog.show({
                controller: LoginController,
                templateUrl: 'partials/login',
                parent: angular.element(document.body),
                clickOutsideToClose:true
            });
        };
        $scope.toastPosition = {
            bottom : false,
            top : true,
            left : true,
            right : false
        };
        $scope.getToastPosition = function() {
            return Object.keys($scope.toastPosition)
                .filter(function(pos) { return $scope.toastPosition[pos]; })
                .join(' ');
        };
        $scope.showSimpleToast = function(ev,message) {
            $mdToast.show(
                $mdToast.simple()
                    .content(message)
                    .position($scope.getToastPosition())
                    .hideDelay(3000)
                    .parent($document[0].querySelector('#toast-parent'))
            );
        };

        $scope.updateActivities = function(){
            $rootScope.$broadcast('updateActivities');
        };
        $scope.$on(AUTH_EVENTS.notAuthenticated,$scope.showLoginDialog);
        $scope.$on(AUTH_EVENTS.sessionTimeout, $scope.showLoginDialog);
        $scope.$on(AUTH_EVENTS.notAuthorized,$scope.showLoginDialog);
        $scope.$on('showToast',$scope.showSimpleToast);

    }])
    .controller('FeedCtrl',['$scope','$http','$rootScope',function($scope,$http,$rootScope){
        $scope.showLoading = true;

        $scope.$on('updateFeed',function(){
            $scope.posts = [];
            $scope.offset = 0;
            $scope.getCount();
        });
        $scope.posts = [];
        $scope.number = 5;
        $scope.offset = 0;
        $scope.numItems = 0;
        $scope.isAlreadyLoading = false;

        $scope.getCount = function(){
            $http.get('/api/posts/count')
                .then(angular.bind(this, function (response) {
                    $scope.numItems = response.data.count;
                    $scope.loadMore();
                }));
        };
        $scope.getCount();

        $scope.loadMore = function(){
            if( $scope.offset >= $scope.numItems || $scope.isAlreadyLoading){
                return;
            }
            $scope.isAlreadyLoading = true;
            $http.get('/api/posts',{
                params: {
                    offset: $scope.offset,
                    number: $scope.number
                }
            })
                .then(function successCallback (response) {
                    $scope.showLoading = false;
                    var array_posts = response.data;
                    $scope.offset += array_posts.length;
                        array_posts.forEach(function(post) {
                        $scope.posts.push(post);
                    });
                    $scope.isAlreadyLoading = false;
                }, function errorCallback(response){
                    $scope.showLoading = false;
                    $rootScope.$broadcast('showToast','Error getting posts');
                });
        };
    }])
    .controller('PostCtrl',['$scope','$http','AuthService','$rootScope','AUTH_EVENTS',function($scope,$http,AuthService,$rootScope,AUTH_EVENTS){
        $scope.showComments = false;
        $scope.isCommentsLoading = false;
        $scope.showAddComment = false;
        $scope.newComment = {};

        $scope.toggleComments = function(post){
            $scope.showComments = ! $scope.showComments;
            if($scope.showComments){
                $scope.getComments(post);
            }
            else{
                $scope.showAddComment = false;
            }
        };
        $scope.upvote = function(post){
            if (!AuthService.isAuthenticated()) {
                $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
            }
            else {
                if(post.upvotes.indexOf($scope.currentUser.id) > -1) {
                    $rootScope.$broadcast('showToast', 'Post already upvoted !');
                }
                else{
                    $http
                        .post('/api/upvote', {post: post._id})
                        .then(function successCallback(response) {
                            if (response.data.status == "ALREADY_UPVOTED") {
                                $rootScope.$broadcast('showToast', 'Post already upvoted !');
                            }
                            else {
                                $scope.post.upvotes.push($scope.currentUser.id);
                                $rootScope.$broadcast('showToast', 'Post upvoted !');
                                $rootScope.$broadcast('updateActivities');
                            }
                        }, function errorCallback(response) {
                            // TODO Show error
                        });
                }
            }
        };
        $scope.downvote = function(post){
            if (!AuthService.isAuthenticated()) {
                $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
            }
            else {
                if(post.downvotes.indexOf($scope.currentUser.id) > -1) {
                    $rootScope.$broadcast('showToast', 'Post already downvoted !');
                }
                else {
                    $http
                        .post('/api/downvote', {post: post._id})
                        .then(function successCallback(response) {
                            if (response.data.status == "ALREADY_DOWNVOTED") {
                                $rootScope.$broadcast('showToast', 'Post already downvoted !');
                            }
                            else {
                                $scope.post.downvotes.push($scope.currentUser.id);
                                $rootScope.$broadcast('showToast', 'Post downvoted !');
                                $rootScope.$broadcast('updateActivities');
                            }
                        }, function errorCallback(response) {
                            // TODO Show error
                        });
                }
            }
        };

        $scope.showAddCommentForm = function(){
            if (!AuthService.isAuthenticated()) {
                event.preventDefault();
                $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
            }
            else {
                $scope.showAddComment = true;
            }
        };

        $scope.addComment = function(isValid){
            if (isValid && !$scope.isCommentsLoading) {
                $scope.uploadComment({content : $scope.newComment.content,post: $scope.post._id});
            }
            else{
                if($scope.isCommentsLoading){
                    $rootScope.$broadcast('showToast','Sending...');
                    $rootScope.$broadcast('updateActivities');
                }
                else if(!isValid){
                    $rootScope.$broadcast('showToast','Invalid comment');
                }
            }
        };
        $scope.uploadComment = function (comment) {
            $scope.isCommentsLoading = true;
            $http
                .post('/api/comment', comment)
                .then(function successCallback(response) {
                    $scope.isCommentsLoading = false;
                    $scope.newComment = {};
                    $scope.showAddComment = false;
                    $rootScope.$broadcast('showToast','Comment added !');
                    $rootScope.$broadcast('updateActivities');
                    $scope.getComments($scope.post)
                }, function errorCallback(response) {
                    $scope.isCommentsLoading = false;
                    $rootScope.$broadcast('showToast','An error occured');
                });
        };

        $scope.getComments = function(post){
            $scope.isCommentsLoading = true;
            $http.get('/api/comments/'+post._id)
                .then(function successCallback(response) {
                    $scope.post.comments = response.data;
                    $scope.isCommentsLoading = false;
                }, function errorCallback(response) {
                    $scope.isCommentsLoading = false;
                    $rootScope.$broadcast('showToast','An error occured');
                });
        }

    }])
    .controller('AddPostCtrl',['$scope','$mdDialog','$rootScope','$document','AuthService','AUTH_EVENTS',function($scope, $mdDialog, $rootScope,$document,AuthService,AUTH_EVENTS){
        $scope.speedDial ={isOpen:false};
        $scope.showAddDialog = function(ev) {
            if (!AuthService.isAuthenticated()) {
                ev.preventDefault();
                $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
            }
            else {
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'partials/dialog',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true
                })
                    .then(function (answer) {
                        $rootScope.$broadcast('showToast','Post added !');
                        $rootScope.$broadcast('updateActivities');
                        $scope.updateFeed();
                    }, function () {
                        // Cancel
                    });
            }
        };
        $scope.updateFeed = function(){
            $rootScope.$broadcast('updateFeed');
            $rootScope.$broadcast('updatePostCount');
            $rootScope.$broadcast('feed_refresh');
        }
    }])
    .controller('ActivityCtrl',['$scope','$http','$interval','$mdDialog','$rootScope','$document','$timeout',function($scope,$http,$interval, $mdDialog, $rootScope,$document,$timeout){

        var ActivityItems = function() {
            /**
             * @type {!Object<?Array>} Data pages, keyed by page number (0-index).
             */
            this.loadedPages = {};
            /** @type {number} Total number of items. */
            this.numItems = 0;
            /** @const {number} Number of items to fetch per request. */
            this.PAGE_SIZE = 20;
            this.fetchNumItems_();
        };
        // Required.
        ActivityItems.prototype.getItemAtIndex = function(index) {
            if(index>this.numItems-1){
                return false;
            }
            var pageNumber = Math.floor(index / this.PAGE_SIZE);
            var page = this.loadedPages[pageNumber];
            if (page) {
                return page[index % this.PAGE_SIZE];
            } else if (page !== null) {
                this.fetchPage_(pageNumber);
            }
        };
        // Required.
        ActivityItems.prototype.getLength = function() {
            return this.numItems;
        };
        ActivityItems.prototype.fetchPage_ = function(pageNumber) {
            // Set the page to null so we know it is already being fetched.
            this.loadedPages[pageNumber] = null;
            // For demo purposes, we simulate loading more items with a timed
            // promise. In real code, this function would likely contain an
            // $http request.
            var offset = pageNumber * this.PAGE_SIZE;
            $http.get('/api/activities',{
                params: {
                    offset:offset,
                    number:this.PAGE_SIZE
                }
            })
                .then(angular.bind(this, function (response) {
                    var array_activities = response.data;
                    this.loadedPages[pageNumber]=[];
                    array_activities.forEach(function(activity) {
                        this.loadedPages[pageNumber].push(activity);
                    },this);
                }));
        };
        ActivityItems.prototype.fetchNumItems_ = function() {
            $http.get('/api/activities/count')
                .then(angular.bind(this, function (response) {
                    this.numItems = response.data.count;
                }));
        };

        $scope.activities = new ActivityItems();

        $scope.updateActivities = function() {
            $http.get('/api/activities/count')
                .then(angular.bind(this, function (response) {
                    if($scope.activities.getLength() != response.data.count){
                        $scope.activities = new ActivityItems();
                    }
                }));
        };
        $scope.updateActivities();
        $interval(function(){
            $rootScope.$broadcast('updateActivities');
        },20000);
        $scope.$on('updateActivities',function(){
            $scope.updateActivities();
        });

    }]);
// Add post dialog
function DialogController($scope, $mdDialog, Upload, $rootScope) {
    $scope.obj = {};
    $scope.hide = function () {
        $mdDialog.hide();
    };
    $scope.cancel = function () {
        $mdDialog.cancel();
    };
    $scope.valid = function(isValid) {
        if (isValid && $scope.file && !$scope.showLoading) {
            $scope.upload($scope.file);
        }
        else{
            if(!$scope.file){
                $rootScope.$broadcast('showToast','An image is required');
            }
            else if($scope.showLoading){
                $rootScope.$broadcast('showToast','Your post is already uploading');
            }
            else if(!isValid){
                $rootScope.$broadcast('showToast','Form invalid');
            }
        }
    };
    $scope.upload = function (file) {
        $scope.showLoading = true;
        Upload.upload({
            url: '/api/post',
            data: {file: file, title: $scope.post.title}
        }).then(function (resp) {
            $scope.showLoading = false;
            $mdDialog.hide(true);
        }, function (resp) {
            $scope.showLoading = false;
            $rootScope.$broadcast('showToast','An error occured, image may be to large');
        }, function (evt) {
            var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
            console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        });
    };
}

// Authenticate dialog
function LoginController($scope,$rootScope, AUTH_EVENTS, AuthService, $mdDialog) {
    $scope.credentials = {
        username: '',
        password: '',
        password_confirm: ''
    };
    $scope.hide = function () {
        $mdDialog.hide();
    };
    $scope.cancel = function () {
        $mdDialog.cancel();
    };
    $scope.validSignin = function(isValid) {
        if (isValid && !$scope.showLoading) {
            $scope.signin($scope.credentials);
        }
        else{
            if($scope.showLoading){
                $rootScope.$broadcast('showToast','Connecting...');
            }
            else if(!isValid){
                $rootScope.$broadcast('showToast','Form invalid');
            }
        }
    };
    $scope.signin = function (credentials) {
        $scope.showLoading = true;
        AuthService.login(credentials).then(function(user){
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            $rootScope.$broadcast(AUTH_EVENTS.currentUser,user);
            $rootScope.$broadcast('showToast',"Hello "+user.username+" !");
            $scope.showLoading = false;
            $scope.hide();
        },function(){
            $scope.showLoading = false;
            $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
            $rootScope.$broadcast('showToast','Bad credentials');
        })
    };
    $scope.validSignup = function(isValid) {
        if (isValid && !$scope.showLoading) {
            $scope.signup($scope.credentials);
        }
        else{
            if($scope.showLoading){
                $rootScope.$broadcast('showToast','Connecting...');
            }
            else if(!isValid){
                $rootScope.$broadcast('showToast','Form invalid');
            }
        }
    };
    $scope.signup = function (credentials) {
        $scope.showLoading = true;
        AuthService.signup(credentials).then(function(user){
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            $rootScope.$broadcast(AUTH_EVENTS.currentUser,user);
            $rootScope.$broadcast('showToast',"Welcome "+user.username+" !");
            $scope.showLoading = false;
            $scope.hide();
        },function(){
            $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
            $scope.showLoading = false;
            $rootScope.$broadcast('showToast','Username already taken');
        })
    };
}
