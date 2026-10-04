
/*
  lyrics-api.example.js
  ---------------------
  Пример серверного КОНТРАКТА для GitHub Pages.

  GitHub Pages не может безопасно хранить секретный ключ lyrics-провайдера.
  Поэтому фронтенд вызывает /api/lyrics, а этот endpoint на твоём сервере
  обращается к лицензированному провайдеру.

  Этот пример намеренно НЕ содержит обходов, парсеров чужих сайтов или
  неавторизованного источника текстов.

  Ответ фронтенду:
    {
      licensed: true,
      syncedLyrics: "...LRC..."
    }

  Если провайдер не даёт право отображать текст на твоём сайте:
    {
      licensed: false,
      syncedLyrics: ""
    }

  Пример Express-обвязки:

  app.get('/api/lyrics', async (req,res) => {
    const {title, artist, album, duration} = req.query;

    // 1. Здесь вызывай только тот lyrics-провайдер, чья лицензия
    //    разрешает твоему сервису показывать эти тексты.
    // 2. Передай title/artist/album/duration.
    // 3. Преобразуй ответ провайдера в формат выше.
    // 4. Никогда не отправляй секретный API key в браузер.

    res.json({
      licensed: false,
      syncedLyrics: ""
    });
  });
*/

module.exports = {};
