AOS.init();

async function loadSchedule() {
  const container = document.getElementById('schedule-container');
  const source = document.getElementById('schedule-source');
  container.innerHTML = '<p>Loading schedule...</p>';

  try {
    const response = await fetch('/api/schedule');
    const data = await response.json();
    source.textContent = `Data source: ${data.source}`;
    container.innerHTML = '';

    data.games.forEach(game => {
      container.innerHTML += `
        <div class="card" data-aos="fade-up">
          <h3>${game.away} at ${game.home}</h3>
          <p>${game.gameTime}</p>
          <p>${game.venue}</p>
        </div>
      `;
    });
  } catch (error) {
    container.innerHTML = '<p>Schedule could not be loaded.</p>';
  }
}

loadSchedule();
