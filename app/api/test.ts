




const text = "×\nWordtracker \nBy Search\n \nBy Domain\n \nBy Rank\nLog in\n Unlock full tool\n×\n\n Have you seen our new ranking tool?\n\n0 free searches remaining. Unlock now...\n Enter a seed term to reveal what people search for online \n Territory\nUnited States\nSearch\nImport...\nShow search options...\nEnter any idea or keyword to begin...\nClose\n$10 ONLY\nGet everything Wordtracker has to offer for a month for $10\nEmail address \nPassword \nUnlock full access for $10 \n\nGet Wordtracker for just $10 for a month,\nand only $24/month after that, forever.\n\n See all plans and pricing\n\nDetails\nBilling\nDone!\nSELECTED PLAN\nWordtracker Bronze\nUnlimited searches\nUp to 1000 results\nAnalyze unlimited domains\nTrack rank of up to 1000 keywords\nFull data exports\n\nGuaranteed safe and secure checkout\n\n\"Thanks for being less expensive than Ahrefs for my basic SEO needs!\"\n\n— JOSH S\n\n\t\n\t"


const lines = text
  .split("\n")
  .map(l => l.trim())
  .filter(Boolean);

const results = [];

for (let i = 0; i < lines.length; i++) {
  const keyword = lines[i];

  const volume = lines[i + 1];
  const competition = lines[i + 2];
  const kei = lines[i + 3];
  const noClick1 = lines[i + 4];
  const noClick2 = lines[i + 5];

  if (
    volume &&
    (/^\d[\d,]*$/.test(volume) || volume === "—") &&
    competition &&
    kei
  ) {
    results.push({
      keyword,
      volume,
      competition,
      kei,
      noClickSearches: noClick1
    });

    i += 5;
  }
}

console.log(results)