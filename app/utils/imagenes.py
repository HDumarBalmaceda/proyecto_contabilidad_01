import os
from PIL import Image
from docxtpl import InlineImage
from docx.shared import Mm
from flask import current_app
import io

def obtener_imagen_procesada(doc, nombre_archivo, ancho_mm):
    """
    Optimiza la imagen y la prepara para docxtpl.
    """
    if not nombre_archivo:
        return None, None

    ruta_origen = os.path.join(current_app.root_path, 'static', 'uploads', nombre_archivo)
    
    # IMPORTANTE: Usamos un nombre único con el proceso ID o timestamp si pudieras, 
    # pero por ahora mantengamos el nombre base para no complicar.
    nombre_temp = f"optimizada_{nombre_archivo}"
    # Forzamos extensión .png para máxima compatibilidad con Word
    nombre_temp = os.path.splitext(nombre_temp)[0] + ".png"
    ruta_temp = os.path.join(current_app.root_path, 'static', 'temp', nombre_temp)

    if not os.path.exists(ruta_origen):
        print(f"⚠️ No existe: {ruta_origen}")
        return None, None

    try:
        os.makedirs(os.path.dirname(ruta_temp), exist_ok=True)

        with Image.open(ruta_origen) as img:
            # Convertimos a RGBA para mantener calidad y luego a RGB si es necesario
            # Pero para Word, PNG es el formato más estable
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Redimensionar
            img.thumbnail((600, 600), Image.Resampling.LANCZOS)
            
            # Guardar físicamente
            img.save(ruta_temp, "PNG", optimize=True)

        # VERIFICACIÓN DE SEGURIDAD: ¿El archivo se guardó y tiene contenido?
        if os.path.exists(ruta_temp) and os.path.getsize(ruta_temp) > 0:
            return InlineImage(doc, ruta_temp, width=Mm(ancho_mm)), ruta_temp
        else:
            print(f" Archivo generado vacío o no existe: {ruta_temp}")
            return None, None

    except Exception as e:
        print(f" Error crítico procesando imagen: {e}")
        return None, None