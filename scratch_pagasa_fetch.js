async function test() {
  try {
    const res = await fetch('https://pagasa.chlod.net/api/v1/bulletins/active');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
