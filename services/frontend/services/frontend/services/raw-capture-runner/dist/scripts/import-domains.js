"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3 = __importStar(require("sqlite3"));
const sqlite_1 = require("sqlite");
const fs_1 = __importDefault(require("fs"));
// Helper to get the main domain from a subdomain
function getMainDomain(domain) {
    // Remove www.
    domain = domain.replace(/^www\./, '');
    // Split by dots and get the last two parts for most domains
    const parts = domain.split('.');
    if (parts.length > 2) {
        // Special cases for country-specific domains (e.g., co.uk, com.br)
        const lastPart = parts[parts.length - 1];
        const secondLastPart = parts[parts.length - 2];
        if (lastPart.length === 2 && secondLastPart.length <= 3) {
            // Likely a country code with subdomain (e.g., co.uk, com.br)
            return parts.slice(-3).join('.');
        }
        // Regular domain, take last two parts
        return parts.slice(-2).join('.');
    }
    return domain;
}
// Get unique domains from the input
const rawDomains = `
www.google.com
www.blogger.com
youtube.com
linkedin.com
support.google.com
cloudflare.com
microsoft.com
apple.com
en.wikipedia.org
play.google.com
wordpress.org
docs.google.com
mozilla.org
maps.google.com
youtu.be
drive.google.com
bp.blogspot.com
sites.google.com
googleusercontent.com
accounts.google.com
t.me
europa.eu
plus.google.com
whatsapp.com
adobe.com
facebook.com
policies.google.com
uol.com.br
istockphoto.com
vimeo.com
vk.com
github.com
amazon.com
search.google.com
bbc.co.uk
google.de
live.com
gravatar.com
nih.gov
dan.com
files.wordpress.com
www.yahoo.com
cnn.com
dropbox.com
wikimedia.org
creativecommons.org
google.com.br
line.me
googleblog.com
opera.com
es.wikipedia.org
globo.com
brandbucket.com
myspace.com
slideshare.net
paypal.com
tiktok.com
netvibes.com
theguardian.com
who.int
goo.gl
medium.com
tools.google.com
draft.blogger.com
pt.wikipedia.org
fr.wikipedia.org
www.weebly.com
news.google.com
developers.google.com
w3.org
mail.google.com
gstatic.com
jimdofree.com
cpanel.net
imdb.com
wa.me
feedburner.com
enable-javascript.com
nytimes.com
workspace.google.com
ok.ru
google.es
dailymotion.com
afternic.com
bloomberg.com
amazon.de
photos.google.com
wiley.com
aliexpress.com
indiatimes.com
youronlinechoices.com
elpais.com
tinyurl.com
yadi.sk
spotify.com
huffpost.com
ru.wikipedia.org
google.fr
webmd.com
samsung.com
independent.co.uk
amazon.co.jp
get.google.com
amazon.co.uk
4shared.com
telegram.me
planalto.gov.br
businessinsider.com
ig.com.br
issuu.com
www.gov.br
wsj.com
hugedomains.com
picasaweb.google.com
usatoday.com
scribd.com
www.gov.uk
storage.googleapis.com
huffingtonpost.com
bbc.com
estadao.com.br
nature.com
mediafire.com
washingtonpost.com
forms.gle
namecheap.com
forbes.com
mirror.co.uk
soundcloud.com
fb.com
marketingplatform.google.com
domainmarket.com
ytimg.com
terra.com.br
google.co.uk
shutterstock.com
dailymail.co.uk
reg.ru
t.co
cdc.gov
thesun.co.uk
wp.com
cnet.com
instagram.com
researchgate.net
google.it
fandom.com
office.com
list-manage.com
msn.com
un.org
de.wikipedia.org
ovh.com
mail.ru
bing.com
news.yahoo.com
myaccount.google.com
hatena.ne.jp
shopify.com
adssettings.google.com
bit.ly
reuters.com
booking.com
discord.com
buydomains.com
nasa.gov
aboutads.info
time.com
abril.com.br
change.org
nginx.org
twitter.com
www.wikipedia.org
archive.org
cbsnews.com
networkadvertising.org
telegraph.co.uk
pinterest.com
google.co.jp
pixabay.com
zendesk.com
cpanel.com
vistaprint.com
sky.com
windows.net
alicdn.com
google.ca
lemonde.fr
newyorker.com
webnode.page
surveymonkey.com
translate.google.com
calendar.google.com
amazonaws.com
academia.edu
apache.org
imageshack.us
akamaihd.net
nginx.com
discord.gg
thetimes.co.uk
search.yahoo.com
amazon.fr
yelp.com
berkeley.edu
google.ru
sedoparking.com
cbc.ca
unesco.org
ggpht.com
privacyshield.gov
www.over-blog.com
clarin.com
www.wix.com
whitehouse.gov
icann.org
gnu.org
yandex.ru
francetvinfo.fr
gmail.com
mozilla.com
ziddu.com
guardian.co.uk
twitch.tv
sedo.com
foxnews.com
rambler.ru
books.google.com
stanford.edu
wikihow.com
it.wikipedia.org
20minutos.es
sfgate.com
liveinternet.ru
ja.wikipedia.org
000webhost.com
espn.com
eventbrite.com
disney.com
statista.com
addthis.com
pinterest.fr
lavanguardia.com
vkontakte.ru
doubleclick.net
bp2.blogger.com
skype.com
sciencedaily.com
bloglovin.com
insider.com
pl.wikipedia.org
sputniknews.com
id.wikipedia.org
doi.org
nypost.com
elmundo.es
abcnews.go.com
ipv4.google.com
deezer.com
express.co.uk
detik.com
mystrikingly.com
rakuten.co.jp
amzn.to
arxiv.org
alibaba.com
fb.me
wikia.com
t-online.de
telegra.ph
mega.nz
usnews.com
plos.org
naver.com
ibm.com
smh.com.au
dw.com
google.nl
lefigaro.fr
bp1.blogger.com
picasa.google.com
theatlantic.com
nydailynews.com
themeforest.net
rtve.es
newsweek.com
ovh.net
ca.gov
goodreads.com
economist.com
target.com
marca.com
kickstarter.com
hindustantimes.com
weibo.com
finance.yahoo.com
huawei.com
e-monsite.com
hubspot.com
npr.org
netflix.com
gizmodo.com
netlify.app
yandex.com
mashable.com
cnn.com
bbc.com
vimeo.com
imdb.com
ebay.com
etsy.com
paypal.com
walmart.com
target.com
microsoft.com
`.trim();
// Process domains
const domains = rawDomains
    .split('\n')
    .map(d => d.trim())
    .filter(d => d) // Remove empty lines
    .map(getMainDomain) // Clean domains
    .filter((d, i, arr) => arr.indexOf(d) === i); // Remove duplicates
async function importDomains() {
    console.log(`Found ${domains.length} unique domains to import`);
    try {
        // Save domains to a file for reference
        fs_1.default.writeFileSync('domains.txt', domains.join('\n'));
        console.log('✅ Saved domains to domains.txt');
        // Create data directory if it doesn't exist
        if (!fs_1.default.existsSync('data')) {
            fs_1.default.mkdirSync('data');
        }
        // Open SQLite database
        const db = await (0, sqlite_1.open)({
            filename: 'data/domains.db',
            driver: sqlite3.Database
        });
        // Create domains table
        await db.exec(`
      CREATE TABLE IF NOT EXISTS domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        let imported = 0;
        let skipped = 0;
        // Import domains
        for (const domain of domains) {
            try {
                await db.run('INSERT INTO domains (domain) VALUES (?) ON CONFLICT (domain) DO NOTHING', domain);
                // Check if the insert was successful
                const result = await db.get('SELECT id FROM domains WHERE domain = ?', domain);
                if (result) {
                    console.log(`✅ Imported: ${domain}`);
                    imported++;
                }
                else {
                    console.log(`ℹ️ Skipped (already exists): ${domain}`);
                    skipped++;
                }
            }
            catch (error) {
                console.error(`❌ Error importing ${domain}:`, error);
            }
        }
        // Print summary
        console.log('\nImport Summary:');
        console.log(`Total domains processed: ${domains.length}`);
        console.log(`Successfully imported: ${imported}`);
        console.log(`Skipped (already exist): ${skipped}`);
        // Print all domains in database
        console.log('\nAll domains in database:');
        const allDomains = await db.all('SELECT * FROM domains ORDER BY created_at DESC');
        allDomains.forEach((row) => {
            console.log(`- ${row.domain} (ID: ${row.id}, Created: ${row.created_at})`);
        });
        // Close database
        await db.close();
    }
    catch (error) {
        console.error('❌ Fatal error during import:', error);
    }
}
// Run the import
importDomains().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
