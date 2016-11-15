/* global module */
/* jslint node: true */
/* jslint indent: 2 */
'use strict';

var object = {};

/**
 * Retourne le premier objet du container avec le type mime spécifié
 * @param {Array} container (jsonLine.metadata || jsonLine.fulltext)
 * @param {str} mime Type mime du document recherché
 * @param {Boolean} original
 * @return {object} L'objet correspondant au critère ou null
 */
object.getData = function(container, mime, original) {
  original = original || false;
  for (var i = 0; i < container.length; i++) {
    if (container[i].mime === mime && container[i].original === original) {
      return container[i];
    }
  }
  return null;
};

/**
 * Retourne les infos nécessaires pour la lecture ou la création d'un fichier dans la chaîne Istex
 * Pour l'id: 0123456789012345678901234567890123456789
 *  - directory => [corpusPath]/0/1/2/0123456789012345678901234567890123456789/[type]/([label]/)
 *  - filename => 0123456789012345678901234567890123456789.([label].)[extension]
 * @param {str} corpusPath Chemin du corpusOutput
 * @param {str} id Id Istex du document
 * @param {str} type Type de document (metadata | enrichements | fulltext)
 * @param {str} label Label du module (ce qui permet d'ajouter un sous-répertoire dédié au module, utile dans le cas où plusieurs enrichissements différents peuvent être produits)
 * @param {str} extension Extension du document (ex : .tei.xml)
 * @return {object} fileInfos { filemane, directory }
 */
object.getFilePath = function(corpusPath, id, type, label, extension) {
  return {
    'directory': path.join(corpusPath, id[0], id[1], id[2], id, type, label),
    'filename': id + ((label) ? '.' : '') + label + extension
  };
};

module.exports = business;