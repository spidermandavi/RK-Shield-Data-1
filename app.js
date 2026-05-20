const analyzeBtn = document.getElementById("analyzeBtn");
const tournamentInput = document.getElementById("tournamentInput");
const statsOutput = document.getElementById("statsOutput");

const copyTextBtn = document.getElementById("copyTextBtn");
const copyJsonBtn = document.getElementById("copyJsonBtn");

let latestStatsText = "";
let latestStatsJson = {};

analyzeBtn.addEventListener("click", analyzeTournament);
copyTextBtn.addEventListener("click", copyTextStats);
copyJsonBtn.addEventListener("click", copyJsonStats);

async function analyzeTournament() {
  try {
    statsOutput.textContent = "Loading tournament...";

    const url = tournamentInput.value.trim();

    const tournamentId = extractTournamentId(url);

    if (!tournamentId) {
      statsOutput.textContent = "Invalid tournament URL.";
      return;
    }

    const cached = localStorage.getItem(`rk_${tournamentId}`);

    let games;

    if (cached) {
      games = JSON.parse(cached);
    } else {
      games = await fetchTournamentGames(tournamentId);
      localStorage.setItem(`rk_${tournamentId}`, JSON.stringify(games));
    }

    const stats = calculateStats(games, tournamentId);

    latestStatsJson = stats;
    latestStatsText = generateTextOutput(stats);

    statsOutput.textContent = latestStatsText;

  } catch (err) {
    console.error(err);
    statsOutput.textContent = "Error loading tournament.";
  }
}

function extractTournamentId(url) {
  const match = url.match(/tournament\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function fetchTournamentGames(tournamentId) {

  const response = await fetch(
    `https://lichess.org/api/tournament/${tournamentId}/games`,
    {
      headers: {
        Accept: "application/x-ndjson"
      }
    }
${stats.longestGame
