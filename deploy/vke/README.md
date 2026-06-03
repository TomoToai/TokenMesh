# TokenMesh VKE Deployment

This directory contains the MVP Kubernetes manifests for deploying TokenMesh on Volcengine Kubernetes Engine (VKE).

## What You Need From Volcengine

- A VKE cluster with `kubectl` access.
- A Volcengine Container Registry repository, for example:
  `limengtao-cr-demo-cn-beijing.cr.volces.com/limengtao-codex/limengtao-codex`
- A default StorageClass in the VKE cluster, or update `pvc.yaml` with your StorageClass.
- A CLB/EIP provisioned by the `LoadBalancer` Service.
- Optional: a domain name and ICP filing if the domain resolves to a Mainland China server.

## Build And Push Image On VKE

The recommended MVP release path is to build the image inside VKE. This avoids local
CPU architecture mismatches and lets the VKE amd64 node produce the production image.

Create the Container Registry auth secret from your local Docker login:

```bash
kubectl apply -f deploy/vke/namespace.yaml

kubectl -n tokenmesh create secret generic tokenmesh-cr-auth \
  --from-file=.dockerconfigjson="$HOME/.docker/config.json" \
  --type=kubernetes.io/dockerconfigjson \
  --dry-run=client -o yaml | kubectl apply -f -
```

Start one build job:

```bash
TAG=$(git rev-parse --short HEAD)
IMAGE=limengtao-cr-demo-cn-beijing.cr.volces.com/limengtao-codex/limengtao-codex:$TAG

sed "s/REPLACE_WITH_TAG/$TAG/g" deploy/vke/build-job.yaml | kubectl apply -f -
kubectl -n tokenmesh wait --for=condition=complete job/tokenmesh-image-build --timeout=20m
kubectl -n tokenmesh logs job/tokenmesh-image-build
```

Delete the completed job before starting another build with the same job name:

```bash
kubectl -n tokenmesh delete job tokenmesh-image-build --ignore-not-found
```

## Create Secret

Do not commit real secrets.

```bash
cp deploy/vke/secret.example.yaml deploy/vke/secret.yaml
```

Edit `deploy/vke/secret.yaml` and fill:

- `ARK_API_KEY`
- `DEEPSEEK_API_KEY`
- `VOLCENGINE_WEB_SEARCH_API_KEY`
- `JWT_SECRET`

Then apply it:

```bash
kubectl apply -f deploy/vke/namespace.yaml
kubectl apply -f deploy/vke/secret.yaml
```

## Deploy To VKE

```bash
kubectl apply -k deploy/vke
kubectl set image deployment/tokenmesh-web tokenmesh-web="$IMAGE" -n tokenmesh
kubectl rollout status deployment/tokenmesh-web -n tokenmesh
kubectl get svc tokenmesh-web -n tokenmesh
```

The service is `LoadBalancer` type and forwards public port `80` to container port `3001`.

## Important MVP Constraint

TokenMesh currently uses SQLite. The VKE deployment is intentionally configured as:

- `replicas: 1`
- `strategy: Recreate`
- `ReadWriteOnce` PVC mounted at `/app/data`
- `DATABASE_PATH=/app/data/tokenmesh.db`

Do not scale this deployment above 1 replica until the database is migrated to PostgreSQL/MySQL.
