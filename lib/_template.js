(function () {
	var require = (function (modules) {
		var getBuild = function (build) {
			return function (ignore, module) {
				module.exports = build.exports;
			};
		};
		var require = function (scope, tree, path) {
			var name, dir, module = { exports: {} }, require, build;
			path = path.split('/');
			name = path.pop();
			if (path[0] === '.') {
				path.shift();
			} else if (path[0] !== '..') {
				scope = tree[0];
				tree = [];
			}
			while ((dir = path.shift())) {
				if (dir === '..') {
					scope = tree.pop();
				} else if (dir !== '.') {
					tree.push(scope);
					scope = scope[dir];
				}
			}
			require = getRequire(scope, tree);
			build = scope[name];
			scope[name] = getBuild(module);
			build(module.exports, module, require);
			return module.exports;
		};
		var getRequire = function (scope, tree) {
			return function (path) {
				return require(scope, [].concat(tree), path);
			};
		};
		return getRequire(modules['.'], [modules]);
	})(MODULES);

	PROGRAM

})();