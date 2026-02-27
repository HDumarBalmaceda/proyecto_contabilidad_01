import os

class Config:
    # 1. Definimos las credenciales directamente para evitar el error de lectura
    USER = "postgres"
    PASSWORD = "1025527566"
    HOST = "localhost"
    PORT = "5432"
    DB_NAME = "gestion_colegios"

    # 2. Construimos la URI de forma limpia
    SQLALCHEMY_DATABASE_URI = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DB_NAME}"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False