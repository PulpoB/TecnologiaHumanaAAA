const http = require('http');

function requestJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  const profile = await requestJson('/api/profile?userId=u1');
  const tasks = await requestJson('/api/tasks?userId=u1');
  const grades = await requestJson('/api/grades?userId=u1');
  const teacherGrades = await requestJson('/api/grades?userId=u2');

  console.log('PROFILE STATUS', profile.status);
  console.log(JSON.stringify(profile.body, null, 2));
  console.log('\nTASKS STATUS', tasks.status);
  console.log(JSON.stringify(tasks.body, null, 2));
  console.log('\nGRADES STATUS', grades.status);
  console.log(JSON.stringify(grades.body, null, 2));
  console.log('\nTEACHER GRADES STATUS', teacherGrades.status);
  console.log(JSON.stringify(teacherGrades.body, null, 2));
})();
