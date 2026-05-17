AOS.init();

async function loadScores() {
  const container = document.getElementById('scores-container');
  const source = document.getElementById('scores-source');
  container.innerHTML = '<p>Loading scores...</p>';

  try {
    const response = await fetch('/api/scores');
    const data = await response.json();
    source.textContent = `Data source: ${data.source}`;
    container.innerHTML = '';

    data.games.forEach(game => {
      container.innerHTML += `
        <div class="card" data-aos="fade-up">
          <h3>${game.away} vs ${game.home}</h3>
          <p>Score: ${game.awayScore} - ${game.homeScore}</p>
          <p>Status: ${game.state}</p>
          <p>${game.gameTime}</p>
        </div>
      `;
    });
  } catch (error) {
    container.innerHTML = '<p>Scores could not be loaded.</p>';
  }
}

async function loadLeaders() {
  const container = document.getElementById('leaders-container');
  const source = document.getElementById('leaders-source');
  container.innerHTML = '<p>Loading standings...</p>';

  try {
    const response = await fetch('/api/leaders');
    const data = await response.json();
    source.textContent = `Data source: ${data.source}`;
    container.innerHTML = '';

    data.leaders.forEach(team => {
      container.innerHTML += `
        <div class="card" data-aos="fade-up">
          <h3>${team.team}</h3>
          <p>Points: ${team.points}</p>
          <p>Record: ${team.wins}-${team.losses}</p>
        </div>
      `;
    });

    makeChart(data.leaders);
  } catch (error) {
    container.innerHTML = '<p>Standings could not be loaded.</p>';
  }
}

function makeChart(leaders) {
  const canvas = document.getElementById('standingsChart');

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: leaders.map(team => team.team),
      datasets: [{
        label: 'Team Points',
        data: leaders.map(team => team.points)
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: 'white' }
        }
      },
      scales: {
        x: { ticks: { color: 'white' } },
        y: { ticks: { color: 'white' } }
      }
    }
  });
}

loadScores();
loadLeaders();
