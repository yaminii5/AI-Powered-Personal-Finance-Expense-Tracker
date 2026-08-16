import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_V3O2AwrdmlTW@ep-shy-brook-apa1hz8f-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)

class Config:
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    cors_raw = os.getenv("CORS_ORIGINS", "*")
    CORS_ORIGINS = [o.strip() for o in cors_raw.split(",")] if "," in cors_raw else cors_raw
