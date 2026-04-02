import docker

def get_docker_status():
    client = docker.from_env()
    containers = client.containers.list(all=True)
    result = []
    for container in containers:
        result.append({
            "name": container.name,
            "status": container.status, 
            "started_at": container.attrs["State"]["StartedAt"],
            "restart_count": container.attrs["RestartCount"]
        })
    return result

