import {Axios, AxiosError, AxiosResponse} from 'axios';
const axios: Axios = require('axios');
import cheerio from 'cheerio';

const RATE_LIMIT_WAIT = 61000; // ms

interface Dependent {
  repo: string;
  stars: number;
  forks: number;
}

interface ScrapeResult {
  dependents: Dependent[];
  nextURL: string | null;
}

export async function getDependents(repo: string, pageLimit = 300) {
  const baseURL = `https://github.com/${repo}/network/dependents`;

  const dependents: Dependent[] = [];
  let nextURL: string | null = baseURL;
  let currentPage = 0;

  do {
    console.log(`Page ${currentPage}`);
    const res: ScrapeResult = await scrapePage(nextURL);
    dependents.push(...res.dependents);
    nextURL = res.nextURL;
    if (res.dependents.length > 0) currentPage++;
  } while (currentPage < pageLimit && nextURL);

  return dependents;
}

async function scrapePage(url: string): Promise<ScrapeResult> {
  let res: AxiosResponse;

  try {
    res = await axios.get(url);
  } catch (e: unknown) {
    if (e instanceof AxiosError && e.code === 'ERR_BAD_REQUEST') {
      console.log(`Waiting ${RATE_LIMIT_WAIT / 1000}s...`);
      await new Promise(r => setTimeout(r, RATE_LIMIT_WAIT));
      return {
        dependents: [],
        nextURL: url,
      };
    } else throw e;
  }

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
