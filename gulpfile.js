var gulp		= require('gulp')
,	plugins		= require('gulp-load-plugins')({
		rename: {
			'gulp-if': 'gulpif'
		}
	})
,	merge		= require('merge-stream')
,	lazypipe	= require('lazypipe')
,	http		= require('http')
,	st			= require('st')
,	config		= require('./gulpfile.config.json')
;

gulp.task('bower', function() {
	return plugins.bower();
});

gulp.task('tsd', function(callback) {
	plugins.tsd({
		command: "reinstall",
		config: "./tsd.json"
	}, callback);
});

gulp.task('peg', function() {
	return gulp.src(config.srcDir + '/grammar.peg')
		.pipe(plugins.peg({exportVar: 'var gw2CalculatorParser'}).on("error", plugins.util.log))
		.pipe(gulp.dest(config.srcDir + '/js'))
		;
});

gulp.task('js', gulp.series(gulp.parallel('bower', 'tsd', 'peg'), function() {
	// produce asset extractor channel
	var assets = plugins.useref.assets({
		noconcat: true,
		//additionalStreams: [tsStream]
	});
	// produce a (lazy) js sourcemaps and minification channel
	var tsChannel = lazypipe()
		.pipe(plugins.tslint)
		.pipe(plugins.tslint.report, 'prose')
		.pipe(plugins.typescript, config.tsconfig, {
			out: 'myscripts.js'
		})
		;
	var jsChannel = lazypipe()
		.pipe(plugins.sourcemaps.init, {loadMaps: true})
		.pipe(plugins.gulpif, '*.ts', tsChannel())
		.pipe(gulp.dest, config.distJsDir + '/debug')
		.pipe(plugins.concat, 'scripts.min.js')
		.pipe(plugins.uglify)
		.pipe(plugins.sourcemaps.write)
		.pipe(gulp.dest, config.distJsDir)
		.pipe(plugins.livereload)
		;
	// start the chain, working only on js contents
	return gulp.src(config.staticDir + "/index.html")
		.pipe(assets)
		.pipe(plugins.gulpif(new RegExp('\\.js|\\.ts'), jsChannel()))
		;
}));

gulp.task('css', function() {
	// produce a (lazy) less sourcemaps and minification channel
	var lessStream = gulp.src('*.less', {cwd: config.lessDir})
		.pipe(plugins.sourcemaps.init())
		.pipe(plugins.less())
		.pipe(plugins.sourcemaps.write());
	// produce asset extractor channel
	var assets = plugins.useref.assets({
		noconcat: true,
		additionalStreams: [lessStream]
	});
	// produce a (lazy) css sourcemaps and minification channel
	var cssChannel = lazypipe()
		.pipe(plugins.sourcemaps.init, {loadMaps: true})
		.pipe(plugins.concat, 'styles.min.css')
		.pipe(plugins.cssmin)
		.pipe(plugins.sourcemaps.write)
		.pipe(gulp.dest, config.distCssDir)
		.pipe(plugins.livereload)
		;
	// start the chain, working only on js contents
	return gulp.src(config.staticDir + "/index.html")
		.pipe(assets)
		.pipe(plugins.gulpif('*.css', cssChannel()))
		;
});

gulp.task('html', function() {
	return gulp.src(config.staticDir + "/index.html")
		.pipe(plugins.useref())
		.pipe(plugins.htmlMinifier({
			collapseWhitespace: true
		}))
		.pipe(gulp.dest(config.distDir))
		.pipe(plugins.livereload())
		;
});

gulp.task('dist', gulp.parallel(gulp.series('peg', 'js'), 'css', 'html'));

gulp.task('watch', function() {
	plugins.livereload.listen({
		basePath: 'dist'
	});
	gulp.watch('src/static/index.html', gulp.series('dist'));
	gulp.watch('src/less/*', gulp.series('css'));
	gulp.watch('src/ts/*', gulp.series('js'));
	gulp.watch('src/grammar.peg', gulp.series('peg', 'js'));
});

gulp.task('server', function(done) {
	http.createServer(
		st({path: __dirname + '/dist', index: 'index.html', cache: false})
	).listen(8080, done);
});