const dayjs = require('dayjs')
const fs = require('fs')

const month = 7

const config = {
  date: dayjs(new Date(2023, month, 1)),
  month,
  fields: {
    roundingMethod: 'NEAREST',
    category: 'powwow',
    project: 'powwow Performance [33]',
    rate: 82.5,
    roundingMinutes: 1,
    task: 'Software-Entwicklung [28]',
    subtask: '',
  },
  tasks: [
    {
      value: 'Dokumentation',
      minTime: 24,
      maxTime: 73,
    },
    /*
    {
      value: 'Tracking-Konzept',
      minTime: 38,
      maxTime: 86,
    },
     */
    {
      value: 'Abstimmung Tracking',
      minTime: 8,
      maxTime: 21,
    },
    {
      value: 'Google Analytics',
      minTime: 18,
      maxTime: 42,
    },
    {
      value: 'Google Tag Manager',
      minTime: 22,
      maxTime: 77,
    },
    {
      value: 'Confluence Dokumentation',
      minTime: 13,
      maxTime: 47,
    },
    {
      value: 'Product Feeds, Channable',
      minTime: 24,
      maxTime: 66,
    },
    {
      value: 'JS Entwicklung',
      minTime: 38,
      maxTime: 112,
    },
    {
      value: 'Tests',
      minTime: 11,
      maxTime: 31,
    },
    {
      value: 'Tracking-Anforderungen',
      minTime: 38,
      maxTime: 113,
    },
    {
      value: 'Anforderungen anpassen',
      minTime: 38,
      maxTime: 113,
    },
    {
      value: 'Confluence Anforderungen',
      minTime: 38,
      maxTime: 113,
    },
  ],
  weekdays: ['Tuesday', 'Wednesday', 'Thursday'],
  firstTasks: {
    notes: [
      'JIRA, Mails, Teams',
      'JIRA, Trello, Mails, Teams',
      'Teams, Mails, Confluence',
      'Teams, Mails, JIRA',
      'Mails, Trello, JIRA',
      'Mails, Trello, Teams',
    ],
    earliestStartHour: 8,
    earliestStartMinute: 23,
    latestStartHour: 9,
    latestStartMinute: 34,
  },
}

class Creator {
  constructor () {
    this._id = 0

    const days = this.getEveryDayForGivenMonth(config.month).filter(entry => config.weekdays.includes(entry.weekday))
    const tasks = this.createTasksEntriesForEveryDay(days)
    // console.log(days)

    /* eslint-disable no-unused-vars */
    const tasksByDays = tasks.reduce((accumulator, task) => {
      const day = task.startTime.date()

      const dayObj = accumulator.find(dayObj => dayObj.day === day)

      if (dayObj) {
        dayObj.tasks.push(task)
        dayObj.duration += this.round(task.duration / 3600)
      } else {
        accumulator.push({
          day,
          date: task.startTime.format('YYYY-MM-DD'),
          tasks: [task],
          duration: this.round(task.duration / 3600),
        })
      }

      return accumulator
    }, [])
    /* eslint-enable no-unused-vars */

    const jsonForFile = tasks.map(task => {
      return {
        ...config.fields,
        // startTime: task.startTime.format('YYYY-MM-DDTHH:mm:ss') + '+0000',
        // endTime: task.endTime.format('YYYY-MM-DDTHH:mm:ss') + '+0000',
        startTime: task.startTime.format(),
        endTime: task.endTime.format(),
        duration: task.duration,
        notes: task.notes,
        sum: task.sum,
      }
    })

    this.writeToFile(jsonForFile)
    this.createCsvFile(jsonForFile)
  }

  writeToFile (jsonForFile) {
    fs.writeFile('output.json', JSON.stringify(jsonForFile), 'utf8', () => {})
  }

  createCsvFile (jsArray) {
    const header = Object.keys(jsArray[0]).join(';') + '\n'
    const csv = header + jsArray.map(row => Object.values(row).join(';')).join('\n')
    fs.writeFile('output.csv', csv, 'utf8', () => {})
  }

  createId () {
    return this._id++
  }

  getEveryDayForGivenMonth (month) {
    const days = []
    let date = config.date.clone()
    while (date.month() === month) {
      days.push({
        date: date.clone(),
        dateFormat: date.format(),
        weekday: this.getWeekDay(date),
      })
      date = date.add(1, 'day')
    }
    return days
  }

  getWeekDay (date) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return weekdays[date.day()]
  }

  createTasksEntriesForEveryDay (days) {
    let entries = []
    days.forEach(day => {
      entries = entries.concat(this.createTaskEntriesForDay(day))
    })
    return entries
  }

  createTaskEntriesForDay (day) {
    const tasks = [this.createFirstEntryForDay(day)]
    let durationTotal = tasks[0].duration
    let pause = false

    while (durationTotal < 28800) {
      if (!pause && tasks[tasks.length - 1].endTime.hour() >= 12) {
        console.log(tasks[tasks.length - 1])
        tasks.push(this.createTask(day, tasks, true))
        pause = true
      } else {
        tasks.push(this.createTask(day, tasks, false))
      }

      durationTotal += tasks[tasks.length - 1].duration
    }

    return tasks
  }

  createFirstEntryForDay (day) {
    const earliestStartDate = day.date.hour(config.firstTasks.earliestStartHour).minute(config.firstTasks.earliestStartMinute)
    const latestStartDate = day.date.hour(config.firstTasks.latestStartHour).minute(config.firstTasks.latestStartMinute)
    const minutes = latestStartDate.diff(earliestStartDate, 'minute')
    const randomStartMinutes = this.randomNum(0, minutes)
    const randomDuration = this.randomNum(23, 44)

    const startTime = earliestStartDate.add(randomStartMinutes, 'minute')
    const endTime = startTime.add(randomDuration, 'minute')
    const notes = config.firstTasks.notes[this.randomNum(0, config.firstTasks.notes.length - 1)]

    return {
      ...config.fields,
      id: this.createId(),
      startTime,
      endTime,
      startTimeFormat: startTime.format(),
      endTimeFormat: endTime.format(),
      duration: this.round(randomDuration * 60),
      sum: this.round(config.fields.rate * randomDuration / 60),
      notes,
    }
  }

  createTask (day, tasks, setPause = false) {
    const minuteGap = setPause ? this.randomNum(34, 52) : this.randomNum(1, 8)

    const startTime = tasks[tasks.length - 1].endTime.add(minuteGap, 'minute')
    const task = config.tasks[this.randomNum(0, config.tasks.length - 1)]
    const duration = this.randomNum(task.minTime, task.maxTime)
    const endTime = startTime.add(duration, 'minute')

    return {
      ...config.fields,
      id: this.createId(),
      startTime,
      endTime,
      startTimeFormat: startTime.format(),
      endTimeFormat: endTime.format(),
      duration: this.round(duration * 60),
      sum: this.round(config.fields.rate * duration / 60),
      notes: task.value,
    }
  }

  randomNum (min, max) {
    return Math.round(Math.random() * (max - min) + min)
  }

  round (num) {
    return Math.round(num * 100) / 100
  }
}

new Creator().getEveryDayForGivenMonth(1)

module.exports = Creator
