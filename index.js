const express = require('express');
const {Client} = require('ssh2');
const wol = require('wol');
const ping = require('ping');
const fs = require('fs')

const DB_PATH = process.env.API_DB_PATH || './db.json';
const PORT = process.env.API_PORT || 3000;
const PASSWD = process.env.API_PASSWD || 'password';
const USR = process.env.SSH_USR || 'admin';

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use((req, _, next) => {
    console.log(`${req.ip} ${req.method} ${req.path}`);
    next();
});

function authMiddleware(req, res, next) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Uptime Control"');
    if (
        !req.headers.authorization ||
        req.headers.authorization !== `Basic ${Buffer.from(`${USR}:${PASSWD}`).toString('base64')}`
    ) return res.status(401).send('Unauthorized');
    else next();
}
app.use('/db', authMiddleware);
app.use('/action', authMiddleware);
app.get('/', (_, res) => res.send('Uptime Control is running'));

app.get('/status', (_, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const servers = Object.entries(db.servers).map(([id, details]) => [id, details?.ping]).filter(([_, ping]) => ping);
    Promise.all(servers.map(([id, address]) => ping.promise.probe(address))).then(results => {
        res.send(Object.fromEntries(results.map((result, i) => [servers[i][0], {
            alive: result.alive,
            time: result.avg,
        }])));
    });
});

app.get('/db/raw', (_, res) => res.send(fs.readFileSync(DB_PATH)));

app.get('/db/device/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.send(db.servers[req.params.id]);
});

app.post('/db/device/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.servers[req.params.id] = req.body;
    fs.writeFileSync(DB_PATH, JSON.stringify(db));
    res.send('OK');
});

app.delete('/db/device/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    delete db.servers[req.params.id];
    fs.writeFileSync(DB_PATH, JSON.stringify(db));
    res.send('OK');
});

app.get('/action/wake/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const server = db.servers[req.params.id];
    wol.wake(server.wol.mac, {
        address: server.wol?.address || '255.255.255.255',
        port: server.wol?.port || 9,
    }, (err, success) => {
        if (err) res.status(500).send(err.message);
        else res.send(success ? 'OK' : 'Failed');
    });
});

app.get('/action/shutdown/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const server = db.servers[req.params.id];
    const ssh = new Client();
    ssh.on('ready', () => {
        ssh.exec('shutdown now', (err) => {
            if (err) return res.status(500).send(err.message);
        });
    }).on('error', (e) => res.status(500).send(e.message))
    .on("close", (e) => res.send(`OK: ${e}`)).connect({
        host: server.ssh.host,
        port: server.ssh.port,
        username: server.ssh.username,
        password: server.ssh.password,
        privateKey: server.ssh.privateKey,
        passphrase: server.ssh.passphrase,
    });
});

app.get('/action/reboot/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const server = db.servers[req.params.id];
    const ssh = new Client();
    ssh.on('ready', () => {
        ssh.exec('shutdown -r now', (err) => {
            if (err) return res.status(500).send(err.message);
        });
    }).on('error', (e) => res.status(500).send(e.message))
    .on("close", (e) => res.send(`OK: ${e}`)).connect({
        host: server.ssh.host,
        port: server.ssh.port,
        username: server.ssh.username,
        password: server.ssh.password,
        privateKey: server.ssh.privateKey,
        passphrase: server.ssh.passphrase,
    });
});

app.listen(PORT, () => {
    if (PASSWD === 'password') console.log('Please change the default password');
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({servers: {}}));

    console.log(`Listening on port ${PORT}`)
});