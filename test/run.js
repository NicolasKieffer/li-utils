/* global __dirname, require, process, it */
'use strict';

const pkg = require('../package.json'),
  myObject = require('../index.js'),
  supertest = require('supertest'),
  TU = require('auto-tu'),
  fs = require('fs'),
  path = require('path');

let server,
  request,
  serverFile = path.resolve('./test/server.js');

// Données de test
const docObject = require('./dataset/in/docObject.sample.json'),
  dataset = {
    "files": require('./dataset/in/data/files.json'),
    "enrichments": require('./dataset/in/data/enrichments.json'),
    "XML": require('./dataset/in/data/XML.json'),
    "URL": require('./dataset/in/data/URL.json'),
    "process": require('./dataset/in/data/process.json'),
    "httpServices": require('./dataset/in/data/httpServices.json')
  };

// Mapping indiquant quelle fonction de test et quelles données utiliser pour chaque fonction
const wrapper = {
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
  "process": {
    "transformXML": testOf_processTransformXML
  },
  "httpServices": {
    "setFilesInFormdata": testOf_httpServicesSetFilesInFormdata,
    "call": testOf_httpServicesCall
  }
};

// Mapping indiquant quelle fonction de test et quel beforeEach utiliser pour chaque fonction
const before = {
  "httpServices": {
    "call": function(done) {
      server = require(serverFile).listen(8888, done);
      request = supertest.agent(server);
    }
  }
};

// Mapping indiquant quelle fonction de test et quel afterEach utiliser pour chaque fonction
const after = {
  "httpServices": {
    "call": function(done) {
      server.close(done);
    }
  }
};

TU.which({
  "packages": ["xsltproc"]
});

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
 *
 * - myObject.process.
 *   - transformXML()
 *
 * - myObject.httpServices.
 *   - setFilesInFormdata()
 *   - call()
 */
TU.start({
  "description": pkg.name + '/index.js',
  "root": 'myObject',
  "object": myObject,
  "dataset": dataset,
  "wrapper": wrapper,
  "before": before,
  "after": after
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
  let before = (item.arguments.enrichments && item.arguments.enrichments[item.arguments.options.label]) ? item.arguments.enrichments[item.arguments.options.label].length : 0, // Nombre d'enrichissement avant
    result = fn(item.arguments.enrichments, item.arguments.options),
    after = result[item.arguments.options.label].length; // Nombre d'enrichissement aprés
  return cb(after - before);
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.enrichments.write()
 */
function testOf_enrichmentsWrite(fn, item, cb) {
  // Récupération du fragment de TEI
  fs.readFile(item.template, 'utf-8', function(err, tpl) {
    // Lecture impossible
    if (err) tpl = '';
    item.arguments.options.template = tpl;
    return fn(item.arguments.options, function(err, res) {
      return cb(res);
    });
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.XML.load()
 */
function testOf_xmlLoad(fn, item, cb) {
  let xmlStr = fs.readFileSync(path.join(__dirname, item.path), 'utf-8');
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
 * - myObject.process.transformXML()
 */
function testOf_processTransformXML(fn, item, cb) {
  return fn(item.arguments.options, function(err, res) {
    return cb(res.code);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.httpServices.setFilesInFormdata()
 */
function testOf_httpServicesSetFilesInFormdata(fn, item, cb) {
  return fn(item.arguments.files, item.arguments.formData, function(err, res) {
    if (err) return cb(err.toString());
    return cb(Object.keys(res));
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.httpServices.call()
 */
function testOf_httpServicesCall(fn, item, cb) {
  return fn(item.arguments.options, item.arguments.retry, function(err, res) {
    if (err) return cb(err.toString());
    return cb(res.httpResponse.statusCode);
  });
}

// Set une regex pour chaque clée demandée
function setRegex(keys, options) {
  for (let i = 0; i < keys.length; i++) {
    if (options instanceof Array) {
      for (let j = 0; j < options.length; j++) {
        options[j][keys[i]] = new RegExp(options[j][keys[i]]);
      }
    } else {
      options[keys[i]] = new RegExp(options[keys[i]]);
    }
  }
}