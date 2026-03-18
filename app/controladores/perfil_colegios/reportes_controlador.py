from flask import Blueprint, request, current_app, send_file, jsonify
from app.modelos.models import ProcesoContractual, Colegio, Proveedor
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
import os, re, zipfile, subprocess, platform  
from io import BytesIO
from num2words import num2words
import threading
from PIL import Image
import locale
from datetime import datetime
import shutil
from flask import after_this_request
from flask_login import login_required, current_user
from app.utils.imagenes import obtener_imagen_procesada

pdf_lock = threading.Lock()
reportes_bp = Blueprint('reportes', __name__)

# --- NUEVA FUNCIÓN PARA ESTANDARIZAR TAMAÑOS (OPTIMIZADA PARA PRODUCCIÓN) ---
def redimensionar_imagen(ruta_img, ancho_max=400):
    """Crea una copia optimizada en temp para evitar bloquear el original"""
    if not ruta_img or not os.path.exists(ruta_img):
        return None
    try:
        # 1. Creamos un nombre único para la versión optimizada en la carpeta temp
        nombre_archivo = os.path.basename(ruta_img)
        ruta_temp_img = os.path.join(current_app.root_path, 'static', 'temp', f"opt_{nombre_archivo}")
        
        # Aseguramos que la carpeta temp exista
        os.makedirs(os.path.dirname(ruta_temp_img), exist_ok=True)

        with Image.open(ruta_img) as img:
            # 2. Solo redimensionamos si es necesario, pero SIEMPRE guardamos en temp
            # para que 'docxtpl' lea desde temp y no bloquee el original en uploads
            if img.width > ancho_max:
                ratio = ancho_max / float(img.width)
                alto = int(float(img.size[1]) * float(ratio))
                img = img.resize((ancho_max, alto), Image.Resampling.LANCZOS)
            
            # 3. Guardamos la copia en la ruta temporal
            img.save(ruta_temp_img, optimize=True, quality=90)
            return ruta_temp_img # Devolvemos la nueva ruta para usarla en el Word
            
    except Exception as e:
        print(f"Error redimensionando imagen: {e}")
        return ruta_img # Si falla, devolvemos la original para no romper el flujo

# --- 1. FUNCIONES DE FECHA (FUERA DE OTRAS FUNCIONES) ---
def fecha_texto_largo(fecha):
    # Verificación de seguridad: si no hay fecha o no tiene el atributo month
    if not fecha or not hasattr(fecha, 'month'): 
        return ""
    
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    return f"{fecha.day} de {meses[fecha.month - 1]} de {fecha.year}"

def fecha_texto_legal(fecha):
    # Verificación de seguridad
    if not fecha or not hasattr(fecha, 'month'): 
        return ""
    
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    
    dia_letras = "un" if fecha.day == 1 else num2words(fecha.day, lang='es').lower()
    anio_letras = num2words(fecha.year, lang='es').lower()
    
    return f"{dia_letras} ({fecha.day:02d}) días del mes de {meses[fecha.month - 1]} de {anio_letras} ({fecha.year})"


# 1. Mueve esta función afuera, justo debajo de las otras funciones de fecha
def f_str(fecha_obj):
    try:
        if fecha_obj and hasattr(fecha_obj, 'strftime'):
            return fecha_obj.strftime('%d/%m/%Y')
        return ""
    except:
        return ""

# 2. Reemplaza TODA la función obtener_contexto_proceso con esta versión "Tanque"
def obtener_contexto_proceso(proceso_id):
    """Extrae datos con protección extrema y validación de usuario"""
    # 1. Buscamos el proceso
    proceso = ProcesoContractual.query.get_or_404(proceso_id)
    
    # 2. Buscamos el colegio
    colegio = Colegio.query.get(proceso.colegio_id)
    
    # --- NUEVO: BLOQUEO DE SEGURIDAD  ---
    # Si no es admin y el colegio no le pertenece al usuario logueado... 
    if current_user.rol != 'admin' and colegio.usuario_id != current_user.id:
        # Lanzamos una excepción que será capturada por el 'except' del endpoint
        raise PermissionError("No tienes permiso para acceder a los documentos de este colegio.")
    
    # --- FUNCION DE APOYO INTERNA ---
    def safe_int(val):
        try: 
            if val in [None, "", "null", "undefined"]: return None
            return int(float(val))
        except: return None

    # --- PROVEEDORES ---
    prov1 = Proveedor.query.get(proceso.proveedor_id) if proceso.proveedor_id else None
    prov2 = Proveedor.query.get(proceso.proveedor2_id) if getattr(proceso, 'proveedor2_id', None) else None
    prov3 = Proveedor.query.get(proceso.proveedor3_id) if getattr(proceso, 'proveedor3_id', None) else None

    # --- VIGENCIA ---
    vigencia_db = safe_int(proceso.vigencia)
    anio_base = vigencia_db if vigencia_db else datetime.now().year

    # --- ITEMS ---
    items_tabla = []
    total_acumulado = 0
    items_query = proceso.detalles_items if hasattr(proceso, 'detalles_items') else proceso.details_items
    
    for item in items_query:
        v_unit = float(item.v_unitario or 0)
        v_tot = float(item.v_total or 0)
        cant_val = float(item.cantidad or 0)
        
        items_tabla.append({
            'cant': int(cant_val) if cant_val % 1 == 0 else cant_val,
            'cod': str(item.codigo_clasificador or '').strip(),
            'desc': str(item.descripcion or '').strip(),
            'unit': f"{v_unit:,.0f}",
            'total': f"{v_tot:,.0f}"
        })
        total_acumulado += v_tot

    # --- NOMBRES ---
    def format_p(p):
        if not p: return "NO ASIGNADO", "S.D."
        if p.razon_social and str(p.razon_social).strip() and not str(p.razon_social).isdigit():
            nombre = p.razon_social
        else:
            partes = [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
            nombre = " ".join([str(n).strip() for n in partes if n and str(n).strip()])
        return (nombre or "S.D.").upper(), (p.documento or "S.D.")

    n1, d1 = format_p(prov1)
    n2, d2 = format_p(prov2)
    n3, d3 = format_p(prov3)

    # --- COTIZACIONES ---
    v2 = float(proceso.valor_propuesta2 or 0)
    v3 = float(proceso.valor_propuesta3 or 0)
    conteo_cotizaciones = 1 + (1 if v2 > 0 else 0) + (1 if v3 > 0 else 0)

    nombre_col_limpio = re.sub(r'[^\w]', '_', colegio.nombre).replace("__", "_").upper()

    contexto = {
        'col_nombre': (colegio.nombre or "").upper(),
        'col_nit': colegio.nit or "",
        'col_rector': colegio.rector_nombre or "",
        'col_municipio': colegio.municipio or "",
        'col_direccion': colegio.direccion or "",
        'doc_rector': colegio.rector_documento or "",
        'vigencia': anio_base,
        'ano_anterior': anio_base - 1,
        'dos_anos_antes': anio_base - 2,
        'tipo_contrato': proceso.tipo_contrato or "",
        'objeto': proceso.objeto_desc or "",
        'contratista': n1, 'doc_contratista': d1,
        'contratista2': n2, 'doc_contratista2': d2,
        'contratista3': n3, 'doc_contratista3': d3,
        'cdp_numero': proceso.cdp_numero or "",
        'rubro': proceso.rubro_nombre or "",
        'cod_presupuestal': proceso.cod_presupuestal or "",
        'f_elaboracion': f_str(proceso.f_elaboracion),
        'f_publicacion': f_str(proceso.f_publicacion),
        'f_recepcion': f_str(proceso.f_recepcion),
        'f_cierre': f_str(proceso.f_cierre),
        'f_verificacion': f_str(proceso.f_verificacion),
        'f_firma': f_str(proceso.f_firma),
        'f_recibido': f_str(proceso.f_recibido),
        'f_elaboracion_texto': fecha_texto_largo(proceso.f_elaboracion),
        'f_elaboracion_legal': fecha_texto_legal(proceso.f_elaboracion),
        'f_publicacion_texto': fecha_texto_largo(proceso.f_publicacion),
        'f_publicacion_legal': fecha_texto_legal(proceso.f_publicacion),
        'f_recepcion_texto': fecha_texto_largo(proceso.f_recepcion),
        'f_recepcion_legal': fecha_texto_legal(proceso.f_recepcion),
        'f_cierre_texto': fecha_texto_largo(proceso.f_cierre),
        'f_cierre_legal': fecha_texto_legal(proceso.f_cierre),
        'f_verificacion_texto': fecha_texto_largo(proceso.f_verificacion),
        'f_verificacion_legal': fecha_texto_legal(proceso.f_verificacion),
        'f_firma_texto': fecha_texto_largo(proceso.f_firma),
        'f_firma_legal': fecha_texto_legal(proceso.f_firma),
        'f_recibido_texto': fecha_texto_largo(proceso.f_recibido),
        'f_recibido_legal': fecha_texto_legal(proceso.f_recibido),
        'plazo_txt': proceso.plazo_txt or "",
        'items': items_tabla,
        'total_final': f"${total_acumulado:,.0f}",
        'total_letras': f"{num2words(total_acumulado, lang='es').upper()} PESOS M/L" if total_acumulado > 0 else "CERO PESOS",
        'promedio_valor': f"${(proceso.promedio_propuestas or 0):,.0f}",
        'cantidad_cotizaciones': conteo_cotizaciones,
        'valor_propuesta2': f"${v2:,.0f}",
        'valor_propuesta3': f"${v3:,.0f}",
    }
    return contexto, colegio, nombre_col_limpio

@reportes_bp.route('/obtener_lista_plantillas')
@login_required
def lista_plantillas():
    ruta = os.path.join(current_app.root_path, 'static', 'plantillas')
    
    # MEJORA: Verificar si la ruta existe para evitar que la app explote
    if not os.path.exists(ruta):
        print(f"[ERROR] La carpeta de plantillas no existe en: {ruta}")
        return jsonify([]) # Devolvemos lista vacía si no hay carpeta

    # Mantenemos tu lógica original de filtrado y ordenado
    archivos = sorted([f for f in os.listdir(ruta) if f.endswith('.docx')])
    return jsonify(archivos)


def convertir_a_pdf_libreoffice(ruta_docx, carpeta_destino):
    """Usa LibreOffice de forma híbrida (Windows local / Linux Servidor)"""
    
    # --- DETECCIÓN DE ENTORNO ---
    if platform.system() == "Windows":
        # Ruta en tu PC Acer
        libreoffice_exe = r"C:\Program Files\LibreOffice\program\soffice.exe"
    else:
        # Ruta estándar en PythonAnywhere / Linux
        # Normalmente basta con 'libreoffice' o 'soffice'
        libreoffice_exe = 'libreoffice' 

    comando = [
        libreoffice_exe,
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', carpeta_destino,
        ruta_docx
    ]
    
    try:
        # Ejecutamos con capture_output para no ensuciar la consola del servidor
        subprocess.run(comando, check=True, timeout=35, capture_output=True)
        return True
    except Exception as e:
        print(f"Error en conversión ({platform.system()}): {e}")
        return False

@reportes_bp.route('/descargar_zip/<int:proceso_id>')
@login_required
def descargar_zip(proceso_id):
    formato = request.args.get('formato', 'word').lower()
    archivos_creados = [] 
    
    try:
        # 1. Validación de seguridad y obtención de datos
        contexto, colegio, nombre_col_limpio = obtener_contexto_proceso(proceso_id)
        
        ruta_plantillas = os.path.join(current_app.root_path, 'static', 'plantillas')
        ruta_temp = os.path.join(current_app.root_path, 'static', 'temp')
        os.makedirs(ruta_temp, exist_ok=True)

        if not os.path.exists(ruta_plantillas):
            return jsonify({"success": False, "message": "No se encontró la carpeta de plantillas"}), 404
            
        archivos_docs = sorted([f for f in os.listdir(ruta_plantillas) if f.endswith('.docx')])
        
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for nombre_p in archivos_docs:
                doc = DocxTemplate(os.path.join(ruta_plantillas, nombre_p))
                
                # --- NUEVA LÓGICA DE IMÁGENES REFACTORIZADA ---
                # Procesar Logo
                logo_obj, path_l = obtener_imagen_procesada(doc, colegio.logo_path, 25)
                contexto['logo'] = logo_obj if logo_obj else ""
                if path_l and path_l not in archivos_creados: archivos_creados.append(path_l)

                # Procesar Firma
                firma_obj, path_f = obtener_imagen_procesada(doc, colegio.firma_path, 35)
                contexto['firma'] = firma_obj if firma_obj else ""
                if path_f and path_f not in archivos_creados: archivos_creados.append(path_f)

                # Renderizar con el contexto limpio
                doc.render(contexto)
                
                # Preparar nombres de archivo
                nombre_plantilla_limpio = os.path.splitext(nombre_p)[0].upper()
                nombre_base_final = f"{nombre_plantilla_limpio}_{nombre_col_limpio}"
                path_word = os.path.join(ruta_temp, f"{nombre_base_final}.docx")
                
                # Guardar temporal
                doc.save(path_word)
                archivos_creados.append(path_word)
                
                # --- LÓGICA DE COMPRESIÓN ---
                if formato == 'pdf':
                    with pdf_lock:
                        if convertir_a_pdf_libreoffice(path_word, ruta_temp):
                            path_pdf = path_word.replace(".docx", ".pdf")
                            zf.write(path_pdf, arcname=f"{nombre_base_final}.pdf")
                            if path_pdf not in archivos_creados: archivos_creados.append(path_pdf)
                        else:
                            # Si falla PDF, metemos el Word para no dejar el ZIP vacío
                            zf.write(path_word, arcname=f"{nombre_base_final}.docx")
                else:
                    zf.write(path_word, arcname=f"{nombre_base_final}.docx")

        zip_buffer.seek(0)
        
        # Limpieza automática después de enviar
        @after_this_request
        def limpiar_basura_temporal(response):
            for ruta in archivos_creados:
                try:
                    if os.path.exists(ruta): os.remove(ruta)
                except Exception as e:
                    print(f"No se pudo borrar {ruta}: {e}")
            return response

        return send_file(
            zip_buffer, 
            mimetype='application/zip', 
            as_attachment=True, 
            download_name=f"PAQUETE_{nombre_col_limpio}.zip"
        )

    except PermissionError as pe:
        return jsonify({"success": False, "message": str(pe)}), 403
    except Exception as e:
        import traceback
        print("--- ERROR DETALLADO ---")
        print(traceback.format_exc()) # Esto nos dirá la línea exacta del fallo
        return jsonify({"success": False, "message": str(e)}), 500

@reportes_bp.route('/descargar_individual/<int:proceso_id>/<string:nombre_p>')
@login_required
def descargar_individual(proceso_id, nombre_p):
    formato = request.args.get('formato', 'word').lower()
    archivos_a_borrar = [] 
    
    try:
        # 1. Obtención de contexto y validación de seguridad
        contexto, colegio, nombre_col_limpio = obtener_contexto_proceso(proceso_id)
        
        ruta_plantillas = os.path.join(current_app.root_path, 'static', 'plantillas')
        ruta_temp = os.path.join(current_app.root_path, 'static', 'temp')
        os.makedirs(ruta_temp, exist_ok=True)
        
        ruta_completa_plantilla = os.path.join(ruta_plantillas, nombre_p)
        if not os.path.exists(ruta_completa_plantilla):
            return jsonify({"success": False, "message": "La plantilla no existe"}), 404

        doc = DocxTemplate(ruta_completa_plantilla)

        # --- USO DE LA NUEVA FUNCIÓN DE IMÁGENES ---
        # Procesar Logo (Ancho sugerido 28mm)
        logo_obj, path_l = obtener_imagen_procesada(doc, colegio.logo_path, 28)
        contexto['logo'] = logo_obj if logo_obj else ""
        if path_l: archivos_a_borrar.append(path_l)

        # Procesar Firma (Ancho sugerido 35mm)
        firma_obj, path_f = obtener_imagen_procesada(doc, colegio.firma_path, 35)
        contexto['firma'] = firma_obj if firma_obj else ""
        if path_f: archivos_a_borrar.append(path_f)

        # 2. Renderizado
        doc.render(contexto)
        
        nombre_plantilla_limpio = os.path.splitext(nombre_p)[0].upper()
        nombre_base_final = f"{nombre_plantilla_limpio}_{nombre_col_limpio}"
        
        path_word = os.path.join(ruta_temp, f"{nombre_base_final}.docx")
        doc.save(path_word)
        archivos_a_borrar.append(path_word)
        
        # 3. Lógica de envío y conversión
        archivo_a_enviar = path_word
        nombre_final_con_ext = f"{nombre_base_final}.docx"
        mimetype_final = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

        if formato == 'pdf':
            with pdf_lock: 
                if convertir_a_pdf_libreoffice(path_word, ruta_temp):
                    path_pdf = path_word.replace(".docx", ".pdf")
                    archivo_a_enviar = path_pdf
                    nombre_final_con_ext = f"{nombre_base_final}.pdf"
                    mimetype_final = 'application/pdf'
                    archivos_a_borrar.append(path_pdf)
                # Si falla PDF, por defecto enviará el Word generado arriba

        # 4. Limpieza segura post-respuesta
        @after_this_request
        def cleanup(response):
            for path in archivos_a_borrar:
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception as e:
                    print(f"No se pudo limpiar archivo temporal: {e}")
            return response

        return send_file(
            archivo_a_enviar, 
            as_attachment=True, 
            download_name=nombre_final_con_ext,
            mimetype=mimetype_final
        )

    except PermissionError as pe:
        return jsonify({"success": False, "message": str(pe)}), 403
    except Exception as e:
        print(f" ERROR CRÍTICO EN DESCARGA INDIVIDUAL: {str(e)}") 
        return jsonify({"success": False, "message": "Error al generar el documento"}), 500