# Kubernetes Deployment Walkthrough

I have successfully created the Kubernetes manifest structure for the TradeVia application. The setup uses **Kustomize** to manage configurations, with a common `base` and a `k3d` overlay for local development.

## Structure

```text
k8s/
├── base/
│   ├── api-service/          # Deployment & Service for API
│   ├── engine-service/       # Deployment & Service for Engine
│   ├── price-poller-service/ # Deployment & Service for Price Poller
│   ├── web/                  # Deployment & Service for Web Frontend
│   ├── infra/                # Postgres & Redis deployments
│   └── kustomization.yml     # Aggregates all base components
└── overlays/
    └── k3d/                  # k3d-specific configurations
        ├── patches/          # Patches to expose services
        └── kustomization.yml # References base and applies patches
```

## Key Changes

### Infrastructure
- **Postgres**: Set up with a 1Gi PersistentVolumeClaim and internal ClusterIP service.
- **Redis**: Set up with an `emptyDir` volume for simplicity in dev.

### Services
- **api-service**: Exposed on port 3001. Configured with health checks (`/health`).
- **web**: Exposed on port 3000. Configured with health checks (`/`).
- **engine-service** & **price-poller-service**: Internal services connected to Redis and Postgres.

### k3d Overlay
- Patched `web` and `api-service` to use `type: LoadBalancer`. This allows accessing them from your host machine if the k3d cluster is created with port mapping.

## How to Deploy

1. **Create k3d Cluster (with port mapping)**:
   ```bash
   k3d cluster create tradevia \
     -p "3000:3000@loadbalancer" \
     -p "3001:3001@loadbalancer"
   ```

2. **Deploy to k3d**:
   ```bash
   kubectl apply -k k8s/overlays/k3d
   ```

3. **Verify**:
   ```bash
   kubectl get pods
   kubectl get svc
   ```

Once deployed, you can access:
- **Web Frontend**: `http://localhost:3000`
- **API Service**: `http://localhost:3001/health`
