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

      localStorage.setItem(
        `rk_${tournamentId}`,
        JSON.stringify(games)
      );
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
  );

  const text = await response.text();

  const lines = text
    .split("\n")
    .filter(line => line.trim() !== "");

  return lines.map(line => JSON.parse(line));
}

function calculateStats(games, tournamentId) {

  const players = {};
  const openingMap = {};

  let totalMoves = 0;
  let validGames = 0;

  let berserkGames = 0;
  let totalGames = 0;

  let whiteWins = 0;
  let blackWins = 0;
  let draws = 0;

  let longestGame = null;
  let shortestGame = null;

  games.forEach(game => {

    totalGames++;

    const moves = game.moves
      ? game.moves.split(" ")
      : [];

    const moveCount = moves.length;

    const white = game.players.white;
    const black = game.players.black;

    if (!white?.user?.name || !black?.user?.name) {
      return;
    }

    initPlayer(
      players,
      white.user.name,
      white.rating
    );

    initPlayer(
      players,
      black.user.name,
      black.rating
    );

    players[white.user.name].games++;
    players[black.user.name].games++;

    const winner = game.winner || "draw";

    if (winner === "white") {

      whiteWins++;

      players[white.user.name].wins++;
      players[black.user.name].losses++;

      updateStreak(
        players[white.user.name],
        true
      );

      updateStreak(
        players[black.user.name],
        false
      );

    } else if (winner === "black") {

      blackWins++;

      players[black.user.name].wins++;
      players[white.user.name].losses++;

      updateStreak(
        players[black.user.name],
        true
      );

      updateStreak(
        players[white.user.name],
        false
      );

    } else {

      draws++;

      players[white.user.name].draws++;
      players[black.user.name].draws++;

      updateStreak(
        players[white.user.name],
        false
      );

      updateStreak(
        players[black.user.name],
        false
      );
    }

    if (white.berserk) berserkGames++;
    if (black.berserk) berserkGames++;

    if (moveCount > 0) {

      validGames++;
      totalMoves += moveCount;

      if (
        !longestGame ||
        moveCount > longestGame.moves
      ) {
        longestGame = {
          id: game.id,
          moves: moveCount,
          white: white.user.name,
          black: black.user.name
        };
      }

      if (
        !shortestGame ||
        moveCount < shortestGame.moves
      ) {
        shortestGame = {
          id: game.id,
          moves: moveCount,
          white: white.user.name,
          black: black.user.name
        };
      }

      const openingKey = moves
        .slice(0, 8)
        .join(" ");

      if (openingKey) {
        openingMap[openingKey] =
          (openingMap[openingKey] || 0) + 1;
      }
    }

    updateRatings(players, white, black);
  });

  const playerArray = Object.entries(players)
    .map(([name, data]) => {

      const gamesPlayed = data.games;

      return {
        name,
        ...data,

        winRate:
          gamesPlayed >= 10
            ? (data.wins / gamesPlayed) * 100
            : null,

        lossRate:
          gamesPlayed >= 10
            ? (data.losses / gamesPlayed) * 100
            : null,

        ratingChange:
          data.endRating - data.startRating
      };
    });

  const totalPlayers = playerArray.length;

  const averageRating = Math.round(
    playerArray.reduce(
      (sum, p) => sum + p.startRating,
      0
    ) / totalPlayers
  );

  const bestUnder2000 = playerArray
    .filter(p => p.startRating < 2000)
    .sort((a, b) => {
      if (b.games !== a.games) {
        return b.games - a.games;
      }

      return b.performance - a.performance;
    })[0] || null;

  return {

    tournamentId,

    overview: {
      totalPlayers,

      averageRating,

      berserkRate: percentage(
        berserkGames,
        totalGames * 2
      ),

      whiteWinPercentage: percentage(
        whiteWins,
        totalGames
      ),

      blackWinPercentage: percentage(
        blackWins,
        totalGames
      ),

      drawPercentage: percentage(
        draws,
        totalGames
      ),

      averageMoves: validGames
        ? (
            totalMoves / validGames
          ).toFixed(2)
        : 0
    },

    topGainers:
      sortDesc(playerArray, "ratingChange")
        .slice(0, 3),

    topLosers:
      sortAsc(playerArray, "ratingChange")
        .slice(0, 3),

    topWinRates:
      playerArray
        .filter(p => p.winRate !== null)
        .sort((a, b) =>
          b.winRate - a.winRate
        )
        .slice(0, 3),

    topLossRates:
      playerArray
        .filter(p => p.lossRate !== null)
        .sort((a, b) =>
          b.lossRate - a.lossRate
        )
        .slice(0, 3),

    topStreaks:
      playerArray
        .sort((a, b) =>
          b.bestStreak - a.bestStreak
        )
        .slice(0, 3),

    mostGames:
      playerArray
        .sort((a, b) =>
          b.games - a.games
        )
        .slice(0, 3),

    highestPerformance:
      playerArray
        .sort((a, b) =>
          b.performance - a.performance
        )
        .slice(0, 3),

    lowestPerformance:
      playerArray
        .sort((a, b) =>
          a.performance - b.performance
        )
        .slice(0, 3),

    mostPlayedOpenings:
      Object.entries(openingMap)
        .sort((a, b) =>
          b[1] - a[1]
        )
        .slice(0, 10)
        .map(([moves, count]) => ({
          moves,
          count
        })),

    longestGame,
    shortestGame,

    bestUnder2000
  };
}

function initPlayer(players, name, rating) {

  if (!players[name]) {

    players[name] = {

      startRating: rating,
      endRating: rating,
      performance: rating,

      wins: 0,
      losses: 0,
      draws: 0,
      games: 0,

      currentStreak: 0,
      bestStreak: 0
    };
  }
}

function updateRatings(players, white, black) {

  players[white.user.name].endRating =
    white.rating;

  players[black.user.name].endRating =
    black.rating;

  if (white.ratingDiff !== undefined) {
    players[white.user.name].performance +=
      white.ratingDiff;
  }

  if (black.ratingDiff !== undefined) {
    players[black.user.name].performance +=
      black.ratingDiff;
  }
}

function updateStreak(player, won) {

  if (won) {

    player.currentStreak++;

    if (
      player.currentStreak >
      player.bestStreak
    ) {
      player.bestStreak =
        player.currentStreak;
    }

  } else {

    player.currentStreak = 0;
  }
}

function percentage(part, total) {

  return total
    ? ((part / total) * 100).toFixed(2)
    : 0;
}

function sortDesc(arr, key) {

  return [...arr]
    .sort((a, b) => b[key] - a[key]);
}

function sortAsc(arr, key) {

  return [...arr]
    .sort((a, b) => a[key] - b[key]);
}

function generateTextOutput(stats) {

  return `
RK SHIELD ARENA ANALYSIS
========================

TOURNAMENT OVERVIEW
-------------------
Total Players: ${stats.overview.totalPlayers}
Average Rating: ${stats.overview.averageRating}
Berserk Rate: ${stats.overview.berserkRate}%

White Win %: ${stats.overview.whiteWinPercentage}%
Black Win %: ${stats.overview.blackWinPercentage}%
Draw %: ${stats.overview.drawPercentage}%

Average Moves: ${stats.overview.averageMoves}

TOP GAINERS
------------
${formatPlayers(
  stats.topGainers,
  p => `${p.ratingChange}`
)}

TOP LOSERS
-----------
${formatPlayers(
  stats.topLosers,
  p => `${p.ratingChange}`
)}

TOP WIN RATES
--------------
${formatPlayers(
  stats.topWinRates,
  p => `${p.winRate.toFixed(2)}%`
)}

TOP LOSS RATES
---------------
${formatPlayers(
  stats.topLossRates,
  p => `${p.lossRate.toFixed(2)}%`
)}

TOP WIN STREAKS
----------------
${formatPlayers(
  stats.topStreaks,
  p => `${p.bestStreak}`
)}

MOST GAMES
-----------
${formatPlayers(
  stats.mostGames,
  p => `${p.games}`
)}

HIGHEST PERFORMANCE
--------------------
${formatPlayers(
  stats.highestPerformance,
  p => `${Math.round(p.performance)}`
)}

LOWEST PERFORMANCE
-------------------
${formatPlayers(
  stats.lowestPerformance,
  p => `${Math.round(p.performance)}`
)}

MOST PLAYED OPENINGS
---------------------
${stats.mostPlayedOpenings
  .map(
    (o, i) =>
      `${i + 1}. ${o.moves} (${o.count})`
  )
  .join("\n")}

LONGEST GAME
-------------
${stats.longestGame.white}
vs
${stats.longestGame.black}

Moves:
${stats.longestGame.moves}

SHORTEST GAME
--------------
${stats.shortestGame.white}
vs
${stats.shortestGame.black}

Moves:
${stats.shortestGame.moves}

BEST UNDER 2000
----------------
${stats.bestUnder2000.name}

Games:
${stats.bestUnder2000.games}

Rating Change:
${stats.bestUnder2000.ratingChange}
`;
}

function formatPlayers(players, formatter) {

  return players
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${formatter(p)})`
    )
    .join("\n");
}

function copyTextStats() {

  if (!latestStatsText) return;

  navigator.clipboard.writeText(
    latestStatsText
  );
}

function copyJsonStats() {

  if (!latestStatsJson) return;

  navigator.clipboard.writeText(
    JSON.stringify(
      latestStatsJson,
      null,
      2
    )
  );
}
