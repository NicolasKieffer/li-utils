/* global __dirname, require, process, it */
'use strict';

var pkg = require('../package.json'),
  myObject = require('../index.js'),
  TU = require('auto-tu'),
  fs = require('fs'),
  path = require('path');

// Données de test
var docObject = require('./dataset/in/docObject.sample.json'),
  dataset = {
    "files": require('./dataset/in/data/files.json'),
    "enrichments": require('./dataset/in/data/enrichments.json'),
    "XML": require('./dataset/in/data/XML.json'),
    "URL": require('./dataset/in/data/URL.json'),
    // "services": require('./dataset/in/data/services.json')
  };

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
var wrapper = {
  "files": {
    "createIstexPath": null,
    "createPath": null,
    "get": testOf_fileRepresentation,
    "select": testOf_fileRepresentation,
    "selectAll": testOf_fileRepresentation
  },
  "enrichments": {
    "save": testOf_enrichmentsSave,
    "write": testOf_enrichmentsWrite
  },
  "XML": {
    "load": testOf_xmlLoad
  },
  "URL": {
    "addParameters": testOf_urlAddParameters
  },
  // "services": {
  //   "post": testOf_servicesPost,
  //   "transformXML": testOf_servicesTransformXML
  // }
};

/**
 * Test de chaques fonctions de :
 *
 * - myObject.files.
 *   - selectAll()
 *   - select()
 *   - get()
 *   - createPath()
 *
 * - myObject.enrichments.
 *   - write()
 *   - save()
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
 * - myObject.enrichments.save()
 */
function testOf_enrichmentsSave(fn, item, cb) {
  var before = (item.arguments.enrichments && item.arguments.enrichments[item.arguments.options.label]) ? item.arguments.enrichments[item.arguments.options.label].length : 0, // Nombre d'enrichissement avant
    result = fn(item.arguments.enrichments, item.arguments.options),
    after = result[item.arguments.options.label].length; // Nombre d'enrichissement aprés
  return cb(after - before);
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.enrichments.write()
 */
function testOf_enrichmentsWrite(fn, item, cb) {
  return fn(item.arguments.options, function(err) {
    return cb(err);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.XML.load()
 */
function testOf_xmlLoad(fn, item, cb) {
  var xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
  return cb(fn(xmlStr).html().length);
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.URL.addParameters()
 */
function testOf_urlAddParameters(fn, item, cb) {
  return cb(fn(item.arguments.url, item.arguments.parameters));
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.services.post()
 */
function testOf_servicesPost(fn, item, cb) {
  return fn(item.arguments.options, function(err, res) {
    return cb(err);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.services.transformXML()
 */
function testOf_servicesTransformXML(fn, item, cb) {
  return fn(item.arguments.options, function(err, res) {
    return cb(res.code);
  });
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