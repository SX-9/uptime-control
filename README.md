# Uptime Control
Simple self-hosted API to monitor machines uptime and remotely shutdown/wake/reboot.

## Environment Variables
- **API_DB_PATH** - path to database file for ssh and wake on lan details. (default is ./db.json)
- **API_PORT** - port to run the api on. (default is 3000)
- **API_USR** and **API_PASSWD** - http basic auth credentials. (default is 'admin' and 'password')

## API Endpoints
_all endpoints under /db and /action are protected with http basic auth credentials_

- **GET** <ins>/</ins> - sends 'Uptime Control is running'

- **GET** <ins>/status</ins> - get status of registered devices with ping ip set (_response body below_)
```json
{
  "server-id": {
    "alive": true,
    "time": "1.884"
  }
}
```

---

- **GET** <ins>/db/raw</ins> - get the raw json db file

- **GET** <ins>/db/device/:id</ins> - get registered device information raw from the db (_example response below_)

- **POST** <ins>/db/device/:id</ins> - register/edit device information from body (_request body format below_)

- **DELETE** <ins>/db/device/:id</ins> - deletes device from db

```json
{
    "wol": {
        "mac": "00:11:22:33:44:55",
        "address": "192.168.1.255",
        "port": 9
    },
    "ssh": {
        "host": "192.168.1.100",
        "port": 22,
        "username": "user",
        "password": "password123",
        "privateKey": "private_key_content",
        "passphrase": "privatekey_passphrase123"
    },
    "ping": "192.168.1.100"
}
```

---

- **GET** <ins>/actions/wake/:id</ins> - sends wake on lan packet to device

- **GET** <ins>/actions/shutdown/:id</ins> - sends shutdown command via ssh

- **GET** <ins>/actions/reboot/:id</ins> - sends sends reboot command via ssh