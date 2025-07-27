# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json pm2.config.js ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

RUN npm install -g pm2

CMD ["pm2-runtime", "index.js"]
