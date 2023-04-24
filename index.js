//5925972611:AAHWGrGTKouzKpcoGgf4OZ8XumlCOvg7W8s


const { Telegraf } = require('telegraf');
const puppeteer = require('puppeteer');
const bot = new Telegraf('5925972611:AAHWGrGTKouzKpcoGgf4OZ8XumlCOvg7W8s');

bot.start((ctx) => {
  const message = `
Привет! Я могу показать тебе список бесплатных игр с сайта frexgames.ru.
Также я могу каждый час отправлять список новых халявных игр.
Посмотреть команды можно в меню.
  `;
  return ctx.replyWithHTML(message);
});

async function getFreeGames() {
  console.log('Checking for new games...');
  
  // Используем Puppeteer для извлечения списка бесплатных игр
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://frexgames.ru/', { waitUntil: 'networkidle2' });

  const games = await page.evaluate(() => {
    const gameNodes = document.querySelectorAll('.clean-grid-grid-post');
    const games = [];
    for (const node of gameNodes) {
      const game = {
        title: node.querySelector('.clean-grid-grid-post-title a').textContent.trim(),
        description: node.querySelector('.clean-grid-grid-post-categories a').textContent.trim(),
        imageUrl: node.querySelector('.clean-grid-grid-post-thumbnail-img').src,
        link: node.querySelector('.clean-grid-grid-post-title a').href,
        date: node.querySelector('.clean-grid-grid-post-date').textContent.trim(),
        author: node.querySelector('.clean-grid-grid-post-author a').textContent.trim(),
      };
      games.push(game);
    }
    return games;
  });

  await browser.close();

  return games;
}

async function sendFreeGames(ctx, games) {
  if (games.length === 0) {
    return ctx.reply('На данный момент нет бесплатных игр');
  }
  
  for (const game of games) {
    const message = `
      <b>${game.title}</b>
      <i>Категория:</i> ${game.description}
      <i>Дата:</i> ${game.date}
      <i>Автор:</i> ${game.author}
      <a href="${game.link}">Подробнее</a>
    `;
    await bot.telegram.sendPhoto(ctx.chat.id, { url: game.imageUrl }, { caption: message, parse_mode: 'HTML' });
  }
}

async function checkForNewGames(ctx) {
  const games = await getFreeGames();
  
  // Сверяем полученные игры с уже сохраненными и отправляем новые игры
  const savedGames = ctx.session.games || [];
  const newGames = games.filter(game => {
    const isSaved = savedGames.some(savedGame => savedGame.link === game.link);
    return !isSaved;
  });
  
  if (newGames.length > 0) {
    sendFreeGames(ctx, newGames);
    
    // Сохраняем новые игры в сессию
    ctx.session.games = savedGames.concat(newGames);
  } else {
    console.log('No new games');
  }
}

bot.command('games', async (ctx) => {
  const games = await getFreeGames();
  sendFreeGames(ctx, games);
});

setInterval(() => {
    checkForNewGames(ctx);
}, 60 * 60 * 1000);

bot.launch();