import sys
import os

# 1. Añade la ruta de tu proyecto para que el servidor la encuentre
path = '/home/TU_USUARIO_DE_PYTHONANYWHERE/Proyecto_Contabilidad'
if path not in sys.path:
    sys.path.append(path)

# 2. Importa la variable 'app' de tu archivo principal
# Si tu archivo se llama 'run.py', pon: from run import app
# Si tu archivo se llama 'main.py', pon: from main import app
from main import app as application