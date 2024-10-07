/**
 * Collmex
 *
 * @module Collmex
 * @author Michael Schulze <ms@michaelschulze.de>
 * @license MIT, Copyright 2016 Michael Schulze
 */

import https from 'https'
import fs from 'fs'
import tv4 from 'tv4'
import csvSchema from './schema/collmex.json' assert { type: 'json' }
import config from './config/local-env.js'
import iconv from 'iconv-lite'
import TymeToCollmex from './src/TymeToCollmex.js'

const COLLMEXHOST = 'www.collmex.de';
const COLLMEXPATH = '/cgi-bin/cgi.exe?' + config.CLIENT_ID + ',0,data_exchange';

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
  async chooseAction () {
    let tymeJson, timeEntries

    switch (this.action) {
      case 'tyme2':
        tymeJson = await import(this.getPathToSourceJson(this.sourceFileName), { with: { type: 'json'} })
        timeEntries = new TymeToCollmex(tymeJson.default, csvSchema.CMXACT, 2);

        this.addDataSet(timeEntries);
        break;
      case 'tyme3':
        tymeJson = await import(this.getPathToSourceJson(this.sourceFileName), { with: { type: 'json'} })
        timeEntries = new TymeToCollmex(tymeJson.default, csvSchema.CMXACT, 3);

        this.addDataSet(timeEntries);
        break;
    }

    console.log(timeEntries);

    this.csv = this.createCsvExport();
    this.writeCsvFile();

    if (config.USE_API) {
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
          console.log(record, tv4.validateResult(record, csvSchema[setName].items));
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

    config.COLLMEX_CMXACT_FIELDS_SORT.forEach((fieldName) => {
      csv += divider + (record[fieldName] || '');
    })

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

    //const csv = this.csv

    const csv = iconv.encode(this.csv, 'iso-8859-1')

    fs.writeFile(fileName, csv, function(err) {
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

export default new Collmex();
