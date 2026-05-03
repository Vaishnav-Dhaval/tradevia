.PHONY: docker-clean down build up up-nc all k3d-up k3d-down deploy delete k3d-redeploy

CLUSTER_NAME=tradevia

docker-clean:
	docker system prune -fa

down:
	docker compose down

build:
	docker compose build --no-cache

up:
	docker compose up -d

up-nc:
	docker compose up -d --build

all: down docker-clean build up

# K3d / K8s Commands
k3d-up:
	k3d cluster start $(CLUSTER_NAME) || k3d cluster create $(CLUSTER_NAME) \
		-p "3000:32003@server:0" \
		-p "3001:32307@server:0" \
		--agents 1
	kubectl config use-context k3d-$(CLUSTER_NAME)

k3d-down:
	k3d cluster delete $(CLUSTER_NAME)

deploy:
	kubectl apply -k k8s/overlays/k3d

delete:
	kubectl delete -k k8s/overlays/k3d

k3d-redeploy: build
	k3d image import imgbox/api:latest imgbox/engine:latest imgbox/price-poller:latest imgbox/web:latest -c $(CLUSTER_NAME)
	kubectl rollout restart deployment api-service web engine-service price-poller-service
