# Use official lightweight Node.js image
FROM node:18-alpine

WORKDIR /app

# Copy package lists and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy remaining source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start Express server
CMD ["npm", "start"]
