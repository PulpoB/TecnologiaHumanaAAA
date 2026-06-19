const http = require('http');

function requestJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
  });
}

(async () => {
  const endpoints = [
    '/api/profile?userId=u1',
    '/api/tasks?userId=u1',
    '/api/grades?userId=u1',
    '/api/grades?userId=u2'
  ];

  for (const path of endpoints) {
    try {
      const result = await requestJson(path);
      console.log(`\n=== ${path} => ${result.status} ===`);
      console.log(JSON.stringify(result.body, null, 2));
    } catch (err) {
      console.log(`\n=== ${path} => ERROR ===`);
      console.error(err.message);
    }
  }
})();
