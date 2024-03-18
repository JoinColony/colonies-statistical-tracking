FROM node:20.11.0

RUN apt-get update && apt-get -y install cron

# Copy source code to image
COPY . /root/colonies-statistical-tracking/.

WORKDIR /root/colonies-statistical-tracking

COPY cronjob /etc/cron.d/cronjob
RUN chmod 0644 /etc/cron.d/cronjob
RUN crontab /etc/cron.d/cronjob

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

# place variables in the global /etc/evironment file otherwise cron can't find them
RUN

# Install dependencies
RUN npm ci

# the command that starts our app
# CMD ["npm","run","prod"]
CMD ["bash", "run.sh"]
