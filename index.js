/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

/* Module Require */
const dateFormat = require('dateformat'),
  cheerio = require('cheerio'),
  mkdirp = require('mkdirp'),
  mustache = require('mustache'),
  request = require('request'),
  fs = require('fs'),
  path = require('path'),
  extend = require('util')._extend,
  child_process = require('child_process');

// Main Object
const object = {};

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
 * @param {Array} files (jsonLine.metadata || jsonLine.fulltext)
 * @param {Array} options Liste (ordonnées) des caractéristiques du document recherché
 * @return {Array} L'objet correspondant le mieux aux critères ou []
 */
object.files.selectAll = function(files, options) {
  let result = [],
    _files = extend([], files); // copy du Tableau de fichier
  for (let x = 0; x < options.length; x++) {
    const keys = Object.keys(options[x]);
    while (_files.length > 0) {
      let found = true,
        file = _files.shift();
      for (let i = 0; i < keys.length; i++) {
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
 * @param {Array} files (jsonLine.metadata || jsonLine.fulltext)
 * @param {Array} options Liste (ordonnées) des caractéristiques du document recherché
 * @return {Object} L'objet correspondant le mieux aux critères ou null
 */
object.files.select = function(files, options) {
  for (let i = 0; i < options.length; i++) {
    const result = object.files.get(files, options[i]);
    if (result) return result;
  }
  return null;
};

/**
 * Retourne le premier objet du Tableau de fichier respectant tous les critères spécifiées
 * Exemple : Je souhaite récupérer le fichier txt généré par LoadIstex
 *   files = docObject.fulltext (paramètre du docObject contenant les infos liées au fulltext)
 *   criteria = { mime: 'text/plain', original: false }, --> ficher txt généré par LoadIstex
 * @param {Array} files Tableau d'objet représentant un ensemble de fichier (ex : jsonLine.metadata || jsonLine.fulltext)
 * @param {Object} criteria Objet regroupant les critères du document recherché
 * @return {Object} L'objet correspondant ou null
 */
object.files.get = function(files, criteria) {
  const keys = Object.keys(criteria);
  for (let i = 0; i < files.length; i++) {
    let found = true;
    for (let j = 0; j < keys.length; j++) {
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
 *  - directory => [outputPath]/0/1/2/0123456789012345678901234567890123456789/[type]/([label]/)
 *  - filename => 0123456789012345678901234567890123456789.([label].)[extension]
 * @param {Object} options Objet comportant toutes les informations nécessaire à la création du chemin :
 *  - {String} outputPath Chemin du corpusOutput
 *  - {String} id Id Istex du document
 *  - {String} type Type de document (metadata | enrichments | fulltext)
 *  - {String} label Label du module (ce qui permet d'ajouter un sous-répertoire dédié au module, utile dans le cas où plusieurs enrichissements différents peuvent être produits)
 *  - {String} extension Extension du document (ex : .tei.xml)
 * @return {Object} fileInfos sous la forme : { filemane, directory }
 */
object.files.createIstexPath = function(options) {
  let result = null;
  if (options && options.id) {
    result = {
      'directory': path.join(options.outputPath, options.id[0], options.id[1], options.id[2], options.id, options.type, options.label),
      'filename': options.id + ((options.label) ? '.' : '') + options.label + options.extension
    };
  }
  return result;
};

/**
 * Retourne les infos nécessaires pour la lecture ou la création d'un fichier
 *  - directory => [outputPath]/[id]/
 *  - filename => [id].([label].)[extension]
 * @param {Object} options Objet comportant toutes les informations nécessaire à la création du chemin :
 *  - {String} outputPath Chemin de sortie
 *  - {String} id Id Istex du document
 *  - {String} label Label du module
 *  - {String} extension Extension du document (ex : .tei.xml)
 * @return {Object} fileInfos sous la forme : { filemane, directory }
 */
object.files.createPath = function(options) {
  let result = null;
  if (options && options.id) {
    result = {
      'directory': path.join(options.outputPath, options.label),
      'filename': options.id + ((options.label) ? '.' : '') + options.label + options.extension
    };
  }
  return result;
};

// Regroupe les fonctions liées aux fichiers TEI dans la chaine LoadIstex
object.enrichments = {};

/**
 * Sauvegarde un enrichissement dans le jsonLine
 * @param {Object} enrichments enrichments d'un jsonLine d'un docObject
 * @param {Object} options Options :
 *   - {String} label Label du module
 *   - {Object} enrichment Enrichissment à sauvegarder
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
    const isAlready = object.files.get(enrichments[options.label], options.enrichment);
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
 * @param {Object} options Objet comportant toutes les informations nécessaire à la création du chemin :
 *  - {String} template Tempalte à utiliser
 *  - {Object} data Données à insérer dans le Template
 *  - {Object} output Données sur l'Output (voir : object.files.createPath)
 * @param {function} cb Callback appelée à la fin du traitement, avec comme paramètre disponible :
 *  - {Error} err Erreur de Lecture/Écriture
 *  - {String} res Data écrites dans le fichier
 * @return {undefined} Return undefined
 */
object.enrichments.write = function(options, cb) {
  // Si le répertoire n'existe pas
  mkdirp(options.output.directory, function(err, made) {
    // Erreur I/O
    if (err) return cb(err);
    // Construction du fragment depuis le template et du nom de fichier
    let fragment = mustache.render(options.template, options.data),
      filename = path.join(options.output.directory, options.output.filename);
    // Écriture du fragment de TEI
    fs.writeFile(filename, fragment, 'utf8', function(err) {
      if (err) fragment = null;
      return cb(err, fragment);
    });
  });
};

// Regroupe les fonctions liées aux traitement des XML
object.XML = {};

/**
 * Parse le contenu d'un fichier XML
 * @param {String} xmlStr Sélecteur
 * @return {Object} Objet JSON représentant le document XML ou null
 */
object.XML.load = function(xmlStr) {
  const result = cheerio.load(xmlStr, {
    xmlMode: true
  });
  return (Object.keys(result).length > 0) ? result : null;
};

// Regroupe les fonctions liées aux traitement des URL
object.URL = {};

/**
 * Construit l'url d'une requête http GET
 * @param {String} url Toutes la partie de l'url avant le '?'
 * @param {Object} parameters Paramètres à ajouter à l'url (après le '?')
 * @return {String} L'url complète encodée
 */
object.URL.addParameters = function(url, parameters) {
  const keys = Object.keys(parameters),
    separator = '&';
  let result = '?';
  for (let i = 0; i < keys.length; i++) {
    result += keys[i] + '=' + encodeURIComponent(parameters[keys[i]]) + ((i < keys.length - 1) ? '&' : '');
  }
  return url + result;
};

// Regroupe les fonctions liées aux dates
object.dates = {};

/**
 * Renvoi la date actuelle au format souhaité
 * @param {String} format Format de la date (par défaut 'dd-mm-yyyy')
 * @return {String} Date au format souhaité
 */
object.dates.now = function(format) {
  const arg = format || 'dd-mm-yyyy';
  return dateFormat(new Date(Date.now()), arg);
};

// Regroupe les fonctions liées aux services
object.services = {};

/**
 * Effectue une requête HTTP (méthode POST) sur un service
 * @param {Object} options Objet comportant toutes les informations nécessaire à la requête :
 *  - {String} filename Nom du fichier
 *  - {Object} headers Headers de la requête
 *  - {String} url Url d'accès au service 
 * @param {function} cb Callback appelée à la fin du traitement, avec comme paramètre disponible :
 *  - {Error} err Erreur de Lecture/Écriture
 *  - {Object} res Résultat de la réponse, sous la forme :
 *    - {Object} httpResponse Réponse HTTP
 *    - {String} body Body de la réponse
 * @return {undefined} undefined
 */
object.services.post = function(options, cb) {
  let _err = null,
    res = null;
  // Vérification de l'existence du fichier à envoyer
  fs.stat(options.filename, function(err, stats) {
    // Lecture impossible
    if (err) {
      _err = new Error(err);
      return cb(_err, res);
    }
    // Création du form data
    const formData = {
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
        return cb(_err, res);
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
 * @param {Object} options Objet comportant toutes les informations nécessaire à la création du chemin :
 *  - {String} output Chemin du Tempalte
 *  - {String} documentId Données à insérer dans le Template
 *  - {String} runId Données sur l'Output (voir : object.files.createPath)
 *  - {String} xsltFile Données sur l'Output (voir : object.files.createPath)
 *  - {String} xmlFile Données sur l'Output (voir : object.files.createPath)
 * @param {function} cb Callback appelée à la fin du traitement, avec comme paramètre disponible :
 *  - {Error} err Erreur de Lecture/Écriture
 *  - {Object} res Résultat de l'opération, sous la forme 
 *    - {Object} logs Logs de stderr (array) et stdout (array)
 *    - {Array} output Tableau contenant les différents logs dans l'ordre d'apparition
 *    - {Integer} code Code de retour du process
 * @return {undefined} Return undefined
 */
object.services.transformXML = function(options, cb) {
  // Spawn du process qui effectura la transformation XSLT
  const xsltproc = child_process.spawn('xsltproc', [
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
    const str = data.toString();
    logs.stdout.push(str);
    return output.push('[stdout] ' + str);
  });

  // Write stderr in Logs
  xsltproc.stderr.on('data', function(data) {
    const str = data.toString();
    logs.stderr.push(str);
    return output.push('[stderr] ' + data.toString());
  });

  // On error
  xsltproc.on('error', function(err) {
    const res = {
      'logs': logs,
      'output': output
    };
    return cb(err, res);
  });

  // On close
  xsltproc.on('close', function(code) {
    const res = {
      'logs': logs,
      'output': output,
      'code': code
    };
    return cb(null, res);
  });
};

module.exports = object;