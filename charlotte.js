var humanize = function(string) {
  string = $.trim(string);
  var terms = string.split('_');

  for(var i=0; i < terms.length; i++){
    terms[i] = terms[i].charAt(0).toUpperCase() + terms[i].slice(1);
  }

  return terms.join(' ');
}

var massageUrl = function(url_string) {
  var url = $.trim(url_string).toLowerCase();
  if (!!url.match(/\/$/) === true) {
    return url;
  } else {
    return url + "/";
  }
}

var Build = function(baseUrl, frequency){

  var self = this;

  self.baseUrl = massageUrl(baseUrl);
  self.url = ko.observable(self.baseUrl + "api/json?tree=name,description,lastBuild[building,timestamp,estimatedDuration],healthReport[description,url,score],lastSuccessfulBuild[timestamp],changeSet[items[id,comment]],lastCompletedBuild[result,culprits[fullName]]&jsonp=?");
  self.name = ko.observable(baseUrl);
  self.description = ko.observable("(no description)");
  self.status = ko.observable("UNKNOWN");
  self.lastChecked = ko.observable();
  self.building = ko.observable(false);
  self.buildStarted = ko.observable(new Date(0));
  self.buildEstimate = ko.observable(new Date(0));
  self.pollingError = ko.observable(false);
  self.pollingFrequency = frequency;

  self.update = function(data) {
    self.pollingError(false);
    self.name(humanize(data.name));
    self.description(data.description);
    self.building(data.lastBuild.building);
    self.buildStarted(new Date(data.lastBuild.timestamp));
    self.buildEstimate(new Date(data.lastBuild.timestamp + data.lastBuild.estimatedDuration));
    self.status(data.lastCompletedBuild.result);
    self.lastChecked(new Date());
    console.log("check " + self.name() + " again in " + self.pollingFrequency + " seconds");
    setTimeout(function(){ self.retrieve() }, self.pollingFrequency * 1000);
  };

  self.retrieve = function() {
    console.log("retrieving state for " + self.url());
    $.ajax({
      url: self.url(),
      data: null,
      success: function(data) {
        console.log("data received for " + self.url());
        self.update(data)
      },
      error: function(request, status, errorThrown) {
        console.log("error while checking " + self.url());
        self.pollingError(true);
      },
      dataType: "jsonp"
    });
  }

}

function CharlotteViewModel(urls, pollingFrequency) {
  var self = this;
  this.jobUrls = ko.observableArray(urls);
  this.pollingFrequency = ko.observable(pollingFrequency);
  this.builds = ko.observableArray($.map(self.jobUrls(), function(url) { return new Build(url, this.pollingFrequency) }));
  this.currentTime = ko.observable(new Date().formatted());
  this.configVisible = ko.observable(!urls.length);
  this.lastUpdate = ko.computed(function(){
    var checkTimes = $.map(self.builds(), function(build) {
      return build.lastChecked()
    });
    var latest = Math.max.apply(Math, checkTimes);
    return latest > 0 ? new Date(latest).formatted() : new Date(0);
  });

  this.addBuildUrl = function(){
    console.log("adding build");
    self.jobUrls.push(self.urlToAdd());
  }

  this.showConfig = function(){ self.configVisible(true); }
  this.hideConfig = function(){ self.configVisible(false); }

  this.updateConfig = function(){
    window.localStorage["jobUrls"] = ko.toJSON(self.jobUrls());
    window.localStorage["pollingFrequency"] = ko.toJSON(self.pollingFrequency());
    window.location.reload(false);
  }

  this.urlToAdd = ko.observable();
  this.addUrl = function() {
    console.log("adding url");
    self.jobUrls.push(self.urlToAdd())
    self.urlToAdd(null);
  }
  this.removeUrl = function(url) {
    self.jobUrls.remove(url);
  }

  this.initAll = function(){
    console.log("initializing all...");
    ko.utils.arrayForEach(self.builds(), function(build){
      build.retrieve();
    });
    self.updateTime();
  }

  this.updateTime = function() {
    self.currentTime(new Date().formatted());
    setTimeout(function(){ self.updateTime() }, 1 * 1000);
  }

  this.initAll();
}

Date.prototype.sameDay = function(other){
  if (other.getYear() != this.getYear()) return false;
  if (other.getMonth() != this.getMonth()) return false;
  if (other.getDate() != this.getDate()) return false;
  return true;
}
Date.prototype.formatted = function(alwaysShowDate){
  function pad(n){return n<10 ? '0'+n : n}
  var hours = this.getHours();
  var ampm = "am";
  if (hours > 12) {
    hours = hours - 12;
    ampm = "pm"
  }
  alwaysShowDate = typeof alwaysShowDate !== 'undefined' ? alwaysShowDate : false;
  var datePart = (alwaysShowDate || this.sameDay(new Date())) ? '' : ' on ' + (this.getMonth() + 1) + '/' + pad(this.getDate());
  return hours + ':' + pad(this.getMinutes()) + ':' + pad(this.getSeconds()) + ' ' + ampm + datePart;
}

