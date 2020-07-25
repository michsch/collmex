const prices = [
  {
    name: 'Rails-Entwicklung',
    value: 75
  },
  {
    name: 'Entwicklung',
    value: 70
  },
  {
    name: 'Inhaltseinpflege',
    value: 50
  },
  {
    name: 'Produktion (nicht berechenbar)',
    value: 0
  },
  {
    name: 'Workshop Teilnahme (nicht berechenbar)',
    value: 0
  },
  {
    name: 'default',
    value: 65
  }
]

const loadjQuery = () => {
  const timeout = 10000
  const src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js'
  const script = document.createElement('script')
  script.src = src

  return new Promise((resolve, reject) => {
    const to = window.setTimeout(() => {
      reject(new Error(`jQuery Timeout after ${timeout / 1000} seconds.`))
    }, timeout)

    script.onload = function () {
      window.clearTimeout(to)

      if (window.jQuery) {
        resolve(window.jQuery)
      } else {
        reject(new Error('jQuery not found!'))
      }
    }

    document.head.append(script)
  })
}

class TableFormFiller {
  constructor () {
    this._$el = $('table.tabledata').first()

    this._el = {
      $tr: this._$el.find('tr')
    }
  }

  init () {
    this._el.$tr.each((index, element) => {
      let price = null
      const $tr = $(element)
      const $inputs = $tr.find('input')
      const $bezeichnung = this._findInput($inputs, /^table_(\d+)_bezeichnung$/)
      const $target = this._findInput($inputs, /^table_(\d+)_satz$/)
      const name = $bezeichnung.val()

      console.log('Result', name, $bezeichnung, $target)

      price = prices.find(item => item.name === name)

      if (price == null) {
        price = prices.find(item => item.name === 'default')
      }

      $target.val(price.value.toString().replace('.', ','))
    })
  }

  _findInput ($inputs, regex) {
    return $inputs
      .filter((index, element) => {
        const $input = $(element)
        const id = $input.attr('id')

        if (id == null) {
          return false
        } else {
          return id.match(regex) != null
        }
      }).first()
  }
}

loadjQuery().then(jQuery => {
  window.$ = jQuery

  const tableFormFiller = new TableFormFiller()
  tableFormFiller.init()
})
