/* global __dirname, require, process, it */
'use strict';

var pkg = require('../package.json'),
  myObject = require('../index.js'),
  docObject = require('./dataset/in/docObject.sample.json'),
  fs = require('fs'),
  path = require('path'),
  async = require('async'),
  chai = require('chai'),
  expect = chai.expect;

// Mapping indiquant quelle fonction de test utiliser pour chaque fonction
var mapTests = {
  "files": {
    "selectAll": testOfFileRepresentation,
    "select": testOfFileRepresentation,
    "get": testOfFileRepresentation,
    "createPath": testOfCreateFilePath
  },
  "XML": {
    "load": testOfXmlLoad,
    "select": testOfXmlSelection
  }
};

// Données de test
var data = {
  "files": require('./dataset/in/test.files.json'),
  "XML": require('./dataset/in/test.XML.json')
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
describe(pkg.name + '/index.js', function() {
  async.eachSeries(Object.keys(data), function(k, callback) {
    async.eachSeries(Object.keys(data[k]), function(key, callback) {
      // Permet de filtrer les propriétées de l'objets qui ne sont pas des fonctions
      if (typeof myObject[k][key] === 'function') {
        describe('#' + k + '.' + key + '()', function() {
          mapTests[k][key](data[k][key], myObject[k][key]);
        });
      }
      return callback();
    });
    return callback();
  });
});

// Cette fonction permet d'effecetuer le test correspondant au résultat souhaité
function test(value, result) {
  if (result.not) {
    // Si on doit tester que la valeur retournée n'est pas égale à
    return expect(value).to.not.equal(result.value);
  } else if (result.length) {
    // Si on doit tester la longueur la valeur retournée
    return expect(value).to.have.length(result.value);
  } else if (result.typeof) {
    // Si on doit tester que le type de la valeur retournée n'est pas égale à
    return expect(typeof result).to.equal(result.value);
  }
  // Si on doit tester que la valeur retournée est pas égale à
  return expect(value).to.equal(result.value);
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

/**
 * Fonction de test à appliquée pour :
 * - myObject.files.selectAll()
 * - myObject.files.select()
 * - myObject.files.get()
 */
function testOfFileRepresentation(values, testedFunction) {
  async.eachSeries(values, function(item, callback) {
    it(item.label, function(done) {
      // Transforme les string en regex si nécessaire
      if (item.regExp) {
        setRegex(item.regExp, item.options);
      }
      test(testedFunction(docObject[item.container], item.options), item.result);
      return done();
    });
    return callback();
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.files.createPath()
 */
function testOfCreateFilePath(values, testedFunction) {
  async.eachSeries(values, function(item, callback) {
    it(item.label, function(done) {
      test(testedFunction(item.options), item.result);
      return done();
    });
    return callback();
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.XML.load()
 */
function testOfXmlLoad(values, testedFunction) {
  async.eachSeries(values, function(item, callback) {
    // Fichier XML de test
    var xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
    it(item.label, function(done) {
      test(testedFunction(xmlStr), item.result);
      return done();
    });
    return callback();
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.XML.select()
 */
function testOfXmlSelection(values, testedFunction) {
  async.eachSeries(values, function(item, callback) {
    // Fichier XML de test
    var xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
    var xml = myObject.XML.load(xmlStr);
    it(item.label, function(done) {
      // Si on doit tester que la valeur retournée est pas égale à
      test(testedFunction(item.query, xml)[0], item.result);
      return done();
    });
    return callback();
  });
}