import os
import psycopg2

# Lee la contraseña desde la variable de entorno
password = os.environ.get("DB_PASSWORD", None)
user = "hameth"
dbname = "gestion_colegios"
host = "localhost"
port = "5432"

# Imprime valores y repr para detectar caracteres invisibles o no-utf8
print("---- Parámetros de conexión (visibles) ----")
print("user:", user)
print("dbname:", dbname)
print("host:", host)
print("port:", port)
print("password visible:", password)
print("---- Parámetros de conexión (repr) ----")
print("user repr:", repr(user))
print("dbname repr:", repr(dbname))
print("host repr:", repr(host))
print("port repr:", repr(port))
print("password repr:", repr(password))

# Construir DSN como string y mostrar su repr
dsn = f"dbname={dbname} user={user} password={password} host={host} port={port}"
print("DSN repr:", repr(dsn))

# Intentar conectar usando DSN (capturando excepciones)
try:
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute("SELECT now();")
    print("Conexión OK, hora del servidor:", cur.fetchone())
    cur.close()
    conn.close()
except Exception as e:
    print("ERROR al conectar:", type(e).__name__, str(e))