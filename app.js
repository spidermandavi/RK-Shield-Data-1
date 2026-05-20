const analyzeBtn = document.getElementById("analyzeBtn");
}

function sortDesc(arr, key) {
  return [...arr].sort((a, b) => b[key] - a[key]);
}

function sortAsc(arr, key) {
  return [...arr].sort((a, b) => a[key] - b[key]);
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
Win Percentage: ${stats.overview.winPercentage}%
Draw Percentage: ${stats.overview.drawPercentage}%
Average Moves: ${stats.overview.averageMoves}

TOP GAINERS
------------
${formatPlayers(stats.topGainers, p => `${p.ratingChange}`)}

TOP LOSERS
-----------
${formatPlayers(stats.topLosers, p => `${p.ratingChange}`)}

TOP WIN RATES
--------------
${formatPlayers(stats.topWinRates, p => `${p.winRate.toFixed(2)}%`)}

TOP LOSS RATES
---------------
${formatPlayers(stats.topLossRates, p => `${p.lossRate.toFixed(2)}%`)}

TOP WIN STREAKS
----------------
${formatPlayers(stats.topStreaks, p => `${p.bestStreak}`)}

MOST GAMES
-----------
${formatPlayers(stats.mostGames, p => `${p.games}`)}

MOST PLAYED OPENINGS
---------------------
${stats.mostPlayedOpenings
  .map((o, i) => `${i + 1}. ${o.moves} (${o.count})`)
  .join("\n")}

LONGEST GAME
-------------
${stats.longestGame
