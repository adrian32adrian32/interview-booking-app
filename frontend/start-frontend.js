const { exec } = require('child_process');
const path = require('path');

process.env.PORT = '3001';
process.chdir(__dirname);

const proc = exec('npm start', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  console.log(stdout);
});

proc.stdout.on('data', (data) => {
  console.log(data);
});

proc.stderr.on('data', (data) => {
  console.error(data);
});
