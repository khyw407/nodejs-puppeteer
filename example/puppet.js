const puppeteer = require('puppeteer');
const path = require('path');
const pdf = require('html-pdf');
const fs = require('fs');
const filePath = path.join(__dirname, '/seed/url_failcase');

const createPdf = async (html, options, dirPath, resultFileName) => {
  await pdf.create(html, options).toFile(`./example/result/${dirPath}/${resultFileName}.pdf`,async (err, res) => {
    if(err){
      return console.log(err);
    }

    console.log(`create pdf : ${resultFileName}`);
  });
}

const getBroadcastDateTime = (broadcastDate) => {
  let splitDate = broadcastDate.split(' ');
  let hhmmss = splitDate[1].split(':');
  return hhmmss[0] + hhmmss[1];
}

fs.readFile(filePath, async(err, fileStream) => {
  if(err){
    console.log(err);
    throw err;
  }

  let textArray = fileStream.toString().split('\n');

  let browser = await puppeteer.launch({headless: false, args: ['--window-size=1920,1080', '--disable-notifications'], ignoreDefaultArgs: ['--disable-extensions'], devtools: false});
  let page = await browser.newPage();
  await page.setViewport({width: 1920, height: 1080});
  await page.goto('접속하려는 URL', {waitUntil: 'networkidle2'});
  await page.type('#userId', 'ID값');
  await page.type('#passwd', 'Password값');
  await page.click('[name="loginBtn"]');
  await page.waitForNavigation({timeout: 60000});

  for(let item of textArray){
    let data = item.split(',');
    let obj = {
      seq: data[0],
      url: data[1],
      agreement_date: data[2],
      broadcast_date_yymmdd: data[3],
      broadcast_date: data[4],
      compcode: data[5],
      pgm_id: data[6],
      product_code: data[7],
      seperate: data[8]
    }

    await page.goto(obj.url, {waitUntil: 'networkidle2', timeout: 60000});
    await page.waitForSelector('#printId > div', {timeout: 60000});

    await page.evaluate((select) => {
      let elements = document.querySelectorAll(select);
      for(let i=0; i<elements.length; i++){
        elements[i].parentNode.removeChild(elements[i]);
      }
    }, '.blockUI');

    await page.evaluate(() => {
      let agreeArea1 = document.querySelector('#agreeArea1 + div');
      let agreeArea2 = document.querySelector('#agreeArea2 + div');
      let bottomArea = document.querySelector('#broadCondAgreeDocPopupForm + div');

      if(agreeArea1){agreeArea1.remove();}
      if(agreeArea2){agreeArea2.remove();}
      if(bottomArea){bottomArea.remove();}
    });

    let html = await page.content();
    let options = {format: 'A3'};
    let bradcast_date_hhmm = getBroadcastDateTime(obj.broadcast_date);
    let dirPath = `${obj.broadcast_date_yymmdd.substring(0,4)}/${obj.broadcast_date_yymmdd.substring(4,6)}`;
    let resultFileName = `${obj.broadcast_date_yymmdd}_${bradcast_date_hhmm}_${obj.compcode}_${obj.pgm_id}_${obj.product_code}`;

    fs.writeFile(`./example/result/${dirPath}/${resultFileName}.html`, html, (err) => {
      if(err){
        console.log(err);
        throw err;
      }
    })

    await createPdf(html, options, dirPath, resultFileName);
  }
});