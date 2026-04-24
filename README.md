# Local development

## Requirements

- NodeJS
- MongoDB Community: Download [here](https://www.mongodb.com/try/download/community-edition)
- Recommended OS: Linux - Debian based (use WSL on Windows) (If used other OS, some parts of the project may not work properly e.g. code playgorund)

### MongoDB Configuration

`/etc/mongod.conf`:
```
# network interfaces
net:
  port: 27017
  bindIp: 0.0.0.0

#replication:
replication:
  replSetName: "rs0"
```

After enabling replica set:
1. Restart MongoDB
2. Connect via shell (mongosh)
3. Run `rs.initiate()`

MongoDB Atlas connection URI requires `?directConnection=true`

## How to first run

1. Clone the repo
2. Create .env config file in /backend directory and copy paste content from .env-local-example (may require set some variables yourself)
- Make sure MongoDB service is running and the database with given name is created!

### Backend

1. Open /backend directory
2. Install NodeJS dependencies `npm install`
3. Seed the database `npm run seed`
4. Run development server `npm run dev`

### Frontend

1. Open /frontend directory (second terminal)
2. Install NodeJS dependencies
3. Run development server `npm run dev`

### Extra steps for code playground

1. Open /backend directory (third terminal)
2. Install ioi/isolate, compilers and other dependencies `node dist/cli/compiler-setup.js`
3. Run worker `npm run codeRunner`
