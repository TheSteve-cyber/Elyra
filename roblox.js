/* ═══════════════════════════════
   ELYRA — roblox.js
   ═══════════════════════════════ */

async function handleRoblox(username) {
  const searching = addMessage(`🔍 Buscando perfil de "${username}"...`, 'bot')

  try {
    // 1. Find user by username
    const searchRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    })
    const searchData = await searchRes.json()
    const user = searchData?.data?.[0]

    if (!user) {
      searching.querySelector('.msg-bubble').textContent = `❌ Usuário "${username}" não encontrado no Roblox.`
      return
    }

    const id = user.id

    // 2. Fetch all data in parallel
    const [profileRes, friendsRes, followersRes, followingRes, badgesRes, gamesRes, thumbRes] =
      await Promise.allSettled([
        fetch(`https://users.roblox.com/v1/users/${id}`),
        fetch(`https://friends.roblox.com/v1/users/${id}/friends/count`),
        fetch(`https://friends.roblox.com/v1/users/${id}/followers/count`),
        fetch(`https://friends.roblox.com/v1/users/${id}/followings/count`),
        fetch(`https://badges.roblox.com/v1/users/${id}/badges?limit=5&sortOrder=Desc`),
        fetch(`https://games.roblox.com/v2/users/${id}/games?limit=5&sortOrder=Desc`),
        fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png`)
      ])

    const profile   = profileRes.status   === 'fulfilled' ? await profileRes.value.json()   : {}
    const friends   = friendsRes.status   === 'fulfilled' ? (await friendsRes.value.json())?.count   ?? 'N/A' : 'N/A'
    const followers = followersRes.status === 'fulfilled' ? (await followersRes.value.json())?.count ?? 'N/A' : 'N/A'
    const following = followingRes.status === 'fulfilled' ? (await followingRes.value.json())?.count ?? 'N/A' : 'N/A'
    const badges    = badgesRes.status    === 'fulfilled' ? (await badgesRes.value.json())?.data   ?? [] : []
    const games     = gamesRes.status     === 'fulfilled' ? (await gamesRes.value.json())?.data    ?? [] : []
    const thumbData = thumbRes.status     === 'fulfilled' ? await thumbRes.value.json() : null
    const avatarUrl = thumbData?.data?.[0]?.imageUrl || ''

    // 3. Format data
    const created = profile.created
      ? new Date(profile.created).toLocaleDateString('pt-BR')
      : 'N/A'
    const statusBadge = profile.isBanned ? '🔴 Banido' : '✅ Ativo'
    const desc = (profile.description || '').trim().slice(0, 100) || 'Sem descrição'

    const badgesHTML = badges.slice(0, 3).map(b =>
      `<span>🏅 ${escapeHTML(b.name)}</span>`
    ).join('<br>') || 'Nenhum'

    const gamesHTML = games.slice(0, 3).map(g =>
      `<span>🎮 ${escapeHTML(g.name)}</span>`
    ).join('<br>') || 'Nenhum público'

    // 4. Build card HTML
    const html = `
      <div class="roblox-card">
        <div class="rbx-header">
          ${avatarUrl ? `<img src="${avatarUrl}" class="rbx-avatar" alt="avatar">` : ''}
          <div>
            <div class="rbx-username">${escapeHTML(user.displayName)}</div>
            <div class="rbx-handle">@${escapeHTML(user.name)} · ID ${id}</div>
          </div>
        </div>

        <div class="rbx-row"><span class="rbx-label">Status</span><span class="rbx-val">${statusBadge}</span></div>
        <div class="rbx-row"><span class="rbx-label">Conta criada</span><span class="rbx-val">${created}</span></div>
        <div class="rbx-row"><span class="rbx-label">Amigos</span><span class="rbx-val">${friends}</span></div>
        <div class="rbx-row"><span class="rbx-label">Seguidores</span><span class="rbx-val">${followers}</span></div>
        <div class="rbx-row"><span class="rbx-label">Seguindo</span><span class="rbx-val">${following}</span></div>
        <div class="rbx-row"><span class="rbx-label">Badges recentes</span><span class="rbx-val">${badgesHTML}</span></div>
        <div class="rbx-row"><span class="rbx-label">Jogos públicos</span><span class="rbx-val">${gamesHTML}</span></div>
        <div class="rbx-row"><span class="rbx-label">Descrição</span><span class="rbx-val">${escapeHTML(desc)}</span></div>

        <div class="rbx-link">🔗 <a href="https://www.roblox.com/users/${id}/profile" target="_blank">roblox.com/users/${id}/profile</a></div>
      </div>
    `

    // Replace "searching" bubble with the card
    searching.querySelector('.msg-bubble').innerHTML = html

  } catch (err) {
    console.error('Roblox error:', err)
    searching.querySelector('.msg-bubble').textContent = '❌ Erro ao buscar perfil. Verifique o nome e tente novamente.'
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

window.handleRoblox = handleRoblox
