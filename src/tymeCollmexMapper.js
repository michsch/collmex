import config from '../config/local-env'

/* eslint-disable no-unused-vars */
const getCollmexIdInMarker = (text, entry) => {
  const regEx = new RegExp('\\' + config.IDMARKER_START +
    '.*\\' + config.IDMARKER_END, 'g')
  const matches = text.match(regEx)

  if (!matches || matches.length === 0) {
    if (entry == null) {
      return
    }

    throw new Error('No ID found for entry', entry)
  }

  return parseInt(matches.pop().slice(1, -1), 10)
}
/* eslint-enable no-unused-vars */

export default {
  tyme2: {
    record: (config, staticRecord, collmexDate, startingTime, endingTime) => {
      return {
        projectId: staticRecord.projectId,
        employeeId: config.EMPLOYEEID,
        companyId: config.COMPANYID,
        rateId: staticRecord.rateId,
        description: staticRecord.notes,
        date: collmexDate,
        fromTime: startingTime,
        toTime: endingTime,
        breakTime: '00:00',
      }
    },
  },
}
