/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

/* Module Require */
var path = require('path'),
  extend = require('util')._extend;

var object = {};

// Regroupe toutes les fonctions liées aux fichiers dans la chaine LoadIstex
object.files = {};

/**
 * Retourne les objets du Tableau de fichier respectant au moins un des "ensemble de critères" spécifiées
 * Exemple : Je souhaite récupérer le fichier txt généré par LoadIstex ou un fichier txt
 *   files = docObject.fulltext (paramètre du docObject contenant les infos liées au fulltext)
 *   data = [
 *     { mime: 'text/plain', original: false }, --> ficher txt généré par LoadIstex
 *     { mime: 'text/plain'}                    --> ficher txt
 *   ]
 * @param {Array} files (jsonLine.metadata || jsonLine.fulltext)
 * @param {Array} data Liste (ordonnées) des caractéristiques du document recherché
 * @return {Array} L'objet correspondant le mieux aux critères ou []
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
}

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
 * @return {object} L'objet correspondant le mieux aux critères ou null
 */
object.files.select = function(files, options) {
  for (var i = 0; i < options.length; i++) {
    var result = object.files.get(files, options[i]);
    if (result) return result;
  }
  return null;
}

/**
 * Retourne le premier objet du Tableau de fichier respectant tous les critères spécifiées
 * Exemple : Je souhaite récupérer le fichier txt généré par LoadIstex
 *   files = docObject.fulltext (paramètre du docObject contenant les infos liées au fulltext)
 *   criteria = { mime: 'text/plain', original: false }, --> ficher txt généré par LoadIstex
 * @param {Array} files Tableau d'objet représentant un ensemble de fichier (ex : jsonLine.metadata || jsonLine.fulltext)
 * @param {Object} criteria Objet regroupant les critères du document recherché
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
}

/**
 * Retourne les infos nécessaires pour la lecture ou la création d'un fichier dans la chaîne Istex
 * Pour l'id: 0123456789012345678901234567890123456789
 *  - directory => [corpusPath]/0/1/2/0123456789012345678901234567890123456789/[type]/([label]/)
 *  - filename => 0123456789012345678901234567890123456789.([label].)[extension]
 * @param {Object} options Objet comportant toutes les informations nécessaire à la création du chemin :
 *  - {str} corpusPath Chemin du corpusOutput
 *  - {str} id Id Istex du document
 *  - {str} type Type de document (metadata | enrichements | fulltext)
 *  - {str} label Label du module (ce qui permet d'ajouter un sous-répertoire dédié au module, utile dans le cas où plusieurs enrichissements différents peuvent être produits)
 *  - {str} extension Extension du document (ex : .tei.xml)
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
}

module.exports = object;