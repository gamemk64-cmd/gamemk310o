
/*
  Настройка источника текстов.

  ВАЖНО:
  Этот URL должен вести на ТВОЙ backend, который использует лицензированный
  источник lyrics. Не вставляй секретный API-ключ сюда: GitHub Pages показывает
  весь JavaScript пользователю.

  Backend должен вернуть:
  {
    "licensed": true,
    "syncedLyrics": "[00:01.20] ...\n[00:04.80] ..."
  }

  или:
  {
    "licensed": true,
    "lines": [
      {"start_ms":1200,"end_ms":4800,"text":"..."}
    ]
  }

  Если endpoint пустой, караоке продолжит работать с LRC, уже сохранённым
  в твоём каталоге, но автоматически получать тексты не будет.
*/
window.LYRICS_CFG = {
  endpoint: "/api/lyrics",
  timeout: 8000,
  autoFetch: true
};
