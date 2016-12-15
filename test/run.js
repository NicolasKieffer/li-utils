/* global __dirname, require, process, it */
'use strict';

var pkg = require('../package.json'),
  myObject = require('../index.js'),
  TU = require('rd-tu'),
  fs = require('fs'),
  path = require('path');

// Données de test
var docObject = require('./dataset/in/docObject.sample.json'),
  dataset = {
    "paths": require('./dataset/in/test.paths.json'),
    "resources": require('./dataset/in/test.resources.json'),
    "files": require('./dataset/in/test.files.json'),
    "directories": require('./dataset/in/test.directories.json'),
    "XML": require('./dataset/in/test.XML.json'),
    "URL": require('./dataset/in/test.URL.json')
  };

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
var wrapper = {
  "paths": {
    "init": testOf_pathsInit
  },
  "resources": {
    "load": testOf_resourcesLoad
  },
  "files": {
    "selectAll": testOf_fileRepresentation,
    "select": testOf_fileRepresentation,
    "get": testOf_fileRepresentation
  },
  "directories": {
    "sync": null
  },
  "XML": {
    "load": testOf_xmlLoad,
    "select": testOf_xmlSelect
  },
  "URL": {
    "addParameters": testOf_urlAddParameters
  }
};

/**
 * Test de chaques fonctions de :
 * - myObject.paths.
 *   - init()
 *
 * - myObject.files.
 *   - selectAll()
 *   - select()
 *   - get()
 *   - createPath()
 *
 * - myObject.XML.
 *   - load()
 *   - select()
 *
 * - myObject.URL.
 *   - addParameters()
 */
TU.start({
  description: pkg.name + '/index.js',
  root: 'myObject',
  object: myObject,
  dataset: dataset,
  wrapper: wrapper
});

/**
 * Fonction de test à appliquée pour :
 * - myObject.paths.init()
 */
function testOf_pathsInit(fn, item, cb) {
  var result = fn(item.arguments.paths, item.arguments.root);
  return cb(result.test);
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.resources.laod()
 */
function testOf_resourcesLoad(fn, item, cb) {
  var paths = myObject.paths.init(item.arguments.paths, __dirname);
  var result = fn(paths);
  return cb(Object.keys(result));
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.XML.load()
 */
function testOf_xmlLoad(fn, item, cb) {
  var xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
  return cb(fn(xmlStr));
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.files.selectAll()
 * - myObject.files.select()
 * - myObject.files.get()
 */
function testOf_fileRepresentation(fn, item, cb) {
  if (item.regExp) setRegex(item.regExp, item.arguments.options);
  return cb(fn(docObject[item.container], item.arguments.options));
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.XML.select()
 */
function testOf_xmlSelect(fn, item, cb) {
  var xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
  var jsonObject = myObject.XML.load(xmlStr);
  return cb(fn(item.arguments.selector, jsonObject)[0]);
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.URL.addParameters()
 */
function testOf_urlAddParameters(fn, item, cb) {
  return cb(fn(item.arguments.url, item.arguments.parameters));
}

// Set une regex pour chaque clée demandée
function setRegex(keys, options) {
  for (var i = 0; i < keys.length; i++) {
    if (options instanceof Array) {
      for (var j = 0; j < options.length; j++) {
        options[j][keys[i]] = new RegExp(options[j][keys[i]]);
      }
    } else {
      options[keys[i]] = new RegExp(options[keys[i]]);
    }
  }
}