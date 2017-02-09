/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

/* Module Require */
var dateFormat = require('dateformat'),
  cheerio = require('cheerio'),
  mkdirp = require('mkdirp'),
  mustache = require('mustache'),
  request = require('request'),
  fs = require('fs'),
  path = require('path'),
  extend = require('util')._extend,
  child_process = require('child_process');

/* Constantes */
var JSON_EXTENSION = new RegExp(/(.json)$/g);

// Main Object
var object = {};

// Regroupe les fonctions liées aux chemins
object.paths = {};

/**
 * Initialise les chemins d'un module R&D
 * @param {object} paths Liste des chemins sous forme d'objet JSON (clé => valeur)
 * @param {string} root Racine du module
 * @return {object} L'objet contenant les chemins initialisés
 */
object.paths.init = function(paths, root) {
  var result = {};
  // Pour chaque chemin
  for (var k in paths) {
    // On construit le chemin absolu
    if (paths.hasOwnProperty(k) && typeof paths[k] !== 'function') {
      result[k] = path.join(root, paths[k]);
    }
  }
  return result;
};

// Regroupe les fonctions liées aux ressources
object.resources = {};

/**
 * Require toutes les ressources d'un module R&D
 * @param {object} paths Liste des chemins sous forme d'objet JSON (clé => valeur)
 * @return {object} L'objet contenant toutes les ressources chargée
 */
object.resources.require = function(paths) {
  var result = {};
  for (var k in paths) {
    if ((typeof paths[k] === 'string') && paths[k].match(JSON_EXTENSION)) { // Require du fichier s'il a une extension JSON
      result[k] = require(paths[k]);
    } else if (typeof paths[k] === 'object') { // Relance du traitement si un c'est un object
      result[k] = object.resources.require(paths[k]);
    }
  }
  return result;
};

// Regroupe les fonctions liées aux fichiers dans la chaine LoadIstex
object.files = {};

/**
 * Retourne les objets du Tableau de fichier respectant au moins un des "ensemble de critères" spécifiées
 * Exemple : Je souhaite récupérer le fichier txt généré par LoadIstex ou un fichier txt
 *   files = docObject.fulltext (paramètre du docObject contenant les infos liées au fulltext)
 *   options = [
 *     { mime: 'text/plain', original: false }, --> ficher txt généré par LoadIstex (original = false)
 *     { mime: 'text/plain'}                    --> ficher txt
 *   ]
 * @param {array} files (jsonLine.metadata || jsonLine.fulltext)
 * @param {array} options Liste (ordonnées) des caractéristiques du document recherché
 * @return {array} L'objet correspondant le mieux aux critères ou []
 */
object.files.selectAll = function(files, options) {
  var result = [],
    _files = extend([], files); // copy du Tableau de fichier
  for (var x = 0; x < options.length; x++) {
    var keys = Object.keys(options[x]);
    while (_files.length > 0) {
      var found = true,
        file = _files.shift();
      for (var i = 0; i < keys.length; i++) {
        found &= (options[x][keys[i]] instanceof RegExp) ? options[x][keys[i]].test(file[keys[i]]) : (file[keys[i]] === options[x][keys[i]]);
        if (!found) break;
      }
      if (found) {
        result.push(file);
      }
    }
  }
  return result;
};

/**
 * Retourne le premier objet du Tableau de fichier respectant l'un des "ensemble de critères" spécifiées
 * Exemple : Je souhaite récupérer le fichier txt généré par LoadIstex ou un fichier txt
 *   files = docObject.fulltext (paramètre du docObject contenant les infos liées au fulltext)
 *   options = [
 *     { mime: 'text/plain', original: false }, --> ficher txt généré par LoadIstex (choix n°1)
 *     { mime: 'text/plain'}                    --> ficher txt (choix n°2, seulement s'il n'y a aucun choix n°1)
 *   ]
 * @param {array} files (jsonLine.metadata || jsonLine.fulltext)
 * @param {array} options Liste (ordonnées) des caractéristiques du document recherché
 * @return {object} L'objet correspondant le mieux aux critères ou null
 */
object.files.select = function(files, options) {
  for (var i = 0; i < options.length; i++) {
    var result = object.files.get(files, options[i]);
    if (result) return result;
  }
  return null;
};

/**
 * Retourne le premier objet du Tableau de fichier respectant tous les critères spécifiées
 * Exemple : Je souhaite récupérer le fichier txt généré par LoadIstex
 *   files = docObject.fulltext (paramètre du docObject contenant les infos liées au fulltext)
 *   criteria = { mime: 'text/plain', original: false }, --> ficher txt généré par LoadIstex
 * @param {array} files Tableau d'objet représentant un ensemble de fichier (ex : jsonLine.metadata || jsonLine.fulltext)
 * @param {object} criteria Objet regroupant les critères du document recherché
 * @return {object} L'objet correspondant ou null
 */
object.files.get = function(files, criteria) {
  var keys = Object.keys(criteria);
  for (var i = 0; i < files.length; i++) {
    var found = true;
    for (var j = 0; j < keys.length; j++) {
      found &= (criteria[keys[j]] instanceof RegExp) ? criteria[keys[j]].test(files[i][keys[j]]) : (files[i][keys[j]] === criteria[keys[j]]);
      if (!found) break;
    }
    if (found) return files[i];
  }
  return null;
};

/**
 * Retourne les infos nécessaires pour la lecture ou la création d'un fichier dans la chaîne Istex
 * Pour l'id: 0123456789012345678901234567890123456789
 *  - directory => [corpusPath]/0/1/2/0123456789012345678901234567890123456789/[type]/([label]/)
 *  - filename => 0123456789012345678901234567890123456789.([label].)[extension]
 * @param {object} options Objet comportant toutes les informations nécessaire à la création du chemin :
 *  - {string} corpusPath Chemin du corpusOutput
 *  - {string} id Id Istex du document
 *  - {string} type Type de document (metadata | enrichments | fulltext)
 *  - {string} label Label du module (ce qui permet d'ajouter un sous-répertoire dédié au module, utile dans le cas où plusieurs enrichissements différents peuvent être produits)
 *  - {string} extension Extension du document (ex : .tei.xml)
 * @return {object} fileInfos sous la forme : { filemane, directory }
 */
object.files.createPath = function(options) {
  var result = null;
  if (options && options.id) {
    result = {
      'directory': path.join(options.corpusPath, options.id[0], options.id[1], options.id[2], options.id, options.type, options.label),
      'filename': options.id + ((options.label) ? '.' : '') + options.label + options.extension
    };
  }
  return result;
};

// Regroupe les fonctions liées aux fichiers TEI dans la chaine LoadIstex
object.enrichments = {};

/**
 * Sauvegarde un enrichissement dans le jsonLine
 * @param {object} enrichments enrichments d'un jsonLine d'un docObject
 * @param {object} options Options :
 *   - {string} label Label du module
 *   - {object} enrichment Enrichissment à sauvegarder
 * @return {undefined} Return undefined
 */
object.enrichments.save = function(enrichments, options) {
  // Si jsonLine ne contient pas encore de clé enrichments
  if (!enrichments) enrichments = {};
  // Si enrichments[options.label] ne contient pas encore d'enrichissement
  if (!enrichments[options.label]) {
    enrichments[options.label] = [];
    enrichments[options.label].push(options.enrichment);
  } else {
    var isAlready = object.files.get(enrichments[options.label], options.enrichment);
    // Si l'objet n'est pas déjà dans le jsonLine
    if (!isAlready) {
      // Ajout de l'enrichissement
      enrichments[options.label].push(options.enrichment);
    }
  }
  return enrichments;
};

/**
 * Écrit un fichier de TEI
 * @param {object} options Objet comportant toutes les informations nécessaire à la création du chemin :
 *  - {string} template Chemin du Tempalte
 *  - {object} data Données à insérer dans le Template
 *  - {object} output Données sur l'Output (voir : object.files.createPath)
 * @param {function} cb Callback appelée à la fin du traitement, avec comme paramètre disponible :
 *  - {Error} err Erreur de Lecture/Écriture
 * @return {undefined} Return undefined
 */
object.enrichments.write = function(options, cb) {
  // Récupération du fragment de TEI
  fs.readFile(options.template, 'utf-8', function(err, tpl) {
    // Lecture impossible
    if (err) return cb(err);
    // Si le répertoire n'existe pas
    mkdirp(options.output.directory, function(err, made) {
      // Erreur I/O
      if (err) return cb(err);
      // Construction du fragment depuis le template et du nom de fichier
      var fragment = mustache.render(tpl, options.data),
        filename = path.join(options.output.directory, options.output.filename);
      // Écriture du fragment de TEI
      fs.writeFile(filename, fragment, 'utf8', function(err) {
        return cb(err);
      });
    });
  });
};

// Regroupe les fonctions liées aux traitement des XML
object.XML = {};

/**
 * Parse le contenu d'un fichier XML
 * @param {string} xmlStr Sélecteur
 * @return {object} Objet JSON représentant le document XML ou null
 */
object.XML.load = function(xmlStr) {
  var result = cheerio.load(xmlStr, {
    xmlMode: true
  });
  return (Object.keys(result).length > 0) ? result : null;
};

// Regroupe les fonctions liées aux traitement des URL
object.URL = {};

/**
 * Construit l'url d'une requête http GET
 * @param {string} url Toutes la partie de l'url avant le '?'
 * @param {object} parameters Paramètres à ajouter à l'url (après le '?')
 * @return {string} L'url complète encodée
 */
object.URL.addParameters = function(url, parameters) {
  var keys = Object.keys(parameters),
    result = '?',
    separator = '&';
  for (var i = 0; i < keys.length; i++) {
    result += keys[i] + '=' + encodeURIComponent(parameters[keys[i]]) + ((i < keys.length - 1) ? '&' : '');
  }
  return url + result;
};

// Regroupe les fonctions liées aux dates
object.dates = {};

/**
 * Renvoi la date actuelle au format souhaité
 * @param {string} format Format de la date (par défaut 'dd-mm-yyyy')
 * @return {string} Date au format souhaité
 */
object.dates.now = function(format) {
  var arg = format || 'dd-mm-yyyy';
  return dateFormat(new Date(Date.now()), arg);
};

// Regroupe les fonctions liées aux services
object.services = {};

/**
 * Effectue une requête HTTP (méthode POST) sur un service
 * @param {object} options Objet comportant toutes les informations nécessaire à la requête :
 *  - {string} filename Nom du fichier
 *  - {object} headers Headers de la requête
 *  - {string} url Url d'accès au service 
 * @param {function} cb Callback appelée à la fin du traitement, avec comme paramètre disponible :
 *  - {Error} err Erreur de Lecture/Écriture
 *  - {object} res Résultat de la réponse, sous la forme :
 *    - {object} httpResponse Réponse HTTP
 *    - {string} body Body de la réponse
 * @return {undefined} undefined
 */
object.services.post = function(options, cb) {
  var _err = null,
    _res = null;
  // Vérification de l'existence du fichier à envoyer
  fs.stat(options.filename, function(err, stats) {
    // Lecture impossible
    if (err) {
      _err = new Error(err);
      return cb(_err, _res);
    }
    // Création du form data
    var formData = {
      file: fs.createReadStream(options.filename)
    };
    // Requête POST sur le service
    request.post({
      headers: options.headers,
      url: options.url,
      formData: formData
    }, function(err, httpResponse, body) {
      // Erreur
      if (err) {
        _err = new Error(err);
        return cb(_err, _res);
      }
      // Retourne le résultat de la requête
      return cb(_err, {
        "httpResponse": httpResponse,
        "body": body
      });
    });
  });
};

/**
 * Applique une feuille xslt sur un document XML (provenant d'un service)
 * @param {object} options Objet comportant toutes les informations nécessaire à la création du chemin :
 *  - {string} output Chemin du Tempalte
 *  - {string} documentId Données à insérer dans le Template
 *  - {string} runId Données sur l'Output (voir : object.files.createPath)
 *  - {string} xsltFile Données sur l'Output (voir : object.files.createPath)
 *  - {string} xmlFile Données sur l'Output (voir : object.files.createPath)
 * @param {function} cb Callback appelée à la fin du traitement, avec comme paramètre disponible :
 *  - {Error} err Erreur de Lecture/Écriture
 *  - {Object} res Résultat de l'opération, sous la forme 
 *    - {object} logs Logs de stderr (array) et stdout (array)
 *    - {array} output Tableau contenant les différents logs dans l'ordre d'apparition
 *    - {integer} code Code de retour du process
 * @return {undefined} Return undefined
 */
object.services.transformXML = function(options, cb) {
  // Spawn du process qui effectura la transformation XSLT
  var xsltproc = child_process.spawn('xsltproc', [
      '--output',
      options.output,
      '--stringparam',
      'documentId',
      options.documentId,
      '--stringparam',
      'runId',
      options.runId,
      options.xsltFile,
      options.xmlFile
    ]),
    _err = null,
    logs = {
      'stderr': [],
      'stdout': []
    },
    output = [];

  // Write stdout in Logs
  xsltproc.stdout.on('data', function(data) {
    var str = data.toString();
    logs.stdout.push(str);
    return output.push('[stdout] ' + str);
  });

  // Write stderr in Logs
  xsltproc.stderr.on('data', function(data) {
    var str = data.toString();
    logs.stderr.push(str);
    return output.push('[stderr] ' + data.toString());
  });

  // On error
  xsltproc.on('error', function(err) {
    var res = {
      'logs': logs,
      'output': output
    };
    return cb(err, res);
  });

  // On close
  xsltproc.on('close', function(code) {
    var res = {
      'logs': logs,
      'output': output,
      'code': code
    };
    return cb(null, res);
  });
};

module.exports = object;