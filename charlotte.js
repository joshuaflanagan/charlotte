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
  self.removed = ko.observable(false);
  self.t = undefined;

  self.update = function(data) {
    self.pollingError(false);
    self.name(humanize(data.name));
    self.description(data.description);
    self.building(data.lastBuild.building);
    self.buildStarted(new Date(data.lastBuild.timestamp));
    self.buildEstimate(new Date(data.lastBuild.timestamp + data.lastBuild.estimatedDuration));
    self.status(data.lastCompletedBuild.result);
    self.lastChecked(new Date());
    console.log("Check " + self.name() + " again in " + self.pollingFrequency + " seconds");
    self.retry();
  };

  self.retry = function() {
    clearTimeout(self.t);
    self.t = setTimeout(function(){ self.retrieve() }, self.pollingFrequency * 1000);
  };

  self.retrieve = function() {
    if (self.removed() === true) {
      console.log("Build " + self.name() + " was Removed");
      clearTimeout(self.t);
      return;
    }

    console.log("Retrieving state for " + self.name());
    $.ajax({
      url: self.url(),
      data: null,
      timeout: (2 * 1000),
      success: function(data) {
        console.log("Data received for " + self.name());
        self.pollingError(false);
        self.update(data)
      },
      error: function(request, status, errorThrown) {
        console.log("Error while checking " + self.name());
        self.pollingError(true);
        self.retry();
      },
      dataType: "jsonp"
    });
  }

}

function CharlotteViewModel() {
  var self = this;

  self.currentTime = ko.observable(new Date().formatted());
  self.urlToAdd = ko.observable();
  self.pollingForBuild = ko.observable(30);
  self.formShowing = ko.observable(false);

  self.storedBuilds = function() {
    var localUrls = window.localStorage["jobUrls"];
    var urls = "[]";
    if (typeof localUrls !== "undefined") {
      urls = localUrls;
    }
    return JSON.parse(urls);
  }

  self.builds = ko.observableArray(
    $.map(self.storedBuilds(), function(data) {
      return new Build(data.url, data.frequency)
    })
  );

  self.storage = ko.computed(function() {
    return $.map(self.builds(), function(build) {
      return {
        "url" : build.baseUrl,
        "frequency" : build.pollingFrequency,
      };
    });
  });

  self.lastUpdate = ko.computed(function(){
    var checkTimes = $.map(self.builds(), function(build) {
      return build.lastChecked()
    });
    var latest = Math.max.apply(Math, checkTimes);
    return latest > 0 ? new Date(latest).formatted() : new Date(0);
  });

  self.save = function(){
    window.localStorage["jobUrls"] = ko.toJSON(self.storage());
  }

  self.toggleForm = function() {
    self.formShowing(!self.formShowing());
  }

  self.formToggleText = function() {
    return (self.formShowing() === true ? "-" : "+");
  }

  self.addBuild = function() {
    console.log("Adding new build " + self.urlToAdd());
    var new_build = new Build(self.urlToAdd(), self.pollingForBuild());
    new_build.retrieve();
    self.builds.push(new_build);
    self.save();
    self.urlToAdd(null);
    self.pollingForBuild(30);
    $(".jobUrl").focus();
  }

  self.removeBuild = function(build) {
    build.removed(true);
    self.builds.remove(build);
    self.save();
  }

  self.initAll = function(){
    console.log("Initializing all...");
    ko.utils.arrayForEach(self.builds(), function(build){
      build.retrieve();
    });
    self.updateTime();
  }

  self.updateTime = function() {
    self.currentTime(new Date().formatted());
    setTimeout(function(){ self.updateTime() }, 1 * 1000);
  }

  self.initAll();
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

