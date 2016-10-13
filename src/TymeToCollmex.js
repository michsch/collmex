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
          collmexTimeEntriesForSingleTymeEntry;

      startingDate = new Date(entry.timeStart);
      endingDate = new Date(entry.timeEnd);

      collmexTimeEntriesForSingleTymeEntry = this.createRecordsForSingleTymeEntry(
        startingDate,
        endingDate,
        {
          projectId: this.getCollmexIdInMarker(entry.project, entry),
          rateId: this.getCollmexIdInMarker(entry.task, entry),
          notes: entry.notes
        }
      );

      collmexTimeEntries = collmexTimeEntries.concat(
        collmexTimeEntriesForSingleTymeEntry
      );
    });

    return collmexTimeEntries;
  }

  /**
   * Create records (collmex time entries) for a single Tyme entry.
   *
   * @method createRecordsForSingleTymeEntry
   * @param {Date} startingDate
   * @param {Date} endingDate
   * @param {Object} staticRecord Object containing projectId, rateId and notes
   * @return {Array} collmexTimeEntries
   */
  createRecordsForSingleTymeEntry (startingDate, endingDate, staticRecord) {
    let startingTime,
        endingTime,
        collmexDate,
        record,
        newStartingDate,
        collmexTimeEntries;

    collmexTimeEntries = [];

    startingTime = this.createCollmexTime(startingDate);
    endingTime = this.createCollmexTime(endingDate);
    collmexDate = this.createCollmexDate(startingDate);

    record = {
      projectId   : staticRecord.projectId,
      employeeId  : config.EMPLOYEEID,
      companyId   : config.COMPANYID,
      rateId      : staticRecord.rateId,
      description : staticRecord.notes,
      date        : collmexDate,
      fromTime    : startingTime,
      toTime      : endingTime,
      breakTime   : '00:00'
    };

    // Entry is on more than one day.
    if (endingDate > startingDate && endingDate.getDate() !== startingDate.getDate()) {
      newStartingDate = new Date(startingDate.getTime());
      newStartingDate.setDate(newStartingDate.getDate() + 1);

      // Set new starting time to 00:00:00
      newStartingDate.setHours(0);
      newStartingDate.setMinutes(0);
      newStartingDate.setSeconds(0);

      record.toTime = '23:59';
      collmexTimeEntries.push(record);

      // Go to the next day and concat all the records.
      collmexTimeEntries = collmexTimeEntries.concat(
        this.createRecordsForSingleTymeEntry(newStartingDate, endingDate, staticRecord)
      );
    } else {
      collmexTimeEntries.push(record);
    }

    return collmexTimeEntries;
  }

  /**
   * Creates a collmex time with a given date object.
   *
   * @method createCollmexTime
   * @param {Object} date
   * @return {String} Time as string like "09:08"
   */
  createCollmexTime (date) {
    const hours = this.atLeastTwoDigits(date.getHours());
    const minutes = this.atLeastTwoDigits(date.getMinutes());
    const collmexTime = hours + ':' + minutes;

    return collmexTime;
  }

  /**
   * Creates a collmex date with a given date object.
   *
   * @method createCollmexDate
   * @param {Object} date
   * @return {String} Date as string like "20161011".
   */
  createCollmexDate (date) {
    const collmexDate = date.getFullYear() +
      this.atLeastTwoDigits(date.getMonth() + 1) +
      this.atLeastTwoDigits(date.getDate());

    return collmexDate;
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
