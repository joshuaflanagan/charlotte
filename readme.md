# Charlotte
A single-page [information radiator](http://alistair.cockburn.us/Information+radiator) display for the [Jenkins](http://jenkins-ci.org/)
continuous integration server.

![Charlotte's Web "Radiant" display](http://images.cafepress.com/image/22669672_400x400.jpg)

## Installation

1. Open `index.html` in a browser (no server needed, run as a local
   file)
2. On the Configuration screen, add your job URLs in the form: `http://ciserver/job/jobname/`.
This is the same URL you would see in your browser when viewing the job
from the Jenkins dashboard.

3. Click the *Close* button. Your browser will refresh, and should start
   polling the CI server for each of the jobs you added.

***

Inspired by Avishek Sen Gupta's [jquery-jenkins-radiator](https://github.com/asengupta/jquery-jenkins-radiator).

Copyright (C) 2012 Joshua Flanagan

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
