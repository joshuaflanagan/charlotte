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
  self.lastChecked = ko.observable(new Date());
  self.isBuilding = ko.observable(false);
  self.buildStarted = ko.observable(new Date(0));
  self.buildEstimate = ko.observable(new Date(0));
  self.pollingError = ko.observable(false);
  self.pollingFrequency = frequency;
  self.interval = undefined;

  self.update = function(data) {
    var last = data.lastBuild;
    self.pollingError(false);
    self.name(humanize(data.name));
    self.description(data.description);
    self.isBuilding(last.building);
    self.buildStarted(new Date(last.timestamp));
    self.buildEstimate(new Date(last.timestamp + last.estimatedDuration));
    self.status(data.lastCompletedBuild.result);
    console.log("Check " + self.name() + " again in " + self.pollingFrequency + " seconds");
  };

  self.fetch = function() {
    console.log("Retrieving state for " + self.name());
    var twoSeconds = 2 * 1000;
    $.ajax({
      url: self.url(),
      data: null,
      timeout: twoSeconds,
      success: function(data) {
        console.log("Data received for " + self.name());
        self.pollingError(false);
        self.update(data)
      },
      error: function(request, status, errorThrown) {
        console.log("Error while checking " + self.name());
        self.pollingError(true);
      },
      complete: function() {
        self.lastChecked(new Date());
      },
      dataType: "jsonp"
    });
  }

  self.stop = function() {
    clearInterval(self.interval);
  }

  self.start = function() {
    console.log("Starting " + self.name());
    self.stop();
    self.fetch();
    self.interval = setInterval(function(){ self.fetch() }, self.pollingFrequency * 1000);
  }

}

function FormViewModel(charlotte) {

  var self = this;

  self.charlotte = charlotte;
  self.visible = ko.observable(false);
  self.text    = ko.observable("+");
  self.url     = ko.observable();
  self.polling = ko.observable(30);

  self.add = function() {
    var build = new Build(self.url(), self.polling());
    console.log("Adding new build " + build.url());
    charlotte.addBuild(build);
    self.reset();
  }

  self.toggle = function() {
    if (self.visible() === true) {
      self.visible(false);
      self.text("+");
    } else {
      self.visible(true);
      self.text("-");
      self.reset();
    }
  }

  self.reset = function() {
    self.url(null);
    self.polling(30);
    $(".jobUrl").focus();
  }

}

function Clock() {
  var self = this;

  self.time = ko.observable(new Date());
  self.interval = null;

  self.tick = function() {
    self.time(new Date());
  }

  self.start = function() {
    var oneSecond = 1000;
    self.interval = setInterval(function(){ self.tick() }, oneSecond);
  }
}

function CharlotteViewModel() {
  var self = this;

  self.form = new FormViewModel(self);
  self.clock = new Clock();

  self.urlToAdd = ko.observable();
  self.pollingForBuild = ko.observable(30);
  self.formShowing = ko.observable(false);

  self.storedBuilds = function() {
    var ci_builds = localStorage["ci-builds"],
        urls = "[]";
    if ((typeof ci_builds !== "undefined") && (ci_builds !== "undefined")) {
      urls = ci_builds;
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
    return latest > 0 ? new Date(latest).formatted() : new Date().formatted();
  });

  self.save = function(){
    localStorage["ci-builds"] = ko.toJSON(self.storage());
  }

  self.addBuild = function(build) {
    build.start();
    self.builds.push(build);
    self.save();
  }

  self.removeBuild = function(build) {
    build.stop();
    console.log("Build " + build.name() + " was Removed");
    self.builds.remove(build);
    self.save();
  }

  self.initAll = function(){
    console.log("Initializing all...");
    ko.utils.arrayForEach(self.builds(), function(build){
      build.start();
    });
    self.clock.start();
  }

  self.initAll();
}

Date.prototype.isSameDay = function(other){
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
  var datePart = (alwaysShowDate || this.isSameDay(new Date())) ? '' : ' on ' + (this.getMonth() + 1) + '/' + pad(this.getDate());
  return hours + ':' + pad(this.getMinutes()) + ':' + pad(this.getSeconds()) + ' ' + ampm + datePart;
}

