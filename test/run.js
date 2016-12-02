/* global __dirname, require, process, it */
'use strict';

var pkg = require('../package.json'),
  myObject = require('../index.js'),
  docObject = require('./dataset/in/docObject.sample.json'),
  TU = require('rd-tu'),
  fs = require('fs'),
  path = require('path');

// Données de test
var dataset = {
  files: require('./dataset/in/test.files.json'),
  XML: require('./dataset/in/test.XML.json')
};

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
var wrapper = {
  "files": {
    "selectAll": testOfFileRepresentation,
    "select": testOfFileRepresentation,
    "get": testOfFileRepresentation
  },
  "XML": {
    "load": testOfXmlLoad,
    "select": testOfXmlSelection
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
function testOfXmlLoad(fn, item) {
  var xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
  return fn(xmlStr);
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.files.selectAll()
 * - myObject.files.select()
 * - myObject.files.get()
 */
function testOfFileRepresentation(fn, item) {
  if (item.regExp) setRegex(item.regExp, item.arguments.options);
  return fn(docObject[item.container], item.arguments.options);
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.XML.select()
 */
function testOfXmlSelection(fn, item) {
  var xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
  var jsonObject = myObject.XML.load(xmlStr);
  return fn(item.arguments.selector, jsonObject)[0];
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