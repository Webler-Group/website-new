# Local development

## Requirements

- NodeJS
- Mongo DB Community: Download [here](https://www.mongodb.com/try/download/community-edition)

## How to run

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
2. Run worker `npm run codeRunner`


