// ─── Showcase examples ───────────────────────────────────────────────────────

const EXAMPLES = {
  utilisateurs: `source api("https://jsonplaceholder.typicode.com/users")
  puis extrait [id, name, email]
  puis affiche;`,

  filtre: `source api("https://jsonplaceholder.typicode.com/todos")
  puis filtre userId == 1
  puis filtre completed == faux
  puis extrait [id, title]
  puis affiche;`,

  transforme: `source api("https://jsonplaceholder.typicode.com/posts")
  puis filtre userId == 1
  puis extrait [id, title, userId]
  puis transforme userId est userId * 100
  puis affiche;`,

  pipeline: `pipeline resumer debut
  puis extrait [id, name, email]
  puis filtre id < 4
  puis affiche;
fin

source api("https://jsonplaceholder.typicode.com/users") | resumer;`,

  libre: ``,
}

// ─── CodeMirror Flux mode ─────────────────────────────────────────────────────

CodeMirror.defineMode('flux', () => {
  const KEYWORDS  = /^(source|puis|filtre|extrait|transforme|affiche|sauvegarde|pipeline|debut|fin|est)\b/
  const BUILTINS  = /^(api)\b/
  const BOOLEANS  = /^(vrai|faux)\b/
  const LOGICALS  = /^(et|ou)\b/
  const OPERATORS = /^(==|!=|<=|>=|<|>|\||\*|\+|-|\/)/
  const NUMBERS   = /^-?\d+(\.\d+)?/
  const STRINGS   = /^"([^"\\]|\\.)*"/

  return {
    token(stream) {
      if (stream.eatSpace()) return null

      if (stream.match(/^\/\/.*/)) return 'flux-comment'
      if (stream.match(STRINGS))   return 'flux-string'
      if (stream.match(NUMBERS))   return 'flux-number'
      if (stream.match(BOOLEANS))  return 'flux-bool'
      if (stream.match(KEYWORDS))  return 'flux-keyword'
      if (stream.match(LOGICALS))  return 'flux-keyword'
      if (stream.match(BUILTINS))  return 'flux-builtin'
      if (stream.match(OPERATORS)) return 'flux-operator'

      stream.next()
      return null
    },
  }
})

// ─── Editor setup ─────────────────────────────────────────────────────────────

const editor = CodeMirror(document.getElementById('editor'), {
  value: EXAMPLES.utilisateurs,
  mode: 'flux',
  lineNumbers: true,
  indentWithTabs: false,
  tabSize: 2,
  lineWrapping: false,
  autofocus: true,
  extraKeys: {
    'Ctrl-Enter': run,
    'Cmd-Enter':  run,
  },
})

// ─── Tabs ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    btn.classList.add('active')

    const key = btn.dataset.example
    editor.setValue(EXAMPLES[key] ?? '')
    editor.focus()

    if (key !== 'libre') run()
  })
})

// ─── Run ──────────────────────────────────────────────────────────────────────

const runBtn      = document.getElementById('run-btn')
const outputEl    = document.getElementById('output')
const statusEl    = document.getElementById('output-status')

async function run() {
  const code = editor.getValue().trim()
  if (!code) return

  runBtn.disabled = true
  outputEl.innerHTML = '<span class="spinner"></span>'
  statusEl.textContent = ''
  statusEl.className = ''

  try {
    const res  = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      outputEl.innerHTML = `<span class="output-error">${escape(data.error)}</span>`
      statusEl.textContent = 'Erreur'
      statusEl.className = 'error'
    } else {
      outputEl.innerHTML = highlightJson(data.output)
      statusEl.textContent = 'OK'
      statusEl.className = 'ok'
    }
  } catch {
    outputEl.innerHTML = '<span class="output-error">Impossible de joindre le serveur.</span>'
    statusEl.textContent = 'Erreur'
    statusEl.className = 'error'
  } finally {
    runBtn.disabled = false
  }
}

document.getElementById('run-btn').addEventListener('click', run)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightJson(raw) {
  return escape(raw).replace(
    /("(?:[^"\\]|\\.)*")(\s*:)?|(\btrue\b|\bfalse\b)|\bnull\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, str, colon, bool, num) => {
      if (str && colon) return `<span class="j-key">${str}</span>${colon}`
      if (str)          return `<span class="j-str">${str}</span>`
      if (bool)         return `<span class="j-bool">${bool}</span>`
      if (match === 'null') return `<span class="j-null">null</span>`
      if (num)          return `<span class="j-num">${num}</span>`
      return match
    }
  )
}

// ─── Auto-run the first example on load ──────────────────────────────────────

run()

// ─── API cards ────────────────────────────────────────────────────────────────

document.querySelectorAll('.api-card').forEach(card => {
  card.addEventListener('click', () => {
    const url = card.dataset.url
    const copyEl = card.querySelector('.api-copy')
    navigator.clipboard.writeText(url).then(() => {
      copyEl.textContent = 'Copié ✓'
      copyEl.classList.add('copied')
      setTimeout(() => {
        copyEl.textContent = 'Copier'
        copyEl.classList.remove('copied')
      }, 1500)
    })
  })
})
