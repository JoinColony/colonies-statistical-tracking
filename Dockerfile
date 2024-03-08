FROM node:20.11.0

# Copy source code to image
COPY . .

# Install block ingestor dependencies
RUN npm ci

# the command that starts our app
CMD ["npm","run","prod"]
