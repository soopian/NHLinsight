AOS.init();

const form = document.getElementById('favorite-form');
const container = document.getElementById('favorites-container');
const source = document.getElementById('favorites-source');

async function loadFavorites() {
  container.innerHTML = '<p>Loading favorites...</p>';

  try {
    const response = await fetch('/api/favorites');
    const data = await response.json();
    source.textContent = `Data source: ${data.source}`;
    container.innerHTML = '';

    data.favorites.forEach(team => {
      container.innerHTML += `
        <div class="card" data-aos="fade-up">
          <h3>${team.team_name}</h3>
          <p>Abbreviation: ${team.team_abbrev}</p>
          <p>${team.note || 'No note added.'}</p>
        </div>
      `;
    });
  } catch (error) {
    container.innerHTML = '<p>Favorites could not be loaded.</p>';
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  const favorite = {
    team_name: document.getElementById('team-name').value,
    team_abbrev: document.getElementById('team-abbrev').value,
    note: document.getElementById('team-note').value
  };

  await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(favorite)
  });

  form.reset();
  loadFavorites();
});

loadFavorites();
