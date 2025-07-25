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

# Expose no port because agent only connects outbound
CMD ["npm", "start"]
