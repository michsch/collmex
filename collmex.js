/**
 * Collmex
 *
 * @module Collmex
 * @author Michael Schulze <ms@michaelschulze.de>
 * @license MIT, Copyright 2016 Michael Schulze
 */

'use strict';

var https = require('https');
var fs = require('fs');
var tv4 = require('tv4');
var csvSchema = require('./schema/collmex.json');
var config = require('./config/local-env');

const COLLMEXHOST = 'www.collmex.de';
const COLLMEXPATH = '/cgi-bin/cgi.exe?' + config.CLIENTID + ',0,data_exchange';

Object.size = function(obj) {
    let size = 0,
    key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          size++;
        }
    }

    return size;
};

/**
 * Main Collmex class
 *
 * @class Collmex
 */
class Collmex {
  /**
   * @constructor
   */
  constructor (action) {
    this.action = action || process.argv[2] || null;
    this.params = [];

    this.data = {
      LOGIN: {
        user: config.USER,
        password: config.PASSWORD
      }
    };
    this.columns = 2;

    for(let i in arguments){
      if (i > 0) {
        this.params.push(arguments[i]);
      }
    }

    // Get the params out of command line.
    if (this.params.length === 0) {
      process.argv.forEach( (value, index) => {
        if (index > 2) {
          this.params.push(value);
        }
      });
    }

    this.sourceFileName = this.params[0];

    this.chooseAction();
  }

  /**
   * Choose the action to initiate.
   *
   * @method chooseAction
   * @return {void}
   */
  chooseAction () {
    switch (this.action) {
      case 'tyme':
        let TymeToCollmex = require('./src/TymeToCollmex');
        let tymeJson = require(this.getPathToSourceJson(this.sourceFileName));
        let timeEntries = new TymeToCollmex(tymeJson, csvSchema.CMXACT);

        this.addDataSet(timeEntries);
        break;
    }

    this.csv = this.createCsvExport();
    this.writeCsvFile();

    if (config.USEAPI) {
      this.sendDataToCollmex();
    }
  }

  /**
   * Add new data to the data object or merge some data.
   *
   * @method addDataSet
   * @param {Object} dataSet
   * @return {void}
   */
  addDataSet (dataSet) {
    let columns = 0;

    if (dataSet.set == null) {
      return;
    }

    if (this.data[dataSet.set] == null ||
      !Array.isArray(this.data[dataSet.set])) {
      this.data[dataSet.set] = [];
    }

    this.data[dataSet.set] = this.data[dataSet.set].concat(dataSet.records);

    if (Array.isArray(dataSet.records)) {
      dataSet.records.forEach(function (record) {
        if (typeof record === 'object' &&
          Object.size(record) > columns) {
          columns = Object.size(record);
        }
      });
    } else if (typeof dataSet.records === 'object') {
      columns = Object.size(dataSet.records);
    }

    if (columns > this.columns) {
      this.columns = columns;
    }

    return;
  }

  /**
   * Create an csv export string from all stored data.
   *
   * @method createCsvExport
   * @return {String} csvExport
   */
  createCsvExport () {
    let csv = '';

    if (Object.size(this.data) === 0) {
      return;
    }

    for (let setName in this.data) {
      if (csv.length > 0) {
        csv += "\n";
      }

      csv += this.createCsvForSet(setName);
    }

    return csv;
  }

  /**
   * Create a csv string for a set.
   *
   * @method createCsvForSet
   * @param {String} setName
   * @return {String} csv
   */
  createCsvForSet (setName) {
    let csv, divider, set;

    csv = '';
    divider = ';';
    set = this.data[setName];


    if (Array.isArray(set)) {
      set.forEach( (record) => {
        if (!tv4.validate(record, csvSchema[setName].items)) {
          console.log(tv4.validateResult(record, csvSchema[setName].items));
          return;
        }

        if (csv.length > 0) {
          csv += "\n";
        }

        csv += this.writeSingleCsvLine(setName, record);
      });
    } else if (typeof set === 'object') {
      if (!tv4.validate(set, csvSchema[setName])) {
        console.log(tv4.validateResult(set, csvSchema[setName]));
        return csv;
      }

      csv = this.writeSingleCsvLine(setName, set);
    }

    return csv;
  }

  /**
   * Create a single csv line.
   *
   * @method writeSingleCsvLine
   * @param {String} setName
   * @param {Object} record
   * @return {String} csv
   */
  writeSingleCsvLine (setName, record) {
    let divider, csv;

    divider = ';';
    csv = setName;

    for (let fieldName in record) {
      csv += divider + record[fieldName];
    }

    //console.log(this.columns);
    if (Object.size(record) < this.columns) {
      csv += divider.repeat(this.columns - Object.size(record));
    }

    return csv;
  }

  /**
   * Write the csv file.
   *
   * @method writeCsvFile
   * @return {void}
   */
  writeCsvFile () {
    let fileNameArr, fileName;

    fileNameArr = this.sourceFileName.split('.');
    fileNameArr.pop();
    fileName = fileNameArr.join('.') + '.csv';

    fs.writeFile(fileName, this.csv, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("Collmex CSV saved: " + fileName);
    });
  }

  /**
   * Send the csv data to collmex.
   *
   * @method sendDataToCollmex
   * @return {void}
   */
  sendDataToCollmex () {
    let csvData;

    csvData = this.csv + "\n";

    var options = {
      host: COLLMEXHOST,
      port: 443,
      path: COLLMEXPATH,
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'Content-Length': Buffer.byteLength(csvData)
      }
    };

    var req = https.request(options, function(res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
      });
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(csvData);
    req.end();
  }

  /**
   * Check if record is valid.
   *
   * @method isValidRecord
   * @param {Array} record
   * @param {Array} schemaTable
   * @return {Boolean} true, if record is valid, false if not
   */
  isValidRecord (record, schemaTable) {
    if (!Array.isArray(record) ||
        !Array.isArray(schemaTable) ||
        record.length !== schemaTable.length) {
      return false;
    }

    return true;
  }

  /**
   * Get the complete path to the given file.
   *
   * @method getPathToSourceJson
   * @param {String} fileName
   * @return {String} path
   */
  getPathToSourceJson (fileName) {
    let path, fileExtension, fileFragments;

    path = '';
    fileExtension = fileName.indexOf('.') > -1 ? fileName.split('.').pop() : '';
    fileFragments = fileName.split('/');

    if (fileFragments.length === 1 ||
      (fileFragments.length > 1 && fileFragments[0].length > 0)) {
        path = './' + fileName;
      }

    return path;
  }
}

module.exports = new Collmex();
