# this file should be imported immediately to load the env vars
import os
from dotenv import load_dotenv

env_file = (
    ".env.production"
    if os.environ.get("ENVIRONMENT") == "production"
    else ".env.development"
)
load_dotenv(env_file)


def is_prod():
    return os.environ.get("ENVIRONMENT") == "production"


def get_allowed_origins():
    allowed_origins = os.environ.get("ALLOWED_ORIGINS")
    return allowed_origins.split(",") if allowed_origins else []
