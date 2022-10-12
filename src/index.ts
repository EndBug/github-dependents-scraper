import type {Axios} from 'axios';
const axios: Axios = require('axios');
import cheerio from 'cheerio';

interface Dependent {
  repo: string;
  stars: number;
  forks: number;
}

interface ScrapeResult {
  dependents: Dependent[];
  nextURL: string | null;
}

export async function getDependents(repo: string, pageLimit = 500) {
  const baseURL = `https://github.com/${repo}/network/dependents`;

  const dependents: Dependent[] = [];
  let nextURL: string | null = baseURL;

  do {
    pageLimit--;
    const res: ScrapeResult = await scrapePage(nextURL);
    dependents.push(...res.dependents);
    nextURL = res.nextURL;
  } while (pageLimit > 0 && nextURL);

  console.log(dependents);
  console.log(`${dependents.length} deps found`);
}

async function scrapePage(url: string): Promise<ScrapeResult> {
  const res = await axios.get(url);

  const $ = cheerio.load(res.data);

  const dependents: Dependent[] = [];

  $('#dependents > div.Box > div').each((i, e) => {
    // The first element is the header row
    if (i === 0) return;

    const repo =
      $(e).find('span > a:nth-child(1)').text().trim() +
      '/' +
      $(e).find('span > a:nth-child(2)').text().trim();

    const stars = Number($(e).find('div > span:nth-child(1)').text().trim());
    const forks = Number(
      $(e)
        .find('div > span:nth-child(2)')
        .text()
        .trim()
        .split('\n')
        .slice(-1)
        .join('')
        .trim()
    );

    dependents.push({
      repo,
      stars,
      forks,
    });
  });

  const nextURL =
    $('#dependents > div.paginate-container > div > a').prop('href') || null;

  return {
    dependents,
    nextURL,
  };
}
