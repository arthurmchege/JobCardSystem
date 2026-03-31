import docker

def get_docker_status():
    client = docker.from_env()
    containers = client.containers.list()
    result = []
    for container in containers:
        result.append({
            "name": container.name,
            "status": container.status
        })
    return result

