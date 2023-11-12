const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { writeFile, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const imapConfig = {
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: process.env.IMAP_PORT,
  tls: process.env.IMAP_TLS,
};

const folder = process.env.IMAP_FOLDER;

const getEmails = () => {
    try {
      const imap = new Imap(imapConfig);
      let count = 0;

      imap.once('ready', () => {
        imap.openBox(folder, false, () => {
          imap.search(['UNSEEN'], (err, results) => {
            const fetch = imap.fetch(results, {
              bodies: ''
            });

            fetch.on('message', (msg, seqno) => {
              msg.on('body', (stream) => {
                count++;
                simpleParser(stream, (err, parsed) => {
                  if (err) throw err;

                  const emailBody = parsed.text;
                  const subject = parsed.subject || 'No Subject';

                  const folderName = seqno + '_' + subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                  const folderPath = join(__dirname, 'emails', folderName);

                  if (!existsSync(folderPath)) {
                    mkdirSync(folderPath);
                  }

                  const fileName = join(folderPath, 'body.txt');
                  writeFile(fileName, emailBody, function (err) {
                    if (err) throw err;
                    console.log(`Email body saved to ${fileName}`);
                  });

                });
              });

              msg.once('attribute', (attrs) => {
                const { uid } = attrs;
                imap.addFlags(uid, ['\\Seen'], () => {
                  console.log('Marked as read');
                });
              });
            });

            fetch.once('error', (err) => {
              return Promise.reject(err);
            });

            fetch.once('end', () => {
              console.log('Done fetching all messages');
              imap.end();
            });
          });
        });
      });

      imap.once('error', (err) => {
        console.log(err);
      })

      imap.once('end', () => {
        console.log('Connection ended');
        console.log('readed ' + count);
      })

      imap.connect();

    } catch (error) {
      console.log('An error has been occurred while fetching the mails', error);
    }
  }
;

getEmails();
