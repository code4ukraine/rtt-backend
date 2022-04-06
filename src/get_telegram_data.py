import csv
import os

from dotenv import load_dotenv
from telethon import TelegramClient
from os.path import exists

load_dotenv()

async def main():

    messages = []
    channel_names = []

    file_exists = exists("results.csv")

    max_id_per_channel = dict([(channel_name, 0) for channel_name in channel_names])
    max_iteration = 0
    if file_exists:
        with open("results.csv", "r") as infile:
            reader = csv.reader(infile)
            next(reader)
            for row in reader:
                channel_name = row[0]
                msg_id = row[1]
                max_id_per_channel[channel_name] = max(max_id_per_channel[channel_name], int(msg_id))
                if len(row) > 5:
                    max_iteration = max(max_iteration, int(row[5] or 0))

    for channel_name in channel_names:
        async for message in client.iter_messages(channel_name, min_id=max_id_per_channel[channel_name]):
            messages.append([channel_name, message.id, str(message.date),
                    message.text, message.edit_date])

    with open("results.csv", "a") as outfile:
        writer = csv.writer(outfile)
        if not file_exists:
            writer.writerow(["channel", "id", "posted_at", "message", "edited_at", "iteration"])
        for m in messages:
            m.append(max_iteration + 1)
            writer.writerow(m)

with TelegramClient('anon', os.getenv('API_ID'), os.getenv('APP_HASH')) as client:
    client.loop.run_until_complete(main())
