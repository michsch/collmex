/**
 * Custom runtime exception
 *
 * @module RuntimeException
 * @author Michael Schulze <ms@michaelschulze.de>
 * @license MIT, Copyright 2016 Michael Schulze
 */

class RuntimeException {
  constructor (message, obj) {
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
    this.obj = obj

    console.error(message, obj)
  }
}

export default RuntimeException
