const Imap = require('imap');
const { simpleParser } = require('mailparser');

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
            const f = imap.fetch(results, {
              bodies: ''
            });

            f.on('message', (msg) => {
              msg.on('body', (stream) => {
                count++;
                simpleParser(stream, async (err, parsed) => {
                  console.log('----------------------');
                  console.log('From: ' + parsed.from.text + ' -> ' + parsed.text);
                });
              });

              msg.once('attribute', (attrs) => {
                const { uid } = attrs;
                imap.addFlags(uid, ['\\Seen'], () => {
                  console.log('Marked as read');
                });
              });
            });

            f.once('error', (err) => {
              return Promise.reject(err);
            });

            f.once('end', () => {
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
