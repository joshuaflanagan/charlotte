var Build = function(baseUrl){
  this.baseUrl = baseUrl;
  this.url = baseUrl + "api/json?tree=description,lastBuild[building,timestamp,estimatedDuration],healthReport[description,url,score],lastSuccessfulBuild[timestamp],changeSet[items[id,comment]],lastCompletedBuild[result,culprits[fullName]]&jsonp=?"
  this.name = ko.observable(baseUrl);
  this.status = ko.observable("UNKNOWN");
  this.lastChecked = ko.observable();
  this.building = ko.observable(false);
  this.buildStarted = ko.observable(new Date(0));
  this.buildEstimate = ko.observable(new Date(0));
  this.pollingError = ko.observable(false);
}

function CharlotteViewModel(urls, pollingFrequency) {
  var self = this;
  this.jobUrls = ko.observableArray(urls);
  this.pollingFrequency = ko.observable(pollingFrequency);
  this.builds = ko.observableArray($.map(self.jobUrls(), function(url) { return new Build(url) }));
  this.currentTime = ko.observable(new Date().formatted());
  this.configVisible = ko.observable(!urls.length);
  this.lastUpdate = ko.computed(function(){
    var checkTimes = $.map(self.builds(), function(build) { 
      return build.lastChecked() 
    });
    var latest = Math.max.apply(Math, checkTimes);
    return latest > 0 ? new Date(latest).formatted() : new Date(0);
  });

  this.showConfig = function(){ self.configVisible(true); }
  this.hideConfig = function(){ 
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
      self.retrieveBuildState(build);
    });
    self.updateTime();
  }

  this.updateTime = function() {
    self.currentTime(new Date().formatted());
    setTimeout(function(){ self.updateTime() }, 1 * 1000);
  }

  this.retrieveBuildState = function(build){
    console.log("retrieving state for " + build.url);
    $.ajax({
      url: build.url,
      data: null,
      //timeout: this.timeout,
      success: function(data) { self.updateBuild(build, data) },
      error: function(request,status,errorThrown) { 
        console.log("error while checking " + build.url);
        build.pollingError(true);
      },
      dataType: "jsonp"
    });
  }

  this.updateBuild = function(build, data){
    console.log("data received for " + build.url);
    build.pollingError(false);
    build.name(data.description);
    build.building(data.lastBuild.building);
    build.buildStarted(new Date(data.lastBuild.timestamp));
    build.buildEstimate(new Date(data.lastBuild.timestamp + data.lastBuild.estimatedDuration));
    build.status(data.lastCompletedBuild.result);
    build.lastChecked(new Date());
    console.log("check " + build.name() + " again in " + self.pollingFrequency() + " seconds");
    setTimeout(function(){ self.retrieveBuildState(build) }, self.pollingFrequency() * 1000);
  };

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

