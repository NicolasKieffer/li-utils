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
  "files": require('./dataset/in/test.files.json'),
  "directories": require('./dataset/in/test.directories.json'),
  "XML": require('./dataset/in/test.XML.json'),
  "URL": require('./dataset/in/test.URL.json')
};

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
var wrapper = {
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
    "select": testOf_xmlSelection
  },
  "URL": {
    "addParameters": testOf_addParameters
  }
};

/**
 * Test de chaques fonctions de :
 * - myObject.files.
 *   - selectAll()
 *   - select()
 *   - get()
 *   - createPath()
 *
 * - myObject.XML.
 *   - load()
 *   - select()
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
function testOf_xmlSelection(fn, item, cb) {
  var xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
  var jsonObject = myObject.XML.load(xmlStr);
  return cb(fn(item.arguments.selector, jsonObject)[0]);
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.URL.addParameters()
 */
function testOf_addParameters(fn, item, cb) {
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