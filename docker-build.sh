docker buildx rm gobuilder
docker buildx create --name gobuilder --config ./buildkitd.toml --use --driver-opt network=host
docker buildx inspect --bootstrap
docker build -t alemonjs-code:latest .
docker exec -it alemonjs-code bash
