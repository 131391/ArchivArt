# Gunicorn configuration for OpenCV Feature Matching Service

import multiprocessing
import os

# Server socket
bind = f"{os.getenv('OPENCV_HOST', '0.0.0.0')}:{os.getenv('OPENCV_PORT', 5001)}"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'sync'
worker_connections = 1000
timeout = int(os.getenv('REQUEST_TIMEOUT', 30))
keepalive = 2

# Restart workers after this many requests, to prevent memory leaks
max_requests = 1000
max_requests_jitter = 100

# Preload app for better performance
preload_app = True

# Logging
accesslog = '-'
errorlog = '-'
loglevel = os.getenv('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'opencv-feature-matching'

# Server mechanics
daemon = False
pidfile = 'opencv-service.pid'
user = None
group = None
tmp_upload_dir = None

# SSL (uncomment and configure if needed)
# keyfile = '/path/to/keyfile'
# certfile = '/path/to/certfile'

# Worker timeout for graceful shutdown
graceful_timeout = 30

# Maximum number of pending connections
max_requests_jitter = 100

# Worker process recycling
worker_tmp_dir = '/dev/shm'  # Use shared memory for better performance

# Environment variables
raw_env = [
    'OPENCV_DEBUG=false',
    'ENABLE_METRICS=true',
    'LOG_LEVEL=INFO'
]
