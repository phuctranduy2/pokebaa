async function test() {
  const res = await fetch("https://pixabay.com/vi/music/search/lofi%20chill/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  const html = await res.text();
  console.log("HTML length:", html.length);
  const matchNext = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (matchNext) {
    try {
      const data = JSON.parse(matchNext[1]);
      console.log("Found Next Data!");
      const pageProps = data.props?.pageProps;
      const media = pageProps?.initialMedia || pageProps?.initialData?.media || [];
      console.log("Media count:", media.length || Object.keys(pageProps || {}));
      const jsonStr = JSON.stringify(data);
      const audioMatches = jsonStr.match(/https:\/\/[^"]*\.mp3/g) || [];
      console.log("MP3 matches in JSON:", audioMatches.slice(0, 5));
    } catch (e) {
      console.log("JSON parse error:", e.message);
    }
  } else {
    const urls = html.match(/https?:\/\/[^\s"'\\]+\.mp3/gi);
    console.log("Direct audio URLs found:", urls?.slice(0, 5));
  }
}
test();
