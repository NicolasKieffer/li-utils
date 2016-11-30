/* global __dirname, require, process, it */

'use strict';

var
  pkg = require('../package.json'),
  myObject = require('../index.js'),
  docObject = require('./dataset/in/docObject.sample.json'),
  async = require('async'),
  chai = require('chai'),
  expect = chai.expect;

// Mapping indiquant quelle fonction de test utiliser lors de chaque test
var mapTests = {
  "selectAll": testOfFileRepresentation,
  "select": testOfFileRepresentation,
  "get": testOfFileRepresentation,
  "createPath": testOfCreateFilePath
}

// Données de test
var data = {
  "files": require('./dataset/in/test.files.json')
};

describe(pkg.name + '/index.js', function() {
  async.eachSeries(Object.keys(data.files), function(key, callback) {
    /**
     * Test de chaques fonctions :
     * - myObject.files.selectAll()
     * - myObject.files.select()
     * - myObject.files.get()
     * - myObject.files.createPath()
     */
    describe('#' + key + '()', function() {
      mapTests[key](data.files[key], myObject.files[key]);
    });
    callback();
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

/** Fonction de test à appliquée pour :
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
    callback();
  });
}

/** Fonction de test à appliquée pour :
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
    callback();
  });
}