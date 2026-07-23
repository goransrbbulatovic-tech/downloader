const STATUS_URL = 'http://127.0.0.1:57432/ping'
const DL_URL     = 'http://127.0.0.1:57432/download'

let currentUrl = ''

chrome.tabs.query({ active:true, currentWindow:true }, (tabs) => {
  currentUrl = tabs[0]?.url || ''
  document.getElementById('pageUrl').textContent = currentUrl
})

async function sendToApp(format) {
  const status = document.getElementById('status')
  status.textContent = 'Šaljem u ACMigo...'
  try {
    const res = await fetch(DL_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ url:currentUrl, title:document.title, format })
    })
    const data = await res.json()
    if (data.success) {
      status.textContent = '✓ Dodano u red čekanja!'
      status.style.color = '#4ade80'
    }
  } catch(e) {
    document.getElementById('notRunning').style.display = 'block'
    status.textContent = ''
  }
}

document.getElementById('btnDownload').addEventListener('click', () => sendToApp('mp4'))
document.getElementById('btnMp3').addEventListener('click',     () => sendToApp('mp3'))
