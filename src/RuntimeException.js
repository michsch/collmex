/**
 * Custom runtime exception
 *
 * @module RuntimeException
 * @author Michael Schulze <ms@michaelschulze.de>
 * @license MIT, Copyright 2016 Michael Schulze
 */

'use strict'

class RuntimeException {
  constructor (message, obj) {
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
    this.obj = obj

    console.error(message, obj)
  }
}

module.exports = RuntimeException
