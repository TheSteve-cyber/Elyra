/* ═══════════════════════════════
   ELYRA — chat.js
   ═══════════════════════════════ */

// ── Config ──
// Troque pela URL do seu backend no Render após o deploy
const BACKEND_URL = 'https://elyra-backend.onrender.com'

// ── State ──
const conversationHistory = []
let isLoading = false

// ── DOM ──
const messagesDiv  = document.getElementById('messages')
const chatInput    = document.getElementById('chatInput')
const sendBtn      = document.getElementById('sendBtn')
const typingDiv    = document.getElementById('typing')
const statusDot    = document.getElementById('statusDot')
const statusText   = document.getElementById('statusText')
const initTimeEl   = document.getElementById('initTime')

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initTimeEl.textContent = getTime()
  checkBackend()
  initParticles()
  initCursor()
  initNav()
  initTextarea()
})

// ── Backend health check ──
async function checkBackend() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      setStatus('online', 'online · assistente pessoal')
    } else {
      setStatus('error', 'erro de conexão')
    }
  } catch {
    setStatus('error', 'backend offline')
  }
}

function setStatus(state, text) {
  statusDot.className = 'status-dot ' + state
  statusText.textContent = text
}

// ── Helpers ──
function getTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function showTyping(show) {
  typingDiv.className = show ? 'typing-indicator show' : 'typing-indicator'
  if (show) messagesDiv.scrollTop = messagesDiv.scrollHeight
}

function setLoading(state) {
  isLoading = state
  sendBtn.disabled = state
  showTyping(state)
}

function addMessage(content, role, isHTML = false, extraClass = '') {
  const wrap = document.createElement('div')
  wrap.className = `msg ${role} ${extraClass}`.trim()

  const bubble = document.createElement('div')
  bubble.className = 'msg-bubble'
  if (isHTML) bubble.innerHTML = content
  else bubble.textContent = content

  const time = document.createElement('div')
  time.className = 'msg-time'
  time.textContent = getTime()

  wrap.appendChild(bubble)
  wrap.appendChild(time)
  messagesDiv.appendChild(wrap)
  messagesDiv.scrollTop = messagesDiv.scrollHeight
  return wrap
}

// ── Send message ──
async function sendMessage() {
  const text = chatInput.value.trim()
  if (!text || isLoading) return

  chatInput.value = ''
  chatInput.style.height = 'auto'
  addMessage(text, 'user')

  // Roblox command
  const lower = text.toLowerCase()
  if (lower.startsWith('!roblox ') || lower.startsWith('!rbx ')) {
    const username = text.split(' ').slice(1).join(' ').trim()
    if (username) {
      await handleRoblox(username)
    } else {
      addMessage('Use: !roblox <usuário>', 'bot')
    }
    return
  }

  // AI chat
  setLoading(true)
  conversationHistory.push({ role: 'user', content: text })

  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory }),
      signal: AbortSignal.timeout(30000)
    })

    setLoading(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      addMessage(`❌ ${err.error || 'Erro ao conectar com Elyra.'}`, 'bot', false, 'msg-error')
      conversationHistory.pop()
      return
    }

    const data = await res.json()
    const reply = data.reply || '...'
    conversationHistory.push({ role: 'assistant', content: reply })
    addMessage(reply, 'bot')

  } catch (err) {
    setLoading(false)
    conversationHistory.pop()
    if (err.name === 'TimeoutError') {
      addMessage('⏱ Tempo esgotado. Tente novamente.', 'bot', false, 'msg-error')
    } else {
      addMessage('❌ Sem conexão com o backend. Verifique se o servidor está online.', 'bot', false, 'msg-error')
    }
  }
}

// ── Textarea auto-resize + Enter to send ──
function initTextarea() {
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto'
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px'
  })

  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })
}

// ── Nav scroll effect ──
function initNav() {
  const nav = document.getElementById('nav')
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60)
  })
}

// ── Cursor (desktop) ──
function initCursor() {
  if (window.innerWidth <= 768) return
  const cursor     = document.getElementById('cursor')
  const cursorRing = document.getElementById('cursorRing')
  if (!cursor || !cursorRing) return

  let mx = 0, my = 0, rx = 0, ry = 0

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY })

  function loop() {
    cursor.style.left = mx + 'px'
    cursor.style.top  = my + 'px'
    rx += (mx - rx) * 0.13
    ry += (my - ry) * 0.13
    cursorRing.style.left = rx + 'px'
    cursorRing.style.top  = ry + 'px'
    requestAnimationFrame(loop)
  }
  loop()
}

// ── Particles ──
function initParticles() {
  const canvas = document.getElementById('particles')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
  resize()
  window.addEventListener('resize', resize)

  const pts = Array.from({ length: 55 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vy: -(0.15 + Math.random() * 0.35),
    vx: (Math.random() - 0.5) * 0.1,
    life: Math.random(),
    max: 0.3 + Math.random() * 0.6,
    r: 0.4 + Math.random() * 1.2
  }))

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    pts.forEach(p => {
      p.life += 0.003
      if (p.life > p.max) {
        p.life = 0
        p.x = Math.random() * canvas.width
        p.y = canvas.height + 5
      }
      p.y += p.vy; p.x += p.vx
      const a = Math.sin((p.life / p.max) * Math.PI) * 0.3
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(168,180,232,${a})`
      ctx.fill()
    })
    requestAnimationFrame(draw)
  }
  draw()
}

// expose sendMessage globally
window.sendMessage = sendMessage
