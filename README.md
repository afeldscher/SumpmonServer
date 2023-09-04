# Sumpmon

WIP



## Setup

### Create a DB
Create a folder for the database to store it's data in. This will get mapped into the docker container. 

```
mkdir ../db
cp ./db/docker-compose.yml ../db
```

Create a .env file in the db folder
```
MYSQL_ROOT_PASSWORD=_____
MYSQL_DATABASE=sump_db
MYSQL_USER=admin
MYSQL_PASSWORD=____
````

Start the db:
```
cd ../db
sudo docker-compose up -d

# Check
sudo docker ps
```

### Create a venv

```
python -m venv ./venv
source ./venv/bin/activate
pip --upgrade pip
pip install -r ./requirements.txt
```


### Running

## Start the Server

Export the env file
```
export $(cat ../db/.env | xargs) 
```

```
source venv/bin/activate
python ./server
```

