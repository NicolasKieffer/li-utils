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

// Mapping indiquant quelle fonction de test utiliser lors de chaque test
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
 * + myObject.files :
 *   - selectAll()
 *   - select()
 *   - get()
 *   - createPath()
 *
 * + myObject.XML :
 *   - load()
 *   - select()
 */
describe(pkg.name + '/index.js', function() {
  async.eachSeries(Object.keys(data), function(k, callback) {
    async.eachSeries(Object.keys(data[k]), function(key, callback) {
      describe('#' + k + '.' + key + '()', function() {
        mapTests[k][key](data[k][key], myObject[k][key]);
      });
      return callback();
    });
    return callback();
  });
});

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
      // Si on doit tester la longueur la valeur retournée
      if (item.result.length) {
        expect(testedFunction(docObject[item.container], item.options)).to.have.length(item.result.value);
        return done();
      }
      // Si on doit tester que la valeur retournée n'est pas égale à
      if (item.result.not) {
        expect(testedFunction(docObject[item.container], item.options)).to.not.equal(item.result.value);
        return done();
      }
      // Si on doit tester que la valeur retournée est pas égale à
      expect(testedFunction(docObject[item.container], item.options)).to.equal(item.result.value);
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
      // Si on doit tester que la valeur retournée n'est pas égale à
      if (item.result.not) {
        expect(testedFunction(item.options)).to.not.equal(item.result.value);
        return done();
      }
      // Si on doit tester que la valeur retournée est pas égale à
      expect(testedFunction(item.options)).to.equal(item.result.value);
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
      var result = testedFunction(xmlStr);
      // Si on doit tester que la valeur retournée n'est pas égale à
      if (item.result.typeof) {
        result = typeof result;
      }
      // Si on doit tester que la valeur retournée est pas égale à
      expect(result).to.equal(item.result.value);
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
    it(item.label, function(done) {
      var xml = myObject.XML.load(xmlStr);
      // Si on doit tester que la valeur retournée est pas égale à
      expect(testedFunction(item.query, xml)[0]).to.equal(item.result.value);
      return done();
    });
    return callback();
  });
}