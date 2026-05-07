async function test() {
  try {
    const res = await fetch('https://pagasa.chlod.net/api/v1/bulletins/active', {
      headers: { 
        'Accept': 'application/json',
        'Referer': 'https://pagasa.chlod.net/app/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body snippet:', text.substring(0, 1000));
  } catch(e) {
    console.error('Error:', e.message);
  }
}
test();
