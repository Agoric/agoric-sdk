export function parseJSON(data) {
  try {
    const d = JSON.parse(data);
    return d;
  } catch (e) {
    console.log(`unparseable data: ${data}`);
    throw e;
  }
}
