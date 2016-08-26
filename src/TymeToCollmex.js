/**
 * Tyme converter
 *
 * @module TymeToCollmex
 * @author Michael Schulze <ms@michaelschulze.de>
 * @license MIT, Copyright 2016 Michael Schulze
 */

'use strict';

var RuntimeException = require('./RuntimeException');
var config = require('../config/local-env');

/**
 * Use Tyme JSON and convert it to a collmex object.
 *
 * @class TymeToCollmex
 */
class TymeToCollmex {
  /**
   * @constructor
   * @param {Object} sourceJson
   */
  constructor (sourceJson) {
    if (this.isValidSourceJson(sourceJson)) {
      this.sourceJson = sourceJson;
      this.set = 'CMXACT';
      this.records = this.createCollmexTimeEntriesObject();
    }
  }

  /**
   * Create an internal collmex json object of all time entries.
   *
   * @method createCollmexTimeEntriesObject
   * @return {Object} collmexTimeEntries
   */
  createCollmexTimeEntriesObject () {
    let collmexTimeEntries;

    collmexTimeEntries = [];

    this.sourceJson.timed.forEach( (entry) => {
      let startingDate,
          endingDate,
          startingTime,
          endingTime,
          collmexDate = '';

      startingDate = new Date(entry.timeStart);
      endingDate = new Date(entry.timeEnd);

      startingTime = this.createCollmexTime(startingDate);
      endingTime = this.createCollmexTime(endingDate);
      collmexDate += startingDate.getFullYear() +
        this.atLeastTwoDigits(startingDate.getMonth() + 1) +
        this.atLeastTwoDigits(startingDate.getDate());

      let record = {
        projectId   : this.getCollmexIdInMarker(entry.project, entry),
        employeeId  : config.EMPLOYEEID,
        companyId   : config.COMPANYID,
        rateId      : this.getCollmexIdInMarker(entry.task, entry),
        description : entry.notes,
        date        : collmexDate,
        fromTime    : startingTime,
        toTime      : endingTime,
        breakTime   : '00:00'
      };

      collmexTimeEntries.push(record);
    });

    return collmexTimeEntries;
  }

  /**
   * Creates a collmex time with a given date object.
   *
   * @method createCollmexTime
   * @return {String} Time as string like "09:08"
   */
  createCollmexTime (date) {
    let hours, minutes;

    hours = this.atLeastTwoDigits(date.getHours());
    minutes = this.atLeastTwoDigits(date.getMinutes());

    return hours + ':' + minutes;
  }

  /**
   * Creates a string out of a number with at least two digits:
   * 8 => "08" / 10 => "10" / 172 => "172"
   *
   * @method atLeastTwoDigits
   * @return {String} number as string with at least two digits
   */
  atLeastTwoDigits (num) {
    return parseInt(num, 10) < 10 ? '0' + num : num.toString();
  }

  /**
   * Get the Collmex ID from inside a string using markers (see constant).
   *
   * @method getCollmexIdInMarker
   * @param {String} text the text where the id should be found
   * @param {Object} [entry] the complete record, where the Id should be found.
   * @return {Number} id
   */
  getCollmexIdInMarker (text, entry) {
    let regEx, matches;

    regEx = new RegExp('\\' + config.IDMARKER.substring(0, 1) +
      '.*\\' + config.IDMARKER.substring(1), 'g');
    matches = text.match(regEx);

    if (!matches || matches.length === 0) {
      if (entry == null) {
        return;
      }

      throw new Error('No ID found for entry', entry);
    }

    return parseInt(matches.pop().slice(1, -1), 10);
  }

  /**
   * Check if the given JSON is a valid tyme object.
   *
   * @method isValidSourceJson
   * @param {Object} sourceJson
   * @return {Boolean} true if is valid, false if not
   */
  isValidSourceJson (sourceJson) {
    return (typeof sourceJson === 'object' &&
            Array.isArray(sourceJson.timed) &&
            sourceJson.timed.length > 0 &&
            (sourceJson.timed[0].project && sourceJson.timed[0].project.length) &&
            (sourceJson.timed[0].task && sourceJson.timed[0].task.length) > 0);
  }
}

module.exports = TymeToCollmex;
