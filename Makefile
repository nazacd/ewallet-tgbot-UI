docker:
    docker run -d --env-file .env --network ewallet-network -p 3000:3000 --name e-wallet-bot e-wallet-bot
