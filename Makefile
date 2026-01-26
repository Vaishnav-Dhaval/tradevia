.PHONY: docker-clean down build up up-nc all

docker-clean:
	docker system prune -fa

down:
	docker compose down

build:
	docker compose build

up:
	docker compose up -d

up-nc:
	docker compose up -d --build

all: down docker-clean build up
