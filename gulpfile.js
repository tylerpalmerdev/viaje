// -- PACKAGE DEPENDENCIES -- //
// include all packages
var gulp = require('gulp');
var concat = require('gulp-concat');
var annotate = require('gulp-ng-annotate');
var plumber = require('gulp-plumber');
var watch = require('gulp-watch');
var sass = require('gulp-sass');
var path = require('path');

// -- VARIABLES -- //

// obj to note paths to js & sass files you want to compile
var paths = {
  jsSource: ['./app/**/*.js'],
  sassSource: ['./styles/**/*.scss'],
  paths: [ path.join(__dirname, 'styles') ]
};

// obj to note options for sass
var sassOptions = {
  errLogToConsole: true,
  outputStyle: 'expanded',
  paths: [ path.join(__dirname, 'styles') ]
};

// -- OPERATIONS -- //
// compiles all js files (from above) into one final js file to include in html script tag
gulp.task('js', function() {
  return gulp.src(paths.jsSource)
  .pipe(plumber())
  .pipe(concat('bundle.js')) // name of compiled file
  .pipe(annotate())
  .pipe(gulp.dest('./')); // location to save compiled file
});

// compiles all sass files into one final css file, to include in html style tag
gulp.task('sass', function () {
  return gulp.src(paths.sassSource)
    .pipe(sass(sassOptions).on('error', sass.logError))// run sass w/ options + logging
    .pipe(concat('style.css')) // name of compiled file
    .pipe(gulp.dest('./')); // destination for compiled file
});

// watches files and updates them automatically as changes are made
gulp.task('watch', function() {
  gulp.watch(paths.jsSource, ['js']);
  gulp.watch(paths.sassSource, ['sass']);
});

gulp.task('default', ['watch', 'js', 'sass']);
